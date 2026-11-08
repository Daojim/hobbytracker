using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Discover's From your ratings, as a rule: which of your titles start it, what each one points at,
/// what is left out, and the order. Pure, so the whole of the list's judgement sits in one place
/// with the measurements behind it; <see cref="GameCatalogService"/> does the reading, the asking
/// and the storing.
///
/// <para>
/// Every number here was measured against the user's own board on 7 November 2026 before it was
/// chosen — 91 titles, 63 rated — and each choice was made with the list it made on screen. See
/// #17 in docs/plans/games-board-next.md, and <b>From your ratings</b> in docs/games-igdb.md.
/// </para>
/// </summary>
internal static class FromYourRatings
{
    /// <summary>
    /// How highly a title's latest finish has to be rated to start the list: 38 of the user's 63.
    /// Picked over 9 and up (15 titles), 8.5 and up (20) and any rating at all.
    /// </summary>
    public const decimal SeedRating = 8m;

    /// <summary>
    /// How many people have to have rated a game for the list to offer it. Under it, IGDB's
    /// "similar" is mostly games nobody has heard of: 43 of the 263 the list would otherwise have
    /// held. A floor on how many rated a game judges whether it is known rather than whether it is
    /// good, which is what the user wanted — nothing here rests on IGDB's scores.
    /// </summary>
    public const int FewestRatings = 10;

    /// <summary>
    /// The titles that start the list, <b>highest rated first and then by name</b> — the order a
    /// tile names them in, so the one it leads with never depends on which was logged first.
    /// </summary>
    public static IReadOnlyList<BoardTitle> Seeds(IEnumerable<BoardTitle> board) =>
    [
        .. board
            .Where(title => title.LatestFinish >= SeedRating)
            .OrderByDescending(title => title.LatestFinish)
            .ThenBy(title => title.Title, StringComparer.OrdinalIgnoreCase)
            .ThenBy(title => title.IgdbId),
    ];

    /// <summary>
    /// Every game your seeds name, and the seeds that name it, in <see cref="Seeds"/>' order.
    ///
    /// <para>
    /// <b>A seed that is a version of another game names its original's ten</b>, not its own. For
    /// the 19 rated versions on the user's board their own lists held 66 games fifty or more people
    /// had rated, and their originals' held 124; and the hubs IGDB calls similar to everything came
    /// mostly from the versions — <i>Towerborne</i>, rated by nobody, fell from 2nd to 46th.
    /// </para>
    ///
    /// <para>
    /// <b>Left out: every title on your board and every board title's original</b>, which is the
    /// same game under another id. IGDB files a port, a remake or an expansion under an id of its
    /// own, and on the user's board ten originals came back that way — <i>Symphony of the
    /// Night</i>, <i>Marvel's Spider-Man</i> behind <i>Miles Morales</i> — until this rule took all
    /// ten off. Comparing names found none it missed, and a name is not a link: a game IGDB ties to
    /// nothing on the board is offered, whatever it is called.
    /// </para>
    /// </summary>
    /// <param name="board">Every title on your board, any column.</param>
    /// <param name="seeds">The titles that start the list, from <see cref="Seeds"/>.</param>
    /// <param name="answers">IGDB's answer about every board title: its ten, and its original's.</param>
    public static IReadOnlyDictionary<int, IReadOnlyList<BoardTitle>> PointedAt(
        IReadOnlyCollection<BoardTitle> board,
        IReadOnlyList<BoardTitle> seeds,
        IReadOnlyList<IgdbGame> answers)
    {
        var answered = answers.DistinctBy(answer => answer.Id).ToDictionary(answer => answer.Id);

        HashSet<int> leftOut = [.. board.Select(title => title.IgdbId)];
        leftOut.UnionWith(answers
            .Select(answer => answer.ParentGame?.Id)
            .Where(original => original.HasValue)
            .Select(original => original!.Value));

        var pointers = new Dictionary<int, List<BoardTitle>>();

        foreach (var seed in seeds)
        {
            // A board title IGDB no longer answers for brings nothing, and names nothing wrong.
            if (!answered.TryGetValue(seed.IgdbId, out var answer))
            {
                continue;
            }

            var named = answer.ParentGame is { } original ? original.SimilarGames : answer.SimilarGames;

            foreach (var id in (named ?? []).Distinct().Where(id => !leftOut.Contains(id)))
            {
                if (!pointers.TryGetValue(id, out var by))
                {
                    pointers[id] = by = [];
                }

                by.Add(seed);
            }
        }

        return pointers.ToDictionary(pair => pair.Key, IReadOnlyList<BoardTitle> (pair) => pair.Value);
    }

    /// <summary>
    /// The list in its order: <b>how many of your seeds name a game, then how many people rated
    /// it</b>, then IGDB's id so the order is the same on every page and every machine.
    ///
    /// <para>
    /// Few games are named twice — 205 of 262 on the user's list were named by one seed — so it is
    /// mostly the second key that orders the list. Ordered by it alone, the list read <i>Grand Theft
    /// Auto V, God of War, BioShock Infinite</i>: what is best known rather than what is like your
    /// games, and the user picked this over that.
    /// </para>
    /// </summary>
    /// <param name="offered">The named games IGDB would let a list offer, from its second question.</param>
    /// <param name="pointedAt">What each named game was named by, from <see cref="PointedAt"/>.</param>
    public static IReadOnlyList<IgdbGame> Rank(
        IReadOnlyList<IgdbGame> offered, IReadOnlyDictionary<int, IReadOnlyList<BoardTitle>> pointedAt) =>
    [
        .. offered
            .DistinctBy(game => game.Id)
            .Where(game => pointedAt.ContainsKey(game.Id))
            .OrderByDescending(game => pointedAt[game.Id].Count)
            .ThenByDescending(game => game.TotalRatingCount ?? 0)
            .ThenBy(game => game.Id),
    ];
}

/// <summary>One title on your board, as From your ratings reads it.</summary>
/// <param name="IgdbId">Its <c>media.external_id</c>, which is what IGDB is asked about.</param>
/// <param name="Title">The name its card leads with.</param>
/// <param name="LatestFinish">
/// The rating on its latest finished pass — in Completed, and latest by <c>logged_at DESC, id
/// DESC</c> — or null for a title not finished or not rated when it was. A title finished twice
/// counts by its latest finish, whatever an earlier one was rated.
/// </param>
internal sealed record BoardTitle(int IgdbId, string Title, decimal? LatestFinish);
