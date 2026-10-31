namespace HobbyTracker.Api.Domain;

/// <summary>
/// A picture's bytes, and its thumbnail's: one row per <see cref="NotePicture"/>, keyed by it.
/// Apart from it so that nothing reads these but the two routes that answer with them.
///
/// Reached only from this side. A picture has no navigation to its bytes, which is what makes
/// "opening a journal never reads a picture" a fact about the model rather than a habit.
/// </summary>
public class NotePictureBytes
{
    /// <summary>The picture these are, and the key: one row of bytes each.</summary>
    public int PictureId { get; set; }
    public NotePicture? Picture { get; set; }

    /// <summary>The picture, as the browser shrank it. Never changed once written.</summary>
    public required byte[] Bytes { get; set; }

    /// <summary>
    /// A small copy made when the picture was sent, about 96px tall, for the card. Drawn from
    /// the full picture, a board would download every card's newest picture to show it 28px tall.
    /// </summary>
    public required byte[] Thumbnail { get; set; }

    /// <summary>What the thumbnail is, read from its bytes. See <see cref="NotePicture.ContentType"/>.</summary>
    public required string ThumbnailType { get; set; }
}
