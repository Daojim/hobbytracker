namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A page of your board's rows, and what the column's header says about all of them.
///
/// <para>
/// <b>The hours are the whole column's, and the items are one page of it.</b> A column is paged
/// at <see cref="Paging.MaxPageSize"/>, and a header that added up the page it was handed would
/// disagree with its own count the day a column passed that.
/// </para>
///
/// <para>
/// <b>On the column's response rather than a route of its own</b>, so nothing has to remember
/// it: every move, add, remove and drawer write already refreshes the column, and the header
/// comes with it. The phone's switcher reads every column's answer to count them, so it has
/// these too without asking again.
/// </para>
/// </summary>
public sealed record LibraryPage(
    IReadOnlyList<LibraryItemDto> Items,
    int Total,
    int Page,
    int PageSize,
    ColumnHours Hours) : PagedResult<LibraryItemDto>(Items, Total, Page, PageSize);

/// <summary>
/// How long a column's titles take, and how long you took over the ones you logged hours for.
///
/// <para>
/// <b>A title with no figure is left out and counted, never added as nought</b>, which would
/// claim it takes no time. So each sum comes with how many titles it is over, and is null rather
/// than zero when that is none: a header with nothing to say prints nothing, which is not the
/// same as printing "0 h".
/// </para>
/// </summary>
public sealed record ColumnHours(
    /// <summary>
    /// <see cref="LibraryItemDto.LengthHours"/>, the figure each card prints, added up over the
    /// column's titles that have one. For a game that is HowLongToBeat's All Styles figure. Null
    /// when no title has one.
    /// </summary>
    decimal? Length,

    /// <summary>
    /// How many titles <see cref="Length"/> is over. The rest of the column has no figure.
    /// </summary>
    int LengthTitles,

    /// <summary>
    /// Your hours, added up over the titles that have both your hours and a length. From each
    /// title's current pass, the one its card shows, like everything else on the row. Null when
    /// no title has both.
    /// </summary>
    decimal? Played,

    /// <summary>
    /// The lengths of those same titles, added up: what <see cref="Played"/> is read against.
    /// Over the same titles or it is not a comparison, which is why this is not
    /// <see cref="Length"/>.
    /// </summary>
    decimal? PlayedLength,

    /// <summary>
    /// How many titles <see cref="Played"/> and <see cref="PlayedLength"/> are over.
    /// </summary>
    int PlayedTitles);
