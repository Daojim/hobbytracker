namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A page of results plus the count needed to render a pager.
///
/// List endpoints return this envelope from the start rather than a bare array. Retrofitting
/// pagination later means changing the response shape, which breaks every existing client —
/// cheap now, expensive once a frontend exists.
///
/// Not sealed, so that a list can carry what is true of all its pages beside the one it hands
/// back: a board column's hours are <see cref="LibraryPage"/>.
/// </summary>
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize)
{
    public static PagedResult<T> Empty(int page, int pageSize) => new([], 0, page, pageSize);
}

/// <summary>Shared paging bounds, so every list endpoint agrees on them.</summary>
public static class Paging
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 100;

    /// <summary>Clamps caller-supplied paging into something safe to hand to the database.</summary>
    public static (int Page, int PageSize) Normalise(int? page, int? pageSize) =>
        (Math.Max(page ?? 1, 1), Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize));
}
