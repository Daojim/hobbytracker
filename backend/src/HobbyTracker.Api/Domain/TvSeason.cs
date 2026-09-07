namespace HobbyTracker.Api.Domain;

/// <summary>
/// One season of a <see cref="TvShow"/>: which one it is, what it is called, and how many
/// episodes are in it.
///
/// **Its whole purpose is the journal's two dropdowns** — pick a season, and the episode list
/// that follows is that season's real length rather than a guess. Which is also why it carries
/// no air dates and no episode names: storing those would be a per-episode catalogue, and
/// nothing has asked for one.
///
/// **The key is (media_id, season_number), natural rather than surrogate.** A show cannot have
/// two season 3s, and saying so in the primary key means the database refuses a duplicate rather
/// than the refresh code having to remember not to write one. There is deliberately no
/// <c>DbSet</c> for this: seasons are only ever reached through their show, and leaving the set
/// off makes that true in the type system instead of in a comment.
/// </summary>
public class TvSeason
{
    /// <summary>The show this belongs to — half of the primary key, and the foreign key.</summary>
    public int MediaId { get; set; }

    /// <summary>
    /// TMDB's own season number, and the other half of the key.
    ///
    /// **0 is Specials, not a missing value.** `ck_tv_seasons_season_number` allows nought for
    /// that reason, and so does the constraint on a pass's `season_number`.
    /// </summary>
    public int SeasonNumber { get; set; }

    /// <summary>
    /// How many episodes are in it. This is the number that decides how long the journal's
    /// episode list is once a season is chosen, which is the whole reason any of this is stored.
    ///
    /// Nought is allowed rather than refused: TMDB really does list an announced season with no
    /// episodes yet, and that is a fact about the show rather than a mapping mistake — unlike a
    /// runtime of nought, which is why that one is refused and this one is not.
    /// </summary>
    public int EpisodeCount { get; set; }

    /// <summary>
    /// What TMDB calls it — usually "Season 3", occasionally a real name for an anthology or
    /// "Specials". Null where TMDB has none, in which case the client falls back to the number.
    /// </summary>
    public string? Name { get; set; }

    public TvShow? Show { get; set; }
}
