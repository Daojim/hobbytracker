import { NavLink } from 'react-router';
import { SettingsMenu } from '../theme/SettingsMenu';
import { HOBBIES, boardPath } from './hobbies';

export interface AppHeaderProps {
  /** What the app is. Rendered as the page's one h1. */
  title: string;
}

/**
 * The bar across the top, and the hobbies under it.
 *
 * It used to carry a link to the other screen, back when there was one: search had a page of its
 * own and the two were one click apart in each direction. Search sits above the board now, so the
 * link had nowhere left to point, and the row it used to share is the nav's.
 *
 * The five hobbies that do not exist yet are plain text, not disabled links and not disabled
 * buttons. There is nothing behind them to operate, and a disabled control claims it would work
 * under some other condition — so there is nothing to focus and nothing announced as operable.
 * Each says "Soon" in words as well as being dim, which is the rule the destructive controls
 * follow too: nothing here is signalled by colour alone.
 *
 * Dim means `text-muted` and nothing further. An opacity on top of it was the first attempt and
 * was wrong: every theme's `--muted` is chosen to clear 4.5:1 against its own surface, and
 * fading it takes it back under — silently, because index.css.test.ts checks the tokens rather
 * than what a component does to them afterwards.
 *
 * Exactly one SettingsMenu, and it has to stay that way. `useTheme` holds its state locally on
 * purpose — themes are CSS, so there is no provider — which means a second menu would read
 * storage once on mount and then keep drawing the old choice.
 */
export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>

        {/* Top right, and pushed there rather than positioned, so it stays put when the title
            wraps on a narrow screen. */}
        <div className="ml-auto self-center">
          <SettingsMenu />
        </div>
      </div>

      <nav aria-label="Hobbies" className="mt-3 border-b border-line-soft">
        {/* Scrolls rather than wraps: six tabs and a narrow window is the one case where a
            wrapped second row would push the board down for no gain. */}
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {HOBBIES.map((hobby) => (
            <li key={hobby.slug} className="shrink-0">
              {hobby.ready ? (
                <NavLink
                  to={boardPath(hobby.slug)}
                  end
                  // aria-current comes free, which is the whole reason this is a NavLink while
                  // there is only one of them to be current.
                  className={({ isActive }) =>
                    `inline-block border-b-2 px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-accent text-accent'
                        : 'border-transparent text-muted hover:text-fg'
                    }`
                  }
                >
                  {hobby.label}
                </NavLink>
              ) : (
                <span className="inline-block border-b-2 border-transparent px-3 py-2 text-sm text-muted">
                  {hobby.label}{' '}
                  <span className="rounded bg-hover px-1 py-0.5 text-[0.625rem] tracking-wide uppercase">
                    Soon
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
