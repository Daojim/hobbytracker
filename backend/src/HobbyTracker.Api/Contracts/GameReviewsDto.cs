using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// What critics and players say about a game, and the two pages it was read from — the journal's
/// OpenCritic and Steam rows, asked for when the journal opens.
///
/// <para>
/// <b>The ids come with the verdicts</b>, though the journal's read carries them too: the first
/// time a journal asks, this is what finds them, so the answer is how the drawer learns that the
/// title it holds is out of date. A half with an id and no verdict is a link alone — OpenCritic
/// without a key, or a provider that could not be read.
/// </para>
///
/// <para>
/// Facts, not words. The journal writes <i>85 · Mighty · 91% recommend</i> and <i>Very Positive ·
/// 94%</i> from these, in the hobby's file, as the spreadsheet's words are written in the browser.
/// </para>
/// </summary>
/// <param name="OpenCriticId">OpenCritic's number for the game, found or pinned, or null for none.</param>
/// <param name="SteamAppId">The game's Steam store page, or null for none.</param>
/// <param name="OpenCritic">What OpenCritic says, or null when nothing was asked or it could not be read.</param>
/// <param name="Steam">What Steam's players say, or null when nothing was asked or it could not be read.</param>
public sealed record GameReviewsDto(
    int? OpenCriticId,
    int? SteamAppId,
    OpenCriticVerdictDto? OpenCritic,
    SteamVerdictDto? Steam);

/// <summary>
/// OpenCritic's verdict, unrounded. A null score is OpenCritic having none — too few reviews, or
/// not out — which the journal tells apart by whether the game is out.
/// </summary>
/// <param name="TopCriticScore">The top critics' average, or null when OpenCritic has none.</param>
/// <param name="Tier">Mighty, Strong, Fair or Weak, or null with no score.</param>
/// <param name="PercentRecommended">The share of critics who recommend it, or null with too few reviews.</param>
public sealed record OpenCriticVerdictDto(double? TopCriticScore, string? Tier, double? PercentRecommended);

/// <summary>
/// Steam's verdict as its store page prints it for an English reader: its own word, and the counts
/// the share is worked out from.
/// </summary>
/// <param name="Summary">Steam's word: <i>Very Positive</i>, or <i>No user reviews</i> for a game not out.</param>
/// <param name="Positive">How many reviews recommend it.</param>
/// <param name="Total">How many reviews there are, nought for none.</param>
public sealed record SteamVerdictDto(string Summary, int Positive, int Total);

/// <summary>
/// OpenCritic's number for a game, pinned by hand, or null to take the pin back.
///
/// A number and not an address: the journal's box takes a whole pasted OpenCritic address and
/// reads the number out of it, as it writes the address the link goes to, so OpenCritic's address
/// is known in one place. Taking the pin back sends the title to be looked for again.
/// </summary>
public sealed record SetOpenCriticIdRequest([Range(1, int.MaxValue)] int? OpenCriticId);
