namespace HobbyTracker.Api.Domain;

/// <summary>
/// A game somebody has asked never to be offered on Discover again (#23), kept until they take it
/// back.
///
/// <para>
/// <b>That one entry and nothing else</b>: never its series and never its versions, both the
/// user's picks at the workshop on 13 November 2026. Hiding <i>Horizon Zero Dawn</i> leaves its
/// Remastered on the lists, and <i>Forza Horizon 5</i> was never in danger, whatever its name.
/// </para>
///
/// <para>
/// <b>Yours, on a title that is everybody's.</b> The title is the shared catalogue's row, which is
/// what a tile carries and what gives the list of hides a cover and a name; the hide is a person's,
/// keyed on the two together, so one person hiding one game is one row. The lists leave it out by
/// IGDB id, which they reach through the title's <c>external_id</c>, because a list is IGDB's
/// answer before anything is stored.
/// </para>
/// </summary>
public class DiscoverHide
{
    /// <summary>Whose hide. Cascades from <c>users</c>, so deleting an account takes its hides.</summary>
    public int UserId { get; set; }
    public User? User { get; set; }

    /// <summary>The title hidden: a game, in practice one IGDB answered for.</summary>
    public int MediaId { get; set; }
    public Media? Media { get; set; }

    /// <summary>
    /// When it was hidden, which orders the list of hides newest first. A second hide of the same
    /// game is the first one, so this never moves.
    /// </summary>
    public DateTimeOffset HiddenAt { get; set; }
}
