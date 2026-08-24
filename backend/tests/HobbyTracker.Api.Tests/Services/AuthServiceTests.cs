using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Turning "Google says this is subject 1234" into a row in <c>users</c>.
///
/// This is the half of the sign-in the framework does not do for us, and the half worth
/// testing: the OAuth dance itself is the handler's, proved end to end against the stub.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class AuthServiceTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Creates_a_user_and_an_identity_on_a_first_sign_in()
    {
        var user = await SignInAsync(Google("1234", "jimmy@example.com", "Jimmy Dao"));

        user.DisplayName.ShouldBe("Jimmy Dao");
        user.Role.ShouldBe("user");
        user.CreatedAt.ShouldBe(Journal.Now);

        var identity = await WithDbAsync(db => db.AuthIdentities.AsNoTracking().SingleAsync(Ct));
        identity.UserId.ShouldBe(user.Id);
        identity.Provider.ShouldBe("google");
        identity.ProviderUserId.ShouldBe("1234");
        identity.Email.ShouldBe("jimmy@example.com");
    }

    [Fact]
    public async Task Signs_the_same_person_back_in_without_creating_a_second_user()
    {
        // The whole point of the unique index on (provider, provider_user_id). A second row
        // here is a second board, and the person would never see their own games again.
        var first = await SignInAsync(Google("1234", "jimmy@example.com", "Jimmy Dao"));
        var second = await SignInAsync(Google("1234", "jimmy@example.com", "Jimmy Dao"));

        second.Id.ShouldBe(first.Id);
        (await AccountsAsync()).ShouldBe(1);
        (await CountAsync(db => db.AuthIdentities)).ShouldBe(1);
    }

    [Fact]
    public async Task Tells_two_google_accounts_apart_by_subject_and_not_by_email()
    {
        // Providers reuse addresses and people change them, which is exactly why the subject is
        // the login key and the email is informational. Same address, two subjects, two people.
        var first = await SignInAsync(Google("1234", "shared@example.com", "First"));
        var second = await SignInAsync(Google("5678", "shared@example.com", "Second"));

        second.Id.ShouldNotBe(first.Id);
        (await AccountsAsync()).ShouldBe(2);
    }

    [Fact]
    public async Task Follows_an_email_that_changed_at_the_provider()
    {
        var user = await SignInAsync(Google("1234", "old@example.com", "Jimmy Dao"));
        await SignInAsync(Google("1234", "new@example.com", "Jimmy Dao"));

        var identity = await WithDbAsync(db => db.AuthIdentities.AsNoTracking().SingleAsync(Ct));
        identity.UserId.ShouldBe(user.Id);
        identity.Email.ShouldBe("new@example.com");
    }

    [Fact]
    public async Task Leaves_a_display_name_alone_once_it_exists()
    {
        // The profile is the app's, not the provider's. Renaming yourself at Google should not
        // undo a name chosen here — and there is nowhere to choose one yet, so this is really
        // about not surprising anyone the day there is.
        var user = await SignInAsync(Google("1234", "jimmy@example.com", "Jimmy Dao"));
        await SignInAsync(Google("1234", "jimmy@example.com", "Someone Else"));

        (await UserAsync(user.Id)).DisplayName.ShouldBe("Jimmy Dao");
    }

    [Fact]
    public async Task Falls_back_to_the_email_when_the_provider_sends_no_name()
    {
        // display_name is NOT NULL, so something has to go there. The local part is the most
        // recognisable thing available when a provider declines to say.
        var user = await SignInAsync(Google("1234", "jimmy@example.com", displayName: null));

        user.DisplayName.ShouldBe("jimmy");
    }

    [Fact]
    public async Task Falls_back_again_when_there_is_no_email_either()
    {
        var user = await SignInAsync(Google("1234", email: null, displayName: "   "));

        user.DisplayName.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Truncates_a_display_name_too_long_for_the_column()
    {
        // varchar(100). A longer one is a 500 on the way in, and the person cannot do anything
        // about it because the name came from their provider rather than from them.
        var user = await SignInAsync(Google("1234", "jimmy@example.com", new string('a', 300)));

        user.DisplayName.Length.ShouldBe(100);
    }

    [Fact]
    public async Task Two_simultaneous_first_sign_ins_still_make_one_user()
    {
        // Two tabs, one person, one provider account. The lookup-then-insert is racy by
        // construction, and the unique index on (provider, provider_user_id) is what turns the
        // loser into a clean 23505 rather than a second user with a second empty board — the
        // same recovery the IGDB upsert already makes, for the same reason.
        //
        // Whether the two actually collide is up to the scheduler, so this asserts the
        // invariant rather than the collision. The catch itself was checked by removing it and
        // watching this go red.
        var identity = Google("1234", "jimmy@example.com", "Jimmy Dao");

        var both = await Task.WhenAll(
            Task.Run(() => SignInAsync(identity), Ct),
            Task.Run(() => SignInAsync(identity), Ct));

        both[0].Id.ShouldBe(both[1].Id);
        (await AccountsAsync()).ShouldBe(1);
        (await CountAsync(db => db.AuthIdentities)).ShouldBe(1);
    }

    // ----------------------------------------------------------------- helpers

    private static ExternalIdentity Google(
        string subject, string? email = "someone@example.com", string? displayName = "Someone") =>
        new("google", subject, email, displayName);

    private Task<User> SignInAsync(ExternalIdentity identity) =>
        WithScopeAsync(services =>
            services.GetRequiredService<IAuthService>().SignInAsync(identity, Ct));

    private Task<User> UserAsync(int id) =>
        WithDbAsync(db => db.Users.AsNoTracking().SingleAsync(user => user.Id == id, Ct));

    /// <summary>
    /// Accounts that signed in, rather than every row in <c>users</c>. The harness creates one
    /// of its own for the ordinary fixtures, and counting that would put these assertions one
    /// out for a reason none of them is about.
    /// </summary>
    private Task<int> AccountsAsync() =>
        WithDbAsync(db => db.Users.CountAsync(user => user.AuthIdentities.Any(), Ct));

    private Task<int> CountAsync<T>(Func<HobbyTrackerDbContext, IQueryable<T>> set) =>
        WithDbAsync(db => set(db).CountAsync(Ct));

    // ------------------------------------------------------- a second provider

    [Fact]
    public async Task Two_providers_pointing_at_one_user_give_one_board()
    {
        // The reason credentials live in their own table rather than as columns on users. Two
        // identities, one profile, one backlog — and this is what a "link your Discord" feature
        // would write when it exists. Signing in through either has to land in the same place.
        var user = await SignInAsync(Google("1234", "jimmy@example.com", "Jimmy Dao"));
        await GivenIdentityAsync(user.Id, "discord", "9876", "jimmy@example.com");

        var viaDiscord = await SignInAsync(
            new ExternalIdentity("discord", "9876", "jimmy@example.com", "Jimmy Dao"));

        viaDiscord.Id.ShouldBe(user.Id);
        (await AccountsAsync()).ShouldBe(1);
        (await CountAsync(db => db.AuthIdentities)).ShouldBe(2);
    }

    [Fact]
    public async Task The_same_address_at_two_providers_is_still_two_people()
    {
        // Until somebody links them it has to be, and the reason is that email is not a login
        // key: providers reuse addresses, and trusting one to merge accounts would let anybody
        // who can get an address at either provider walk into the other's journal.
        var google = await SignInAsync(Google("1234", "shared@example.com", "Jimmy"));
        var discord = await SignInAsync(
            new ExternalIdentity("discord", "1234", "shared@example.com", "Jimmy"));

        discord.Id.ShouldNotBe(google.Id);
        (await AccountsAsync()).ShouldBe(2);
    }

    private Task GivenIdentityAsync(int userId, string provider, string subject, string? email) =>
        WithDbAsync(async db =>
        {
            db.AuthIdentities.Add(new AuthIdentity
            {
                UserId = userId,
                Provider = provider,
                ProviderUserId = subject,
                Email = email,
            });

            await db.SaveChangesAsync(Ct);
        });
}
