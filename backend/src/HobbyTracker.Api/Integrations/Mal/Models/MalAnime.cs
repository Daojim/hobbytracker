namespace HobbyTracker.Api.Integrations.Mal.Models;

/// <summary>
/// One anime, as MAL describes it — and the same class for a search result and for a detail.
///
/// <b>That is the difference from TMDB, and it is MAL being simpler rather than this being
/// written differently.</b> TMDB has two shapes because `/search/movie` genuinely carries less
/// than `/movie/{id}`: no runtime, no genre names, no credits. MAL's search and detail
/// endpoints take the same `fields` parameter and answer with the same node, so a second class
/// here would be one shape copied twice with nothing to distinguish them.
///
/// <b>A node carries `id`, `title` and `main_picture` whatever `fields` asks for, and nothing
/// else.</b> Every property below except those three is opt-in, which is why
/// <see cref="MalClient"/> states its field list in one place: a field left out deserialises to
/// null here and is indistinguishable from a title MAL has nothing to say about.
///
/// Wire types never leave this folder.
/// </summary>
public sealed class MalAnime
{
    public int Id { get; init; }

    /// <summary>
    /// The romaji title — `Sousou no Frieren`. Always present, and what MAL's search matches on.
    /// </summary>
    public string? Title { get; init; }

    public MalPicture? MainPicture { get; init; }

    public MalAlternativeTitles? AlternativeTitles { get; init; }

    /// <summary>`tv`, `movie`, `ova`, `ona`, `special`, `music`.</summary>
    public string? MediaType { get; init; }

    /// <summary>
    /// How many episodes the cour has.
    ///
    /// <b>Nought means unknown, not none.</b> An entry that has not aired returns 0 rather than
    /// null — Frieren's announced 2027 cour does — so both the length figure and the episode
    /// control have to read it that way, and `AnimeCatalogService` maps it to null on the way in.
    /// </summary>
    public int? NumEpisodes { get; init; }

    /// <summary>
    /// How long one episode runs, in <b>seconds</b>. 1470 for Frieren, which is 24m30s.
    ///
    /// Named for MAL's own field and kept in MAL's own unit all the way to the column, where
    /// Postgres converts it. A silent minutes/seconds mix-up is a runtime sixty times out.
    /// </summary>
    public int? AverageEpisodeDuration { get; init; }

    public MalStartSeason? StartSeason { get; init; }

    /// <summary>`finished_airing`, `currently_airing`, `not_yet_aired`.</summary>
    public string? Status { get; init; }

    /// <summary>What it was adapted from: `manga`, `light_novel`, `original`, and a dozen more.</summary>
    public string? Source { get; init; }

    /// <summary>MAL's mean user score, out of ten.</summary>
    public double? Mean { get; init; }

    /// <summary>
    /// How many MAL users have this on a list of any kind, which is the closest thing MAL
    /// publishes to "how many people mean this one".
    ///
    /// It is the whole of <c>MalRelevance</c>'s first rule, and the margins it
    /// decides by are wide: 1.5M against 607k between the two Frieren cours, 2.1M against 416k
    /// between the Bebop series and its film.
    /// </summary>
    public int? NumListUsers { get; init; }

    /// <summary>
    /// MAL's genres, and <b>three taxonomies flattened into one array</b>: genres, themes and
    /// demographics all arrive here together. Frieren comes back as Adventure, Award Winning,
    /// Drama, Fantasy, Shounen — two genres, a MAL tag and a demographic in one list.
    ///
    /// Which is exactly what the client wants: the ordered specific-before-generic list in
    /// `frontend/src/hobbies/anime.ts` works on it directly, with no merging step.
    /// </summary>
    public List<MalNamed>? Genres { get; init; }

    /// <summary>Who animated it — the anime equivalent of a developer or a director.</summary>
    public List<MalNamed>? Studios { get; init; }
}

/// <summary>
/// The cover, at MAL's two sizes.
///
/// <b>Full URLs, so there is no image helper here where TMDB needs one.</b> TMDB sends a bare
/// path and publishes a separate base and a size vocabulary; MAL sends
/// `https://cdn.myanimelist.net/images/anime/1015/138006.jpg` outright.
/// </summary>
public sealed class MalPicture
{
    public string? Medium { get; init; }
    public string? Large { get; init; }
}

/// <summary>
/// What else it is called.
///
/// <c>En</c> is <b>often absent</b>, which is a fact about the entry rather than a fault:
/// plenty of anime have no official English title at all. <c>Synonyms</c> is what makes `fma`
/// find Fullmetal Alchemist, and is read for relevance rather than stored.
/// </summary>
public sealed class MalAlternativeTitles
{
    public string? En { get; init; }
    public string? Ja { get; init; }
    public List<string>? Synonyms { get; init; }
}

/// <summary>Which cour it began in — `{ "year": 2023, "season": "fall" }`.</summary>
public sealed class MalStartSeason
{
    public int? Year { get; init; }
    public string? Season { get; init; }
}

/// <summary>An id and a name, which is the shape MAL uses for both genres and studios.</summary>
public sealed class MalNamed
{
    public int Id { get; init; }
    public string? Name { get; init; }
}
