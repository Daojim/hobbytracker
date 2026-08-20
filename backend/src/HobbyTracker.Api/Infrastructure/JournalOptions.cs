using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// The timezone the journal records days in.
///
/// Not UTC, and not a fixed offset. A game finished at 9pm is finished *that* evening, but UTC
/// has already rolled over by then — so asking UTC what day it is stamps tomorrow onto anything
/// logged after 8pm Eastern, which is most of them. A fixed -5 would fix the evening and break
/// the small hours instead, because Eastern is -4 for two thirds of the year.
/// </summary>
public sealed class JournalOptions
{
    public const string SectionName = "Journal";

    /// <summary>
    /// IANA zone id. .NET resolves IANA ids on Windows as well as Linux, so this is the same
    /// string here as it would be in a container.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string TimeZone { get; set; } = "America/New_York";
}
