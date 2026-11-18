// Draws the picture X shows on the brand page's card before it plays: the
// player, in the dark, with the logo sprayed through its stencil and lifted.
// Chrome paints it through its DevTools protocol, as a person would, so the
// paint is the player's own. Start the dev server, then run
// `pnpm --filter site player-image`, after the player changes. Pass another
// address to draw from it, and set CHROME to Chrome's binary if it is not in
// the usual place.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:5173/brand/wall/embed/';
const out = path.join(import.meta.dirname, '../public/og/brand-player.png');
const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = await mkdtemp(path.join(tmpdir(), 'thumb-'));
const chrome = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=600,600',
  'about:blank',
]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50 && !targets; i++) {
  await wait(200);
  targets = await fetch(`http://127.0.0.1:${port}/json/list`)
    .then((r) => r.json())
    .catch(() => undefined);
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    pending.set(++id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true })).result
    .result.value;

await send('Emulation.setDeviceMetricsOverride', {
  width: 600,
  height: 600,
  deviceScaleFactor: 2,
  mobile: false,
});
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'dark' }],
});
await send('Page.navigate', { url });
await wait(2500);

const center = (selector) =>
  evaluate(
    `(() => { const r = document.querySelector(${JSON.stringify(
      selector,
    )}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`,
  );
const mouse = (type, [x, y]) =>
  send('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: 'left',
    buttons: type === 'mouseReleased' ? 0 : 1,
    clickCount: 1,
  });
const click = async (at) => {
  await mouse('mousePressed', at);
  await mouse('mouseReleased', at);
  await wait(150);
};
/** Sprays along points, a few pixels a step. */
const stroke = async (points) => {
  await mouse('mousePressed', points[0]);
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let s = 1; s <= steps; s++) {
      await mouse('mouseMoved', [
        ax + ((bx - ax) * s) / steps,
        ay + ((by - ay) * s) / steps,
      ]);
      await wait(8);
    }
  }
  await mouse('mouseReleased', points.at(-1));
  await wait(200);
};

const sheet = await evaluate(
  `(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`,
);
const [sx, sy, sw, sh] = sheet;
const at = (fx, fy) => [sx + sw * fx, sy + sh * fy];

// The fat cap, blue, in rows across the sheet.
await click(await center('[aria-label="Fat cap"]'));
await click(await center('[aria-label="Blue"]'));
await stroke([
  at(0.1, 0.18),
  at(0.9, 0.24),
  at(0.12, 0.42),
  at(0.92, 0.5),
  at(0.1, 0.7),
  at(0.9, 0.82),
]);
// Green, over the lower right.
await click(await center('[aria-label="Green"]'));
await stroke([at(0.45, 0.95), at(0.98, 0.55), at(0.6, 0.98)]);
// Lift the sheet, to show the logo it left.
await click(await center('[aria-label="Move"]'));
await click(await center('.sheet'));
await click(await center('.sheet-lift'));
await wait(600);
await click(await center('[aria-label="Spray"]'));
await evaluate(
  `document.querySelector('.aim').hidden = true; document.activeElement?.blur(); 0`,
);
await mouse('mouseMoved', [300, 590]);
await wait(800);
await evaluate(`document.querySelector('.aim').hidden = true; 0`);

const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(out, Buffer.from(shot.result.data, 'base64'));
ws.close();
// Chrome lets go of its profile once it has quit.
const quit = new Promise((resolve) => chrome.once('exit', resolve));
chrome.kill();
await quit;
await rm(profile, { recursive: true, force: true });
console.log(path.relative(process.cwd(), out));
