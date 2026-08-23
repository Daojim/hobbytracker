using System.Threading.Channels;

namespace HobbyTracker.Api.Infrastructure;

public interface IHltbQueue
{
    /// <summary>
    /// Asks for a title to be looked up on HowLongToBeat, and returns immediately.
    ///
    /// Never blocks and never throws: nothing a person does should wait on HowLongToBeat, and a
    /// full queue is not worth failing an unrelated request over.
    /// </summary>
    void Enqueue(int mediaId);

    IAsyncEnumerable<int> ReadAllAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Titles waiting to be looked up on HowLongToBeat.
///
/// This is what makes "nothing a user does ever blocks on HLTB" true rather than aspirational.
/// Adding a game to the board writes a log entry and drops an id in here; the reply goes back
/// before anything has been asked of the site. The backfill does the same thing for the whole
/// library at once, which is why it answers 202 rather than reporting a count of what changed —
/// at a two-second floor between requests, fifty titles is a hundred seconds, and no HTTP
/// request should be held open for that.
///
/// Bounded, and drops the newest when full rather than blocking the writer. The queue is a
/// convenience, not a ledger: anything missed is picked up by the next backfill, since
/// hltb_checked_at still says the title was never asked about.
/// </summary>
public sealed class HltbQueue : IHltbQueue
{
    private const int Capacity = 1000;

    private readonly Channel<int> _channel = Channel.CreateBounded<int>(
        new BoundedChannelOptions(Capacity)
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true,
        });

    public void Enqueue(int mediaId) => _channel.Writer.TryWrite(mediaId);

    public IAsyncEnumerable<int> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}
