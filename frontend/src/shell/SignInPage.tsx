import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { wasDeleted } from '../account/useDeleteAccount';
import { signInUrl } from '../api/auth';
import { PROVIDERS } from './providers';

/**
 * The only screen you can reach without a session.
 *
 * Each provider is a link rather than a button on purpose: signing in is a top-level navigation
 * to somebody else's site, answered with a 302 that fetch cannot usefully follow. A third one is
 * an entry in providers.tsx and a config block on the server.
 *
 * The buttons are neutral and the marks are not: `bg-surface` behind `border-line` with `text-fg`
 * on it, which is the bordered-control idiom the whole app already wears, and the provider's own
 * colours only inside its mark. That is how every site that offers this does it, and it is also
 * the cheap answer here — `--accent` has no paired foreground because nothing in the app has ever
 * put text on top of it, so a filled button would have meant inventing `--accent-fg` as five new
 * values and five new rows in the contrast test. `--fg` on `--surface` is already asserted on
 * every palette. Drawing the buttons in the accent instead, which is what this did first, made
 * "Continue with Google" a green button with no Google about it.
 *
 * The ground is the whole viewport and the screen is a card on it, which is what every other
 * site does with a sign-in and is not only a taste decision. `bg-sunken` used to sit on a
 * `max-w-sm` <main>, so the theme's ground was painted in a 384px strip down the middle and
 * whatever the browser felt like either side of it — most visible on Ember, where the strip was
 * near-black and the margins were not. A full-bleed ground has nowhere to leak.
 *
 * The card is `bg-surface` and so are the two links on it, which is deliberate rather than an
 * oversight: they are separated by their borders, exactly as a bordered control on a panel is
 * everywhere else here. Giving them a different fill would make them the only raised thing in
 * an app whose buttons are all outlines.
 */
export function SignInPage() {
  // Straight after an account is deleted the card says so, in the heading, because whether it
  // worked is the question on your mind. Picked from renders on 4 October 2026 over a line in
  // place of the intro and over a notice above it. Only the navigation from a delete carries
  // this; signing out lands on the ordinary card.
  const deleted = wasDeleted(useLocation().state);
  const heading = useRef<HTMLHeadingElement>(null);

  // The board the delete came from went from under the keyboard, which would otherwise be left
  // on the document with nothing announced. The heading is where it goes instead.
  useEffect(() => {
    if (deleted) {
      heading.current?.focus();
    }
  }, [deleted]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-sunken p-6 text-fg">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-line bg-surface p-8 shadow-xl">
        {deleted ? (
          <div className="space-y-2">
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
              Account deleted
            </h1>
            <p className="text-sm text-muted">
              Everything on your boards went with it. Signing in again starts a new, empty
              account.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted">
              Your backlog, your ratings and everything you have written about a game are yours
              alone. Signing in is what makes them yours.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {PROVIDERS.map(({ id, label, Mark }) => (
            <a
              key={id}
              href={signInUrl(id)}
              className="flex items-center justify-center gap-3 rounded-lg border border-line
                px-4 py-2.5 text-sm font-medium text-fg hover:bg-hover
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Mark />
              {label}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
