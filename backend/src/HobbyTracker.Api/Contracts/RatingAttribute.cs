using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A rating from 1.0 to 10.0 with at most one decimal place.
///
/// The scale half matters more than it looks. The column is numeric(3,1), and Postgres
/// <em>rounds</em> rather than rejecting: an accepted 8.75 is stored as 8.8, so the response
/// would report a rating the database does not hold. Catching it here keeps the API honest
/// about what it saved.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class RatingAttribute : ValidationAttribute
{
    private const decimal Minimum = 1.0m;
    private const decimal Maximum = 10.0m;

    public RatingAttribute()
        : base("Rating must be between 1.0 and 10.0, with at most one decimal place.")
    {
    }

    public override bool IsValid(object? value) => value switch
    {
        // Null is "not rated yet", which is always allowed.
        null => true,
        decimal rating => rating >= Minimum
                          && rating <= Maximum
                          && decimal.Round(rating, 1) == rating,
        _ => false,
    };
}
