// Draws the images in `public` that come from the pages, with headless
// Chrome: a share image for each page in `og/`, a home-screen icon for each
// page in `icons/`, and the manifest's icons. Run it after changing a page's
// name, summary or logo: `pnpm --filter site images`. Set CHROME to Chrome's
// binary if it is not in the usual place.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const root = path.resolve(import.meta.dirname, '..');
const out = process.argv[2] ?? path.join(root, 'public');

const vite = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
});
const work = await mkdtemp(path.join(tmpdir(), 'images-'));
try {
  const { HOME, PAGES } = await vite.ssrLoadModule('/src/pages.ts');
  const { OG, ogMarkup, iconMarkup, imageStyles } =
    await vite.ssrLoadModule('/src/images.tsx');

  // The site's fonts and colours, with the fonts read from disk.
  const fonts = pathToFileURL(path.join(root, 'public/fonts')).href;
  const css = (await readFile(path.join(root, 'src/site.css'), 'utf8'))
    .match(/^[\s\S]*?\n}\n\n\/\* The component's own colours[\s\S]*?\n}\n/)[0]
    .replaceAll("url('/fonts", `url('${fonts}`);

  /** Draws `body` at `width` by `height` into `out/name`. */
  async function draw(name, body, width, height) {
    const html = `<!doctype html><html style="color-scheme: light"><head><meta charset="utf-8"><style>${css}${imageStyles}</style></head><body>${body}</body></html>`;
    const file = path.join(work, 'image.html');
    await writeFile(file, html);
    await mkdir(path.dirname(path.join(out, name)), { recursive: true });
    execFileSync(
      CHROME,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${width},${height}`,
        '--virtual-time-budget=2000',
        `--screenshot=${path.join(out, name)}`,
        pathToFileURL(file).href,
      ],
      { stdio: 'ignore' },
    );
    console.log(name);
  }

  for (const page of PAGES) {
    await draw(`og/${page.id}.png`, ogMarkup(page), OG.width, OG.height);
    await draw(`icons/${page.id}-180.png`, iconMarkup(page, 180), 180, 180);
  }
  for (const size of [192, 512]) {
    await draw(`icons/home-${size}.png`, iconMarkup(HOME, size), size, size);
  }
} finally {
  await rm(work, { recursive: true });
  await vite.close();
}
