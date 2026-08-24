using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Sign-in configuration, one block per provider.
///
/// Every endpoint is a setting rather than a constant, for the reason <c>Igdb:BaseUrl</c> is:
/// it is what lets the end-to-end suite point the real handler at a local stub, so the code
/// that runs against Google is the code the specs exercise.
/// </summary>
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public AuthProviderOptions Google { get; set; } = new();

    public AuthProviderOptions Discord { get; set; } = new();

    /// <summary>
    /// How long a session lasts. Sliding, so using the app renews it and only a month away
    /// signs you out.
    /// </summary>
    [Range(1, 365)]
    public int SessionDays { get; set; } = 30;
}

/// <summary>
/// One OAuth provider. Discord is a second one of these and nothing else — which is the whole
/// reason the generic handler was chosen over a provider-specific package.
/// </summary>
public sealed class AuthProviderOptions
{
    /// <summary>
    /// OAuth client id. Register the application with the provider — Google's console is at
    /// https://console.cloud.google.com/apis/credentials.
    /// Supplied via user-secrets in development — never appsettings.json.
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>OAuth client secret. See <see cref="ClientId"/>.</summary>
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>Where the browser is sent to sign in.</summary>
    public string AuthorizationEndpoint { get; set; } = string.Empty;

    /// <summary>Where the authorization code is exchanged for an access token.</summary>
    public string TokenEndpoint { get; set; } = string.Empty;

    /// <summary>Where that token is spent, to learn who signed in.</summary>
    public string UserInfoEndpoint { get; set; } = string.Empty;
}

/// <summary>
/// Checks the provider blocks by hand, because <c>ValidateDataAnnotations</c> does not recurse
/// into nested option objects — a <c>[Required]</c> on <see cref="AuthProviderOptions.ClientId"/>
/// would look right and validate nothing at all.
///
/// Doing it here rather than through a <c>.Validate(predicate, message)</c> pair is what lets the
/// failure name the exact key that is missing. A boot that stops saying "Auth:Google:ClientId" is
/// worth a great deal more than one saying the Auth section is invalid.
/// </summary>
public sealed class ValidateAuthOptions : IValidateOptions<AuthOptions>
{
    public ValidateOptionsResult Validate(string? name, AuthOptions options)
    {
        List<string> failures = [];

        Check(options.Google, $"{AuthOptions.SectionName}:{nameof(AuthOptions.Google)}", failures);
        Check(options.Discord, $"{AuthOptions.SectionName}:{nameof(AuthOptions.Discord)}", failures);

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }

    private static void Check(AuthProviderOptions provider, string path, List<string> failures)
    {
        Required(provider.ClientId, $"{path}:{nameof(provider.ClientId)}", failures);
        Required(provider.ClientSecret, $"{path}:{nameof(provider.ClientSecret)}", failures);

        Endpoint(provider.AuthorizationEndpoint, $"{path}:{nameof(provider.AuthorizationEndpoint)}", failures);
        Endpoint(provider.TokenEndpoint, $"{path}:{nameof(provider.TokenEndpoint)}", failures);
        Endpoint(provider.UserInfoEndpoint, $"{path}:{nameof(provider.UserInfoEndpoint)}", failures);
    }

    private static void Required(string value, string key, List<string> failures)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            failures.Add($"{key} is required.");
        }
    }

    /// <summary>
    /// An endpoint has to be an absolute URL. A relative one binds happily and then surfaces as
    /// a redirect to nowhere on somebody's first sign-in, which names nothing useful.
    /// </summary>
    private static void Endpoint(string value, string key, List<string> failures)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            failures.Add($"{key} is required.");
        }
        else if (!Uri.TryCreate(value, UriKind.Absolute, out _))
        {
            failures.Add($"{key} must be an absolute URL, e.g. https://example.com/authorize.");
        }
    }
}
