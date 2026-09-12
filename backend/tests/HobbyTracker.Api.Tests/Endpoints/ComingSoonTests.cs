using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The release calendar: your Backlog entries whose title is not out yet.
///
/// It is a <i>view</i> of Backlog rather than a place of its own — the same row, read two ways —
/// which is what makes "it moves to Backlog the day it comes out" need no job at all. The two
/// halves of that partition have to be exact complements, and most of what is below is checking
/// that a title cannot fall into both or into neither.
///
/// The stopped clock reads 15 September 2026, so "next year" below means 2027.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class ComingSoonTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task A_title_nobody_has_asked_IGDB_about_stays_in_the_backlog()
    {
        // The most important test here, and the one that stops a migration ruining a real
        // library. Every row that existed before the release columns arrived carries a null
        // precision, and null has to keep meaning "never asked" — which reads as released.
        //
        // Take the `ReleasePrecision != null` clause out of the predicate and this is the only
        // thing in the suite that notices: every existing user's Backlog column empties, with
        // no error and no log line.
        var mediaId = await GivenGameAsync("Never Asked About");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        (await BacklogAsync()).Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
        (await UpcomingAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_backlog_title_that_is_not_out_yet_is_on_the_calendar_and_not_in_the_column()
    {
        var mediaId = await GivenGameAsync("Silksong II");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        (await BacklogAsync()).Items.ShouldBeEmpty();

        var upcoming = await UpcomingAsync();
        upcoming.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
        upcoming[0].ReleaseDate.ShouldBe(new DateOnly(2027, 3, 12));
        upcoming[0].ReleasePrecision.ShouldBe(ReleasePrecision.Day);
    }

    [Fact]
    public async Task The_whole_library_still_carries_a_title_that_is_not_out_yet()
    {
        // The partition narrows the Backlog column and nothing else. Put it in Filtered
        // unconditionally and it also narrows the un-statused list — which is what
        // libraryMediaIds() pages through to build the search strip's "On your board" set.
        //
        // The symptom then is not an empty board. It is the strip offering to add a title you
        // already have, and the second press writing a second Backlog entry that the card
        // renders as a replay that never happened. Nobody would trace that back to here.
        var mediaId = await GivenGameAsync("Silksong II");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        var everything = await GetPageAsync("/api/library?hobby=games");

        everything.Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
    }

    [Fact]
    public async Task A_title_whose_window_has_passed_is_in_the_backlog_with_no_job_having_run()
    {
        // Requirement two, as an executable claim. Nothing writes anything and no worker runs:
        // the same row simply answers a different question once the day passes.
        var mediaId = await GivenGameAsync("Out Yesterday");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2026, 9, 14), ReleasePrecision.Day);

        (await BacklogAsync()).Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
        (await UpcomingAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_title_out_today_is_out()
    {
        // Pins the comparison at "the last possible day has arrived" rather than "has passed".
        // A game released this morning is playable this morning.
        var mediaId = await GivenGameAsync("Out Today");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2026, 9, 15), ReleasePrecision.Day);

        (await BacklogAsync()).Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
    }

    [Fact]
    public async Task A_title_announced_only_for_this_year_is_not_out_until_the_year_is()
    {
        // The window's last day is what decides, not its first. Compare on release_date instead
        // and every title announced for "2026" would appear in Backlog on 1 January, eleven
        // months before anybody could play it.
        var mediaId = await GivenGameAsync("Sometime This Year");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2026, 6, 1), ReleasePrecision.Year);

        (await BacklogAsync()).Items.ShouldBeEmpty();
        (await UpcomingAsync()).ShouldHaveSingleItem().ReleasePrecision.ShouldBe(ReleasePrecision.Year);
    }

    [Fact]
    public async Task A_title_nobody_has_announced_a_date_for_is_on_the_calendar_with_no_date()
    {
        // "Asked, and IGDB said TBD" — the third state, and the whole reason precision is
        // stored rather than inferred from the dates being null.
        var mediaId = await GivenGameAsync("The Elder Scrolls VI");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(mediaId, null, ReleasePrecision.Unknown);

        (await BacklogAsync()).Items.ShouldBeEmpty();

        var item = (await UpcomingAsync()).ShouldHaveSingleItem();
        item.ReleasePrecision.ShouldBe(ReleasePrecision.Unknown);
        item.ReleaseDate.ShouldBeNull();
    }

    [Fact]
    public async Task A_title_IGDB_says_people_are_already_playing_is_out_whatever_its_date_says()
    {
        // The provider's own word outranks the window. Without it a game IGDB still lists only
        // as "2026" sits in the calendar until New Year's Eve even though it shipped in March
        // and nobody has sharpened the entry.
        var mediaId = await GivenGameAsync("Inzoi");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(
            mediaId, new DateOnly(2027, 6, 1), ReleasePrecision.Year, ReleaseStatus.EarlyAccess);

        (await BacklogAsync()).Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
        (await UpcomingAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_cancelled_title_stays_on_the_calendar_however_its_date_reads()
    {
        // Silent Hills has an announced date in the past and is never coming. Letting the window
        // decide would put it in Backlog, which claims it shipped; dropping it would lose a
        // title somebody deliberately added. It stays, and the calendar says what happened.
        var mediaId = await GivenGameAsync("Silent Hills");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(
            mediaId, new DateOnly(2016, 6, 1), ReleasePrecision.Year, ReleaseStatus.Cancelled);

        (await BacklogAsync()).Items.ShouldBeEmpty();
        (await UpcomingAsync()).ShouldHaveSingleItem().ReleaseStatus.ShouldBe(ReleaseStatus.Cancelled);
    }

    [Fact]
    public async Task A_rumoured_title_stays_in_the_backlog_rather_than_the_calendar()
    {
        // The mirror of the case above, and it goes the other way. Cancelled and Rumored sat in
        // the same set until 12 September 2026, on the reading that neither is arriving on the
        // date it names. They are different claims: a cancelled title *was* announced and the
        // calendar is where you learn it is dead, where a rumour was never announced by anybody
        // who would know. Half-Life 3 on a calendar of things that are coming makes the calendar
        // mean less.
        //
        // Measured: IGDB marks 21 of its 53,096 undated titles Rumored, and they are exactly
        // Half-Life 3, The Last of Us Part III, BioShock 4 and their kind.
        var mediaId = await GivenGameAsync("Half-Life 3");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(mediaId, null, ReleasePrecision.Unknown, ReleaseStatus.Rumored);

        (await BacklogAsync()).Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
        (await UpcomingAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_rumour_is_out_even_when_its_announced_date_has_not_come()
    {
        // The clause order matters. A rumour with a future date must be filed by its status and
        // not by its window, or the ten Rumored titles an IGDB editor happened to give a TBD row
        // would behave differently from the twenty-one who got none.
        var mediaId = await GivenGameAsync("Bloodborne 2");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenReleaseWindowAsync(
            mediaId, new DateOnly(2027, 4, 1), ReleasePrecision.Day, ReleaseStatus.Rumored);

        (await BacklogAsync()).Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
        (await UpcomingAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Narrows_the_backlog_and_leaves_the_other_three_columns_alone()
    {
        // An unreleased title in Playing is somebody recording an early build, and it belongs
        // where they put it. Only the queue you have not started is a question about what is
        // out — which is also why the partition sits in the status switch beside InYear rather
        // than above it.
        var mediaId = await GivenGameAsync("An Early Build");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Clock.UtcNow);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        var playing = await GetPageAsync("/api/library?hobby=games&status=InProgress");

        playing.Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
        (await UpcomingAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Orders_by_the_first_possible_day_with_the_undated_last()
    {
        var soon = await GivenReadyToShipAsync("Soon", "1", new DateOnly(2026, 11, 3), ReleasePrecision.Day);
        var later = await GivenReadyToShipAsync("Later", "2", new DateOnly(2027, 6, 1), ReleasePrecision.Year);
        var never = await GivenReadyToShipAsync("No Date", "3", null, ReleasePrecision.Unknown);

        var upcoming = await UpcomingAsync();

        upcoming.Select(item => item.MediaId).ShouldBe([soon, later, never]);
    }

    [Fact]
    public async Task Answers_a_non_empty_page()
    {
        // Asserted outright because emptiness is what a query that stops translating looks like
        // here — the same reasoning LibraryOrderingTests records. A calendar that quietly shows
        // nothing reads as "you have nothing coming", which is a plausible answer.
        await GivenReadyToShipAsync("Silksong II", "1", new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        (await UpcomingAsync()).ShouldNotBeEmpty();
    }

    [Fact]
    public async Task A_move_answers_with_the_same_release_window_the_calendar_shows()
    {
        // ListAsync and ItemAsync are two projections of one row and must stay identical field
        // for field: a transition answers with the row it just wrote and the board caches that,
        // so a field populated in one and null in the other flickers on a drag. Delete these
        // four lines from ItemAsync and this goes red here and nowhere else — which is exactly
        // what LibraryItemDto.Subtitle cost last time.
        var mediaId = await GivenGameAsync("Silksong II");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Clock.UtcNow);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        var response = await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(LogStatus.Backlog), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var moved = await ReadAsync<LibraryItemDto>(response);
        moved.ReleaseDate.ShouldBe(new DateOnly(2027, 3, 12));
        moved.ReleaseEnd.ShouldBe(new DateOnly(2027, 3, 12));
        moved.ReleasePrecision.ShouldBe(ReleasePrecision.Day);
    }

    [Fact]
    public async Task Somebody_elses_unreleased_backlog_is_not_on_my_calendar()
    {
        // Cheap, and worth having: the calendar is a new read path over shared `media` rows, and
        // what scopes it is BoardQuery's user predicate rather than anything of its own.
        var stranger = await GivenUserAsync("Someone Else");
        var mediaId = await GivenGameAsync("Silksong II");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog, userId: stranger);
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        (await UpcomingAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_board_row_is_on_exactly_one_side_of_the_release_line()
    {
        // The partition, checked as a partition rather than one case at a time.
        //
        // Worth its own test because the failure mode is SQL's three-valued logic, which does
        // not announce itself: the check constraint on these same columns first shipped as an OR
        // of three conjunctions, and a row that satisfied none of them evaluated to NULL — which
        // Postgres accepts. A predicate with a NULL hole here loses titles from both sides at
        // once, and every single-case test above would still pass.
        //
        // One title per shape the columns can take, including the two where the status and the
        // window disagree.
        var all = new[]
        {
            await GivenReadyToShipAsync("Never Asked", "1", null, precision: null),
            await GivenReadyToShipAsync("No Date Announced", "2", null, ReleasePrecision.Unknown),
            await GivenReadyToShipAsync("Out Last Year", "3", new DateOnly(2025, 4, 1), ReleasePrecision.Day),
            await GivenReadyToShipAsync("Out Today", "4", new DateOnly(2026, 9, 15), ReleasePrecision.Day),
            await GivenReadyToShipAsync("Out Next Year", "5", new DateOnly(2027, 4, 1), ReleasePrecision.Day),
            await GivenReadyToShipAsync("Some Time In 2026", "6", new DateOnly(2026, 3, 1), ReleasePrecision.Year),
            await GivenReadyToShipAsync("Playing It Already", "7", new DateOnly(2027, 4, 1),
                ReleasePrecision.Day, ReleaseStatus.EarlyAccess),
            await GivenReadyToShipAsync("Never Coming", "8", new DateOnly(2016, 4, 1),
                ReleasePrecision.Year, ReleaseStatus.Cancelled),
            await GivenReadyToShipAsync("Only A Rumour", "9", null,
                ReleasePrecision.Unknown, ReleaseStatus.Rumored),
        };

        var inColumn = (await BacklogAsync()).Items.Select(item => item.MediaId).ToList();
        var onCalendar = (await UpcomingAsync()).Select(item => item.MediaId).ToList();

        inColumn.Intersect(onCalendar).ShouldBeEmpty("a title is in the column or on the calendar, never both");

        List<int> bothSides = [.. inColumn.Concat(onCalendar).Order()];
        bothSides.ShouldBe([.. all.Order()], "every title is on one side or the other");
    }

    [Fact]
    public async Task Refuses_a_hobby_nobody_has_heard_of()
    {
        // The same guard List and Years carry, and for their reason: an empty calendar under a
        // misspelt slug reads as "nothing is coming" rather than as a typo.
        var response = await Client.GetAsync("/api/library/upcoming?hobby=boardgames", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // ---------------------------------------------------------------- arrange

    /// <summary>A game on the board, with a release window, in one call.</summary>
    private async Task<int> GivenReadyToShipAsync(
        string title,
        string externalId,
        DateOnly? day,
        ReleasePrecision? precision,
        ReleaseStatus? status = null)
    {
        var mediaId = await GivenGameAsync(title, externalId: externalId);
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        // A null precision is a title nobody has asked a provider about, so there is nothing to
        // write — which is the state every row was in before these columns existed.
        if (precision is { } announced)
        {
            await GivenReleaseWindowAsync(mediaId, day, announced, status);
        }

        return mediaId;
    }

    /// <summary>
    /// Writes the window straight onto the media row, bypassing IGDB — the arrange half of every
    /// test above. Built through <see cref="ReleaseWindow.For"/> rather than by setting the three
    /// columns by hand, so a fixture can never express a shape the check constraint forbids.
    /// </summary>
    private Task GivenReleaseWindowAsync(
        int mediaId,
        DateOnly? day,
        ReleasePrecision precision,
        ReleaseStatus? status = null) => WithDbAsync(async db =>
        {
            var window = day is { } announced
                ? ReleaseWindow.For(announced, precision)
                : ReleaseWindow.Unknown;

            var media = await db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            media.ReleaseDate = window.Start;
            media.ReleaseEnd = window.End;
            media.ReleasePrecision = window.Precision;
            media.ReleaseStatus = status;

            await db.SaveChangesAsync(Ct);
        });

    private async Task<PagedResult<LibraryItemDto>> BacklogAsync() =>
        await GetPageAsync("/api/library?hobby=games&status=Backlog");

    private async Task<IReadOnlyList<LibraryItemDto>> UpcomingAsync() =>
        await ReadAsync<IReadOnlyList<LibraryItemDto>>(
            await Client.GetAsync("/api/library/upcoming?hobby=games", Ct));

    private async Task<PagedResult<LibraryItemDto>> GetPageAsync(string url) =>
        await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(url, Ct));
}
