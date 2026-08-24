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
    /// wire and converting here would hide which side the epoch belongs to. Only the year is
    /// ever used, by the HowLongToBeat matcher.
    /// </summary>
    public long? FirstReleaseDate { get; set; }

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

    public IgdbCover? Cover { get; set; }
    public List<IgdbPlatform>? Platforms { get; set; }
    public List<IgdbGenre>? Genres { get; set; }
    public List<IgdbInvolvedCompany>? InvolvedCompanies { get; set; }
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
