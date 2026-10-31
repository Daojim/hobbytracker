namespace HobbyTracker.Api.Domain;

/// <summary>
/// A picture in a note: a screenshot of where you are, or of the save screen once it is over.
/// What the drawer needs in order to draw one, and nothing more. The bytes are a row of their
/// own, <see cref="NotePictureBytes"/>, because every read that carries a note carries its
/// pictures, and a journal opening should not bring every picture in it out of the database.
///
/// **No user column, and no route to the bytes.** Whose it is goes through the note and its
/// pass, as everything about a note does. There is deliberately no navigation from here to
/// <see cref="NotePictureBytes"/>, so no <c>Include</c> can reach them by accident.
/// </summary>
public class NotePicture
{
    public int Id { get; set; }

    public int NoteId { get; set; }
    public Note? Note { get; set; }

    /// <summary>
    /// Its place in the note, lowest first. The first is the one a card shows. A picture kept
    /// when a note is rewritten keeps its place, and one added goes after the ones kept, which
    /// can be a place another is leaving in the same save.
    /// </summary>
    public int Position { get; set; }

    /// <summary>
    /// <c>image/jpeg</c>, <c>image/png</c> or <c>image/webp</c>, read from the bytes rather than
    /// taken from the request. The picture route answers with this, so the database refuses
    /// anything else: a stored <c>text/html</c> would be a page served from the app's own address.
    /// </summary>
    public required string ContentType { get; set; }

    /// <summary>
    /// The picture's size in pixels, read from its bytes. Drawn as the <c>&lt;img&gt;</c>'s own
    /// attributes, so its space is held before it arrives and a journal opened at a note does
    /// not scroll away from it as the pictures above it load.
    /// </summary>
    public int Width { get; set; }

    /// <inheritdoc cref="Width"/>
    public int Height { get; set; }

    /// <summary>
    /// What it takes on disk: the picture and its thumbnail together. Kept here, beside what the
    /// drawer reads, so an account's total is a sum over this table rather than over the bytes.
    /// </summary>
    public int ByteCount { get; set; }
}
