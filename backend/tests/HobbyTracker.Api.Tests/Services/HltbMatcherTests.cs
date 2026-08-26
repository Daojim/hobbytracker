using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Services;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Deciding which of HowLongToBeat's candidates is actually the game, or that none of them is.
///
/// This is the work; fetching is not. IGDB and HLTB disagree about titles constantly — remasters,
/// anniversaries, subtitle punctuation, paired releases — and a wrong number here is worse than
/// no number at all, because the whole point is answering "can I finish this before the weekend
/// is out". So the bar is high and refusing is a normal outcome rather than a failure.
///
/// The cases below are measured, not invented: they come from running this against a real
/// library and against real HowLongToBeat responses.
/// </summary>
public sealed class HltbMatcherTests
{
    private static readonly HltbOptions Options = new();

    [Fact]
    public void Takes_a_title_that_matches_outright()
    {
        var match = Match("Hollow Knight", null,
            Candidate(26286, "Hollow Knight", 2017, "Hollow Knight: Voidheart Edition"),
            Candidate(65945, "Hollow Knight: Silksong", 2025));

        match.ShouldNotBeNull().Id.ShouldBe(26286);
    }

    [Fact]
    public void Takes_a_title_that_only_one_of_the_alternative_names_carries()
    {
        // HowLongToBeat files a game under one name and lists the others as aliases. Which of
        // them IGDB happens to use is not something either side agreed on.
        var match = Match("Hollow Knight: Voidheart Edition", null,
            Candidate(26286, "Hollow Knight", 2017, "Hollow Knight: Voidheart Edition"));

        match.ShouldNotBeNull().Id.ShouldBe(26286);
    }

    [Fact]
    public void Refuses_a_sequel_wearing_almost_exactly_the_same_name()
    {
        // "Final Fantasy VII" against "Final Fantasy VIII" scores about 0.97 on letters alone,
        // so no threshold worth having could separate them. The numbers have to be compared as
        // numbers, and this is the single most valuable rule in the file.
        Match("Final Fantasy VII", null,
            Candidate(1, "Final Fantasy VIII", 1999)).ShouldBeNull();
    }

    [Fact]
    public void Refuses_a_numbered_sequel_when_the_title_being_matched_has_no_number()
    {
        Match("Portal", null, Candidate(1, "Portal 2", 2011)).ShouldBeNull();
    }

    [Fact]
    public void Reads_roman_and_arabic_numerals_as_the_same_number()
    {
        var match = Match("Final Fantasy VII", null,
            Candidate(3521, "Final Fantasy 7", 1997));

        match.ShouldNotBeNull().Id.ShouldBe(3521);
    }

    [Fact]
    public void Refuses_two_candidates_it_cannot_tell_apart()
    {
        // HowLongToBeat lists "Resident Evil 4" twice, under exactly that title, for 2005 and
        // for 2023. Both score 1.0. Picking either would be a coin flip that looks from the
        // outside exactly like a confident match, so the margin refuses instead.
        Match("Resident Evil 4", null,
            Candidate(7720, "Resident Evil 4", 2005),
            Candidate(108881, "Resident Evil 4", 2023)).ShouldBeNull();
    }

    [Fact]
    public void Tells_two_identical_titles_apart_by_the_year_when_it_has_one()
    {
        // Which is the whole reason games.release_year exists. Without it this is the case
        // above and the title simply goes without numbers.
        Match("Resident Evil 4", 2005,
            Candidate(7720, "Resident Evil 4", 2005),
            Candidate(108881, "Resident Evil 4", 2023))
            .ShouldNotBeNull().Id.ShouldBe(7720);

        Match("Resident Evil 4", 2023,
            Candidate(7720, "Resident Evil 4", 2005),
            Candidate(108881, "Resident Evil 4", 2023))
            .ShouldNotBeNull().Id.ShouldBe(108881);
    }

    [Fact]
    public void Does_not_punish_a_release_a_year_out()
    {
        // IGDB and HowLongToBeat disagree about regional dates all the time, so a year either
        // way is agreement rather than evidence against.
        var match = Match("Hollow Knight", 2018,
            Candidate(26286, "Hollow Knight", 2017));

        match.ShouldNotBeNull().Id.ShouldBe(26286);
    }

    [Fact]
    public void Takes_a_lone_candidate_however_far_out_its_year_is()
    {
        // HowLongToBeat files a re-release under the entry for the original and dates that entry
        // from the first release; IGDB dates the version you actually own. Two decades can sit
        // between the two and it is still the only game either site has.
        //
        // Measured: "Paper Mario: The Thousand-Year Door" came back as a single candidate dated
        // 2004 against IGDB's 2024, scored 1.0 on the title, and was refused at 0.7 -- because
        // the threshold leaves 0.1 of headroom and the penalty starts at 0.2. The year is a
        // tie-breaker, and there was no tie to break.
        var match = Match("Paper Mario: The Thousand-Year Door", 2024,
            Candidate(10141, "Paper Mario: The Thousand-Year Door", 2004));

        match.ShouldNotBeNull().Id.ShouldBe(10141);
    }

    [Fact]
    public void Refuses_a_title_that_is_only_nearly_right()
    {
        // Measured: HowLongToBeat models the paired Pokemon release as one entry and IGDB does
        // not, so the closest candidate scores 0.577. Refusing is correct — and it is exactly
        // the case the drawer's pin exists for, since no rule here can invent that mapping.
        Match("Pokémon Scarlet", 2022,
            Candidate(104683, "Pokémon Scarlet and Violet", 2022),
            Candidate(144095, "Pokémon Scarlet and Violet - Mochi Mayhem", 2024)).ShouldBeNull();
    }

    [Fact]
    public void Reads_past_accents_and_a_leading_the()
    {
        var match = Match("The Legend of Zelda: Breath of the Wild", 2017,
            Candidate(38019, "Legend of Zelda: Breath of the Wild", 2017));

        match.ShouldNotBeNull().Id.ShouldBe(38019);

        Match("Pokemon Scarlet and Violet", 2022,
            Candidate(104683, "Pokémon Scarlet and Violet", 2022))
            .ShouldNotBeNull().Id.ShouldBe(104683);
    }

    [Fact]
    public void Has_nothing_to_say_when_howlongtobeat_returned_nothing()
    {
        Match("Something Nobody Has Logged", null).ShouldBeNull();
    }

    [Fact]
    public void Keeps_a_lone_candidate_that_clears_the_bar_and_refuses_one_that_does_not()
    {
        // Nothing to be ambiguous against, so the margin has no opinion and the threshold is
        // the whole test.
        Match("Stardew Valley", null, Candidate(34716, "Stardew Valley", 2016))
            .ShouldNotBeNull().Id.ShouldBe(34716);

        Match("Stardew Valley", null, Candidate(1, "Wandersong", 2018)).ShouldBeNull();
    }

    [Fact]
    public void Is_not_thrown_by_punctuation_the_two_sites_disagree_about()
    {
        var match = Match("Fire Emblem: Fortune's Weave", 2026,
            Candidate(174355, "Fire Emblem - Fortune's Weave", 2026));

        match.ShouldNotBeNull().Id.ShouldBe(174355);
    }

    private static HltbGame? Match(string title, int? releaseYear, params HltbGame[] candidates) =>
        HltbMatcher.Match(title, releaseYear, candidates, Options);

    private static HltbGame Candidate(int id, string name, int? year, params string[] aliases) =>
        new(id, name, aliases, year, 15m, 10m, 20m, 30m);
}
