using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// A picture in a note, one at a time: the picture, and the small copy a card draws. Written
/// with its note (see <see cref="NotesController"/>) and read here, by an <c>&lt;img&gt;</c>
/// that carries the session cookie because the app and the API share an origin.
///
/// <para>
/// <b>Never on a share.</b> A share shows the board and never the journal, so these are
/// <c>[Authorize]</c>d like every route but a share's reads, and somebody holding a share's link
/// and a picture's id is a 401.
/// </para>
///
/// <para>
/// <b>No file extension in the address, and <c>private</c> in the answer.</b> Cloudflare keeps
/// the file types it knows at its edge by default, and hands an edge copy to anyone who asks,
/// signed in or not; see <c>docs/deploy.md</c>. <c>private</c> keeps every cache but the
/// browser's out, and an address with no extension is not one it keeps by default either.
/// </para>
/// </summary>
[ApiController]
[Authorize]
[Route("api/note-pictures")]
public class NotePicturesController(INoteService notes) : ControllerBase
{
    /// <summary>
    /// How long a browser keeps a picture: a year, and without asking again. A picture's bytes
    /// never change, because a new picture is a new id, so a journal reopens at once.
    /// </summary>
    private const string KeptByTheBrowser = "private, max-age=31536000, immutable";

    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Picture(int id, CancellationToken cancellationToken) =>
        Answer(await notes.PictureAsync(id, cancellationToken));

    /// <summary>
    /// The small copy made when the picture was sent, about 96px tall, which is what a card
    /// draws. Drawn from the picture itself, a board would download every card's newest picture
    /// to show it 28px tall.
    /// </summary>
    [HttpGet("{id:int}/thumbnail")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Thumbnail(int id, CancellationToken cancellationToken) =>
        Answer(await notes.ThumbnailAsync(id, cancellationToken));

    /// <summary>
    /// The bytes as the type they were kept as. <c>nosniff</c> stops a browser guessing another,
    /// which is the half of "only a picture is served" that the type check on the way in cannot
    /// do on its own.
    /// </summary>
    private IActionResult Answer(PictureFile? picture)
    {
        if (picture is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = KeptByTheBrowser;
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(picture.Bytes, picture.ContentType);
    }
}
