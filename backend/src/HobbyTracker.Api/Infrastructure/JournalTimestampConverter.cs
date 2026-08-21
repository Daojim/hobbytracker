using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Reads and writes timestamps the way this app means them. Two jobs, both of which the default
/// behaviour gets wrong here.
///
/// **A value with no offset is read as that moment here.** System.Text.Json reads a bare
/// "2026-03-03" as midnight UTC, which is 7pm on the 2nd in Eastern — the same off-by-one the
/// journal clock exists to remove, walked back in through the API. Anything a client sends
/// without a Z or a ±hh:mm is read in the journal's zone instead, because a caller who omits
/// the offset means the wall clock, and here the wall clock is Eastern.
///
/// **Everything is normalised to UTC on the way through.** Npgsql refuses to write a
/// DateTimeOffset with a non-zero offset to a timestamptz column at all, so without this an
/// honest "2026-08-20T21:30:00+09:00" is a 500. Nothing is lost by settling it here: timestamptz
/// stores an instant, so the offset was never going to be persisted either way.
///
/// Registered for DateTimeOffset; System.Text.Json wraps it for DateTimeOffset? on its own.
/// </summary>
public sealed class JournalTimestampConverter(IJournalClock clock) : JsonConverter<DateTimeOffset>
{
    public override DateTimeOffset Read(
        ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var text = reader.GetString();

        // RoundtripKind is what makes the distinction visible: a Z parses as Utc, an explicit
        // ±hh:mm as Local, and a value carrying neither stays Unspecified. Without it the
        // framework quietly assumes the machine's zone, which is not a decision a server should
        // be making from whatever its host happens to be set to.
        if (text is null
            || !DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
        {
            throw new JsonException($"'{text}' is not a timestamp this API can read.");
        }

        if (parsed.Kind is not DateTimeKind.Unspecified)
        {
            // The caller said which moment they meant. Believe them, and settle the offset.
            return new DateTimeOffset(parsed).ToUniversalTime();
        }

        // No offset given, so this is a wall-clock reading and the wall is here.
        //
        // GetUtcOffset resolves the two awkward hours of the year by returning standard time:
        // on the November repeat the earlier 1:30am wins, and the 2:30am that March skips over
        // lands an hour off. Both are unreachable through the UI, which sends real instants.
        return new DateTimeOffset(parsed, clock.Zone.GetUtcOffset(parsed)).ToUniversalTime();
    }

    public override void Write(
        Utf8JsonWriter writer, DateTimeOffset value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToUniversalTime());
}

/// <summary>
/// Puts <see cref="JournalTimestampConverter"/> into MVC's serializer.
///
/// Through IConfigureOptions rather than inline in AddJsonOptions because the converter needs
/// the journal clock, and at the point AddJsonOptions runs there is no container to resolve it
/// from yet.
/// </summary>
public sealed class ConfigureJournalJson(IJournalClock clock)
    : IConfigureOptions<Microsoft.AspNetCore.Mvc.JsonOptions>
{
    public void Configure(Microsoft.AspNetCore.Mvc.JsonOptions options) =>
        options.JsonSerializerOptions.Converters.Add(new JournalTimestampConverter(clock));
}
