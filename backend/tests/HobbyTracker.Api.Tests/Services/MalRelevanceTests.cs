using HobbyTracker.Api.Integrations.Mal.Models;
using HobbyTracker.Api.Services;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Every case here is a search MAL got wrong, measured against the live API on
/// 7 September 2026 with a real client id, and named after what it got wrong.
///
/// <see cref="IgdbRelevanceTests"/>'s method exactly, and for its reason: a ranking rule
/// argued about is a rule nobody can check later, and the useful record is not "popularity
/// first" but "this is the search that made it so".
///
/// The figures below are the real ones. They are wide enough that the rule is not balanced on
/// a knife edge — 1.5M against 607k, 2.1M against 416k, 2.8M against 651k — which is worth
/// knowing before anybody reaches for a weighting.
/// </summary>
public sealed class MalRelevanceTests
{
    [Fact]
    public void Frier_finds_the_first_cour_rather_than_the_second()
    {
        // MAL's own order: 2nd Season, then season one, then the unaired 2027 cour. Which is
        // the card-per-cour decision biting exactly where it was always going to — three
        // entries for one show, and the wrong one on top.
        var ranked = MalRelevance.Rank(
            [
                Anime(59978, "Sousou no Frieren 2nd Season", users: 607_257),
                Anime(52991, "Sousou no Frieren", users: 1_511_281),
                Anime(60815, "Sousou no Frieren: Ougonkyou-hen", users: 108_416),
            ],
            "frier");

        ranked.Select(anime => anime.Title).ShouldBe(
            ["Sousou no Frieren", "Sousou no Frieren 2nd Season", "Sousou no Frieren: Ougonkyou-hen"]);
    }

    [Fact]
    public void Cowboy_bebo_finds_the_series_rather_than_the_film()
    {
        var ranked = MalRelevance.Rank(
            [
                Anime(5, "Cowboy Bebop: Tengoku no Tobira", users: 416_437),
                Anime(1, "Cowboy Bebop", users: 2_084_300),
                Anime(17205, "Cowboy Bebop: Ein no Natsuyasumi", users: 33_337),
            ],
            "cowboy bebo");

        ranked[0].Title.ShouldBe("Cowboy Bebop");
    }

    [Fact]
    public void Steins_finds_the_series_rather_than_the_film_and_the_sequel()
    {
        // The worst of the four measured: MAL put the series *third*, behind a film and a
        // sequel that both have a third of its audience.
        var ranked = MalRelevance.Rank(
            [
                Anime(11577, "Steins;Gate Movie: Fuka Ryouiki no Deja vu", users: 650_972),
                Anime(30484, "Steins;Gate 0", users: 968_574),
                Anime(9253, "Steins;Gate", users: 2_849_804),
            ],
            "steins");

        ranked[0].Title.ShouldBe("Steins;Gate");
    }

    [Fact]
    public void Mushishi_finds_the_series_rather_than_its_continuation()
    {
        var ranked = MalRelevance.Rank(
            [
                Anime(21939, "Mushishi Zoku Shou", users: 330_194),
                Anime(457, "Mushishi", users: 917_688),
            ],
            "mushishi");

        ranked[0].Title.ShouldBe("Mushishi");
    }

    [Fact]
    public void Monster_does_not_promote_a_film_that_merely_shares_the_name()
    {
        // The "Zelda" case, and the reason this rule is popularity-first rather than
        // title-first. `monster` finds a 2019 Chinese film whose English title is exactly
        // "Monster" and which 135 people have logged. Ranking on the title puts it *second* —
        // above Monster Musume and one place below the Urasawa series it is pretending to be.
        var ranked = MalRelevance.Rank(
            [
                Anime(19, "Monster", users: 1_359_068, en: "Monster"),
                Anime(30123, "Monster Musume no Iru Nichijou", users: 811_260),
                Anime(43077, "Shi Shi Feng Bao", users: 135, en: "Monster"),
            ],
            "monster");

        ranked.Select(anime => anime.Title).ShouldBe(
            ["Monster", "Monster Musume no Iru Nichijou", "Shi Shi Feng Bao"]);
    }

    [Fact]
    public void Fma_reads_the_synonyms_mal_matched_on()
    {
        // Nothing in either title contains "fma" — MAL found these through a synonym, and a
        // tie-break that scored the romaji title alone would give all three the same nought
        // and have nothing left to say. Here popularity settles it, and the tier is what
        // separates the tail: the Alchemist entries all match on a synonym, and an unrelated
        // result that arrived some other way does not.
        var ranked = MalRelevance.Rank(
            [
                Anime(121, "Fullmetal Alchemist", users: 1_571_239, synonyms: ["FMA"]),
                Anime(5114, "Fullmetal Alchemist: Brotherhood", users: 3_732_437, synonyms: ["FMA Brotherhood"]),
                Anime(431, "Fullmetal Alchemist: The Conqueror of Shamballa", users: 350_281),
            ],
            "fma");

        ranked[0].Title.ShouldBe("Fullmetal Alchemist: Brotherhood");
    }

    [Fact]
    public void An_english_title_counts_as_a_match_because_mal_matched_on_it()
    {
        // `attack on t` touches no romaji title at all: every one of these is Shingeki no
        // Kyojin. Scoring only `title` would flatten the tier to nought and let anything with
        // more users through — which is what the eighth result in that measured search was.
        var ranked = MalRelevance.Rank(
            [
                Anime(37450, "Tsuujou Kougeki ga Zentai Kougeki de Ni-kai Kougeki no Okaasan wa Suki desu ka?",
                    users: 313_568, en: "Do You Love Your Mom and Her Two-Hit Multi-Target Attacks?"),
                Anime(35120, "Shingeki! Kyojin Chuugakkou", users: 313_568,
                    en: "Attack on Titan: Junior High"),
            ],
            "attack on t");

        // The same audience on both, deliberately: with popularity tied, the tier is the whole
        // of the decision, and only one of them is an Attack on Titan.
        ranked[0].Title.ShouldBe("Shingeki! Kyojin Chuugakkou");
    }

    [Fact]
    public void Punctuation_is_not_something_anybody_should_have_to_type()
    {
        // `Steins;Gate` normalises to `steins gate`, so the semicolon costs nothing either way.
        var ranked = MalRelevance.Rank(
            [
                Anime(1, "Some Other Show", users: 100),
                Anime(9253, "Steins;Gate", users: 100),
            ],
            "steins gate");

        ranked[0].Title.ShouldBe("Steins;Gate");
    }

    [Fact]
    public void Leaves_a_single_result_and_an_empty_search_alone()
    {
        // Never filters, and never rearranges what it has nothing to say about: a low-ranked
        // result is still a result, and this decides an order rather than what exists.
        var one = new[] { Anime(1, "Only") };
        MalRelevance.Rank(one, "anything").ShouldBe(one);

        var two = new[] { Anime(1, "First", users: 5), Anime(2, "Second", users: 5) };
        MalRelevance.Rank(two, "").Select(anime => anime.Title).ShouldBe(["First", "Second"]);
    }

    private static MalAnime Anime(
        int id,
        string title,
        int? users = null,
        string? en = null,
        string[]? synonyms = null) => new()
        {
            Id = id,
            Title = title,
            NumListUsers = users,
            AlternativeTitles = new MalAlternativeTitles
            {
                En = en,
                Synonyms = [.. synonyms ?? []],
            },
        };
}
