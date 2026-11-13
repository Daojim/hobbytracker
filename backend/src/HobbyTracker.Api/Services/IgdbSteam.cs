using System.Globalization;
using System.Text.RegularExpressions;
using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Which Steam app IGDB says is a game's store page, read off the two places IGDB keeps one.
///
/// <para>
/// <b>The <c>websites</c> row of Steam's type first, then a lone <c>external_games</c> row of Steam's
/// source.</b> Measured on the user's board on 12 November 2026: IGDB named a Steam page on the
/// title's own entry for 64 of the 91, in <c>external_games</c> for 62 and in <c>websites</c> alone for
/// two. Eight entries named two apps in <c>external_games</c>, and in all eight the <c>websites</c> row
/// was the store page. The other app was a demo (<i>Until Then</i>), a playtest (<i>Nine Sols</i>), the
/// Japanese release sold as an app of its own (three Trails games), or an old id Steam forwards to
/// the store page (three).
/// </para>
///
/// <para>
/// <b>Two apps and no store page to say which is no app</b>: the eight say the second is as likely
/// to be a demo as the game. Never seen on the board, and a refusal rather than a coin flip.
/// </para>
///
/// <para>
/// Pure and beside <see cref="IgdbRelease"/>, which reads the same answer for the release
/// calendar. A game with no page of its own on Steam gets no Steam row, even when Steam sells it
/// inside a collection: that was round one's decision, so no relation is followed here.
/// </para>
/// </summary>
public static partial class IgdbSteam
{
    /// <summary>Steam, in <c>/v4/website_types</c>.</summary>
    public const int SteamWebsiteType = 13;

    /// <summary>Steam, in <c>/v4/external_game_sources</c>.</summary>
    public const int SteamSource = 1;

    /// <summary>The game's Steam app, or null when IGDB names no single store page for it.</summary>
    public static int? AppIdOf(IgdbGame game)
    {
        var storePage = (game.Websites ?? [])
            .Where(site => site.Type == SteamWebsiteType)
            .Select(site => AppOf(site.Url))
            .FirstOrDefault(app => app is not null);

        if (storePage is not null)
        {
            return storePage;
        }

        List<int> apps =
        [
            .. (game.ExternalGames ?? [])
                .Where(external => external.ExternalGameSource == SteamSource)
                .Select(external => int.TryParse(
                    external.Uid, NumberStyles.None, CultureInfo.InvariantCulture, out var app) ? app : 0)
                .Where(app => app > 0)
                .Distinct(),
        ];

        return apps.Count == 1 ? apps[0] : null;
    }

    /// <summary>
    /// The app in a store address: <c>store.steampowered.com/app/1627720</c>, with or without a slash
    /// and a name after it — the four shapes on the board.
    /// </summary>
    private static int? AppOf(string? url)
    {
        if (url is null)
        {
            return null;
        }

        var match = StoreAddress().Match(url);

        return match.Success
               && int.TryParse(match.Groups[1].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var app)
               && app > 0
            ? app
            : null;
    }

    [GeneratedRegex(@"^https?://store\.steampowered\.com/app/(\d+)(?:[/?#]|$)", RegexOptions.IgnoreCase)]
    private static partial Regex StoreAddress();
}
