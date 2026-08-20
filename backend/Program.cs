using System.Net.Http.Headers;
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

// ------------------------------------------------------------------------ web
builder.Services.AddControllers();
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
