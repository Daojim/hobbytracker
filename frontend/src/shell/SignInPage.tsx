import { signInUrl } from '../api/auth';
import { PROVIDERS } from './providers';

/**
 * The only screen you can reach without a session.
 *
 * Each provider is a link rather than a button on purpose: signing in is a top-level navigation
 * to somebody else's site, answered with a 302 that fetch cannot usefully follow. A third one is
 * a line in providers.ts and a config block on the server.
 *
 * It wears the bordered-control idiom the drawer already uses rather than a filled accent, and
 * that is a token decision rather than a taste one: `--accent` has no paired foreground, because
 * nothing in the app has ever put text on top of it — the settings menu uses it for radio dots.
 * Inventing `--accent-fg` would mean five new values and five new rows in the contrast test, for
 * one button. Accent as the border and the text is already proven against every theme's surface.
 */
export function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted">
          Your backlog, your ratings and everything you have written about a game are yours
          alone. Signing in is what makes them yours.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PROVIDERS.map((provider) => (
          <a
            key={provider.id}
            href={signInUrl(provider.id)}
            className="flex items-center justify-center rounded-lg border border-accent
              bg-surface px-4 py-2.5 text-sm font-medium text-accent hover:bg-hover
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {provider.label}
          </a>
        ))}
      </div>
    </main>
  );
}
