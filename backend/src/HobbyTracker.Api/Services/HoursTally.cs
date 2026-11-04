using HobbyTracker.Api.Contracts;

namespace HobbyTracker.Api.Services;

/// <summary>
/// How long some titles take and how long you took, added up — by the rules a column's header
/// states, and in the one place both of the things that add them up go through: a board column
/// over its titles, and the Stats page over a year's finishes.
///
/// <para>
/// <b>A title with no figure is left out and counted, never added as nought</b>, so each sum
/// comes with how many titles it is over and is null rather than zero over none. <b>The
/// comparison is over the titles that have both figures</b>, or a game with no hours logged reads
/// as you having been quick. Added up in C# rather than SQL, whose <c>SUM</c> answers nought for
/// nothing — which is the first rule broken.
/// </para>
///
/// <para>
/// <b>What each count leaves out can be named too</b>, which a column of your board does: the
/// titles with no figure, and the timed ones without your hours. They are the rest of the same two
/// partitions the sums are over, so a list is exactly the titles its count is over and the two
/// cannot disagree, and a title with neither figure is in the first alone, as the counts have it.
/// </para>
/// </summary>
internal static class HoursTally
{
    /// <summary>
    /// The sums, naming nothing they leave out: what the Stats page says about a year's finishes,
    /// which are passes rather than titles, so a game finished twice would be named twice.
    /// </summary>
    /// <param name="titles">Each title's length as its card prints it, and your hours on it.</param>
    public static ColumnHours Of(IEnumerable<(decimal? Length, decimal? Played)> titles) =>
        Of(titles, title => title.Length, title => title.Played, named: null);

    /// <summary>
    /// The sums, and the titles each count leaves out when <paramref name="named"/> says how to
    /// name one: what a column of your board says.
    /// </summary>
    /// <param name="titles">In the order a list should name them.</param>
    /// <param name="length">A title's length as its card prints it.</param>
    /// <param name="played">Your hours on it.</param>
    /// <param name="named">A title as a list names it, or null for no lists at all.</param>
    public static ColumnHours Of<T>(
        IEnumerable<T> titles,
        Func<T, decimal?> length,
        Func<T, decimal?> played,
        Func<T, LeftOutTitleDto>? named)
    {
        var all = titles.ToList();
        var timed = all.Where(title => length(title) is not null).ToList();
        var compared = timed.Where(title => played(title) is not null).ToList();

        return new ColumnHours(
            Length: timed.Count == 0 ? null : timed.Sum(title => length(title)!.Value),
            LengthTitles: timed.Count,
            Played: compared.Count == 0 ? null : compared.Sum(title => played(title)!.Value),
            PlayedLength: compared.Count == 0 ? null : compared.Sum(title => length(title)!.Value),
            PlayedTitles: compared.Count,
            WithoutLength: named is null
                ? null
                : [.. all.Where(title => length(title) is null).Select(named)],
            WithoutPlayed: named is null
                ? null
                : [.. timed.Where(title => played(title) is null).Select(named)]);
    }
}
