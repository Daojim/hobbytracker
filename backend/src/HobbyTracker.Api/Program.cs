using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Services;
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

builder.Services.AddScoped<IGameCatalogService, GameCatalogService>();
builder.Services.AddScoped<ILogEntryService, LogEntryService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<ILibraryService, LibraryService>();

// ------------------------------------------------------------------------ web
builder.Services.AddControllers()
    // LogStatus travels as "Completed", not 2. Readable on the wire, and immune to someone
    // reordering the enum -- which with ordinals would silently reinterpret existing rows.
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<IgdbExceptionHandler>();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

/// <summary>
/// Top-level statements compile into an internal Program class, which
/// WebApplicationFactory&lt;Program&gt; cannot reach. Declaring it public here is what lets the
/// test project boot the real pipeline in-process rather than mirroring its configuration.
/// </summary>
public partial class Program;
