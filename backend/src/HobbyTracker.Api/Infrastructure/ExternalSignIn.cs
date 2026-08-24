using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authentication.OAuth;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// The one thing the generic OAuth handler leaves to the application: spending the access token
/// on the provider's user-info endpoint, and turning the answer into a session.
///
/// It lives here rather than as a lambda in <c>Program.cs</c> because that file is the
/// composition root and nothing else.
/// </summary>
public static class ExternalSignIn
{
    /// <summary>
    /// Property names to read the subject, address and name from. Google says <c>sub</c> and
    /// <c>name</c>; Discord says <c>id</c> and <c>global_name</c>, falling back to
    /// <c>username</c>. A short list of aliases rather than a per-provider reader, because that
    /// is the entire difference between the two and a class per provider would be ceremony.
    /// </summary>
    private static readonly string[] SubjectNames = ["sub", "id"];
    private static readonly string[] EmailNames = ["email"];
    private static readonly string[] DisplayNames = ["name", "global_name", "username"];

    public static async Task CompleteAsync(OAuthCreatingTicketContext context)
    {
        var payload = await FetchUserAsync(context);

        var subject = Read(payload, SubjectNames)
            ?? throw new InvalidOperationException(
                $"{context.Scheme.Name} returned no subject to identify the account by.");

        var identity = new ExternalIdentity(
            context.Scheme.Name,
            subject,
            Read(payload, EmailNames),
            Read(payload, DisplayNames));

        var users = context.HttpContext.RequestServices.GetRequiredService<IAuthService>();
        var user = await users.SignInAsync(identity, context.HttpContext.RequestAborted);

        // The ticket carries the app's identity, never the provider's. Nothing downstream has to
        // know which provider you used, which is what lets Discord land on the same account
        // later without a second code path reading a second kind of subject.
        context.Identity?.AddClaim(new Claim(
            ClaimTypes.NameIdentifier, user.Id.ToString(CultureInfo.InvariantCulture)));
        context.Identity?.AddClaim(new Claim(ClaimTypes.Name, user.DisplayName));
    }

    private static async Task<JsonElement> FetchUserAsync(OAuthCreatingTicketContext context)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", context.AccessToken);

        using var response = await context.Backchannel.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, context.HttpContext.RequestAborted);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(context.HttpContext.RequestAborted);

        // Cloned because the document is disposed with this method and the element outlives it.
        using var document = JsonDocument.Parse(body);
        return document.RootElement.Clone();
    }

    private static string? Read(JsonElement payload, string[] names)
    {
        foreach (var name in names)
        {
            if (payload.TryGetProperty(name, out var value)
                && value.ValueKind is JsonValueKind.String or JsonValueKind.Number)
            {
                var text = value.ValueKind == JsonValueKind.String
                    ? value.GetString()
                    : value.GetRawText();

                if (!string.IsNullOrWhiteSpace(text))
                {
                    return text;
                }
            }
        }

        return null;
    }
}
