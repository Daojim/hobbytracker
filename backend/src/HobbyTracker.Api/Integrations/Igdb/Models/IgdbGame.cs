namespace HobbyTracker.Api.Integrations.Igdb.Models;

/// <summary>
/// One game as IGDB returns it from /v4/games.
///
/// These types mirror the wire format and stop at the edge of this folder — the catalog
/// service maps them onto domain entities, so nothing above the integration layer has to
/// know that IGDB models "developer" as a flag on a join table.
///
/// Everything except Id is nullable because APIcalypse only returns fields you asked for,
/// and IGDB omits a field entirely rather than sending null when it has no value.
/// </summary>
public sealed class IgdbGame
{
    public int Id { get; set; }
    public string? Name { get; set; }

    /// <summary>
    /// Unix seconds, as IGDB sends it — not a DateTimeOffset, because this type mirrors the
    /// wire and converting here would hide which side the epoch belongs to.
    ///
    /// Read twice, for two different things. The HowLongToBeat matcher takes the year out of it
    /// in UTC; the release calendar uses it to pick which of <see cref="ReleaseDates"/> is the
    /// one being talked about. Those stay separate on purpose — see <b>A refresh does not move
    /// the year the matcher reads</b> in the catalog tests.
    /// </summary>
    public long? FirstReleaseDate { get; set; }

    /// <summary>
    /// Every announced date for the game — <b>one row per platform and per region</b>, so a
    /// game routinely carries several and they do not have to agree. Measured: <i>The Wolf
    /// Among Us 2</i> has six rows all reading 2027, and <i>Inzoi</i> has two real dates and
    /// two TBD ones.
    ///
    /// Taking the first of them is therefore a coin flip that often lands on a Japan-only date
    /// or a re-release. The row that matters is whichever one's <see cref="IgdbReleaseDate.Date"/>
    /// equals <see cref="FirstReleaseDate"/>.
    /// </summary>
    public List<IgdbReleaseDate>? ReleaseDates { get; set; }

    /// <summary>
    /// Where the title is in its life, which outranks any date when it says anything at all.
    /// Absent for most games — neither <i>Grand Theft Auto VI</i> nor <i>The Elder Scrolls VI</i>
    /// carries one — so null here is ordinary rather than a failure.
    ///
    /// This is <c>game_status</c>, not the deprecated <c>status</c>: the twin IGDB deprecates
    /// stops being populated rather than erroring, which is the same trap <c>game_type</c>
    /// already sprang on this client once.
    /// </summary>
    public IgdbGameStatus? GameStatus { get; set; }

    /// <summary>
    /// How many people have rated it, across IGDB members and the outlets it aggregates.
    ///
    /// Read only by <see cref="Services.IgdbRelevance"/>, and never stored: this is a fact
    /// about how many people have played a game today, not a fact about the game, so keeping
    /// a copy would mean holding a number that quietly goes stale and answers for a ranking
    /// nobody would think to re-run.
    /// </summary>
    public int? TotalRatingCount { get; set; }

    /// <summary>
    /// How many people have said they want it. The only signal an unreleased game has, and
    /// so the other half of <see cref="Services.IgdbRelevance"/>'s tie-break.
    /// </summary>
    public int? Hypes { get; set; }

    /// <summary>
    /// The games IGDB calls like this one, as ids — what Discover's From your ratings is made of.
    ///
    /// <b>Always ten</b>, measured on 7 November 2026 over the 63 rated games on the user's board:
    /// never fewer, every one a main game. Fixed for a game, where the other four lists are
    /// recalculated daily, so the list it makes moves only when a rating does. Asked for by
    /// <see cref="IgdbClient.GetSimilarGamesAsync"/> alone.
    /// </summary>
    public List<int>? SimilarGames { get; set; }

    /// <summary>
    /// The game this one is a version of, with that game's own <see cref="SimilarGames"/>: absent
    /// for a game that is nobody's version, which is most of them.
    ///
    /// <para>
    /// <b>One field for every kind of version.</b> Ports, remasters, remakes, expansions, expanded
    /// games and standalone expansions alike: all 30 such titles on the user's board named their
    /// original here, and <c>version_parent</c> was empty on every one of them. IGDB files each
    /// version under an id of its own, so this is how your own game is recognised when it comes
    /// back under another number.
    /// </para>
    ///
    /// <para>
    /// <b>An object, because it is asked for that way.</b> <c>parent_game.similar_games</c> expands
    /// it, which is what lets a version's original be asked about in the same request. Asked for
    /// as plain <c>parent_game</c> it would arrive as a bare id and fail to read — and nothing asks
    /// for it like that.
    /// </para>
    /// </summary>
    public IgdbGame? ParentGame { get; set; }

    /// <summary>
    /// IGDB's own name for the game in an address, <c>nier-automata</c> — which is what Wikidata
    /// files IGDB's id under (P5794), and so the way to OpenCritic's id with no matching at all.
    /// Asked for by <see cref="IgdbClient.GetStoreLinksAsync"/> alone.
    /// </summary>
    public string? Slug { get; set; }

    /// <summary>
    /// The game's pages elsewhere — its own site, its wiki, its store pages — each with what kind
    /// of page it is. <b>The first place a Steam page is looked for</b>, because where an entry names
    /// two Steam apps the store page is always the one here. See <see cref="Services.IgdbSteam"/>.
    /// </summary>
    public List<IgdbWebsite>? Websites { get; set; }

    /// <summary>
    /// The game's ids on other services, each with which service. The second place a Steam page is
    /// looked for, and taken only when it names one app alone.
    /// </summary>
    public List<IgdbExternalGame>? ExternalGames { get; set; }

    public IgdbCover? Cover { get; set; }
    public List<IgdbPlatform>? Platforms { get; set; }
    public List<IgdbGenre>? Genres { get; set; }
    public List<IgdbInvolvedCompany>? InvolvedCompanies { get; set; }
}

/// <summary>
/// One announced release for a game, on one platform in one region.
/// </summary>
public sealed class IgdbReleaseDate
{
    /// <summary>
    /// Unix seconds, and <b>absent entirely on a TBD row</b> rather than nought or null —
    /// measured, and the reason anything matching against it has to skip rows without one.
    ///
    /// For a vague date this is the <i>last</i> day of the window: "Q3 2026" arrives as
    /// 30 September and "2028" as 31 December. It is meaningless without
    /// <see cref="DateFormat"/> beside it.
    /// </summary>
    public long? Date { get; set; }

    /// <summary>
    /// How precisely <see cref="Date"/> is known. IGDB moved this from an inline enum to a
    /// reference endpoint, and the integers that endpoint answers with are published nowhere —
    /// so the string is what gets mapped. See <see cref="IgdbDateFormat"/>.
    /// </summary>
    public IgdbDateFormat? DateFormat { get; set; }
}

/// <summary>
/// IGDB's word for a date's precision, from <c>/v4/date_formats</c>.
///
/// The eight values, read off the live endpoint: <c>YYYYMMDD</c>, <c>YYYYMM</c>, <c>YYYY</c>,
/// <c>YYYYQ1</c> through <c>YYYYQ4</c>, and <c>TBD</c>. Note the spelling — the deprecated
/// inline enum documents these as <c>YYYYMMMMDD</c> and <c>YYYYMMMM</c>, which is one more
/// reason to map what the API says rather than what a doc page does.
/// </summary>
public sealed class IgdbDateFormat
{
    public string? Format { get; set; }
}

/// <summary>
/// IGDB's word for where a game is in its life, from <c>/v4/game_statuses</c>.
///
/// The eight values: <c>Released</c>, <c>Alpha</c>, <c>Beta</c>, <c>Early Access</c>,
/// <c>Offline</c>, <c>Cancelled</c>, <c>Rumored</c>, <c>Delisted</c>. <b>Early Access carries a
/// space</b> where every other value is one word, which is enough to make a parse against enum
/// member names answer null for it.
/// </summary>
public sealed class IgdbGameStatus
{
    public string? Status { get; set; }
}

/// <summary>
/// One of a game's pages elsewhere, from <c>websites</c>.
///
/// <b><c>type</c>, never the deprecated <c>category</c></b>: IGDB leaves a deprecated twin unpopulated
/// rather than removing it, so a lookup written against <c>category</c> finds nothing while reading
/// as correct — <c>game_type</c>'s trap a third time. The ids are <c>/v4/website_types</c>'.
/// </summary>
public sealed class IgdbWebsite
{
    public string? Url { get; set; }
    public int? Type { get; set; }
}

/// <summary>
/// The game's id on another service, from <c>external_games</c>.
///
/// <b><c>external_game_source</c>, never the deprecated <c>category</c></b>, for the reason
/// <see cref="IgdbWebsite.Type"/> gives. The ids are <c>/v4/external_game_sources</c>'. The id
/// itself arrives as a string, because most services' ids are not numbers.
/// </summary>
public sealed class IgdbExternalGame
{
    public string? Uid { get; set; }
    public int? ExternalGameSource { get; set; }
}

public sealed class IgdbCover
{
    /// <summary>Opaque image key, e.g. "co2l7l". Compose a URL with <see cref="IgdbImage"/>.</summary>
    public string? ImageId { get; set; }
}

public sealed class IgdbPlatform
{
    public int Id { get; set; }
    public string? Name { get; set; }
}

/// <summary>
/// IGDB's join between a game and a company. The role is a set of booleans on the join rather
/// than a field on the game, because one company can be developer and publisher at once.
/// </summary>
public sealed class IgdbInvolvedCompany
{
    public bool Developer { get; set; }
    public bool Publisher { get; set; }
    public IgdbCompany? Company { get; set; }
}

public sealed class IgdbCompany
{
    public int Id { get; set; }
    public string? Name { get; set; }
}

/// <summary>
/// One of IGDB's genres. A fixed vocabulary — "Role-playing (RPG)", "Platform", "Shooter" and
/// about twenty more — which is what makes matching on the name workable at all.
/// </summary>
public sealed class IgdbGenre
{
    public int Id { get; set; }
    public string? Name { get; set; }
}
