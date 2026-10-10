using System.Net;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Finding the note where you wrote about that boss fight: <c>GET /api/notes/search</c>.
///
/// Every word you type has to be in the note, in any order and in any case, and each word is
/// matched as the characters it is: <c>ILIKE</c> treats <c>%</c>, <c>_</c> and <c>\</c> as
/// wildcards and an escape, and a note that says <c>50%</c> is not a pattern. Not full-text
/// search, because notes get written in Japanese and Korean, which Postgres's <c>english</c>
/// configuration would mangle and no configuration splits into words.
///
/// One board at a time, because a result opens that board's journal. And yours alone: a note has
/// no owner of its own, so the scope reaches through the pass it was written during.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class NoteSearchTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ------------------------------------------------------------------ what comes back

    [Fact]
    public async Task A_word_finds_the_note_it_is_in_and_says_whose_title_it_is()
    {
        var mediaId = await GivenGameAsync(
            "Hollow Knight: Silksong", coverUrl: "https://images.igdb.com/silksong.jpg");
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        var noteId = await GivenNoteAsync(
            entryId, "Moss Mother took twelve tries.", Eastern(2026, 9, 19, 22, 15));
        await GivenNoteAsync(entryId, "Started on the Switch 2.", Eastern(2026, 9, 17, 19, 20));

        var found = await SearchAsync("moss");

        var note = found.Notes.ShouldHaveSingleItem();
        note.Id.ShouldBe(noteId);
        note.LogEntryId.ShouldBe(entryId);
        note.MediaId.ShouldBe(mediaId);
        note.Title.ShouldBe("Hollow Knight: Silksong");
        note.Subtitle.ShouldBeNull();
        note.CoverUrl.ShouldBe("https://images.igdb.com/silksong.jpg");
        note.Body.ShouldBe("Moss Mother took twelve tries.");
        note.WrittenAt.ShouldBe(Eastern(2026, 9, 19, 22, 15));
        found.More.ShouldBeFalse();
    }

    [Fact]
    public async Task Notes_on_every_pass_are_searched()
    {
        // A replay is a pass of its own, and the finish before it keeps its notes under Earlier
        // passes. Both are what you wrote about the game.
        var mediaId = await GivenGameAsync("Hollow Knight");
        var finished = await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        var replay = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        await GivenNoteAsync(finished, "Radiance is the hardest boss I have beaten.", Eastern(2026, 7, 4));
        await GivenNoteAsync(replay, "Steel Soul this time. Every boss is scarier.", Eastern(2026, 9, 28));

        var found = await SearchAsync("boss");

        found.Notes.Select(note => note.LogEntryId).ShouldBe([replay, finished]);
    }

    [Fact]
    public async Task An_anime_is_named_the_way_its_card_names_it()
    {
        // The English title leads and the romaji sits under it, card, drawer and search tile
        // alike — so a result naming the romaji alone would be the one place it reads otherwise.
        var mediaId = await GivenAnimeAsync(
            "Sousou no Frieren", englishTitle: "Frieren: Beyond Journey's End");
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        await GivenNoteAsync(entryId, "Episode ten, and the mimic.");

        var note = (await SearchAsync("mimic", hobby: "anime")).Notes.ShouldHaveSingleItem();

        note.Title.ShouldBe("Frieren: Beyond Journey's End");
        note.Subtitle.ShouldBe("Sousou no Frieren");
    }

    // ------------------------------------------------------------------ whose notes

    [Fact]
    public async Task Another_persons_note_never_matches()
    {
        // The same game in the shared catalogue, and two journals about it.
        var other = await GivenUserAsync("Someone Else");
        var mediaId = await GivenGameAsync("Hollow Knight");
        var theirs = await GivenLogEntryAsync(mediaId, LogStatus.InProgress, userId: other);
        var mine = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        await GivenNoteAsync(theirs, "The boss in the colosseum.");
        var myNote = await GivenNoteAsync(mine, "A boss I will not name.");

        var found = await SearchAsync("boss");

        found.Notes.Select(note => note.Id).ShouldBe([myNote]);
    }

    [Fact]
    public async Task A_note_on_another_board_never_matches()
    {
        // The film's journal is the films board's. A result here opens this board's drawer,
        // which could not open a film.
        var filmId = await GivenMovieAsync("The Thing");
        var entryId = await GivenLogEntryAsync(filmId, LogStatus.Completed);
        await GivenNoteAsync(entryId, "The blood test scene.");

        (await SearchAsync("blood")).Notes.ShouldBeEmpty();
        (await SearchAsync("blood", hobby: "movies")).Notes.ShouldHaveSingleItem();
    }

    // ------------------------------------------------------------------ what matches

    [Theory]
    [InlineData("BOSS", "the boss above the town")]
    [InlineData("Boss", "BOSS RUSH unlocked")]
    public async Task Matching_ignores_case(string query, string body)
    {
        await GivenNoteOnAGameAsync(body);

        (await SearchAsync(query)).Notes.ShouldHaveSingleItem().Body.ShouldBe(body);
    }

    [Theory]
    [InlineData("50%", "50% through the citadel", "500 rosaries lost")]
    [InlineData("a_b", "the a_b route", "the axb route")]
    [InlineData(@"C:\saves", @"backed up C:\saves first", "backed up C:saves first")]
    public async Task What_LIKE_reads_as_a_pattern_matches_only_itself(
        string query, string literal, string wildcardWouldMatch)
    {
        // Unescaped, % matches anything, _ matches any one character, and \ escapes whatever
        // follows it, so each of these queries would also find the second note.
        await GivenNoteOnAGameAsync(literal, wildcardWouldMatch);

        (await SearchAsync(query)).Notes.Select(note => note.Body).ShouldBe([literal]);
    }

    [Fact]
    public async Task A_Japanese_substring_matches()
    {
        await GivenNoteOnAGameAsync("ボス戦がきつい。でも楽しい。", "Started on the Switch 2.");

        (await SearchAsync("ボス")).Notes.ShouldHaveSingleItem().Body.ShouldBe("ボス戦がきつい。でも楽しい。");
        (await SearchAsync("戦が")).Notes.ShouldHaveSingleItem();
    }

    [Fact]
    public async Task Every_word_has_to_be_in_the_note_in_any_order()
    {
        await GivenNoteOnAGameAsync(
            "Spent an hour on the boss above the town.",
            "Two hours with no map.",
            "Best boss so far.");

        (await SearchAsync("boss hour")).Notes.Select(note => note.Body)
            .ShouldBe(["Spent an hour on the boss above the town."]);
    }

    [Fact]
    public async Task An_ideographic_space_separates_words_too()
    {
        // What a Japanese keyboard types for a space. Split on it, the two words are found in
        // either order; left whole, the query is one word that no note contains.
        await GivenNoteOnAGameAsync("ボス戦がきつい。でも楽しい。");

        (await SearchAsync("楽しい\u3000ボス")).Notes.ShouldHaveSingleItem();
    }

    // ------------------------------------------------------------------ order and the cap

    [Fact]
    public async Task The_newest_note_comes_first_across_titles()
    {
        var silksong = await GivenLogEntryAsync(await GivenGameAsync("Hollow Knight: Silksong", "1"));
        var witcher = await GivenLogEntryAsync(await GivenGameAsync("The Witcher 3", "2"));
        var oldest = await GivenNoteAsync(witcher, "The boss of Hearts of Stone.", Eastern(2026, 1, 18));
        var newest = await GivenNoteAsync(silksong, "The boss above Bellhart.", Eastern(2026, 10, 6));
        var between = await GivenNoteAsync(silksong, "Lace, the best boss so far.", Eastern(2026, 10, 2));

        (await SearchAsync("boss")).Notes.Select(note => note.Id).ShouldBe([newest, between, oldest]);
    }

    [Fact]
    public async Task Notes_written_at_the_same_moment_come_newest_written_first()
    {
        // The tie-break is the id, as it is for a title's passes: the later insert first.
        var entryId = await GivenLogEntryAsync(await GivenGameAsync());
        var first = await GivenNoteAsync(entryId, "boss one");
        var second = await GivenNoteAsync(entryId, "boss two");

        (await SearchAsync("boss")).Notes.Select(note => note.Id).ShouldBe([second, first]);
    }

    [Fact]
    public async Task At_most_fifty_come_back_and_the_answer_says_there_are_more()
    {
        var entryId = await GivenLogEntryAsync(await GivenGameAsync());
        var ids = new List<int>();
        for (var day = 1; day <= 51; day += 1)
        {
            ids.Add(await GivenNoteAsync(entryId, $"boss {day}", Eastern(2026, 1, 1).AddDays(day)));
        }

        var found = await SearchAsync("boss");

        found.Notes.Count.ShouldBe(50);
        found.More.ShouldBeTrue();

        // The fifty most recent: the one left out is the oldest.
        found.Notes.Select(note => note.Id).ShouldNotContain(ids[0]);
    }

    [Fact]
    public async Task Fifty_exactly_is_not_more()
    {
        var entryId = await GivenLogEntryAsync(await GivenGameAsync());
        for (var day = 1; day <= 50; day += 1)
        {
            await GivenNoteAsync(entryId, $"boss {day}", Eastern(2026, 1, 1).AddDays(day));
        }

        var found = await SearchAsync("boss");

        found.Notes.Count.ShouldBe(50);
        found.More.ShouldBeFalse();
    }

    // ------------------------------------------------------------------ refused

    [Theory]
    [InlineData("?hobby=games")]
    [InlineData("?q=&hobby=games")]
    [InlineData("?q=%20%20%20&hobby=games")]
    public async Task A_search_for_nothing_is_refused(string query)
    {
        (await Client.GetAsync($"/api/notes/search{query}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task A_search_longer_than_two_hundred_characters_is_refused()
    {
        // Every word is a clause in the query, so the length is what bounds how many there are.
        (await Client.GetAsync($"/api/notes/search?q={new string('a', 200)}&hobby=games", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.OK);
        (await Client.GetAsync($"/api/notes/search?q={new string('a', 201)}&hobby=games", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("?q=boss")]
    [InlineData("?q=boss&hobby=boardgames")]
    public async Task A_board_not_named_or_not_known_is_refused(string query)
    {
        // An unknown board would otherwise answer with no notes, which reads as "you never
        // wrote that" rather than "that is not a board".
        (await Client.GetAsync($"/api/notes/search{query}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Nobody_signed_in_is_refused()
    {
        (await AnonymousClient.GetAsync("/api/notes/search?q=boss&hobby=games", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    // ------------------------------------------------------------------ helpers

    private async Task<NoteSearchResult> SearchAsync(string q, string hobby = "games")
    {
        var response = await Client.GetAsync(
            $"/api/notes/search?q={Uri.EscapeDataString(q)}&hobby={hobby}", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return await ReadAsync<NoteSearchResult>(response);
    }

    /// <summary>One game, one pass of yours, and these notes on it, a minute apart.</summary>
    private async Task GivenNoteOnAGameAsync(params string[] bodies)
    {
        var entryId = await GivenLogEntryAsync(await GivenGameAsync());
        for (var at = 0; at < bodies.Length; at += 1)
        {
            await GivenNoteAsync(entryId, bodies[at], Eastern(2026, 10, 1).AddMinutes(at));
        }
    }
}
