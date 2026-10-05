import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { hobbyDefinition } from '../hobbies';
import { boardPath, type Hobby } from '../shell/hobbies';

export interface SharedFrameProps {
  hobby: Hobby;
  /** The owner's name, when they ticked it; null otherwise. */
  name: string | null;
  children: ReactNode;
}

/**
 * The page around a share: a banner across the top, the board's heading, whatever the page is,
 * and the data credits at its foot. The board and its Stats page both wear it.
 *
 * **The banner, picked at the #9 workshop over the recommended heading.** It says once, in words,
 * that the board is shared and read-only, and offers one of the visitor's own where Settings sits
 * on your board. It never carries the owner's name, which heads the board once, under it: with the
 * name in both, the renders read it twice.
 *
 * **No app header**: a share has no search, no hobby nav, no session and no Settings, so the top
 * of the page is the banner's. The visitor's own theme dresses it, from the stamp the page wore
 * before the bundle loaded, and nothing of the owner's is stored to dress it otherwise.
 */
export function SharedFrame({ hobby, name, children }: SharedFrameProps) {
  const words = hobbyDefinition(hobby).share!;

  return (
    <>
      {/* Outside <main>, so it is the page's banner landmark, and edge to edge, so it reads as
          about the page rather than as part of the board. Its contents sit on the board's own
          edges, through the same gutters and width. */}
      <header className="border-b border-line-soft bg-well px-4 py-2 text-sm md:px-6 2xl:px-8 3xl:px-10">
        <div className="mx-auto flex max-w-board flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-muted">A board shared from HobbyTracker. It’s read-only.</p>

          {/* A board of the visitor's own: the board's address, which a visitor with no session
              is sent to sign in from, and one with a session lands on. */}
          <Link
            to={boardPath(hobby)}
            className="ml-auto text-sm font-medium text-accent hover:underline"
          >
            Make your own
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </header>

      <main className="min-h-screen bg-sunken p-4 text-fg md:p-6 2xl:p-8 3xl:p-10">
        <div className="mx-auto max-w-board">
          <h1 className="mb-6 text-2xl font-semibold">{words.heading(name)}</h1>

          {children}

          {/* Where a visitor can find them: on your own board they are in Settings, which a
              share has not got. */}
          <footer className="mt-10 border-t border-line-soft pt-3 text-[11px] leading-snug text-muted">
            {`Shared from HobbyTracker. ${words.credits}`}
          </footer>
        </div>
      </main>
    </>
  );
}
