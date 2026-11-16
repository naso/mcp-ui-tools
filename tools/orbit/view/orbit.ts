import { App } from '@modelcontextprotocol/ext-apps';

import { version } from '../package.json';

/**
 * Orbit: a dot circles two rings, and one input moves it to the other ring to
 * miss the arcs ahead. It speeds up with each arc it passes.
 */

type Hazard = { angle: number; lane: 0 | 1; passed: boolean };
type State = 'ready' | 'playing' | 'over';

const SPAN = 0.34;
const DOT = 6;
const STORAGE = 'orbit-best';

const main = document.querySelector('main')!;
const canvas = document.querySelector('canvas')!;
const context = canvas.getContext('2d')!;
const scoreText = document.querySelector('#score')!;
const bestText = document.querySelector('#best')!;
const hint = document.querySelector('#hint')!;
const probes = [...document.querySelectorAll<HTMLElement>('.probe')];

let colors = { foreground: '', muted: '', subtle: '', hazard: '' };
const readColors = () => {
  const [foreground, muted, subtle, hazard] = probes.map(
    (probe) => getComputedStyle(probe).color,
  );
  colors = { foreground, muted, subtle, hazard };
};

let best = 0;
try {
  best = Number(localStorage.getItem(STORAGE)) || 0;
} catch {}

let state: State = 'ready';
let angle = -Math.PI / 2;
let lane: 0 | 1 = 1;
/** 0 on the inner ring, 1 on the outer, easing between them. */
let position = 1;
let hazards: Hazard[] = [];
let next = 0;
let score = 0;
let endedAt = 0;
let flash = 0;

const speed = () => Math.min(1.7 + score * 0.05, 4.2);

function reset() {
  angle = -Math.PI / 2;
  lane = 1;
  position = 1;
  hazards = [];
  next = angle + Math.PI;
  score = 0;
  flash = 0;
}

function render() {
  scoreText.textContent = `${score}`;
  bestText.textContent = best ? `Best ${best}` : '';
  hint.textContent =
    state === 'ready'
      ? 'Tap or press space to start'
      : state === 'over'
        ? 'Tap to go again'
        : '';
}

function press() {
  if (state === 'playing') {
    lane = lane ? 0 : 1;
  } else if (state === 'ready' || performance.now() - endedAt > 400) {
    reset();
    state = 'playing';
    render();
  }
}

main.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  main.focus();
  press();
});
main.addEventListener('keydown', (event) => {
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  if (!event.repeat) press();
});

function step(dt: number, rings: [number, number], gap: number) {
  angle += speed() * dt * (state === 'playing' ? 1 : 0.5);
  position += (lane - position) * (1 - Math.exp(-dt * 20));
  if (state !== 'playing') return;

  // Arcs are laid down ahead, far enough apart to switch rings between them.
  while (next < angle + Math.PI * 1.25) {
    hazards.push({
      angle: next,
      lane: Math.random() < 0.5 ? 0 : 1,
      passed: false,
    });
    next += 0.95 + Math.random() * 0.75;
  }

  const radius = rings[0] + (rings[1] - rings[0]) * position;
  for (const hazard of hazards) {
    const reach = SPAN / 2 + DOT / radius;
    const close = Math.abs(angle - hazard.angle) < reach;
    const same = Math.abs(radius - rings[hazard.lane]) < gap * 0.55;
    if (close && same) {
      state = 'over';
      endedAt = performance.now();
      flash = 1;
      if (score > best) {
        best = score;
        try {
          localStorage.setItem(STORAGE, `${best}`);
        } catch {}
      }
      render();
      return;
    }
    if (!hazard.passed && hazard.angle + reach < angle) {
      hazard.passed = true;
      score += 1;
      render();
    }
  }
  hazards = hazards.filter((hazard) => hazard.angle > angle - Math.PI * 0.6);
}

function draw(dt: number) {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = devicePixelRatio;
  if (canvas.width !== Math.round(width * ratio)) {
    canvas.width = Math.round(width * ratio);
  }
  if (canvas.height !== Math.round(height * ratio)) {
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const x = width / 2;
  const y = height / 2;
  const middle = Math.min(width, height) * 0.33;
  const gap = middle * 0.2;
  const rings: [number, number] = [middle - gap, middle + gap];

  step(dt, rings, gap * 2);

  context.lineWidth = 1.5;
  context.strokeStyle = colors.subtle;
  for (const ring of rings) {
    context.beginPath();
    context.arc(x, y, ring, 0, Math.PI * 2);
    context.stroke();
  }

  context.lineWidth = 6;
  context.lineCap = 'round';
  context.strokeStyle = colors.hazard;
  for (const hazard of hazards) {
    context.globalAlpha = hazard.passed ? 0.3 : 1;
    context.beginPath();
    context.arc(
      x,
      y,
      rings[hazard.lane],
      hazard.angle - SPAN / 2,
      hazard.angle + SPAN / 2,
    );
    context.stroke();
  }
  context.globalAlpha = 1;

  const radius = rings[0] + (rings[1] - rings[0]) * position;
  context.fillStyle = state === 'over' ? colors.hazard : colors.foreground;
  context.beginPath();
  context.arc(
    x + Math.cos(angle) * radius,
    y + Math.sin(angle) * radius,
    DOT,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (flash > 0) {
    flash = Math.max(0, flash - dt * 3);
    context.globalAlpha = flash * 0.12;
    context.fillStyle = colors.hazard;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;
  }
}

let last = performance.now();
function frame(now: number) {
  // A frame after the page was hidden would jump the dot through an arc.
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  draw(dt);
  requestAnimationFrame(frame);
}

const app = new App({ name: 'Orbit', version });

const applyTheme = (theme?: string) => {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.style.colorScheme = theme;
  }
  readColors();
};

app.addEventListener('hostcontextchanged', (context) =>
  applyTheme(context.theme),
);

readColors();
render();
requestAnimationFrame(frame);

await app.connect();
applyTheme(app.getHostContext()?.theme);
