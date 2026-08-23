import { SettingsMenu } from '../theme/SettingsMenu';

export interface AppHeaderProps {
  /** What this screen is. Rendered as the page's one h1. */
  title: string;
}

/**
 * The bar across the top.
 *
 * It used to carry a link to the other screen, back when there was one: search had a page of
 * its own and the two were one click apart in each direction. Search sits above the board now,
 * so the link had nowhere left to point.
 */
export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="mb-6 flex items-baseline gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Top right, and pushed there rather than positioned, so it stays put when the title
          wraps on a narrow screen. */}
      <div className="ml-auto self-center">
        <SettingsMenu />
      </div>
    </header>
  );
}
