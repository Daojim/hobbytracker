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
 * `bg-sunken text-fg` on the <main>, because this screen has no board behind it to paint the
 * ground: without them the one page you can reach signed out renders on the browser canvas,
 * which `color-scheme` gets roughly right and the theme gets exactly right.
 */
export function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 bg-sunken p-6 text-fg">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted">
          Your backlog, your ratings and everything you have written about a game are yours
          alone. Signing in is what makes them yours.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PROVIDERS.map(({ id, label, Mark }) => (
          <a
            key={id}
            href={signInUrl(id)}
            className="flex items-center justify-center gap-3 rounded-lg border border-line
              bg-surface px-4 py-2.5 text-sm font-medium text-fg hover:bg-hover
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Mark />
            {label}
          </a>
        ))}
      </div>
    </main>
  );
}
