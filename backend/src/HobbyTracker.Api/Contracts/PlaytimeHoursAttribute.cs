using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// How long a pass took, in hours: greater than nought, at most 999.99, and no finer than two
/// decimal places.
///
/// The scale half is the rating's hazard one place further out. The column is numeric(5,2), and
/// Postgres <em>rounds</em> rather than rejecting, so an accepted 12.345 is stored as 12.35 and
/// the response would report a number the database does not hold.
///
/// The ceiling is a different failure: overflowing numeric(5,2) throws rather than rounding, so
/// without this a caller's 1000 would come back as a 500 instead of a 400.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class PlaytimeHoursAttribute : ValidationAttribute
{
    private const decimal Maximum = 999.99m;

    public PlaytimeHoursAttribute()
        : base("Hours played must be greater than 0 and at most 999.99, "
               + "with at most two decimal places.")
    {
    }

    public override bool IsValid(object? value) => value switch
    {
        // Null is "not recorded", which is always allowed — and is how a number is taken back.
        null => true,
        decimal hours => hours > 0
                         && hours <= Maximum
                         && decimal.Round(hours, 2) == hours,
        _ => false,
    };
}
