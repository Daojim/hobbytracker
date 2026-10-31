using System.Buffers.Binary;

namespace HobbyTracker.Api.Services;

/// <summary>What a picture is, and its size in pixels, read from its own bytes.</summary>
public sealed record PictureFacts(string ContentType, int Width, int Height);

/// <summary>
/// Reads what a picture is from its first bytes: JPEG, PNG or WebP, and how many pixels wide and
/// tall it is. Nothing else is a picture here.
///
/// <para>
/// <b>The bytes, never the type a request names.</b> The picture route answers with the type
/// found here, so this decides what the app will serve from its own address. A file that says it
/// is a PNG is only a file that says so, and an SVG can carry script.
/// </para>
///
/// <para>
/// <b>The header, never the picture.</b> Nothing here decodes a pixel. A header that reads
/// correctly over bytes that do not is a broken picture, which a browser told it is a picture
/// (<c>nosniff</c>) shows as one that will not load, and only to the account that sent it. The
/// three are what a browser's canvas writes, which is how the app sends every picture.
/// </para>
/// </summary>
public static class PictureFormat
{
    public const string Jpeg = "image/jpeg";
    public const string Png = "image/png";
    public const string Webp = "image/webp";

    /// <summary>The picture's type and size, or null if it is not one of the three.</summary>
    public static PictureFacts? Read(ReadOnlySpan<byte> bytes)
    {
        var facts = bytes switch
        {
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..] => ReadPng(bytes),
            [0xFF, 0xD8, ..] => ReadJpeg(bytes),
            [0x52, 0x49, 0x46, 0x46, _, _, _, _, 0x57, 0x45, 0x42, 0x50, ..] => ReadWebp(bytes),
            _ => null,
        };

        // A header can say anything. Nought is the one size that could not be drawn, and the
        // database refuses it, so it is not a picture here rather than a 500 there.
        return facts is { Width: > 0, Height: > 0 } ? facts : null;
    }

    /// <summary>
    /// The first chunk of every PNG is IHDR, and its first eight bytes are the width and the
    /// height, big-endian.
    /// </summary>
    private static PictureFacts? ReadPng(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 24 || !bytes[12..16].SequenceEqual("IHDR"u8))
        {
            return null;
        }

        var width = BinaryPrimitives.ReadInt32BigEndian(bytes[16..20]);
        var height = BinaryPrimitives.ReadInt32BigEndian(bytes[20..24]);
        return new PictureFacts(Png, width, height);
    }

    /// <summary>
    /// A JPEG is a run of segments, each a marker and most of them a length, and the size is in
    /// the frame header: whichever start-of-frame marker comes first. A canvas writes a baseline
    /// one, but the walk is the same for all of them, so all of them are read.
    /// </summary>
    private static PictureFacts? ReadJpeg(ReadOnlySpan<byte> bytes)
    {
        var at = 2;
        while (at + 4 <= bytes.Length)
        {
            if (bytes[at] != 0xFF)
            {
                return null;
            }

            var marker = bytes[at + 1];

            // Fill bytes, which a JPEG may put ahead of any marker.
            if (marker == 0xFF)
            {
                at++;
                continue;
            }

            // The markers that stand alone, with no length after them.
            if (marker is 0x01 or (>= 0xD0 and <= 0xD8))
            {
                at += 2;
                continue;
            }

            // The end of the picture, or the start of its data, with no frame said yet.
            if (marker is 0xD9 or 0xDA)
            {
                return null;
            }

            var length = BinaryPrimitives.ReadUInt16BigEndian(bytes[(at + 2)..(at + 4)]);
            if (length < 2)
            {
                return null;
            }

            if (IsStartOfFrame(marker))
            {
                // Its length, then the sample precision, then the height and the width.
                if (at + 9 > bytes.Length)
                {
                    return null;
                }

                var height = BinaryPrimitives.ReadUInt16BigEndian(bytes[(at + 5)..(at + 7)]);
                var width = BinaryPrimitives.ReadUInt16BigEndian(bytes[(at + 7)..(at + 9)]);
                return new PictureFacts(Jpeg, width, height);
            }

            at += 2 + length;
        }

        return null;
    }

    /// <summary>
    /// C0 to CF are the frames, but for three that share the range: C4 (the Huffman tables), C8
    /// (reserved) and CC (arithmetic coding conditions).
    /// </summary>
    private static bool IsStartOfFrame(byte marker) =>
        marker is >= 0xC0 and <= 0xCF and not (0xC4 or 0xC8 or 0xCC);

    /// <summary>
    /// A WebP is a RIFF file whose first chunk says which of three it is, and each keeps the size
    /// somewhere of its own. Chromium writes the extended one, VP8X, for every picture, because
    /// it embeds a colour profile; the simple two are a lone VP8 or VP8L chunk.
    /// </summary>
    private static PictureFacts? ReadWebp(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 16)
        {
            return null;
        }

        var chunk = bytes[12..16];

        // Extended: the canvas's width and height, less one each, in three bytes little-endian.
        if (chunk.SequenceEqual("VP8X"u8))
        {
            return bytes.Length < 30
                ? null
                : new PictureFacts(Webp, 1 + ReadUInt24(bytes[24..27]), 1 + ReadUInt24(bytes[27..30]));
        }

        // Lossy: a key frame's start code, then fourteen bits each of width and height.
        if (chunk.SequenceEqual("VP8 "u8))
        {
            if (bytes.Length < 30 || !bytes[23..26].SequenceEqual((ReadOnlySpan<byte>)[0x9D, 0x01, 0x2A]))
            {
                return null;
            }

            var width = BinaryPrimitives.ReadUInt16LittleEndian(bytes[26..28]) & 0x3FFF;
            var height = BinaryPrimitives.ReadUInt16LittleEndian(bytes[28..30]) & 0x3FFF;
            return new PictureFacts(Webp, width, height);
        }

        // Lossless: a signature byte, then fourteen bits each of width and height, less one.
        if (chunk.SequenceEqual("VP8L"u8))
        {
            if (bytes.Length < 25 || bytes[20] != 0x2F)
            {
                return null;
            }

            var bits = BinaryPrimitives.ReadUInt32LittleEndian(bytes[21..25]);
            return new PictureFacts(Webp, 1 + (int)(bits & 0x3FFF), 1 + (int)((bits >> 14) & 0x3FFF));
        }

        return null;
    }

    private static int ReadUInt24(ReadOnlySpan<byte> bytes) => bytes[0] | bytes[1] << 8 | bytes[2] << 16;
}
