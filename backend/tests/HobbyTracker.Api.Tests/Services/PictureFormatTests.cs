using System.Text;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// What a picture is, read from its bytes. The picture route answers with the type this finds,
/// so it decides what the app will serve from its own address. Never from the type a request
/// names: a file that says it is a PNG is only a file that says so.
/// </summary>
public sealed class PictureFormatTests
{
    public static TheoryData<string, byte[], string> WhatABrowserWrites => new()
    {
        { "PNG", Pictures.Png, "image/png" },
        { "JPEG", Pictures.Jpeg, "image/jpeg" },
        { "WebP, extended", Pictures.Webp, "image/webp" },
        { "WebP, extended for alpha", Pictures.WebpWithAlpha, "image/webp" },
        { "WebP, lossy", Pictures.WebpSimpleLossy, "image/webp" },
        { "WebP, lossless", Pictures.WebpSimpleLossless, "image/webp" },
    };

    [Theory]
    [MemberData(nameof(WhatABrowserWrites))]
    public void Reads_the_type_and_size_of_what_a_browser_writes(string name, byte[] bytes, string type)
    {
        var picture = PictureFormat.Read(bytes).ShouldNotBeNull(name);

        picture.ContentType.ShouldBe(type);
        picture.Width.ShouldBe(3);
        picture.Height.ShouldBe(2);
    }

    [Fact]
    public void Tells_a_width_from_a_height()
    {
        // Three by two would read the same with the two swapped, so this is the case that says
        // which is which. The <img> is drawn with them, and a phone photo is taller than wide.
        var picture = PictureFormat.Read(Pictures.JpegPortrait).ShouldNotBeNull();

        picture.Width.ShouldBe(2);
        picture.Height.ShouldBe(3);
    }

    [Fact]
    public void Finds_a_progressive_jpegs_frame_past_whatever_comes_ahead_of_it()
    {
        // A canvas writes a baseline JPEG, but the frame header is all that is read, and a
        // progressive one keeps it under another marker. Ahead of it here: an APP0 segment, and
        // the fill bytes a JPEG may put before any marker.
        byte[] bytes =
        [
            0xFF, 0xD8,
            0xFF, 0xE0, 0x00, 0x10, .. Encoding.ASCII.GetBytes("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0,
            0xFF, 0xFF, 0xFF,
            0xFF, 0xC2, 0x00, 0x11, 0x08, 0x02, 0xD0, 0x05, 0x00, 0x03,
            0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
            0xFF, 0xD9,
        ];

        var picture = PictureFormat.Read(bytes).ShouldNotBeNull();

        picture.ContentType.ShouldBe("image/jpeg");
        picture.Width.ShouldBe(1280);
        picture.Height.ShouldBe(720);
    }

    public static TheoryData<string, byte[]> NotAPicture => new()
    {
        { "nothing", [] },
        { "an SVG, which can carry script", Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>") },
        { "a page", Encoding.UTF8.GetBytes("<!doctype html><title>x</title><script>alert(1)</script>") },
        { "a GIF, which no canvas writes", [.. Encoding.ASCII.GetBytes("GIF89a"), 3, 0, 2, 0, 0, 0, 0] },
        { "a RIFF file that is not a WebP", [.. Encoding.ASCII.GetBytes("RIFF"), 36, 0, 0, 0, .. Encoding.ASCII.GetBytes("WAVEfmt "), 16, 0, 0, 0, 1, 0, 1, 0, 0x44, 0xAC, 0, 0, 0x88, 0x58, 1, 0, 2, 0, 16, 0] },
        { "a PNG cut off after its signature", Pictures.Png[..8] },
        { "a JPEG with no frame before its picture data", [0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x08, 1, 1, 0, 0, 0x3F, 0] },
        { "a WebP cut off inside its header", Pictures.WebpSimpleLossy[..24] },
    };

    [Theory]
    [MemberData(nameof(NotAPicture))]
    public void Refuses_anything_it_cannot_read_as_one_of_the_three(string name, byte[] bytes)
    {
        PictureFormat.Read(bytes).ShouldBeNull(name);
    }

    [Fact]
    public void A_picture_that_says_it_is_nought_wide_is_not_a_picture()
    {
        // A header can say anything. Nought is the one reading that could not be drawn, and the
        // database refuses it, so it is refused here as a 400 rather than there as a 500.
        var bytes = Pictures.Png;
        bytes[16] = bytes[17] = bytes[18] = bytes[19] = 0;

        PictureFormat.Read(bytes).ShouldBeNull();
    }
}
