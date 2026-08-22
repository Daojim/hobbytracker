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
