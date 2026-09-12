using System.Linq.Expressions;

namespace HobbyTracker.Api.Domain;

/// <summary>
/// The span of days a title could come out on, and how precisely that is known.
///
/// One value rather than three loose fields, because the three are only ever correct together:
/// <c>ck_media_release_window</c> refuses a precision without both ends and both ends without a
/// precision, and a type that can only be built by <see cref="For"/> is what keeps the code
/// above from having to remember that.
/// </summary>
public readonly record struct ReleaseWindow(
    DateOnly? Start,
    DateOnly? End,
    ReleasePrecision? Precision)
{
    /// <summary>
    /// The provider says this is announced and has no date for it. Both ends absent, and the
    /// title belongs on the calendar under <i>No date yet</i>.
    /// </summary>
    public static readonly ReleaseWindow Unknown =
        new(null, null, ReleasePrecision.Unknown);

    /// <summary>
    /// No window at all, which is deliberately <b>not</b> <see cref="Unknown"/>.
    ///
    /// It means nothing knows when this came out — either nobody has asked a provider, or one
    /// was asked and had no opinion. Such a title reads as <i>released</i> and stays in Backlog,
    /// which is what keeps a board that predates this feature untouched and what stops an
    /// obscure old title the provider has no date for being filed as coming soon.
    /// </summary>
    public static readonly ReleaseWindow None = new(null, null, null);

    /// <summary>
    /// The window around <paramref name="day"/> at the given precision — the whole month a day
    /// in March falls in, the whole quarter, the whole year.
    ///
    /// <para>
    /// <b>Derived from the unit containing the day rather than by truncating forward from it,
    /// and that is the correction this cost.</b> IGDB sends a vague date as the <i>last</i> day
    /// of its window: "2028" arrives as 2028-12-31 and "Q3 2026" as 2026-09-30, both measured
    /// against the live API. Reading either as a start would file the title a whole window late.
    /// Taking the unit the day falls in is right under either convention, and needs no
    /// assumption about which one a provider chose.
    /// </para>
    /// </summary>
    public static ReleaseWindow For(DateOnly day, ReleasePrecision precision) => precision switch
    {
        ReleasePrecision.Day => new ReleaseWindow(day, day, precision),

        ReleasePrecision.Month => Spanning(day.Year, day.Month, day.Month, precision),

        // Months 1-3 are Q1, 4-6 Q2, and so on. The arithmetic is written out rather than
        // tabled because the table would be four rows saying the same division.
        ReleasePrecision.Quarter => Spanning(
            day.Year,
            (((day.Month - 1) / 3) * 3) + 1,
            (((day.Month - 1) / 3) * 3) + 3,
            precision),

        ReleasePrecision.Year => Spanning(day.Year, 1, 12, precision),

        // Nothing should ask for a window around a day it has no precision for. If something
        // does, answering with no window is the safe direction: a half-written pair is what the
        // check constraint exists to make unreachable.
        _ => Unknown,
    };

    private static ReleaseWindow Spanning(int year, int firstMonth, int lastMonth, ReleasePrecision precision) =>
        new(
            new DateOnly(year, firstMonth, 1),
            new DateOnly(year, lastMonth, DateTime.DaysInMonth(year, lastMonth)),
            precision);

    /// <summary>Statuses that mean a title is playable now, whatever day its window names.</summary>
    private static readonly ReleaseStatus?[] PlayableNow =
    [
        ReleaseStatus.Released,
        ReleaseStatus.Alpha,
        ReleaseStatus.Beta,
        ReleaseStatus.EarlyAccess,
        ReleaseStatus.Offline,
        ReleaseStatus.Delisted,
    ];

    /// <summary>
    /// Statuses that mean it is not arriving on the date it names — or at all. A cancelled title
    /// whose announced date has passed would otherwise read as released, which claims it shipped.
    /// </summary>
    private static readonly ReleaseStatus?[] NotOnItsDate =
    [
        ReleaseStatus.Cancelled,
        ReleaseStatus.Rumored,
    ];

    /// <summary>
    /// Not out yet, as one expression — <b>the single definition of that word in this app.</b>
    ///
    /// <para>
    /// Three things ask it and all three must agree: the Backlog column excludes these, the
    /// release calendar is exactly these, and the nightly sweep re-asks IGDB about exactly
    /// these. Written out three times it would drift, and the drift is invisible — a title in
    /// both the column and the calendar, or in neither, with nothing erroring.
    /// </para>
    ///
    /// <para>
    /// <b>The first clause is the whole of the deploy-day safety and is first for that reason.</b>
    /// A null precision means nobody has asked a provider, which is true of every row that
    /// existed before these columns did, and it has to read as <i>released</i>. Drop it and the
    /// migration empties every existing user's Backlog column, with no error and no log line.
    /// </para>
    ///
    /// <para>
    /// The comparison is against the window's <b>last</b> day. Against its first, a title
    /// announced only for "2026" would appear in Backlog on 1 January, eleven months before
    /// anybody could play it.
    /// </para>
    /// </summary>
    public static Expression<Func<Media, bool>> NotOutOn(DateOnly today) => media =>
        media.ReleasePrecision != null
        && !PlayableNow.Contains(media.ReleaseStatus)
        && (NotOnItsDate.Contains(media.ReleaseStatus)
            || media.ReleaseEnd == null
            || media.ReleaseEnd > today);

    /// <summary>
    /// <see cref="NotOutOn(DateOnly)"/>, re-pointed at something that <i>has</i> a
    /// <see cref="Media"/> rather than being one.
    ///
    /// The board filters rows carrying a media alongside a log entry, and the sweep filters
    /// games; neither can apply a <c>Func&lt;Media, bool&gt;</c> directly, and EF Core cannot
    /// translate an <c>Invoke</c>. Swapping the parameter for the caller's expression is what
    /// lets both ask the database literally the same question instead of two that look alike.
    /// </summary>
    public static Expression<Func<T, bool>> NotOutOn<T>(
        DateOnly today, Expression<Func<T, Media>> mediaOf)
    {
        var predicate = NotOutOn(today);
        var body = new RebindParameter(predicate.Parameters[0], mediaOf.Body).Visit(predicate.Body);

        return Expression.Lambda<Func<T, bool>>(body, mediaOf.Parameters);
    }

    /// <summary>
    /// Negates a predicate as an expression rather than restating it.
    ///
    /// This is what makes the Backlog column and the calendar exact complements: one of them is
    /// literally <c>NOT</c> the other, so a title cannot fall into both or into neither however
    /// the rule above changes.
    /// </summary>
    /// <summary>The compiled form of <see cref="NotOutOn(DateOnly)"/>, for the day it was built on.</summary>
    private sealed record Compiled(DateOnly Day, Func<Media, bool> NotOut);

    /// <summary>
    /// Memoised because <see cref="IsOut"/> is called once per search result — up to five hundred
    /// of them — and compiling an expression tree each time would be real work for an answer that
    /// changes once a day.
    ///
    /// A whole record is swapped rather than two fields written, so a reader can never see a
    /// delegate paired with the wrong day. No lock: two threads racing on a new day both compile
    /// and one wins, which costs a compile and is correct either way.
    /// </summary>
    private static Compiled? _compiled;

    /// <summary>
    /// Whether one title is out, in memory — the same question <see cref="NotOutOn(DateOnly)"/>
    /// asks of the database, negated.
    ///
    /// It exists so a search result and a board column cannot answer differently about one title.
    /// Writing the rule a second time by hand here is exactly the drift this whole type is shaped
    /// to prevent, so the expression is compiled rather than restated.
    /// </summary>
    public static bool IsOut(Media media, DateOnly today)
    {
        var compiled = _compiled;

        if (compiled is null || compiled.Day != today)
        {
            compiled = new Compiled(today, NotOutOn(today).Compile());
            _compiled = compiled;
        }

        return !compiled.NotOut(media);
    }

    public static Expression<Func<T, bool>> Not<T>(Expression<Func<T, bool>> predicate) =>
        Expression.Lambda<Func<T, bool>>(Expression.Not(predicate.Body), predicate.Parameters);

    private sealed class RebindParameter(ParameterExpression from, Expression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == from ? to : base.VisitParameter(node);
    }
}
