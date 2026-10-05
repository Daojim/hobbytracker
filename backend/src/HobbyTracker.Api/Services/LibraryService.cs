using System.Linq.Expressions;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

/// <summary>What happened when a title was put on the board from a tile.</summary>
public enum AddToBoardOutcome
{
    /// <summary>No title with that media id.</summary>
    NoSuchTitle,

    /// <summary>
    /// You have a pass against it already, in some column. Nothing is written: a second pass
    /// here would be a replay nobody made.
    /// </summary>
    AlreadyOnBoard,

    Added,
}

public interface ILibraryService
{
    Task<LibraryPage> ListAsync(
        string? hobby,
        LogStatus? status,
        int? year,
        LibrarySort sort,
        LibraryPartition partition,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken);

    /// <summary>
    /// The release calendar: your Backlog entries whose title is not out yet, nearest first and
    /// the undated last.
    ///
    /// A read of the same rows the Backlog column answers with, not a place of its own — which
    /// is what makes a title arrive in Backlog on release day with no job having run anywhere.
    /// </summary>
    Task<IReadOnlyList<LibraryItemDto>> UpcomingAsync(
        string? hobby, CancellationToken cancellationToken);

    /// <summary>
    /// A Backlog column as the board draws it, oldest first, with when each title arrived in it —
    /// what the Stats page lists as waiting.
    ///
    /// The one read here whose owner the caller names, because the Stats page has two readers:
    /// you, and a share of your board, which passes its token's owner. See <see cref="IStatsService"/>.
    /// </summary>
    Task<IReadOnlyList<BacklogTitleDto>> BacklogAsync(
        int ownerId, string? hobby, CancellationToken cancellationToken);

    /// <summary>
    /// Everything on your board, for the spreadsheet: every title in every column, the
    /// calendar's included, with every pass of yours and every note — in the board's order.
    /// </summary>
    Task<IReadOnlyList<ExportTitleDto>> ExportAsync(
        string? hobby, CancellationToken cancellationToken);

    Task<bool> HobbyExistsAsync(string hobby, CancellationToken cancellationToken);

    /// <summary>
    /// Years in which anything was started or finished, newest first — the picker's options.
    /// </summary>
    Task<IReadOnlyList<int>> ActivityYearsAsync(string? hobby, CancellationToken cancellationToken);

    /// <summary>Moves a title to a board column. Null when it has never been logged.</summary>
    Task<LibraryItemDto?> TransitionAsync(
        int mediaId, LogStatus target, CancellationToken cancellationToken);

    /// <summary>
    /// Puts a title on your board, in a column — what a tile's +, ▶ and ✓ do. The card comes
    /// back with <see cref="AddToBoardOutcome.Added"/> and is null otherwise.
    ///
    /// A move from nowhere: the first pass is built exactly as a drag out of Completed builds a
    /// replay, so it lands on top of its column with the dates a drag into it would have given.
    /// </summary>
    Task<(AddToBoardOutcome Outcome, LibraryItemDto? Item)> AddToBoardAsync(
        int mediaId, LogStatus status, CancellationToken cancellationToken);

    /// <summary>
    /// Takes a title off your board by deleting every pass of yours against it — what
    /// <em>Remove from board</em> does. False when you have never logged it.
    ///
    /// Every pass rather than the current one, which is what this did before and what made
    /// removing a replayed title take one press per playthrough. Deleting a single named pass is
    /// the drawer's job, through the log-entry endpoint, where the pass is on screen with its
    /// dates; a board card is one row per title and cannot say which pass you meant.
    /// </summary>
    Task<bool> RemoveFromBoardAsync(int mediaId, CancellationToken cancellationToken);

    Task ReorderAsync(ReorderRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// What a share may read of its owner's board: a column, the calendar and the years.
///
/// <para>
/// <b>Every method takes the owner, and none of them asks <see cref="ICurrentUser"/>.</b> A share
/// is read by nobody in particular, and a read scoped to whoever is visiting would answer with the
/// visitor's board — or, for a visitor signed in to nothing, throw. The share's controller passes
/// its token's owner, where everybody can see it.
/// </para>
///
/// <para>
/// <b>An interface of its own</b>, so the controller holding it can reach nothing else here:
/// no write, and no read that acts as whoever is signed in. And <b>no card carries a note</b>,
/// because a note is the journal, and a share is the board.
/// </para>
/// </summary>
public interface ISharedLibrary
{
    /// <summary>One column of the owner's board, as their board draws it, less the note.</summary>
    Task<LibraryPage> ColumnAsync(
        int ownerId,
        string hobby,
        LogStatus status,
        int? year,
        LibrarySort sort,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken);

    /// <summary>The owner's release calendar, as their board draws it, less the note.</summary>
    Task<IReadOnlyList<LibraryItemDto>> UpcomingAsync(
        int ownerId, string hobby, CancellationToken cancellationToken);

    /// <summary>
    /// The board's years by the board's rule, counted from <paramref name="columns"/> alone: a
    /// year only an unshared column has anything in is not one the share has to show.
    /// </summary>
    Task<IReadOnlyList<int>> YearsAsync(
        int ownerId,
        string hobby,
        IReadOnlySet<LogStatus> columns,
        CancellationToken cancellationToken);
}

/// <summary>
/// Your collection: titles you have logged something against.
///
/// Deliberately not "everything in the media table". Searching IGDB upserts every result as a
/// side effect, so `media` accumulates whatever has ever been typed into a search box. Joining
/// to log_entries is what separates the catalog from the collection.
///
/// <para>
/// <b>Whose board is said at every read</b>: <see cref="BoardQuery"/> takes its owner, and the
/// methods for the signed-in pass <c>user.Id</c> where the eye can find it. A share's reads, which
/// are <see cref="ISharedLibrary"/>'s, pass the owner they are handed instead.
/// </para>
/// </summary>
public sealed class LibraryService(
    HobbyTrackerDbContext db,
    IJournalClock clock,
    ICurrentUser user,
    IEnumerable<IMediaAdded> mediaAdded,
    ILogger<LibraryService> logger) : ILibraryService, ISharedLibrary
{
    /// <summary>
    /// How much of a note reaches a card.
    ///
    /// A note may be 4000 characters and a board is up to five columns of a hundred rows, so
    /// uncapped this would make the board response scale with how much somebody writes. It is
    /// comfortably more than two lines can hold at the widest card and the loosest density, so
    /// the cut a reader actually sees is always the client's line-clamp and never this one —
    /// which is what lets that clamp answer to the card's width, as a character count cannot.
    /// </summary>
    public const int NotePreviewLength = 200;

    /// <summary>
    /// A title on the board, with the entry that decides which column it sits in.
    ///
    /// Deliberately assigned member by member rather than through a constructor. EF Core can
    /// decompose a member-init projection and push later Where/OrderBy clauses down into SQL;
    /// a positional record is opaque to it, and every filter on <c>Latest</c> fails to
    /// translate.
    /// </summary>
    private sealed class BoardRow
    {
        public Media Media { get; set; } = null!;
        public string HobbyName { get; set; } = null!;
        public int EntryCount { get; set; }
        public LogEntry Latest { get; set; } = null!;
    }

    public Task<bool> HobbyExistsAsync(string hobby, CancellationToken cancellationToken) =>
        db.Hobbies.AnyAsync(h => h.Name == hobby, cancellationToken);

    /// <summary>
    /// How many titles the calendar will answer with before it stops.
    ///
    /// Generous rather than paged, because a person's list of things they are waiting for is
    /// tens — which is what lets the client show the first twenty and reveal the rest from the
    /// same response rather than fetching again. <c>ActivityYearsAsync</c> leans on the same
    /// scale argument.
    /// </summary>
    private const int UpcomingCap = 200;

    public Task<IReadOnlyList<LibraryItemDto>> UpcomingAsync(
        string? hobby, CancellationToken cancellationToken) =>
        CalendarAsync(user.Id, LatestNoteOf(user.Id), hobby, cancellationToken);

    Task<IReadOnlyList<LibraryItemDto>> ISharedLibrary.UpcomingAsync(
        int ownerId, string hobby, CancellationToken cancellationToken) =>
        CalendarAsync(ownerId, NoNote, hobby, cancellationToken);

    /// <summary>
    /// The calendar, straight through the column's own read rather than a projection of its own.
    /// The two terminal projections already have to agree field for field, and a third copy of
    /// them is how that quietly stops being true.
    /// </summary>
    private async Task<IReadOnlyList<LibraryItemDto>> CalendarAsync(
        int ownerId,
        Expression<Func<BoardRow, string?>> note,
        string? hobby,
        CancellationToken cancellationToken)
    {
        var page = await PageAsync(
            ownerId,
            note,
            hobby,
            LogStatus.Backlog,
            year: null,
            LibrarySort.Manual,
            LibraryPartition.Upcoming,
            page: 1,
            pageSize: UpcomingCap,
            cancellationToken);

        return page.Items;
    }

    public async Task<IReadOnlyList<BacklogTitleDto>> BacklogAsync(
        int ownerId, string? hobby, CancellationToken cancellationToken)
    {
        // The column exactly as the board draws it, through the board's own query: the current
        // pass decides the column, and the titles waiting on the release calendar are not in it.
        // Unpaged, because the whole column is the answer and a backlog is hundreds at most.
        //
        // Whichever owner the caller names: you, from your own Stats page, or a share's owner
        // from theirs. Nothing here is written, and nothing here is a note.
        var titles = await Filtered(
                BoardQuery(ownerId).AsNoTracking(), hobby, LogStatus.Backlog, year: null,
                LibraryPartition.Default, clock.Today)
            .Select(row => new BacklogTitleDto(
                row.Media.Id,

                // The name a card leads with, as both board projections build it. A third copy of
                // that coalesce, terminal like the others and so nowhere near BoardQuery.
                (row.Media as Anime)!.EnglishTitle ?? row.Media.Title,

                row.Media.CoverUrl,
                row.Latest.LoggedAt,

                // When it last arrived in Backlog: the pass's latest row in the column history,
                // if that row says Backlog. The latest row and not the latest Backlog row —
                // when the last move the history knows of went somewhere else, a write around the
                // recorder brought it back, and an older arrival would claim a wait that was
                // interrupted. Null for a pass with no rows, which is one made before recording
                // began on 1 October 2026 and never moved since.
                db.StatusChanges
                    .Where(change => change.LogEntryId == row.Latest.Id)
                    .OrderByDescending(change => change.ChangedAt)
                    .ThenByDescending(change => change.Id)
                    .Select(change => change.ToStatus == LogStatus.Backlog
                        ? (DateTimeOffset?)change.ChangedAt
                        : null)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);

        // Oldest first, by the best date there is for each.
        return
        [
            .. titles
                .OrderBy(title => title.InBacklogSince ?? title.LoggedAt)
                .ThenBy(title => title.MediaId),
        ];
    }

    public async Task<IReadOnlyList<ExportTitleDto>> ExportAsync(
        string? hobby, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // Every title on your board, through the board's own query with no column and no year
        // named: nothing the board can narrow is narrowed, and the release partition — which
        // applies only where a column is named — leaves the calendar's titles in. Which columns a
        // browser has taken off in Settings the server never knew. Unpaged, because the whole
        // board is the answer; a column stops at a page, and this must not.
        //
        // In the order the board ranks a column by hand, through the very arm it ranks one with.
        // The column order itself is the client's — BOARD_STATUSES — so it lays these out column
        // by column, and within a column they arrive already in place.
        var titles = await Sorted(
                Filtered(
                    BoardQuery(userId).AsNoTracking(), hobby, status: null, year: null,
                    LibraryPartition.Default, clock.Today),
                LibrarySort.Manual)
            .Select(row => new
            {
                row.Media.Id,

                // The name a card leads with and the genres it is painted from, as both board
                // projections build them — copies, terminal like those, and so nowhere near
                // BoardQuery. Every_hobbys_title_is_named_and_painted_as_its_card_is holds the
                // copies to the board's answer.
                Title = (row.Media as Anime)!.EnglishTitle ?? row.Media.Title,
                Genres = (row.Media as Game)!.Genres ?? (row.Media as Movie)!.Genres
                    ?? (row.Media as TvShow)!.Genres ?? (row.Media as Anime)!.Genres,
                PrimaryGenre = (row.Media as Game)!.PrimaryGenre ?? (row.Media as Movie)!.PrimaryGenre
                    ?? (row.Media as TvShow)!.PrimaryGenre ?? (row.Media as Anime)!.PrimaryGenre,

                // What the games sheet prints and a card does not. A game's alone: the LEFT JOIN
                // behind the downcast answers null for any other hobby, which is what the
                // contract says rather than an empty list.
                (row.Media as Game)!.Developers,

                // Straight off `media`, as both projections read them. A day and how precisely
                // it was announced; the client decides what each reads as.
                row.Media.ReleaseDate,
                row.Media.ReleasePrecision,

                (row.Media as Game)!.HltbMainStoryHours,
                (row.Media as Game)!.HltbMainExtraHours,
                (row.Media as Game)!.HltbCompletionistHours,
                (row.Media as Game)!.HltbAllStylesHours,
                (row.Media as Game)!.HltbId,
            })
            .ToListAsync(cancellationToken);

        var onBoard = titles.Select(title => title.Id).ToList();

        // Every pass of yours against them, notes and all. Yours, and it has to say so here: the
        // titles are shared, so a pass query keyed on the media ids alone reaches a stranger's
        // replays of the same game — and puts one first when it is the newest.
        //
        // logged_at DESC, id DESC, the rule BoardQuery's Latest decides "current" by, so a
        // title's first pass is the one its card shows and the sheet's row for it agrees with the
        // board. One more site that orders a title's passes and has to agree with the others;
        // A_titles_first_pass_is_the_one_its_card_shows is what says this one does.
        var passes = await db.LogEntries
            .AsNoTracking()
            .Include(entry => entry.Media)
            .Include(entry => entry.Notes)
            .Where(entry => entry.UserId == userId && onBoard.Contains(entry.MediaId))
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id)
            .ToListAsync(cancellationToken);

        // A lookup keeps each title's passes in the order they were read in.
        var passesOf = passes.ToLookup(entry => entry.MediaId);

        return
        [
            .. titles.Select(title => new ExportTitleDto(
                title.Id,
                title.Title,
                title.Genres,
                title.PrimaryGenre,
                title.Developers,
                title.ReleaseDate,
                title.ReleasePrecision,
                title.HltbMainStoryHours,
                title.HltbMainExtraHours,
                title.HltbCompletionistHours,
                title.HltbAllStylesHours,
                title.HltbId,

                // The journal's own shape for a pass, which also puts each pass's notes newest
                // first — the one place that ordering is written down.
                [.. passesOf[title.Id].Select(LogEntryDto.From)])),
        ];
    }

    public Task<LibraryPage> ListAsync(
        string? hobby,
        LogStatus? status,
        int? year,
        LibrarySort sort,
        LibraryPartition partition,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken) =>
        PageAsync(
            user.Id, LatestNoteOf(user.Id), hobby, status, year, sort, partition, page, pageSize,
            cancellationToken);

    Task<LibraryPage> ISharedLibrary.ColumnAsync(
        int ownerId,
        string hobby,
        LogStatus status,
        int? year,
        LibrarySort sort,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken) =>
        // The board's own read of the column, for the owner the share names, with the note slot
        // filled by nothing. The default partition, so a title waiting on the calendar is off the
        // column here exactly as it is on the owner's board.
        PageAsync(
            ownerId, NoNote, hobby, status, year, sort, LibraryPartition.Default, page, pageSize,
            cancellationToken);

    /// <summary>
    /// A page of one owner's board and the hours its header says over the whole column: what a
    /// column of your board is, and a column of a share of it, each carrying the note it is handed.
    /// </summary>
    private async Task<LibraryPage> PageAsync(
        int ownerId,
        Expression<Func<BoardRow, string?>> note,
        string? hobby,
        LogStatus? status,
        int? year,
        LibrarySort sort,
        LibraryPartition partition,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken)
    {
        var (normalisedPage, normalisedSize) = Paging.Normalise(page, pageSize);

        var query = Filtered(
            BoardQuery(ownerId).AsNoTracking(), hobby, status, SpanOf(year), partition, clock.Today);

        var total = await query.CountAsync(cancellationToken);

        // Over the filtered column and before the page is cut, as the count above is: the header
        // has to agree with the column, not with the hundred cards a page holds.
        var hours = await HoursOfAsync(query, cancellationToken);

        var items = await Ordered(query, sort, partition)
            .Skip((normalisedPage - 1) * normalisedSize)
            .Take(normalisedSize)
            .Select(CardsWith(note))
            .ToListAsync(cancellationToken);

        return new LibraryPage(items, total, normalisedPage, normalisedSize, hours);
    }

    /// <summary>
    /// A board row as the card it is drawn as, with the card's note left for the caller to say.
    ///
    /// <para>
    /// <b>One projection for your board and for a share of it</b>, so the two cannot drift: a share
    /// shows a stranger the board its owner sees, less one field. That field is handed in as an
    /// expression rather than chosen by a condition in here, because a condition is a <c>CASE</c>
    /// around the subquery and the subquery still goes to the database: a share would read every
    /// note and then throw it away. Handed <see cref="NoNote"/>, the slot is a constant and the SQL
    /// never names <c>notes</c> at all.
    /// </para>
    ///
    /// <para>
    /// The note is spliced in by swapping the lambda's second parameter for the note's body, which
    /// is <c>ReleaseWindow.NotOutOn</c>'s trick: EF Core cannot translate an <c>Invoke</c>, and
    /// what it is handed here is the very tree the projection was when the note was written inline.
    /// </para>
    /// </summary>
    private static Expression<Func<BoardRow, LibraryItemDto>> CardsWith(
        Expression<Func<BoardRow, string?>> note)
    {
        Expression<Func<BoardRow, string?, LibraryItemDto>> card =
            (row, latestNote) => new LibraryItemDto(
                row.Media.Id,

                // Which of a title's two names leads, for the one hobby that has two.
                //
                // The English one, because it is what a person here calls the thing — and the
                // romaji one under it, because it is what MAL matched on and what you would
                // type to find it again. media.title is untouched and still holds the romaji:
                // this pair is a reading order, not a second place a title is stored.
                //
                // The coalesce is what makes the missing half harmless, and it is doing two
                // jobs. MAL leaves the English title off a great many entries, so the heading
                // falls back to the one name there is; and three hobbies have no such idea at
                // all, so the LEFT JOIN behind the downcast answers null and they fall back
                // too. Without it, every other board's headings would be empty.
                //
                // Sorted's Title arm repeats this expression and must keep agreeing with it:
                // a column filed alphabetically under a name that is nowhere on screen reads
                // as a sort that is simply broken.
                (row.Media as Anime)!.EnglishTitle ?? row.Media.Title,

                // The second line, which is the *other* name and only when there is one. Null
                // when MAL has no English title, because the one name it has is already the
                // heading and printing it twice is what the card refuses further along.
                (row.Media as Anime)!.EnglishTitle == null ? null : row.Media.Title,

                row.Media.CoverUrl,
                row.HobbyName,
                row.Latest.Status,
                row.EntryCount,
                row.Latest.Rating,
                row.Latest.CompletedAt ?? row.Latest.StartedAt,
                // TPT downcasts, added here rather than in BoardQuery on purpose: that
                // projection is what every Where and OrderBy on Latest is pushed through, and
                // when one stops translating the symptom is an empty library rather than an
                // error. This is terminal, so nothing filters on it afterwards.
                //
                // One coalesce per hobby that has something to say. The LEFT JOIN behind each
                // downcast answers null for a row of the other kind, which is what makes ??
                // the whole of the dispatch — there is no hobby predicate here and there should
                // not be one.
                (row.Media as Game)!.Genres ?? (row.Media as Movie)!.Genres
                    ?? (row.Media as TvShow)!.Genres ?? (row.Media as Anime)!.Genres,
                (row.Media as Game)!.PrimaryGenre ?? (row.Media as Movie)!.PrimaryGenre
                    ?? (row.Media as TvShow)!.PrimaryGenre ?? (row.Media as Anime)!.PrimaryGenre,

                // How long the title takes, whichever hobby is answering: HowLongToBeat's
                // headline figure for a game, the runtime for a film. Rounded to the two places
                // a game's estimate is stored at, so both hobbies put the same shape on the
                // wire — and the client recovers the exact minute from it, because two decimal
                // places is at most 0.3 of a minute out.
                (row.Media as Game)!.HltbAllStylesHours
                    ?? ((row.Media as Movie)!.RuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Movie)!.RuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as TvShow)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as TvShow)!.TotalRuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as Anime)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Anime)!.TotalRuntimeMinutes ?? 0) / 60m, 2)),

                // Still to be asked about, which is what tells the card whether looking
                // again is worth anything. The type test is not decoration and it is not
                // "(row.Media as Game) != null" either — EF elides that one as always true
                // and the film comes back pending. "is Game" becomes the TPT join's own null
                // check, which is the question actually being asked. Without it an unqualified
                // "checked_at is null" calls every film pending for ever, and the movies board
                // would poll for an answer nobody is coming with.
                row.Media is Game && (row.Media as Game)!.HltbCheckedAt == null,


                // Where you are in a show, off the current pass like everything else on this
                // row except the preview below. Safe anywhere, unlike the coalesces above: these
                // come off Latest rather than through a TPT downcast, so nothing here can stop
                // translating and empty a board.
                row.Latest.SeasonNumber,
                row.Latest.EpisodeNumber,

                // The release window, straight off `media` — no downcast and no coalesce chain,
                // unlike Genres and LengthHours above. That is the point of the columns living
                // on the shared table: nothing here needs extending when a fifth hobby arrives,
                // and nothing here can stop translating and empty a board.
                row.Media.ReleaseDate,
                row.Media.ReleaseEnd,
                row.Media.ReleasePrecision,
                row.Media.ReleaseStatus,

                // The last thing written about this title, or nothing: the caller's to say. See
                // LatestNoteOf, which is a board's, and NoNote, which is a share's.
                latestNote);

        var row = card.Parameters[0];
        var spliced = new Rebind(note.Parameters[0], row).Visit(note.Body);

        return Expression.Lambda<Func<BoardRow, LibraryItemDto>>(
            new Rebind(card.Parameters[1], spliced).Visit(card.Body), row);
    }

    /// <summary>
    /// The last thing the owner wrote about a title, from <em>any</em> pass of theirs — what a card
    /// on their own board carries, and deliberately unlike every other field on it, all of which
    /// come from Latest. A replay begun this morning has nothing written on it yet, and what was
    /// said the first time round is still the last thing said about it.
    ///
    /// <para>
    /// <b>The <c>UserId</c> predicate is load-bearing rather than decorative.</b> Riding on Latest
    /// would have inherited BoardQuery's scoping for free; reaching every pass on a title reaches a
    /// <em>shared</em> title, so without it a stranger's journal prints on your card. Notes carry no
    /// user column of their own — they belong to whoever owns the pass they were written during —
    /// so this is a join, exactly as every query in NoteService is.
    /// </para>
    ///
    /// <para>
    /// In the terminal projection rather than in BoardQuery for the genre downcast's reason, and it
    /// matters more here: a subquery that fails to translate throws and names itself, where the
    /// same thing in BoardQuery would empty the board and say nothing at all.
    /// </para>
    /// </summary>
    private static Expression<Func<BoardRow, string?>> LatestNoteOf(int ownerId) =>
        row => row.Media.LogEntries
            .Where(entry => entry.UserId == ownerId)
            .SelectMany(entry => entry.Notes)
            .OrderByDescending(note => note.WrittenAt)
            .ThenByDescending(note => note.Id)
            .Select(note => note.Body.Length > NotePreviewLength
                ? note.Body.Substring(0, NotePreviewLength)
                : note.Body)
            .FirstOrDefault();

    /// <summary>
    /// What a share's cards carry: nothing, as a constant, so a share's SQL never reaches
    /// <c>notes</c>. A note is the journal, and a share is the board.
    /// </summary>
    private static readonly Expression<Func<BoardRow, string?>> NoNote = _ => null;

    /// <summary>
    /// What a column's header says about how long its titles take: the figure each card prints,
    /// added up, and your own hours against it over the titles that have both.
    ///
    /// <para>
    /// <b>Two numbers a title are read out here and added up by <see cref="HoursTally"/></b>,
    /// rather than summed in SQL: a column is a few hundred rows at most at the scale a personal
    /// catalogue reaches, and the rules read as what they are there. The Stats page adds up a
    /// year's finishes by the same ones.
    /// </para>
    /// </summary>
    private static async Task<ColumnHours> HoursOfAsync(
        IQueryable<BoardRow> column, CancellationToken cancellationToken)
    {
        var titles = await column
            .Select(row => new
            {
                // LengthHours, exactly as the two projections build it, rounding and all — the
                // fourth copy of this coalesce, after those two and Sorted's Length arm. A
                // shared expression would have saved one copy of the four: the projections
                // cannot reuse one without an Invoke, which EF cannot translate. So what holds
                // the copies together is a test per hobby instead, that the total is the sum of
                // what the cards print, as each hobby's length-sort test holds Sorted's. See
                // ColumnHoursTests. Rounded per title because the cards are: a total of
                // unrounded runtimes drifts from them by a fraction of a minute a title.
                //
                // TPT downcasts, so terminal and nowhere near BoardQuery, for the reason the
                // projections give.
                Length = (row.Media as Game)!.HltbAllStylesHours
                    ?? ((row.Media as Movie)!.RuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Movie)!.RuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as TvShow)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as TvShow)!.TotalRuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as Anime)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Anime)!.TotalRuntimeMinutes ?? 0) / 60m, 2)),

                // Off the current pass, the one the card shows, like every other field on the
                // row. Latest is already yours, so nobody else's hours can reach this.
                row.Latest.HoursPlayed,
            })
            .ToListAsync(cancellationToken);

        return HoursTally.Of(titles.Select(title => (title.Length, title.HoursPlayed)));
    }

    public Task<IReadOnlyList<int>> ActivityYearsAsync(
        string? hobby, CancellationToken cancellationToken) =>
        YearsOfAsync(user.Id, hobby, columns: null, cancellationToken);

    Task<IReadOnlyList<int>> ISharedLibrary.YearsAsync(
        int ownerId,
        string hobby,
        IReadOnlySet<LogStatus> columns,
        CancellationToken cancellationToken) =>
        YearsOfAsync(ownerId, hobby, columns, cancellationToken);

    /// <summary>
    /// The years one owner's board has anything in, counted from <paramref name="columns"/>, or
    /// from every column when that is null — a board's years, or a share's.
    /// </summary>
    private async Task<IReadOnlyList<int>> YearsOfAsync(
        int ownerId,
        string? hobby,
        IReadOnlySet<LogStatus>? columns,
        CancellationToken cancellationToken)
    {
        var rows = Filtered(
            BoardQuery(ownerId).AsNoTracking(), hobby, status: null, year: null,
            LibraryPartition.Default, clock.Today);

        // A share counts only the columns it shows. A year only Dropped has activity in would
        // otherwise be offered on a share without Dropped, and open on a board with nothing to
        // show for it. By the current pass, as the columns are drawn by it.
        if (columns is not null)
        {
            var shown = columns.ToList();
            rows = rows.Where(row => shown.Contains(row.Latest.Status));
        }

        // Both dates, off the same projection the columns filter on, so the picker can never
        // offer a year that turns out to be empty in every column at once.
        //
        // Completions alone was right while the year was the Completed column's own control,
        // and is not right now that Playing filters on a start: a year you began something in
        // and finished nothing in would be a year the columns handle perfectly well and the
        // picker has no way to ask for.
        var activity = await rows
            .Select(row => new { row.Latest.StartedAt, row.Latest.CompletedAt })
            .ToListAsync(cancellationToken);

        // The instants become years in C# rather than in SQL, by the clock's rule — see
        // IJournalClock.YearsOf, which the Stats page's years go through as well.
        return clock.YearsOf(activity.SelectMany(pass => new[] { pass.StartedAt, pass.CompletedAt }));
    }

    public async Task<LibraryItemDto?> TransitionAsync(
        int mediaId, LogStatus target, CancellationToken cancellationToken)
    {
        var latest = await LatestEntryFor(mediaId).FirstOrDefaultAsync(cancellationToken);
        if (latest is null)
        {
            // In the catalog but not on the board — there is no entry to move.
            return null;
        }

        if (latest.Status != target)
        {
            var now = clock.Now;

            if (latest.Status == LogStatus.Completed)
            {
                // Leaving Completed always starts a fresh entry rather than editing the old
                // one. This is what protects a 2024 playthrough when the same game is replayed
                // in 2026, and it is the entire reason the schema allows several entries per
                // title. Editing in place here would silently destroy the completion record.
                //
                // Yours, like the pass it replaces: LatestEntryFor above already refused
                // anybody else's, so this can only ever be a replay of your own.
                db.LogEntries.Add(await NewPassAsync(mediaId, target, now, cancellationToken));
            }
            else
            {
                latest.Status = target;
                ApplyTransitionTimestamps(latest, target, now);
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return await ItemAsync(mediaId, cancellationToken);
    }

    public async Task<(AddToBoardOutcome Outcome, LibraryItemDto? Item)> AddToBoardAsync(
        int mediaId, LogStatus status, CancellationToken cancellationToken)
    {
        // The catalogue is everyone's, so this is asked of nobody in particular.
        var media = await db.Media.FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken);
        if (media is null)
        {
            return (AddToBoardOutcome.NoSuchTitle, null);
        }

        // "On your board" is having a pass at all, in any column: the question a move asks
        // before it touches anything, scoped to you by the same query. Asked of the media row
        // alone, the first person to add a game would lock everybody else out of it.
        //
        // Refused rather than written. Only a stale tile gets here — another tab, or a list
        // loaded before the title went on — and a second pass would be a replay nobody made,
        // which on top of a 2024 completion reads as the game being started again.
        if (await LatestEntryFor(mediaId).AnyAsync(cancellationToken))
        {
            return (AddToBoardOutcome.AlreadyOnBoard, null);
        }

        db.LogEntries.Add(await NewPassAsync(mediaId, status, clock.Now, cancellationToken));
        await db.SaveChangesAsync(cancellationToken);

        // Reaching a board is what fetches a title's metadata, whichever column it lands in:
        // HowLongToBeat for a game, TMDB's detail for a film. After the write, so a provider
        // having a bad day cannot cost anybody the pass. See IMediaAdded.
        await mediaAdded.AnnounceAsync(media, logger, cancellationToken);

        return (AddToBoardOutcome.Added, await ItemAsync(mediaId, cancellationToken));
    }

    public async Task<bool> RemoveFromBoardAsync(int mediaId, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // Every pass of yours, and every pass of *only* yours. The title is shared — two people
        // searching "Hollow Knight" get the same media row — so a delete keyed on the media id
        // alone would empty a stranger's history of it in one request, with nothing to tell them
        // what happened.
        var mine = await db.LogEntries
            .Where(entry => entry.MediaId == mediaId && entry.UserId == userId)
            .ToListAsync(cancellationToken);

        if (mine.Count == 0)
        {
            // In the catalog but not on your board — there is nothing to take off it.
            return false;
        }

        // All of them, which is what "Remove from board" says and did not used to do. Deleting
        // only the current pass was defensible on paper and wrong in the hand: a title replayed
        // five times took five presses, and each one looked like a failure because the card
        // sprang back to whichever column the pass underneath was in.
        //
        // Deleting one pass at a time is still possible and is the drawer's job, where the pass
        // is named and its dates are on screen. A board card is one row per title and has no
        // way to say which pass you meant.
        //
        // The notes go too, by cascade, because a note belongs to the pass it was written
        // during. Nothing here has to know that.
        db.LogEntries.RemoveRange(mine);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task ReorderAsync(ReorderRequest request, CancellationToken cancellationToken)
    {
        // Only the entries that currently decide a card's place in *this* column. Anything the
        // caller listed that has since moved elsewhere simply is not here — a board loaded a
        // moment ago can legitimately be one drag out of date, and failing the whole request
        // over that would strand the user's reorder.
        // Default, so a reorder acts on the column as it is drawn: an unreleased title is on the
        // calendar rather than in the well, and is not one of the cards being dragged past.
        var inColumn = await Filtered(
                BoardQuery(user.Id), request.Hobby, request.Status, year: null,
                LibraryPartition.Default, clock.Today)
            .Where(row => request.MediaIds.Contains(row.Media.Id))
            .Select(row => new { MediaId = row.Media.Id, Entry = row.Latest })
            .ToListAsync(cancellationToken);

        if (inColumn.Count == 0)
        {
            return;
        }

        var rank = request.MediaIds
            .Select((mediaId, index) => (mediaId, index))
            .ToDictionary(pair => pair.mediaId, pair => pair.index);

        foreach (var row in inColumn)
        {
            row.Entry.Position = rank[row.MediaId];
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    // ------------------------------------------------------------------ internals

    /// <summary>
    /// One owner's board: every title they have logged, with the pass that decides its column.
    ///
    /// <para>
    /// <b>The owner is a parameter rather than read from the session in here</b>, so whose board a
    /// read is about is said at its call site: <c>user.Id</c> for the signed-in, and the token's
    /// owner for a share. A share that asked the session instead would answer with the visitor's
    /// board — and for a visitor signed in to nothing, <c>ICurrentUser.Id</c> throws, which is the
    /// backstop rather than the design.
    /// </para>
    /// </summary>
    private IQueryable<BoardRow> BoardQuery(int ownerId)
    {
        // All three reaches into log_entries below carry the predicate, and all three have to.
        // Scoping only the first would leave EntryCount counting strangers' replays and Latest
        // able to pick a stranger's entry — and Latest is what decides the column, so the
        // symptom would be your own Backlog title sitting under Completed.
        return db.Media
            // One row per title however many times it has been logged. A plain join to
            // log_entries would return a replayed game once per playthrough.
            .Where(media => media.LogEntries.Any(entry => entry.UserId == ownerId))
            .Select(media => new BoardRow
            {
                Media = media,
                HobbyName = media.Hobby!.Name,
                EntryCount = media.LogEntries.Count(entry => entry.UserId == ownerId),

                // "Current" state comes from the most recent entry: a replay under way beats an
                // old completion. Ordering is logged_at DESC, id DESC: a pass is current because
                // it was recorded most recently, not because it happens to carry a date.
                //
                // This used to prefer a dated entry over an undated one, which read well and was
                // wrong. Leaving Completed for Backlog or Dropped writes an entry with no dates
                // by rule, so it could never outrank the completion it replaced — the card
                // sprang back to Completed and every retry added another orphan entry.
                //
                // logged_at is server-stamped on every insert and NOT NULL with a now() default,
                // so it is always there to order by. The id breaks ties, which is not a detail:
                // several entries written in the same instant is exactly what a test fixture on
                // a stopped clock produces.
                //
                // EF turns this nested First() into a LATERAL join rather than N queries.
                //
                // Kept in step with LatestEntryFor below and with GameCatalogService.GetAsync:
                // if they disagree, the board moves one entry and then displays a different one.
                // That now includes agreeing about whose entries are in scope.
                Latest = media.LogEntries
                    .Where(entry => entry.UserId == ownerId)
                    .OrderByDescending(entry => entry.LoggedAt)
                    .ThenByDescending(entry => entry.Id)
                    .First(),
            });
    }

    /// <summary>
    /// The entry the board considers current, as a tracked entity. Must order identically to
    /// the projection in <see cref="BoardQuery"/> and to the entry list in
    /// <c>GameCatalogService.GetAsync</c>, and must agree with them about whose entries count.
    ///
    /// This one feeds two mutating paths addressed by media id alone — a transition and a close
    /// — so leaving it unscoped would not be a leak but an edit to somebody else's board.
    /// </summary>
    private IQueryable<LogEntry> LatestEntryFor(int mediaId)
    {
        var userId = user.Id;

        return db.LogEntries
            .Where(entry => entry.MediaId == mediaId && entry.UserId == userId)
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id);
    }

    /// <summary>The instants a year asked for spans here, or null for every year.</summary>
    private YearSpan? SpanOf(int? year) => year is { } chosen ? clock.SpanOf(chosen) : null;

    private static IQueryable<BoardRow> Filtered(
        IQueryable<BoardRow> query,
        string? hobby,
        LogStatus? status,
        YearSpan? year,
        LibraryPartition partition,
        DateOnly today)
    {
        if (!string.IsNullOrWhiteSpace(hobby))
        {
            query = query.Where(row => row.HobbyName == hobby);
        }

        if (status is { } wanted)
        {
            // Filters on current status, not "has ever been". A game completed in 2024 and
            // being replayed now belongs under InProgress, and must not also appear under
            // Completed.
            query = query.Where(row => row.Latest.Status == wanted);

            // And only then, because the release partition is a fact about *one* column. See
            // ByRelease, which holds why putting it any higher breaks the search strip.
            query = ByRelease(query, status, partition, today);
        }

        if (year is { } span)
        {
            query = InYear(query, status, span);
        }

        return query;
    }


    /// <summary>
    /// Splits the Backlog column from the release calendar — and does so <b>only</b> on Backlog.
    ///
    /// <para>
    /// <b>Why it is here, inside the status branch, rather than beside the hobby filter above.</b>
    /// Filtered also runs with no status named: <c>ActivityYearsAsync</c>, <c>ReorderAsync</c>
    /// and the un-statused <c>GET /api/library</c> all go through it, and that last one is what
    /// <c>libraryMediaIds()</c> pages through to build the search strip's "On your board" set.
    /// Narrow that and an unreleased title drops out of it, the strip offers to add a title you
    /// already have, and the second press writes a second Backlog entry the card renders as a
    /// replay that never happened. Nobody would trace that symptom back to this line.
    /// </para>
    ///
    /// <para>
    /// <b>And why it carries no hobby condition.</b> A film's <c>release_precision</c> is null
    /// for ever — TMDB never writes one — so the first clause below leaves the movies board
    /// exactly as it was. That is what makes "no branch on the hobby slug" true on the server by
    /// construction rather than by discipline: whether a hobby has a calendar is decided by
    /// whether anything fills its columns, not by a list of slugs. The flag in
    /// <c>frontend/src/hobbies/</c> only decides whether the section renders.
    /// </para>
    /// </summary>
    private static IQueryable<BoardRow> ByRelease(
        IQueryable<BoardRow> query, LogStatus? status, LibraryPartition partition, DateOnly today)
    {
        // Every other column holds titles you have already started. Whether those are out is
        // not a question worth asking, and asking it would hide an early build somebody is
        // deliberately recording.
        if (status != LogStatus.Backlog)
        {
            return query;
        }

        // The app's one definition of "not out yet", re-pointed at the row rather than restated
        // for it. The nightly sweep asks the database this very same question.
        var notOut = ReleaseWindow.NotOutOn<BoardRow>(today, row => row.Media);

        // And the two halves negate that one expression rather than stating two, which is the
        // point: a second hand-written predicate is free to drift, and a title that fell into
        // both the column and the calendar — or into neither — is the failure this pairing
        // exists to make impossible. `A board row is on exactly one side of the release line`
        // pins it.
        return partition == LibraryPartition.Upcoming
            ? query.Where(notOut)
            : query.Where(ReleaseWindow.Not(notOut));
    }

    /// <summary>
    /// Narrows a column to one calendar year, on the date that column is actually about.
    ///
    /// The year used to mean completed_at and nothing else, because it was the Completed
    /// column's own control and no other column asked. Board-wide it cannot stay that: Backlog
    /// and InProgress have their completion cleared by the very rules that put a title in them,
    /// so one predicate for all five would leave three columns permanently empty and read as a
    /// broken filter rather than a strict one.
    ///
    /// Every comparison is a half-open range of instants, never EXTRACT(year FROM …).
    /// date_part on a timestamptz reads the session's timezone, so that query would answer
    /// differently depending on how the connection happened to be opened — and a game finished
    /// at 8pm on New Year's Eve would count towards the following year. A title whose relevant
    /// date is null belongs to no year, and shows up only when none is asked for.
    /// </summary>
    private static IQueryable<BoardRow> InYear(
        IQueryable<BoardRow> query, LogStatus? status, YearSpan span) => status switch
    {
        // Exempt, rather than answering with nothing. A Backlog entry has both timestamps
        // cleared by rule, so "my 2019 backlog" is not a question the data can answer — and the
        // useful behaviour is not an empty well but the queue you drag out of while reading a
        // past year.
        LogStatus.Backlog => query,

        // Exempt too, for the second half of Backlog's reason rather than the first. A title on
        // hold does carry a start, so the data could answer "paused in 2019" — but that is not
        // the question the column is for. It is a list you come back to, and narrowed on its
        // start it would lose everything paused since last year the first time anything was
        // logged in a new one, because the board opens on the latest year there is.
        //
        // Said out loud rather than left to the default arm below, which would answer "either
        // date" and look almost right. yearFor in frontend/src/board/keys.ts holds the client's
        // half of this; the two have to agree or a drag writes into a cache entry the column is
        // not reading.
        LogStatus.OnHold => query,

        // Begun in that year. The transition into this column clears completed_at, so a start
        // is the only date a title here has.
        LogStatus.InProgress => query.Where(row =>
            row.Latest.StartedAt != null
            && row.Latest.StartedAt >= span.From
            && row.Latest.StartedAt < span.To),

        // Finished in that year, pointedly not begun in it. A game started in 2019 and finished
        // in 2021 is a 2021 completion, and filing it under 2019 would make the year view
        // disagree with the sentence a person would say about it.
        LogStatus.Completed => query.Where(row =>
            row.Latest.CompletedAt != null
            && row.Latest.CompletedAt >= span.From
            && row.Latest.CompletedAt < span.To),

        // Dropped, and the whole library when no column is named: either date. Dropping leaves
        // the timestamps alone on purpose, so an abandoned title carries a start, a completion
        // from an earlier pass, or neither depending on where it was abandoned from. With no
        // column named there is no one date to prefer, and "active in that year" is the only
        // reading that does not quietly privilege one of the five.
        _ => query.Where(row =>
            (row.Latest.StartedAt != null
             && row.Latest.StartedAt >= span.From
             && row.Latest.StartedAt < span.To)
            || (row.Latest.CompletedAt != null
                && row.Latest.CompletedAt >= span.From
                && row.Latest.CompletedAt < span.To)),
    };

    /// <summary>
    /// The calendar's order: soonest first, and the titles nobody has announced a date for last.
    ///
    /// Not a <see cref="LibrarySort"/> member, because that enum is the per-column sort control's
    /// vocabulary and is mirrored by hand on the client. It needs <b>no downcast</b>, which is
    /// the dividend for putting these columns on <c>media</c> — <c>Title</c> and <c>Length</c>
    /// below both carry one.
    /// </summary>
    private static IQueryable<BoardRow> ByReleaseDate(IQueryable<BoardRow> query) => query
        .OrderBy(row => row.Media.ReleaseDate == null)
        .ThenBy(row => row.Media.ReleaseDate)
        .ThenBy(row => row.Media.Title);

    private static IQueryable<BoardRow> Ordered(
        IQueryable<BoardRow> query, LibrarySort sort, LibraryPartition partition) =>
        partition == LibraryPartition.Upcoming ? ByReleaseDate(query) : Sorted(query, sort);

    private static IQueryable<BoardRow> Sorted(IQueryable<BoardRow> query, LibrarySort sort) => sort switch
    {
        // Alphabetical on the name the card prints, which for an anime is MAL's English title
        // rather than the romaji one in media.title. The same coalesce the two projections
        // build Title from, for sort=length's reason exactly: a column ordered by a string
        // nobody can see reads as a sort that is broken rather than as one that disagrees.
        //
        // The downcast is confined to this arm and to Length, and never goes into BoardQuery —
        // there it would empty the whole board with no error, where here the worst case is this
        // one mode. Sorting_anime_by_title_orders_on_the_name_the_card_shows is what says so.
        LibrarySort.Title => query
            .OrderBy(row => (row.Media as Anime)!.EnglishTitle ?? row.Media.Title),

        LibrarySort.Added => query.OrderByDescending(row => row.Latest.Id),

        // Unrated last in both directions of the scale, rather than sorting as if they were 0.
        LibrarySort.Rating => query
            .OrderBy(row => row.Latest.Rating == null)
            .ThenByDescending(row => row.Latest.Rating),

        // Shortest first, on the same number the card prints, and that is the whole rule: a
        // column ordered by a figure nobody can see reads as broken. This used to order on main
        // story, which is what the card showed then; both moved to the headline All Styles
        // number together, and they have to keep moving together. LibraryItemDto.LengthHours is
        // what makes that cheap to keep true — the card and this arm read one field.
        //
        // A title with no figure sorts last, rather than as though nobody having timed it meant
        // it took no time.
        //
        // The downcast is confined to this one arm on purpose. BoardQuery is what every Where
        // and OrderBy is pushed through, so a downcast that failed to translate *there* would
        // empty the whole board; here the worst case is that this one mode breaks. See the
        // comment on BoardQuery, and the test that asserts this column comes back non-empty.
        // Ordered on the same coalesce the two projections build LengthHours from, so a column
        // cannot be sorted by a number its cards do not show. Not rounded here: rounding cannot
        // change an ordering, and leaving it out keeps the expression readable.
        LibrarySort.Length => query
            .OrderBy(row => (row.Media as Game)!.HltbAllStylesHours == null
                            && (row.Media as Movie)!.RuntimeMinutes == null
                            && (row.Media as TvShow)!.TotalRuntimeMinutes == null
                            && (row.Media as Anime)!.TotalRuntimeMinutes == null)
            .ThenBy(row => (row.Media as Game)!.HltbAllStylesHours
                           ?? (row.Media as Movie)!.RuntimeMinutes / 60m
                           ?? (row.Media as TvShow)!.TotalRuntimeMinutes / 60m
                           ?? (row.Media as Anime)!.TotalRuntimeMinutes / 60m),

        // Manual: the user's own ranking. Every other mode is a read-only view that leaves
        // Position untouched, which is why dragging is only offered in this one.
        _ => query.OrderBy(row => row.Latest.Position).ThenByDescending(row => row.Latest.Id),
    };

    /// <summary>
    /// A fresh pass on top of a column, carrying the dates a move into that column gives — what
    /// a replay out of Completed is, and what an add is.
    ///
    /// One builder for both, so the only difference between adding straight to Playing and
    /// adding to Backlog then dragging is which request did it. Always yours: whose pass this is
    /// comes from the session and never from the caller.
    /// </summary>
    private async Task<LogEntry> NewPassAsync(
        int mediaId, LogStatus status, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var pass = new LogEntry
        {
            MediaId = mediaId,
            UserId = user.Id,
            Status = status,
            LoggedAt = now,
            Position = await BoardPositions.TopOfColumnAsync(db, status, user.Id, cancellationToken),
        };

        ApplyTransitionTimestamps(pass, status, now);
        return pass;
    }

    private static void ApplyTransitionTimestamps(LogEntry entry, LogStatus target, DateTimeOffset now)
    {
        switch (target)
        {
            case LogStatus.Backlog:
                // Back in the queue means not started. A leftover start date would make the
                // year view claim the game was played.
                entry.StartedAt = null;
                entry.CompletedAt = null;

                // And where you were, for the same reason: a card back in the queue
                // still reading S3 E7 is the same lie a leftover start date is. The
                // other three arms leave it alone - dropping a show halfway is exactly
                // when where you got to is worth keeping.
                entry.SeasonNumber = null;
                entry.EpisodeNumber = null;
                break;

            case LogStatus.InProgress:
                // Only when absent: picking a dropped game back up must keep the day you
                // actually started it rather than resetting to today.
                entry.StartedAt ??= now;
                entry.CompletedAt = null;
                break;

            case LogStatus.OnHold:
                // Playing's rule exactly, because on hold is Playing with the controller put
                // down: started, not finished. A start already here is kept, so resuming in
                // September still says May; a title paused straight out of the queue has begun
                // by the time it lands here. Clearing the completion is what keeps the start
                // stamped beside it from landing after one, which would be a 500 from
                // ck_log_entries_timestamp_order on a request with nothing wrong with it.
                //
                // Where you were is left alone, as every arm but Backlog's leaves it: a show
                // paused at S2 E5 is exactly when S2 E5 is worth keeping.
                //
                // This arm has to exist. The switch has no default, so a status without one
                // compiles and silently stamps nothing — StatusTransitionTests' on-hold cases
                // are what say so.
                entry.StartedAt ??= now;
                entry.CompletedAt = null;
                break;

            case LogStatus.Completed:
                // Guards ck_log_entries_timestamp_order against a start moment in the future,
                // which is reachable by hand through PUT and would otherwise be a 500.
                entry.CompletedAt = entry.StartedAt is { } started && started > now
                    ? started
                    : now;
                break;

            case LogStatus.Dropped:
                // You did start it, and abandoning it does not undo that, so a start already
                // here is kept exactly as InProgress keeps one.
                //
                // A pass carrying none is given one, which is the half that is not obvious. The
                // alternative is not "no date": it is an entry belonging to no year at all, and
                // the board reads one year at a time — Dropped is narrowed by either timestamp,
                // so a title dragged straight out of the queue would leave the board entirely
                // and be findable only under All years. That reads as a drag that lost the game
                // rather than as a filter being strict. See InYear, and it agrees with what this
                // column is for: a game you picked up and gave up on.
                //
                // The completion is left alone either way, and is what a start falls back to
                // when one is there. A pass can carry a finish and no start — the drawer's form
                // writes every field, so a game being played can be given a completion date and
                // left without a beginning — and stamping "now" over that would put the start
                // after the finish, which ck_log_entries_timestamp_order refuses. That is a 500
                // on a request with nothing wrong with it, which is the same trap the Completed
                // arm above guards, facing the other way.
                entry.StartedAt ??= entry.CompletedAt is { } finished && finished < now
                    ? finished
                    : now;
                break;
        }
    }

    private async Task<LibraryItemDto?> ItemAsync(int mediaId, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        return await BoardQuery(userId)
            .AsNoTracking()
            .Where(row => row.Media.Id == mediaId)
            .Select(row => new LibraryItemDto(
                row.Media.Id,

                // As in ListAsync, coalesce and all — see the comment there for why the English
                // name leads and what the fallback is doing. This copy has to match for the
                // same reason Genres does: a drag answers with the row it just wrote.
                (row.Media as Anime)!.EnglishTitle ?? row.Media.Title,
                (row.Media as Anime)!.EnglishTitle == null ? null : row.Media.Title,

                row.Media.CoverUrl,
                row.HobbyName,
                row.Latest.Status,
                row.EntryCount,
                row.Latest.Rating,
                row.Latest.CompletedAt ?? row.Latest.StartedAt,
                // As in ListAsync, coalesce and all. This copy has to exist and has to match:
                // a transition answers with the row it just wrote and the board caches that, so
                // a field populated in one projection and null in the other flickers on a drag.
                (row.Media as Game)!.Genres ?? (row.Media as Movie)!.Genres
                    ?? (row.Media as TvShow)!.Genres ?? (row.Media as Anime)!.Genres,
                (row.Media as Game)!.PrimaryGenre ?? (row.Media as Movie)!.PrimaryGenre
                    ?? (row.Media as TvShow)!.PrimaryGenre ?? (row.Media as Anime)!.PrimaryGenre,
                (row.Media as Game)!.HltbAllStylesHours
                    ?? ((row.Media as Movie)!.RuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Movie)!.RuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as TvShow)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as TvShow)!.TotalRuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as Anime)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Anime)!.TotalRuntimeMinutes ?? 0) / 60m, 2)),

                // Still to be asked about, which is what tells the card whether looking
                // again is worth anything. The type test is not decoration and it is not
                // "(row.Media as Game) != null" either — EF elides that one as always true
                // and the film comes back pending. "is Game" becomes the TPT join's own null
                // check, which is the question actually being asked. Without it an unqualified
                // "checked_at is null" calls every film pending for ever, and the movies board
                // would poll for an answer nobody is coming with.
                row.Media is Game && (row.Media as Game)!.HltbCheckedAt == null,

                row.Latest.SeasonNumber,
                row.Latest.EpisodeNumber,

                // The release window, straight off `media` — no downcast and no coalesce chain,
                // unlike Genres and LengthHours above. That is the point of the columns living
                // on the shared table: nothing here needs extending when a fifth hobby arrives,
                // and nothing here can stop translating and empty a board.
                row.Media.ReleaseDate,
                row.Media.ReleaseEnd,
                row.Media.ReleasePrecision,
                row.Media.ReleaseStatus,

                // As in ListAsync, predicate and all. This copy has to exist: it is what a drag
                // or a menu move answers with, and a field arriving null here and populated on
                // the next refetch would flicker.
                row.Media.LogEntries
                    .Where(entry => entry.UserId == userId)
                    .SelectMany(entry => entry.Notes)
                    .OrderByDescending(note => note.WrittenAt)
                    .ThenByDescending(note => note.Id)
                    .Select(note => note.Body.Length > NotePreviewLength
                        ? note.Body.Substring(0, NotePreviewLength)
                        : note.Body)
                    .FirstOrDefault()))
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>
    /// Swaps one parameter for an expression throughout a tree — how <see cref="CardsWith"/>
    /// splices a card's note into the one projection, as <c>ReleaseWindow</c> re-points its
    /// predicate at a board row.
    /// </summary>
    private sealed class Rebind(ParameterExpression from, Expression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == from ? to : base.VisitParameter(node);
    }
}
