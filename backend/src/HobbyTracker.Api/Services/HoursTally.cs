using HobbyTracker.Api.Contracts;

namespace HobbyTracker.Api.Services;

/// <summary>
/// How long some titles take and how long you took, added up — by the rules a column's header
/// states, and in the one place both of the things that add them up go through: a board column
/// over its titles, and the Stats page over a year's finishes.
///
/// <para>
/// <b>A title with no figure is left out and counted, never added as nought</b>, so each sum
/// comes with how many titles it is over and is null rather than zero over none. <b>The
/// comparison is over the titles that have both figures</b>, or a game with no hours logged reads
/// as you having been quick. Added up in C# rather than SQL, whose <c>SUM</c> answers nought for
/// nothing — which is the first rule broken.
/// </para>
/// </summary>
internal static class HoursTally
{
    /// <param name="titles">Each title's length as its card prints it, and your hours on it.</param>
    public static ColumnHours Of(IEnumerable<(decimal? Length, decimal? Played)> titles)
    {
        var timed = titles.Where(title => title.Length is not null).ToList();
        var compared = timed.Where(title => title.Played is not null).ToList();

        return new ColumnHours(
            Length: timed.Count == 0 ? null : timed.Sum(title => title.Length!.Value),
            LengthTitles: timed.Count,
            Played: compared.Count == 0 ? null : compared.Sum(title => title.Played!.Value),
            PlayedLength: compared.Count == 0 ? null : compared.Sum(title => title.Length!.Value),
            PlayedTitles: compared.Count);
    }
}
