import { request as httpRequest } from 'node:http';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { API_PORT } from './support/api';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, entriesFor, openJournal, seed } from './support/board';

/**
 * Pictures in notes, in a real browser: the shrink needs a canvas, and jsdom has none.
 *
 * Run in Chromium with the rest of the suite, and once in Firefox, the user's browser, with
 * `npx playwright test e2e/pictures.spec.ts --browser=firefox`. The two encode WebP and honour a
 * photo's orientation each in their own way, which is the part of this a passing Chromium run
 * says nothing about. The phone's case is Chromium's alone, because only Chromium can be told it
 * is a phone.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
  await page.goto('/board');
});

/** A screenshot as the clipboard holds one: a PNG this many pixels across, drawn in the page. */
async function screenshot(page: Page, width: number, height: number): Promise<string> {
  return page.evaluate(
    async ({ width, height }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#2534a8';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#e7a33e';
      context.fillRect(0, 0, width / 4, height / 4);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((made) => resolve(made!), 'image/png'));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    { width, height },
  );
}

/**
 * A photo taken holding the phone upright, as a phone writes one: the pixels landscape, 400 by
 * 300, with a red block in their top-left corner, and an EXIF record saying to turn them a
 * quarter clockwise to show them. Upright, the block is in the top-right corner of a picture 300
 * wide and 400 tall.
 */
async function uprightPhoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#1f3fbf';
    context.fillRect(0, 0, 400, 300);
    context.fillStyle = '#e01010';
    context.fillRect(0, 0, 100, 100);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((made) => resolve(made!), 'image/jpeg', 0.95));
    const jpeg = new Uint8Array(await blob.arrayBuffer());

    // An APP1 segment holding one EXIF field, Orientation = 6, put right after the start marker
    // where a camera puts it: "Exif\0\0", a big-endian TIFF header, and an IFD of one entry.
    const app1 = [
      0xff, 0xe1, 0x00, 0x22,
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
      0x00, 0x01,
      0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ];
    const photo = new Uint8Array(jpeg.length + app1.length);
    photo.set(jpeg.subarray(0, 2), 0);
    photo.set(app1, 2);
    photo.set(jpeg.subarray(2), 2 + app1.length);

    let binary = '';
    for (const byte of photo) binary += String.fromCharCode(byte);
    return btoa(binary);
  });

  return Buffer.from(base64, 'base64');
}

/** What Win+Shift+S puts on the clipboard, pasted into the box: a picture, and no words. */
async function pastePicture(page: Page, base64: string, name: string, type: string) {
  await page.getByRole('textbox', { name: 'New note' }).evaluate(
    (box, { base64, name, type }) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);

      const clipboard = new DataTransfer();
      clipboard.items.add(new File([bytes], name, { type }));
      box.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }),
      );
    },
    { base64, name, type },
  );
}

/** A picture once it has arrived and been decoded: its own size, not the size it is drawn at. */
async function decoded(picture: Locator) {
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  return picture.evaluate((img: HTMLImageElement) => ({ width: img.naturalWidth, height: img.naturalHeight }));
}

/** The colour of one pixel of a picture as it was decoded, read off a canvas. */
function pixel(picture: Locator, x: number, y: number) {
  return picture.evaluate(
    (img: HTMLImageElement, { x, y }) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(img, 0, 0);
      const [red = 0, green = 0, blue = 0] = context.getImageData(x, y, 1, 1).data;
      return { red, green, blue };
    },
    { x, y },
  );
}

const waiting = (page: Page) => page.getByRole('button', { name: 'Take this picture out' });
const notePicture = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: /^Open the picture from / }).locator('img');

/** The compose box's picker, which is how a picture gets in on a phone. */
const picker = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: 'Add a picture' }).first()
    .locator('xpath=following-sibling::input[@type="file"]');

test('a 1440p screenshot is kept at a 1920 edge, and is there after a reload', async ({ page }) => {
  await seed(page.request, 'Celeste', 'InProgress');
  await page.reload();
  await openJournal(page, 'Celeste');

  await picker(page).setInputFiles({
    name: 'snip.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await screenshot(page, 2560, 1440), 'base64'),
  });
  await expect(waiting(page)).toHaveCount(1);
  await page.getByRole('textbox', { name: 'New note' }).fill('the clock tower');
  await page.getByRole('button', { name: 'Add note' }).click();

  await expect(page.getByRole('dialog').getByText('the clock tower')).toBeVisible();
  await expect(waiting(page)).toHaveCount(0);

  // A reload comes back to the open journal, and the picture comes from the server.
  await page.reload();
  expect(await decoded(notePicture(page))).toEqual({ width: 1920, height: 1080 });

  // Written as WebP by this engine's canvas, and kept by the browser alone, for a year.
  const kept = await page.request.get((await notePicture(page).getAttribute('src'))!);
  expect(kept.headers()['content-type']).toBe('image/webp');
  expect(kept.headers()['cache-control']).toBe('private, max-age=31536000, immutable');
  expect(kept.headers()['x-content-type-options']).toBe('nosniff');

  // The card draws the newest note's first picture, from its small copy.
  await page.getByRole('button', { name: 'Close' }).click();
  const thumbnail = card(page, 'Celeste').locator('[data-note] img');
  await expect(thumbnail).toHaveAttribute('src', /\/thumbnail$/);
  expect((await decoded(thumbnail)).height).toBe(96);
});

test('a pasted screenshot goes into the note as a picked one does', async ({ page, browserName }) => {
  // Firefox gives a paste made in a script an empty clipboard, no types and no files, where
  // Chromium hands the files through: measured on 30 October 2026. The user's real pastes in
  // Firefox were measured the same day with the probe, and carried their pictures.
  test.skip(browserName === 'firefox', 'Firefox empties the clipboard of a paste a script makes.');

  await seed(page.request, 'Celeste', 'InProgress');
  await page.reload();
  await openJournal(page, 'Celeste');

  await pastePicture(page, await screenshot(page, 2560, 1440), 'snip.png', 'image/png');
  await expect(waiting(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Add note' }).click();

  expect(await decoded(notePicture(page))).toEqual({ width: 1920, height: 1080 });
});

test('a phone photo held upright arrives upright', async ({ page }) => {
  // The phone records which way up it was held beside the pixels, and saving the picture again
  // throws the record away, so the shrink has to turn the pixels before it does.
  await seed(page.request, 'Celeste', 'InProgress');
  await page.reload();
  await openJournal(page, 'Celeste');

  await picker(page).setInputFiles({
    name: 'IMG_0001.jpg',
    mimeType: 'image/jpeg',
    buffer: await uprightPhoto(page),
  });
  await expect(waiting(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Add note' }).click();

  const picture = notePicture(page);
  expect(await decoded(picture)).toEqual({ width: 300, height: 400 });

  // The block that was top-left in the pixels is top-right once turned, and nothing else is red.
  const topRight = await pixel(picture, 280, 20);
  const topLeft = await pixel(picture, 20, 20);
  expect(topRight.red).toBeGreaterThan(180);
  expect(topRight.blue).toBeLessThan(90);
  expect(topLeft.red).toBeLessThan(90);
  expect(topLeft.blue).toBeGreaterThan(120);
});

/**
 * A request's headers and nothing else, sent to the API itself, asking leave to send the body.
 * Answers with what the API said, or fails if the API asked for the body, which it does only once
 * something starts reading it.
 */
function askToSend(path: string, headers: Record<string, string>) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = httpRequest(
      { host: 'localhost', port: API_PORT, path, method: 'POST', headers: { ...headers, Expect: '100-continue' } },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => (body += chunk));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
      },
    );
    request.on('continue', () => {
      request.destroy();
      reject(new Error('The API asked for the body, so something was going to read it.'));
    });
    request.on('error', reject);
    request.flushHeaders();
  });
}

test('a request bigger than any note needs is refused before any of it is read', async ({ page }) => {
  // Four pictures at the most a picture may be, with their thumbnails, is the most a note can
  // need: 8,716,288 bytes. The route tells Kestrel, which refuses a request that says it is
  // larger before reading any of it, rather than taking it all to disk for the service to refuse.
  // The test server keeps no such limit, which is why this is here rather than in the backend
  // suite.
  //
  // Asked with Expect: 100-continue, straight to the API: Kestrel asks for the body only once
  // something starts reading it, so a refusal that comes back instead proves nothing read it. A
  // body sent anyway is answered while it is still going, which ended in a 502 or a hang on Vite's
  // proxy one run in four, measured on 30 October 2026, and proved nothing either way.
  const mediaId = await seed(page.request, 'Celeste', 'InProgress');
  const [pass] = await entriesFor(page.request, mediaId);
  const session = (await page.context().cookies()).find((cookie) => cookie.name === 'hobbytracker.session');

  const answer = await askToSend(`/api/log-entries/${pass!.id}/notes`, {
    'Content-Type': 'multipart/form-data; boundary=x',
    'Content-Length': String(9 * 1024 * 1024),
    Cookie: `${session!.name}=${session!.value}`,
  });

  // Refused by the route, not by the service, which names the picture it refuses: MVC files a
  // form it could not read under no field at all.
  expect(answer.status).toBe(400);
  const problem = JSON.parse(answer.body) as { errors: Record<string, string[]> };
  expect(Object.keys(problem.errors)).toEqual(['']);
  expect(problem.errors['']?.join(' ')).toMatch(/too large/i);

  const [after] = await entriesFor(page.request, mediaId);
  expect(after!.notes).toEqual([]);
});

test.describe('on a phone', () => {
  // The picker is the way in on a phone, and Android's offers the gallery and the camera.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Only Chromium can be told it is a phone.');

  test("the box's button takes a picture from the picker", async ({ page }) => {
    await seed(page.request, 'Celeste', 'Backlog');
    await page.reload();
    await openJournal(page, 'Celeste');

    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Add a picture' }).first(),
    ).toBeVisible();
    await picker(page).setInputFiles({
      name: 'PXL_20261030.png',
      mimeType: 'image/png',
      buffer: Buffer.from(await screenshot(page, 1080, 2400), 'base64'),
    });
    await expect(waiting(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Add note' }).click();

    expect(await decoded(notePicture(page))).toEqual({ width: 864, height: 1920 });
  });
});
