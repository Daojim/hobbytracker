using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------- persistence
builder.Services.AddDbContext<HobbyTrackerDbContext>(options => options
    .UseNpgsql(builder.Configuration.GetConnectionString("HobbyTracker"))
    // Maps PascalCase CLR names onto snake_case tables, columns, indexes and keys, so the
    // schema reads like idiomatic Postgres without a HasColumnName call on every property.
    // Explicit ToTable calls in Data/Configurations still win, which is how the lookup
    // tables keep their `_lu` suffix.
    .UseSnakeCaseNamingConvention());

// ---------------------------------------------------------------------- time
// Injected rather than read from DateTime.UtcNow at the point of use, so the rules that stamp
// dates onto a log entry can be tested at a chosen instant instead of at whatever moment the
// suite happens to run.
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);

// The journal records days in one configured zone, not in UTC. Validated at startup for the
// same reason the IGDB credentials are: an unresolvable zone id should fail at boot naming the
// setting, not surface later as dates that are quietly a day out.
builder.Services.AddOptions<JournalOptions>()
    .Bind(builder.Configuration.GetSection(JournalOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(
        options => TimeZoneInfo.TryFindSystemTimeZoneById(options.TimeZone, out _),
        "Journal:TimeZone must be a time zone id .NET can resolve, e.g. 'America/New_York'.")
    .ValidateOnStart();
builder.Services.AddSingleton<IJournalClock, JournalClock>();
builder.Services
    .AddSingleton<IConfigureOptions<Microsoft.AspNetCore.Mvc.JsonOptions>, ConfigureJournalJson>();

// ----------------------------------------------------------- IGDB integration
builder.Services.AddOptions<IgdbOptions>()
    .Bind(builder.Configuration.GetSection(IgdbOptions.SectionName))
    .ValidateDataAnnotations()
    // Fail at startup with a message naming the missing setting, rather than letting absent
    // credentials surface later as an opaque 400 from Twitch on the first search.
    .ValidateOnStart();

// A plain named client for the token flow. TwitchTokenProvider is a singleton (it caches the
// token), so it resolves clients from the factory rather than holding a typed one — see the
// comment on that class.
builder.Services.AddHttpClient(TwitchTokenProvider.HttpClientName);
builder.Services.AddSingleton<IIgdbTokenProvider, TwitchTokenProvider>();

builder.Services.AddTransient<IgdbAuthHandler>();
builder.Services.AddHttpClient<IIgdbClient, IgdbClient>((serviceProvider, client) =>
    {
        var igdb = serviceProvider.GetRequiredService<IOptions<IgdbOptions>>().Value;

        client.BaseAddress = new Uri(igdb.BaseUrl);
        client.Timeout = TimeSpan.FromSeconds(igdb.RequestTimeoutSeconds);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    })
    // Auth is a pipeline concern, so the client itself never mentions tokens.
    .AddHttpMessageHandler<IgdbAuthHandler>();

// -------------------------------------------------- HowLongToBeat integration
// No credentials to validate: HowLongToBeat has no account to hold one, so every setting has a
// working default and nothing here can fail the boot the way a missing IGDB secret does.
builder.Services.AddOptions<HltbOptions>()
    .Bind(builder.Configuration.GetSection(HltbOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// The floor between requests is a singleton so it survives IHttpClientFactory rotating the
// handler chain, which it does every couple of minutes — see HltbThrottle.
builder.Services.AddSingleton<HltbThrottle>();
builder.Services.AddTransient<HltbThrottleHandler>();

// A plain named client for the bundle scrape and the handshake. HltbSession caches both and is
// therefore a singleton, so it resolves clients from the factory rather than holding one — the
// same reasoning as TwitchTokenProvider. Throttled like everything else: a burst of bundle
// fetches is exactly what a site's bot protection is looking for.
builder.Services.AddHttpClient(HltbSession.HttpClientName)
    .AddHttpMessageHandler<HltbThrottleHandler>();
builder.Services.AddSingleton<IHltbSession, HltbSession>();

builder.Services.AddHttpClient<IHltbClient, HltbClient>((serviceProvider, client) =>
    {
        var hltb = serviceProvider.GetRequiredService<IOptions<HltbOptions>>().Value;

        client.BaseAddress = new Uri(hltb.BaseUrl);
        client.Timeout = TimeSpan.FromSeconds(hltb.RequestTimeoutSeconds);

        // No User-Agent here on purpose: HltbClient stamps it on each request itself, because it
        // has to match the one HltbSession used at the handshake and an agreement split across
        // two files is one only the real site can tell you has drifted. See HltbClient.Identify.
    })
    .AddHttpMessageHandler<HltbThrottleHandler>();

// Titles wait here rather than in a request. See HltbQueue.
builder.Services.AddSingleton<IHltbQueue, HltbQueue>();
builder.Services.AddHostedService<HltbWorker>();

builder.Services.AddScoped<IHltbService, HltbService>();
builder.Services.AddScoped<IGameCatalogService, GameCatalogService>();
builder.Services.AddScoped<ILogEntryService, LogEntryService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<ILibraryService, LibraryService>();

// ------------------------------------------------------------------- sign-in
builder.Services.AddOptions<AuthOptions>()
    .Bind(builder.Configuration.GetSection(AuthOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// ValidateDataAnnotations does not recurse into nested option objects, so the provider blocks
// are checked by this instead. See ValidateAuthOptions for why it is worth a class.
builder.Services.AddSingleton<IValidateOptions<AuthOptions>, ValidateAuthOptions>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "hobbytracker.session";

        // The point of choosing a cookie at all: script cannot read it, so an XSS bug anywhere
        // in the app still cannot walk off with somebody's session.
        options.Cookie.HttpOnly = true;

        // Lax, not Strict. The provider comes back as a top-level cross-site GET and Strict
        // withholds the cookie on exactly that navigation, which reads as a sign-in that
        // silently did nothing.
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.SlidingExpiration = true;

        // Without these, an unauthenticated API call is answered with a 302 to a login page;
        // fetch follows it and the caller gets 200 and a lump of HTML, then fails while parsing
        // JSON, miles from the cause. This is an API, so it says so instead.
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    })
    .AddOAuth(AuthProviders.Google, options =>
    {
        // Must match the redirect URI registered with the provider, and the browser has to
        // reach it on the origin it is already on -- see the Vite proxy note in CLAUDE.md.
        options.CallbackPath = $"/api/auth/{AuthProviders.Google}/callback";

        options.Scope.Add("openid");
        options.Scope.Add("email");
        options.Scope.Add("profile");

        // One option, and it closes the interception window on the authorization code.
        options.UsePkce = true;

        // The default is SameSite=None, which browsers refuse without Secure, so the flow fails
        // on plain-http localhost with a correlation error that names nothing useful. Lax is
        // enough for the same reason the session cookie's is: the callback is a top-level
        // navigation rather than a background request.
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;

        // The one part of the dance that is ours. See ExternalSignIn.
        options.Events.OnCreatingTicket = ExternalSignIn.CompleteAsync;
    });

// Everything above is a constant; everything below comes from configuration, and it is resolved
// from the container rather than read here. `builder.Configuration` is still being assembled at
// this point, so a value captured now misses any source added afterwards -- which is exactly
// what the test host does, and it surfaced as every endpoint 500ing on an empty ClientId. The
// IGDB typed client resolves IOptions inside its configuring lambda for the same reason.
builder.Services.AddOptions<CookieAuthenticationOptions>(
        CookieAuthenticationDefaults.AuthenticationScheme)
    .Configure<IOptions<AuthOptions>>((cookie, auth) =>
        cookie.ExpireTimeSpan = TimeSpan.FromDays(auth.Value.SessionDays));

builder.Services.AddOptions<OAuthOptions>(AuthProviders.Google)
    .Configure<IOptions<AuthOptions>>((oauth, auth) =>
    {
        var google = auth.Value.Google;

        oauth.ClientId = google.ClientId;
        oauth.ClientSecret = google.ClientSecret;
        oauth.AuthorizationEndpoint = google.AuthorizationEndpoint;
        oauth.TokenEndpoint = google.TokenEndpoint;
        oauth.UserInformationEndpoint = google.UserInfoEndpoint;
    });

builder.Services.AddAuthorization();

// ------------------------------------------------------------------------ web
builder.Services.AddControllers()
    // LogStatus travels as "Completed", not 2. Readable on the wire, and immune to someone
    // reordering the enum -- which with ordinals would silently reinterpret existing rows.
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
// Registration order is the order they run in, and each returns false for anything that is not
// its own exception type, so appending is safe.
builder.Services.AddExceptionHandler<IgdbExceptionHandler>();
builder.Services.AddExceptionHandler<HltbExceptionHandler>();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

/// <summary>
/// Top-level statements compile into an internal Program class, which
/// WebApplicationFactory&lt;Program&gt; cannot reach. Declaring it public here is what lets the
/// test project boot the real pipeline in-process rather than mirroring its configuration.
/// </summary>
public partial class Program;
