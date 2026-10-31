using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Pictures in a note: written with the words in one request, as <c>multipart/form-data</c>
/// beside the JSON write rather than instead of it, and read back one picture at a time.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class NotePicturesEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ------------------------------------------------------------------ writing

    [Fact]
    public async Task A_note_is_written_with_its_pictures_in_one_request()
    {
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(
            entryId, Form("the clock tower, at last", pictures: [Pictures.Webp, Pictures.JpegPortrait]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var note = await ReadAsync<NoteDto>(response);
        note.Body.ShouldBe("the clock tower, at last");
        note.Pictures.Select(p => (p.Width, p.Height)).ShouldBe([(3, 2), (2, 3)]);

        // Both tables, one row each a picture, and what was sent is what is kept.
        var stored = await WithDbAsync(db => db.NotePictureBytes
            .OrderBy(b => b.Picture!.Position)
            .Select(b => new { b.Picture!.ContentType, b.Bytes, b.ThumbnailType })
            .ToListAsync(Ct));
        stored.Select(s => s.ContentType).ShouldBe(["image/webp", "image/jpeg"]);
        stored[0].Bytes.ShouldBe(Pictures.Webp);
        stored[1].Bytes.ShouldBe(Pictures.JpegPortrait);
    }

    [Fact]
    public async Task A_note_can_be_a_picture_alone()
    {
        // The user's words when it was planned: "Maybe I just want to screenshot something cool
        // and keep it there." No words is an empty body, never a null one.
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(entryId, Form(body: null, pictures: [Pictures.Png]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var note = await ReadAsync<NoteDto>(response);
        note.Body.ShouldBe("");
        note.Pictures.ShouldHaveSingleItem();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_note_with_neither_words_nor_a_picture_is_refused(string body)
    {
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(entryId, Form(body));

        await ShouldBeRefusedAsync(response, "Body", "A note needs something in it.");
        (await WithDbAsync(db => db.Notes.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task The_json_write_is_as_it_was()
    {
        // The multipart write is a second action on the same route, told apart by the request's
        // type, so a note of words alone is written exactly as it was before pictures.
        var entryId = await GivenPassAsync();

        var response = await Client.PostAsJsonAsync(
            $"/api/log-entries/{entryId}/notes", new NoteRequest("words alone"), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var note = await ReadAsync<NoteDto>(response);
        note.Body.ShouldBe("words alone");
        note.Pictures.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_picture_is_known_by_its_bytes_and_not_by_what_it_says_it_is()
    {
        // A PNG sent as a JPEG named .jpg. The type kept is the one the picture route will answer
        // with, so it is read from the bytes and the label goes unread.
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(
            entryId, Form("", pictures: [new Upload(Pictures.Png, "image/jpeg", "photo.jpg")]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await WithDbAsync(db => db.NotePictures.Select(p => p.ContentType).SingleAsync(Ct)))
            .ShouldBe("image/png");
    }

    public static TheoryData<string, byte[]> NotAPicture => new()
    {
        { "a page", "<!doctype html><script>alert(1)</script>"u8.ToArray() },
        { "an SVG", "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"u8.ToArray() },
        { "a GIF", [.. "GIF89a"u8.ToArray(), 3, 0, 2, 0, 0, 0, 0] },
    };

    [Theory]
    [MemberData(nameof(NotAPicture))]
    public async Task Only_a_jpeg_png_or_webp_is_taken_whatever_it_says_it_is(string name, byte[] bytes)
    {
        // Each sent as image/png. An SVG would be served back from the app's own address, script
        // and all, and nosniff cannot help with a type the server itself chose.
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(
            entryId, Form("words too", pictures: [new Upload(bytes, "image/png", "picture.png")]));

        await ShouldBeRefusedAsync(response, "Pictures", "Only pictures can go in a note.", name);
        (await WithDbAsync(db => db.Notes.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task A_fifth_picture_is_refused()
    {
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(entryId, Form(
            "", pictures: [Pictures.Png, Pictures.Png, Pictures.Png, Pictures.Png, Pictures.Png]));

        await ShouldBeRefusedAsync(
            response, "Pictures", "A note holds four pictures. Take one out to add another.");
    }

    [Fact]
    public async Task Four_pictures_are_taken()
    {
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(entryId, Form(
            "", pictures: [Pictures.Png, Pictures.Jpeg, Pictures.Webp, Pictures.WebpSimpleLossless]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await ReadAsync<NoteDto>(response)).Pictures.Count.ShouldBe(4);
    }

    [Fact]
    public async Task A_picture_over_2_MB_is_refused()
    {
        // The browser shrinks every picture to a few hundred kilobytes at most, so this is a
        // picture that did not come from the app.
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(
            entryId, Form("", pictures: [Pictures.PngOfLength(NoteService.PictureMaxBytes + 1)]));

        await ShouldBeRefusedAsync(response, "Pictures", "A picture can be 2 MB at most.");
    }

    [Fact]
    public async Task A_picture_of_exactly_2_MB_is_taken()
    {
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(
            entryId, Form("", pictures: [Pictures.PngOfLength(NoteService.PictureMaxBytes)]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Each_picture_comes_with_its_thumbnail()
    {
        // The card draws a picture from its thumbnail, so one without would leave a card with a
        // hole in it. The browser makes both, so a missing one is a client that did not.
        var entryId = await GivenPassAsync();

        var form = Form("", pictures: [Pictures.Png, Pictures.Png], thumbnails: [Pictures.Webp]);
        var response = await WriteAsync(entryId, form);

        await ShouldBeRefusedAsync(response, "Thumbnails", "Each picture needs its thumbnail.");
    }

    [Fact]
    public async Task A_thumbnail_is_a_picture_too()
    {
        var entryId = await GivenPassAsync();

        var form = Form(
            "",
            pictures: [Pictures.Png],
            thumbnails: [new Upload("<svg/>"u8.ToArray(), "image/webp", "thumbnail.webp")]);
        var response = await WriteAsync(entryId, form);

        await ShouldBeRefusedAsync(response, "Thumbnails", "Only pictures can go in a note.");
    }

    [Fact]
    public async Task A_thumbnail_is_kept_small()
    {
        // About 96px tall and a few kilobytes. A thumbnail the size of its picture would put the
        // picture back on the board, which is what the thumbnail is there to keep off it.
        var entryId = await GivenPassAsync();

        var form = Form(
            "",
            pictures: [Pictures.Png],
            thumbnails: [Pictures.PngOfLength(NoteService.ThumbnailMaxBytes + 1)]);
        var response = await WriteAsync(entryId, form);

        await ShouldBeRefusedAsync(response, "Thumbnails", "A thumbnail can be 64 KB at most.");
    }

    // A request bigger than any note needs is refused by the route, as it arrives. That limit is
    // Kestrel's to keep, and the test server keeps none, so it is proved in the e2e suite against
    // the real one: see pictures.spec.ts.

    // ------------------------------------------------------------------ the account's cap

    [Fact]
    public async Task An_account_keeps_1_GB_of_pictures()
    {
        var entryId = await GivenPassAsync();
        await GivenPicturesWorthAsync(entryId, NoteService.AccountMaxBytes - 100);

        var response = await WriteAsync(entryId, Form("", pictures: [Pictures.Png]));

        await ShouldBeRefusedAsync(
            response, "Pictures", "Your pictures have reached 1 GB, the most an account keeps.");
    }

    [Fact]
    public async Task Up_to_the_cap_is_taken()
    {
        var entryId = await GivenPassAsync();
        var adding = Pictures.Png.Length + Pictures.Webp.Length;
        await GivenPicturesWorthAsync(entryId, NoteService.AccountMaxBytes - adding);

        var response = await WriteAsync(entryId, Form("", pictures: [Pictures.Png]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task The_admin_account_has_no_cap()
    {
        // The user's own choice: "no limit on my account since I am the sole user". The server
        // knows that account by its role, the column's first reader.
        await WithDbAsync(db => db.Users
            .Where(u => u.Id == UserId)
            .ExecuteUpdateAsync(u => u.SetProperty(x => x.Role, User.AdminRole), Ct));
        var entryId = await GivenPassAsync();
        await GivenPicturesWorthAsync(entryId, NoteService.AccountMaxBytes);

        var response = await WriteAsync(entryId, Form("", pictures: [Pictures.Png]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task The_admin_account_still_holds_four_to_a_note()
    {
        await WithDbAsync(db => db.Users
            .Where(u => u.Id == UserId)
            .ExecuteUpdateAsync(u => u.SetProperty(x => x.Role, User.AdminRole), Ct));
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(entryId, Form(
            "", pictures: [Pictures.Png, Pictures.Png, Pictures.Png, Pictures.Png, Pictures.Png]));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Only_your_own_pictures_count_toward_your_cap()
    {
        var someoneElse = await GivenUserAsync("Someone Else");
        var theirs = await GivenLogEntryAsync(await GivenGameAsync("Theirs", "2"), userId: someoneElse);
        await GivenPicturesWorthAsync(theirs, NoteService.AccountMaxBytes);
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(entryId, Form("", pictures: [Pictures.Png]));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task A_rewrite_counts_what_it_takes_out_against_what_it_adds()
    {
        // Swapping one picture for another at the cap keeps the account where it was, so it is
        // not refused for the picture that is on its way out.
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(entryId, Form("", pictures: [Pictures.Png])));
        var leaving = Pictures.Png.Length + Pictures.Webp.Length;
        await GivenPicturesWorthAsync(entryId, NoteService.AccountMaxBytes - leaving);

        var response = await RewriteAsync(note.Id, Form("", pictures: [Pictures.Png]));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    // ------------------------------------------------------------------ rewriting

    [Fact]
    public async Task A_rewrite_keeps_the_pictures_it_names_and_adds_the_new_after_them()
    {
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("three", pictures: [Pictures.Png, Pictures.Jpeg, Pictures.Webp])));
        var (first, second, third) = (note.Pictures[0].Id, note.Pictures[1].Id, note.Pictures[2].Id);

        var response = await RewriteAsync(
            note.Id, Form("two kept and one new", pictures: [Pictures.JpegPortrait], keep: [third, first]));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var rewritten = await ReadAsync<NoteDto>(response);
        rewritten.Body.ShouldBe("two kept and one new");

        // Kept in the order they were already in, whatever order the request named them in, and
        // the new one after them. The one not named is gone, bytes and all.
        rewritten.Pictures.Take(2).Select(p => p.Id).ShouldBe([first, third]);
        rewritten.Pictures[2].ShouldSatisfyAllConditions(
            p => p.Id.ShouldNotBeOneOf(first, second, third),
            p => (p.Width, p.Height).ShouldBe((2, 3)));
        (await WithDbAsync(db => db.NotePictureBytes.AnyAsync(b => b.PictureId == second, Ct)))
            .ShouldBeFalse();
    }

    [Fact]
    public async Task A_rewrite_that_swaps_pictures_puts_none_where_another_is_leaving()
    {
        // Keep the first of three and send two new ones: the new pair would fit the places the
        // two going are leaving, and the database holds one picture to a place.
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("", pictures: [Pictures.Png, Pictures.Png, Pictures.Png])));

        var response = await RewriteAsync(note.Id, Form(
            "", pictures: [Pictures.Jpeg, Pictures.JpegPortrait], keep: [note.Pictures[0].Id]));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<NoteDto>(response)).Pictures.Select(p => (p.Width, p.Height))
            .ShouldBe([(3, 2), (3, 2), (2, 3)]);
    }

    [Fact]
    public async Task A_rewrite_that_names_no_pictures_takes_them_all_out()
    {
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("words and two", pictures: [Pictures.Png, Pictures.Png])));

        var rewritten = await ReadAsync<NoteDto>(await RewriteAsync(note.Id, Form("words alone")));

        rewritten.Pictures.ShouldBeEmpty();
        (await WithDbAsync(db => db.NotePictures.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.NotePictureBytes.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task A_rewrite_that_empties_the_words_of_a_note_with_a_picture_keeps_it()
    {
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("a caption", pictures: [Pictures.Png])));

        var response = await RewriteAsync(note.Id, Form("", keep: [note.Pictures[0].Id]));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<NoteDto>(response)).Body.ShouldBe("");
    }

    [Fact]
    public async Task A_rewrite_that_takes_the_last_picture_out_of_a_note_with_no_words_is_refused()
    {
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(entryId, Form("", pictures: [Pictures.Png])));

        var response = await RewriteAsync(note.Id, Form(""));

        await ShouldBeRefusedAsync(response, "Body", "A note needs something in it.");
        (await WithDbAsync(db => db.NotePictures.CountAsync(Ct))).ShouldBe(1);
    }

    [Fact]
    public async Task A_rewrite_holds_four_pictures_too()
    {
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("", pictures: [Pictures.Png, Pictures.Png, Pictures.Png])));

        var response = await RewriteAsync(note.Id, Form(
            "", pictures: [Pictures.Png, Pictures.Png], keep: [.. note.Pictures.Select(p => p.Id)]));

        await ShouldBeRefusedAsync(
            response, "Pictures", "A note holds four pictures. Take one out to add another.");
        (await WithDbAsync(db => db.NotePictures.CountAsync(Ct))).ShouldBe(3);
    }

    [Fact]
    public async Task A_rewrite_cannot_keep_a_picture_from_another_note()
    {
        // Keeping is the one way a request names a picture that is already stored, so it is the
        // way one would be moved between notes. A picture stays in the note it was sent with.
        var entryId = await GivenPassAsync();
        var other = await ReadAsync<NoteDto>(await WriteAsync(entryId, Form("", pictures: [Pictures.Png])));
        var note = await ReadAsync<NoteDto>(await WriteAsync(entryId, Form("words")));

        var response = await RewriteAsync(note.Id, Form("words", keep: [other.Pictures[0].Id]));

        await ShouldBeRefusedAsync(response, "Keep", "That picture is not in this note.");
        (await WithDbAsync(db => db.NotePictures.Select(p => p.NoteId).SingleAsync(Ct)))
            .ShouldBe(other.Id);
    }

    [Fact]
    public async Task A_json_rewrite_leaves_a_notes_pictures_alone()
    {
        // The JSON write says nothing about pictures, so it changes none of them: it is how a
        // note of words was rewritten before pictures existed, and it still is.
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("wathcer", pictures: [Pictures.Png])));

        var response = await Client.PutAsJsonAsync(
            $"/api/notes/{note.Id}", new NoteRequest("watcher"), Json, Ct);

        var rewritten = await ReadAsync<NoteDto>(response);
        rewritten.Body.ShouldBe("watcher");
        rewritten.Pictures.ShouldHaveSingleItem().Id.ShouldBe(note.Pictures[0].Id);
    }

    [Fact]
    public async Task A_rewrite_does_not_move_a_notes_date()
    {
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(entryId, Form("words")));

        Clock.UtcNow = Clock.UtcNow.AddDays(3);
        var rewritten = await ReadAsync<NoteDto>(
            await RewriteAsync(note.Id, Form("words", pictures: [Pictures.Png])));

        rewritten.WrittenAt.ShouldBe(note.WrittenAt);
    }

    [Fact]
    public async Task Rewriting_a_note_that_does_not_exist_is_a_404()
    {
        (await RewriteAsync(999_999, Form("nobody home"))).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Pictures_against_a_pass_that_does_not_exist_are_a_404()
    {
        (await WriteAsync(999_999, Form("", pictures: [Pictures.Png])))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // ------------------------------------------------------------------ reading

    [Fact]
    public async Task A_picture_is_read_back_as_it_was_kept()
    {
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("", pictures: [Pictures.Webp], thumbnails: [Pictures.Png])));

        var response = await Client.GetAsync($"/api/note-pictures/{note.Pictures[0].Id}", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType.ShouldNotBeNull().MediaType.ShouldBe("image/webp");
        (await response.Content.ReadAsByteArrayAsync(Ct)).ShouldBe(Pictures.Webp);
    }

    [Fact]
    public async Task A_pictures_thumbnail_is_read_on_its_own()
    {
        // What a card draws, so a board does not download every card's newest picture to show
        // it 28px tall.
        var entryId = await GivenPassAsync();
        var note = await ReadAsync<NoteDto>(await WriteAsync(
            entryId, Form("", pictures: [Pictures.Webp], thumbnails: [Pictures.Png])));

        var response = await Client.GetAsync(
            $"/api/note-pictures/{note.Pictures[0].Id}/thumbnail", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType.ShouldNotBeNull().MediaType.ShouldBe("image/png");
        (await response.Content.ReadAsByteArrayAsync(Ct)).ShouldBe(Pictures.Png);
    }

    [Theory]
    [InlineData("")]
    [InlineData("/thumbnail")]
    public async Task A_picture_is_kept_by_the_browser_and_by_no_cache_on_the_way(string which)
    {
        // A picture's bytes never change, because a new picture is a new id, so the browser keeps
        // it for a year and a journal reopens at once. Private, because Cloudflare keeps what it
        // can at its edge and hands its copy to anyone who asks, signed in or not. And nosniff,
        // so a browser takes it as the type it was kept as and never guesses another.
        var pictureId = await GivenPictureAsync(await GivenNoteAsync(await GivenPassAsync()));

        var response = await Client.GetAsync($"/api/note-pictures/{pictureId}{which}", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var cache = response.Headers.CacheControl.ShouldNotBeNull();
        cache.Private.ShouldBeTrue();
        cache.MaxAge.ShouldBe(TimeSpan.FromDays(365));
        cache.Extensions.Select(directive => directive.Name).ShouldContain("immutable");
        response.Headers.GetValues("X-Content-Type-Options").ShouldBe(["nosniff"]);
    }

    [Theory]
    [InlineData("")]
    [InlineData("/thumbnail")]
    public async Task A_picture_that_is_not_there_is_a_404(string which)
    {
        (await Client.GetAsync($"/api/note-pictures/999999{which}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Signed_out_a_picture_is_a_401_shared_board_or_not()
    {
        // A share shows the board and never the journal, so no picture is on one. Holding a
        // share's link and a picture's id reaches nothing: the route asks who is signed in.
        var pictureId = await GivenPictureAsync(await GivenNoteAsync(await GivenPassAsync()));
        (await Client.PostAsJsonAsync(
                "/api/share?hobby=games",
                new ShareRequest([.. Enum.GetValues<SharePart>()], ShowsName: true),
                Json,
                Ct))
            .StatusCode.ShouldBe(HttpStatusCode.Created);

        foreach (var which in new[] { "", "/thumbnail" })
        {
            (await AnonymousClient.GetAsync($"/api/note-pictures/{pictureId}{which}", Ct))
                .StatusCode.ShouldBe(HttpStatusCode.Unauthorized, which);
        }
    }

    /// <summary>Every read that carries a pass's notes, by what it is for.</summary>
    public static TheoryData<string> ReadsThatCarryNotes => new()
    {
        "a game's journal",
        "a film's journal",
        "a show's journal",
        "an anime's journal",
        "pinning a HowLongToBeat id",
        "a pass",
        "the passes",
        "rewriting a pass",
        "a note",
        "rewriting a note",
        "the spreadsheet",
    };

    [Theory]
    [MemberData(nameof(ReadsThatCarryNotes))]
    public async Task Notes_come_back_with_their_pictures_in_order_and_with_their_sizes(string read)
    {
        var (request, pictureIds) = await GivenAReadOfTwoPicturesAsync(read);

        var response = await Client.SendAsync(request, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, read);
        PicturesIn(JsonNode.Parse(await response.Content.ReadAsStringAsync(Ct)))
            .ShouldBe([(pictureIds[0], 3, 2), (pictureIds[1], 2, 3)], read);
    }

    [Theory]
    [MemberData(nameof(ReadsThatCarryNotes))]
    public async Task A_read_that_carries_notes_never_reads_the_bytes(string read)
    {
        // The split between the two tables is the point. A read that brought the bytes out with
        // the pictures would be slow rather than wrong, and so nothing else would say so.
        var (request, pictureIds) = await GivenAReadOfTwoPicturesAsync(read);

        var recorder = new SqlRecorder();
        using var host = SqlRecorder.Into(Factory, recorder);
        using var client = host.CreateClient();
        client.DefaultRequestHeaders.Add(
            TestAuthHandler.UserHeader, UserId.ToString(CultureInfo.InvariantCulture));

        // First, that the recorder sees the bytes when something does read them. Without it, a
        // record that never caught anything would pass for the wrong reason.
        (await client.GetAsync($"/api/note-pictures/{pictureIds[0]}", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.OK);
        recorder.Commands.ShouldContain(sql => SqlRecorder.ReadsPictureBytes(sql));
        recorder.Clear();

        (await client.SendAsync(request, Ct)).StatusCode.ShouldBe(HttpStatusCode.OK, read);

        recorder.Commands.ShouldContain(sql => SqlRecorder.ReadsPictures(sql), read);
        recorder.Commands.Where(SqlRecorder.ReadsPictureBytes).ShouldBeEmpty(read);
    }

    // ------------------------------------------------------------------ arrange

    /// <summary>
    /// A title of the kind <paramref name="read"/> needs, a pass of yours on it, a note with two
    /// pictures, and the request that reads them. The second picture is written first, so a
    /// read that came back in the order the rows went in, rather than the note's order, puts
    /// them the wrong way round.
    /// </summary>
    private async Task<(HttpRequestMessage Request, int[] PictureIds)> GivenAReadOfTwoPicturesAsync(
        string read)
    {
        var mediaId = read switch
        {
            "a film's journal" => await GivenMovieAsync(),
            "a show's journal" => await GivenShowAsync(),
            "an anime's journal" => await GivenAnimeAsync(),
            _ => await GivenGameAsync(),
        };
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        var noteId = await GivenNoteAsync(entryId, "two pictures");
        var second = await GivenPictureAsync(noteId, position: 1, width: 2, height: 3);
        var first = await GivenPictureAsync(noteId, position: 0, width: 3, height: 2);

        Hltb.ById[26286] = FakeHltbClient.Game(26286, "Test Game", 2017, 27m);

        HttpRequestMessage request = read switch
        {
            "a game's journal" => new(HttpMethod.Get, $"/api/games/{mediaId}"),
            "a film's journal" => new(HttpMethod.Get, $"/api/movies/{mediaId}"),
            "a show's journal" => new(HttpMethod.Get, $"/api/tv/{mediaId}"),
            "an anime's journal" => new(HttpMethod.Get, $"/api/anime/{mediaId}"),
            "pinning a HowLongToBeat id" => new(HttpMethod.Put, $"/api/games/{mediaId}/hltb")
            {
                Content = JsonContent.Create(new SetHltbIdRequest(26286), options: Json),
            },
            "a pass" => new(HttpMethod.Get, $"/api/log-entries/{entryId}"),
            "the passes" => new(HttpMethod.Get, $"/api/log-entries?mediaId={mediaId}"),
            "rewriting a pass" => new(HttpMethod.Put, $"/api/log-entries/{entryId}")
            {
                Content = JsonContent.Create(
                    new UpdateLogEntryRequest(LogStatus.InProgress, null, null, null, null, null),
                    options: Json),
            },
            "a note" => new(HttpMethod.Get, $"/api/notes/{noteId}"),
            "rewriting a note" => new(HttpMethod.Put, $"/api/notes/{noteId}")
            {
                Content = JsonContent.Create(new NoteRequest("still two pictures"), options: Json),
            },
            "the spreadsheet" => new(HttpMethod.Get, "/api/library/export?hobby=games"),
            _ => throw new ArgumentOutOfRangeException(nameof(read), read, "No such read."),
        };

        return (request, [first, second]);
    }

    private async Task<int> GivenPassAsync() =>
        await GivenLogEntryAsync(await GivenGameAsync(), LogStatus.InProgress);

    /// <summary>
    /// Pictures already kept on a pass, adding up to <paramref name="bytes"/> by their recorded
    /// size. Written straight to the tables, because sending a gigabyte would prove nothing the
    /// size column does not.
    /// </summary>
    private async Task GivenPicturesWorthAsync(int entryId, long bytes)
    {
        var noteId = await GivenNoteAsync(entryId, "worth a lot");

        await WithDbAsync(async db =>
        {
            for (var position = 0; bytes > 0; position++)
            {
                var size = (int)Math.Min(bytes, int.MaxValue);
                bytes -= size;
                db.NotePictureBytes.Add(new NotePictureBytes
                {
                    Picture = new NotePicture
                    {
                        NoteId = noteId,
                        Position = position,
                        ContentType = "image/png",
                        Width = 3,
                        Height = 2,
                        ByteCount = size,
                    },
                    Bytes = Pictures.Png,
                    Thumbnail = Pictures.Webp,
                    ThumbnailType = "image/webp",
                });
            }

            await db.SaveChangesAsync(Ct);
        });
    }

    // ------------------------------------------------------------------ act

    private Task<HttpResponseMessage> WriteAsync(int entryId, MultipartFormDataContent form) =>
        Client.PostAsync($"/api/log-entries/{entryId}/notes", form, Ct);

    private Task<HttpResponseMessage> RewriteAsync(int noteId, MultipartFormDataContent form) =>
        Client.PutAsync($"/api/notes/{noteId}", form, Ct);

    /// <summary>A file as a browser sends one: its bytes, the type it says it is, and a name.</summary>
    private sealed record Upload(byte[] Bytes, string ClaimedType = "image/webp", string FileName = "picture.webp")
    {
        public static implicit operator Upload(byte[] bytes) => new(bytes);
    }

    /// <summary>
    /// A note as the box sends it. Each picture goes with a thumbnail unless the test says which
    /// thumbnails go, and the words go only when there are some to send, as a browser's
    /// <c>FormData</c> leaves out a field nothing was appended to.
    /// </summary>
    private static MultipartFormDataContent Form(
        string? body,
        Upload[]? pictures = null,
        Upload[]? thumbnails = null,
        int[]? keep = null)
    {
        var form = new MultipartFormDataContent();

        if (body is not null)
        {
            form.Add(new StringContent(body), "body");
        }

        foreach (var id in keep ?? [])
        {
            form.Add(new StringContent(id.ToString(System.Globalization.CultureInfo.InvariantCulture)), "keep");
        }

        foreach (var picture in pictures ?? [])
        {
            form.Add(File(picture), "pictures", picture.FileName);
        }

        foreach (var thumbnail in thumbnails ?? [.. (pictures ?? []).Select(_ => (Upload)Pictures.Webp)])
        {
            form.Add(File(thumbnail), "thumbnails", thumbnail.FileName);
        }

        return form;
    }

    private static ByteArrayContent File(Upload upload)
    {
        var content = new ByteArrayContent(upload.Bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(upload.ClaimedType);
        return content;
    }

    // ------------------------------------------------------------------ assert

    /// <summary>
    /// Every picture in an answer, wherever its notes sit in it: a journal's passes, a page of
    /// passes, the spreadsheet's titles, or a note on its own. Read off the JSON rather than a
    /// type each, because the shapes differ and the pictures are the same thing in all of them.
    /// </summary>
    private static List<(int Id, int Width, int Height)> PicturesIn(JsonNode? answer)
    {
        var found = new List<(int, int, int)>();
        Walk(answer);
        return found;

        void Walk(JsonNode? node)
        {
            switch (node)
            {
                case JsonObject obj:
                    foreach (var (name, value) in obj)
                    {
                        if (name == "pictures" && value is JsonArray pictures)
                        {
                            found.AddRange(pictures.Select(picture =>
                                ((int)picture!["id"]!, (int)picture["width"]!, (int)picture["height"]!)));
                        }
                        else
                        {
                            Walk(value);
                        }
                    }

                    break;

                case JsonArray array:
                    foreach (var item in array)
                    {
                        Walk(item);
                    }

                    break;
            }
        }
    }

    /// <summary>
    /// A 400 naming <paramref name="field"/> and saying <paramref name="message"/>. The box puts
    /// the server's words after <i>Not added.</i>, so the words are part of what is tested.
    /// </summary>
    private static async Task ShouldBeRefusedAsync(
        HttpResponseMessage response, string field, string message, string? because = null)
    {
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest, because);

        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync(Ct));
        var errors = problem.RootElement.GetProperty("errors");
        errors.TryGetProperty(field, out var said).ShouldBeTrue(
            $"{because} expected an error for {field} in {errors}");
        said.EnumerateArray().Select(e => e.GetString()).ShouldContain(message, because);
    }
}
