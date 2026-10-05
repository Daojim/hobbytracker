using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// Your board's share link, as Settings shows it: the token that makes its address, and what it
/// shows. The address itself is the client's to build, because only the browser knows the origin
/// it is on.
/// </summary>
public sealed record ShareDto(string Token, IReadOnlyList<SharePart> Parts, bool ShowsName);

/// <summary>
/// What a share should show: the dialog's boxes, every one of them, since a box writes as it is
/// ticked and an absent part is one that is off. Backlog is not among them, because every share
/// shows it. A part named twice is one part.
/// </summary>
public sealed record ShareRequest([Required] IReadOnlyList<SharePart>? Parts, bool ShowsName);

/// <summary>
/// A share, as anybody holding its link sees it: which board it is, what it shows, and the owner's
/// name. <b>The name is null unless the owner ticked it</b>, and nothing else any of a share's
/// routes answers with carries it.
/// </summary>
public sealed record SharedBoardDto(string Hobby, IReadOnlyList<SharePart> Parts, string? Name);
