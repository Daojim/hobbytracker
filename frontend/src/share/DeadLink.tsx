import { Link } from 'react-router';

/**
 * What a link that opens no board shows: one card for every way that happens, because the API
 * answers an unknown token, a stopped share and a part switched off with the same 404 — so this
 * cannot say which, and says what may have happened instead.
 *
 * The sign-in screen's card, on the page's ground, with a way to a board of the visitor's own
 * where the sign-in screen has its providers. Rendered at the #9 workshop and not asked about.
 */
export function DeadLink() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sunken p-6 text-fg">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-line bg-surface p-8 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">This link doesn’t open a board</h1>
          <p className="text-sm text-muted">
            Whoever shared it may have stopped sharing, or part of the address may be missing.
          </p>
        </div>

        <Link
          to="/"
          className="flex items-center justify-center gap-3 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-fg hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Make your own board
        </Link>
      </div>
    </main>
  );
}
