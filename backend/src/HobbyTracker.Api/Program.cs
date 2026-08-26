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
using Microsoft.AspNetCore.DataProtection;
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

// -------------------------------------------------- the app's public address
// What the outside world reaches this app at, for when a proxy in front means that is not what
// Kestrel sees. Absent in development and in both test harnesses, where the request already
// carries the right answer -- see PublicOriginMiddleware for why this is pinned rather than read
// off X-Forwarded-*. Validated at startup for the reason Journal:TimeZone is: a malformed one
// surfaces as every sign-in being refused, by a provider, on somebody else's server.
builder.Services.AddOptions<PublicOriginOptions>()
    .Bind(builder.Configuration.GetSection(PublicOriginOptions.SectionName))
    .ValidateOnStart();

builder.Services.AddSingleton<IValidateOptions<PublicOriginOptions>, ValidatePublicOriginOptions>();

// ------------------------------------------------------------------- sign-in
builder.Services.AddOptions<AuthOptions>()
    .Bind(builder.Configuration.GetSection(AuthOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// ValidateDataAnnotations does not recurse into nested option objects, so the provider blocks
// are checked by this instead. See ValidateAuthOptions for why it is worth a class.
builder.Services.AddSingleton<IValidateOptions<AuthOptions>, ValidateAuthOptions>();
builder.Services.AddScoped<IAuthService, AuthService>();

// Whose rows a request is about. See CurrentUser for why this is injected into the services
// rather than applied as an EF global query filter.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

// Google is OpenID Connect, so it wants the openid scope; Discord is plain OAuth and does not
// have one. Both need whatever grants a name and an address.
string[] GoogleScopes = ["openid", "email", "profile"];
string[] DiscordScopes = ["identify", "email"];

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
    .AddOAuth(AuthProviders.Google, options => Provider(options, AuthProviders.Google, GoogleScopes))
    .AddOAuth(AuthProviders.Discord, options => Provider(options, AuthProviders.Discord, DiscordScopes));

// A provider is a scheme name, a set of scopes and a block of configuration -- which is the
// whole reason the framework's generic OAuth handler was chosen over a provider-specific
// package. Adding a third is two lines above and five values in appsettings.
static void Provider(OAuthOptions options, string scheme, IEnumerable<string> scopes)
{
    // Must match the redirect URI registered with the provider, and the browser has to reach it
    // on the origin it is already on -- see the Vite proxy note in CLAUDE.md.
    options.CallbackPath = $"/api/auth/{scheme}/callback";

    foreach (var scope in scopes)
    {
        options.Scope.Add(scope);
    }

    // One option, and it closes the interception window on the authorization code.
    options.UsePkce = true;

    // The default is SameSite=None, which browsers refuse without Secure, so the flow fails on
    // plain-http localhost with a correlation error that names nothing useful. Lax is enough for
    // the same reason the session cookie's is: the callback is a top-level navigation rather
    // than a background request.
    options.CorrelationCookie.SameSite = SameSiteMode.Lax;

    // The one part of the dance that is ours. See ExternalSignIn, which reads both providers'
    // user-info shapes -- Google says `sub` and `name`, Discord says `id` and `global_name`.
    options.Events.OnCreatingTicket = ExternalSignIn.CompleteAsync;
}

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
    .Configure<IOptions<AuthOptions>>((oauth, auth) => Credentials(oauth, auth.Value.Google));

builder.Services.AddOptions<OAuthOptions>(AuthProviders.Discord)
    .Configure<IOptions<AuthOptions>>((oauth, auth) => Credentials(oauth, auth.Value.Discord));

static void Credentials(OAuthOptions options, AuthProviderOptions provider)
{
    options.ClientId = provider.ClientId;
    options.ClientSecret = provider.ClientSecret;
    options.AuthorizationEndpoint = provider.AuthorizationEndpoint;
    options.TokenEndpoint = provider.TokenEndpoint;
    options.UserInformationEndpoint = provider.UserInfoEndpoint;
}

builder.Services.AddAuthorization();

// ------------------------------------------- the keys that encrypt the session
// The session cookie is self-contained and encrypted, so the key ring decides whether a session
// survives a restart. Windows persists it under %LOCALAPPDATA% and Linux under $HOME, which is
// why development never notices -- but a container filesystem goes with the container, so
// without somewhere durable to put them every redeploy signs everybody out. There will be a lot
// of redeploys.
//
// Read from builder.Configuration here rather than resolved from the container, unlike the
// credentials below. The distinction is what sets it: those are varied by the test host, whose
// configuration source is added after this line runs, and this is a hosting path no test ever
// sets. Environment variables are already in builder.Configuration by now, which is how a
// deployment supplies it.
var keyRingPath = builder.Configuration["DataProtection:KeyRingPath"];

if (!string.IsNullOrWhiteSpace(keyRingPath))
{
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(keyRingPath))
        // Keys are found by application name, so a rename orphans the ring and signs everybody
        // out exactly as losing the directory would. Said out loud rather than defaulted from
        // the assembly name, which is a thing a refactor is allowed to change.
        .SetApplicationName("HobbyTracker");
}

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

// First, and the ordering is load-bearing rather than tidy. UseHttpsRedirection decides from
// Request.IsHttps, so a pin after it redirects a request that already arrived over TLS -- and
// UseAuthentication is where the OAuth handler answers the callback and exchanges the code,
// which has to send the same redirect_uri the challenge did or the provider refuses the swap.
// Being ahead of UseHttpsRedirection puts it ahead of both.
app.UsePublicOrigin();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Migrations run themselves in production, and only there.
//
// One instance, so there is no second writer to race for the lock. Guarded rather than
// unconditional because both test harnesses already apply migrations their own way -- the
// backend suite through PostgresFixture, Playwright through a `dotnet ef database update`
// chained into the API's own command -- and a third caller would be racing them.
if (app.Environment.IsProduction())
{
    await using var migrationScope = app.Services.CreateAsyncScope();

    await migrationScope.ServiceProvider
        .GetRequiredService<HobbyTrackerDbContext>()
        .Database
        .MigrateAsync();
}

app.Run();

/// <summary>
/// Top-level statements compile into an internal Program class, which
/// WebApplicationFactory&lt;Program&gt; cannot reach. Declaring it public here is what lets the
/// test project boot the real pipeline in-process rather than mirroring its configuration.
/// </summary>
public partial class Program;
