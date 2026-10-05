namespace HobbyTracker.Api.Domain;

/// <summary>
/// A read-only link to one of somebody's boards, for friends and for portfolio reviewers, who
/// otherwise could see nothing without making an account.
///
/// <para>
/// <b>One per board</b>, so unique on the owner and the hobby. Stopping a share deletes the row
/// and sharing again makes a new one with a new token, so whoever had the old address loses it
/// for good — which is what <em>Stop sharing</em> says, and why it asks first.
/// </para>
///
/// <para>
/// <b>The token is kept in plain text</b>, decided by the user on 4 October 2026, so Settings can
/// show the address again whenever it is asked. Anyone who can read it out of the database can
/// already read the board there. Encrypting it with the Data Protection keys, which the nightly
/// dump does not hold, beside a hash to look it up by, was offered and not taken.
/// </para>
/// </summary>
public class BoardShare
{
    public int Id { get; set; }

    /// <summary>Whose board. Cascades from <c>users</c>, so deleting an account kills its shares.</summary>
    public int UserId { get; set; }
    public User? User { get; set; }

    public int HobbyId { get; set; }
    public Hobby? Hobby { get; set; }

    /// <summary>
    /// Sixteen random bytes in base64url: twenty-two characters, and the only part of the address
    /// that is a secret. Unique, and looked up by exact match.
    /// </summary>
    public required string Token { get; set; }

    /// <summary>What the share shows besides Backlog. The shown list: see <see cref="SharePart"/>.</summary>
    public List<SharePart> Parts { get; set; } = [];

    /// <summary>Whether the owner's display name heads the share. Off until ticked.</summary>
    public bool ShowsName { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
