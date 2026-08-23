import { Link } from 'react-router';
import { SettingsMenu } from '../theme/SettingsMenu';

export interface AppHeaderProps {
  /** What this screen is. Rendered as the page's one h1. */
  title: string;
  /** The way to the other screen. There are two, so one link each way is the whole of it. */
  to: string;
  linkLabel: string;
}

/**
 * The bar across the top of both screens.
 *
 * One component rather than two near-identical headers, because the settings menu has to sit in
 * both and a control that exists on one screen and not the other is worse than no control: the
 * board and the search page are one Escape apart, and a preference that vanished on the way
 * would look like it had been forgotten.
 */
export function AppHeader({ title, to, linkLabel }: AppHeaderProps) {
  return (
    <header className="mb-6 flex items-baseline gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Link to={to} className="text-sm text-accent hover:underline">
        {linkLabel}
      </Link>

      {/* Top right, and pushed there rather than positioned, so it stays put when the title
          wraps on a narrow screen. */}
      <div className="ml-auto self-center">
        <SettingsMenu />
      </div>
    </header>
  );
}
