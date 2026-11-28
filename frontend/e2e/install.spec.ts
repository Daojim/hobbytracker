import { expect, test } from '@playwright/test';
import { THEMES, manifestOf } from '../src/theme/theme';

/**
 * What a phone installs, asked of a real browser.
 *
 * src/manifest.test.ts reads the files off disk. This asks what the server hands out, and what
 * Chrome makes of it. A missing file is no 404 here: Vite, like Caddy in production, can answer
 * a path it has no file for with index.html, so a status code proves nothing and every check
 * reads the bytes instead.
 *
 * This runs against Vite, not Caddy, so the content types production serves are checked on the
 * deployed site afterwards. See **Proving it** in docs/deploy.md.
 */

const PNG = '89504e470d0a1a0a';

// The whole of Chromium rather than the headless shell Playwright uses by default. The shell has
// none of Chrome's installing machinery and answers every question about it with nothing at all:
// measured, a manifest with `display: "browser"` and one with no usable icon both came back clean,
// which is the same trap as a scroll gesture headless Chromium accepts and never performs.
test.use({ channel: 'chromium' });

test('Chrome reads the manifest without complaint, and finds no reason not to install', async ({
  page,
}) => {
  // The sign-in page, because it is the one screen that needs no session, and index.html is
  // the same document on every route.
  await page.goto('/signin');
  const cdp = await page.context().newCDPSession(page);

  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.url).toMatch(/\/manifest\.webmanifest$/);
  expect(manifest.errors).toEqual([]);

  // Chrome will not install from an incognito window, and every Playwright context is one, so
  // that reason is always there. Anything beside it is the manifest's fault: `display: "browser"`
  // adds manifest-display-not-supported, and a manifest with only a maskable icon adds
  // manifest-missing-suitable-icon.
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors.map((error) => error.errorId)).toEqual(['in-incognito']);
});

test('every theme links a manifest in the ground it paints, and Chrome would install from each', async ({
  page,
}) => {
  // Since Chrome 153 an installed app's bar at the bottom is its manifest's theme_color (#31),
  // so a chosen theme links a manifest of its own. Each is asked for after a reload, which makes
  // this the pre-paint script's half: the bundle applies nothing on a load. The rule is imported
  // rather than copied again. In daylight, because System's manifest is Shelf Light's paper,
  // which is what System paints in daylight and not after dark.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/signin');
  const cdp = await page.context().newCDPSession(page);

  const asked = async (label: string, expected: string) => {
    await page.reload();

    const manifest = await cdp.send('Page.getAppManifest');
    expect(new URL(manifest.url).pathname, label).toBe(expected);
    expect(manifest.errors, label).toEqual([]);

    const ground = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--sunken').trim(),
    );
    const { theme_color } = JSON.parse(manifest.data ?? '{}') as { theme_color?: string };
    expect(theme_color, label).toBe(ground);

    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors.map((error) => error.errorId), label).toEqual(['in-incognito']);
  };

  for (const theme of THEMES) {
    await page.evaluate((value) => localStorage.setItem('hobbytracker.theme', value), theme.value);
    await asked(theme.label, manifestOf(theme.value));
  }

  // A theme of your own links its base's, so its bar at the bottom is its base's ground and not
  // its own, which the page paints: here the ground is left to the base's block, so the two agree.
  await page.evaluate(() => {
    localStorage.setItem('hobbytracker.theme', 'mine');
    localStorage.setItem(
      'hobbytracker.theme.mine',
      JSON.stringify({ from: 'dusk', scheme: 'dark', tokens: { '--accent': '#e3b04b' } }),
    );
  });
  await asked('a theme of your own, from Dusk', manifestOf('dusk'));
});

test('every icon is served as the picture it claims to be', async ({ page }) => {
  await page.goto('/signin');

  // Read straight off the document rather than through a locator, which would wait out the
  // whole test timeout for a <link> that is never coming.
  const href = async (selector: string) => {
    const value = await page.evaluate(
      (s) => document.querySelector(s)?.getAttribute('href') ?? null,
      selector,
    );
    expect(value, `index.html has no ${selector}`).not.toBeNull();
    return value!;
  };

  const manifest = (await (await page.request.get(await href('link[rel="manifest"]'))).json()) as {
    icons: { src: string; sizes: string; type: string }[];
  };
  const pngs = [
    ...manifest.icons,
    { src: await href('link[rel="apple-touch-icon"]'), sizes: '180x180', type: 'image/png' },
  ];

  for (const icon of pngs) {
    const response = await page.request.get(icon.src);
    expect(response.status(), icon.src).toBe(200);
    expect(response.headers()['content-type'], icon.src).toContain(icon.type);

    const bytes = await response.body();
    expect(bytes.subarray(0, 8).toString('hex'), `${icon.src} is not a PNG`).toBe(PNG);
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.src).toBe(icon.sizes);
  }

  const svg = await page.request.get(await href('link[rel="icon"][type="image/svg+xml"]'));
  expect(svg.headers()['content-type']).toContain('image/svg+xml');
  expect(await svg.text()).toContain('<svg xmlns="http://www.w3.org/2000/svg"');

  const ico = await page.request.get(await href('link[rel="icon"][sizes="32x32"]'));
  expect(ico.headers()['content-type']).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);
});
