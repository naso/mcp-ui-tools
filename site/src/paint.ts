/**
 * Paint on a wall, as it is sprayed. A can lays paint wherever it is held, as
 * in `spray.ts`: a cone packed with droplets, a dust at its edge, a mist
 * around it and a few spatters. The longer it stays over a spot the more
 * lands there, and past what the wall holds, the paint runs.
 *
 * Stencils lie on the wall as sheets of card. Paint lands on whatever is on
 * top: on a sheet's card, or through its cuts onto what is below. A sheet
 * keeps the paint that hit it and takes it along when it moves. A little
 * creeps under the edges of the card, more where it sits loose.
 *
 * The paint stays wet: a finger drawn through it smears it, off the card and
 * into the cuts as well.
 */

import { gaussian, noise, smoothstep } from './spray';
import type { Point } from './spray';

export type { Point };

export type Rgb = [r: number, g: number, b: number];

/** A sheet's side, and the side of the art cut into its middle, in its units. */
export const SHEET = 52;
export const ART = 32;

/** How round a sheet's corners are, in its units. */
export const ROUND = 3;

/**
 * Where a sheet lies: its middle on the wall in CSS pixels, its turn in
 * radians, and how many CSS pixels one of its units takes.
 */
export type Place = { x: number; y: number; angle: number; size: number };

export type Stencil = Place & {
  id: number;
  /** What it lets through, drawn on a square: paint goes where it is opaque. */
  cut: CanvasImageSource;
  /** Where the sheet is drawn, with the paint on it. */
  canvas: HTMLCanvasElement;
};

/**
 * A transform as a canvas takes it: `x` to `a * x + c * y + e`, and `y` to
 * `b * x + d * y + f`.
 */
type Matrix = [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

const invert = ([a, b, c, d, e, f]: Matrix): Matrix => {
  const det = a * d - b * c;
  return [
    d / det,
    -b / det,
    -c / det,
    a / det,
    (c * f - d * e) / det,
    (b * e - a * f) / det,
  ];
};

/** `first`, then `then`. */
const chain = (first: Matrix, then: Matrix): Matrix => [
  then[0] * first[0] + then[2] * first[1],
  then[1] * first[0] + then[3] * first[1],
  then[0] * first[2] + then[2] * first[3],
  then[1] * first[2] + then[3] * first[3],
  then[0] * first[4] + then[2] * first[5] + then[4],
  then[1] * first[4] + then[3] * first[5] + then[5],
];

/** Pixels, from the left and top to the right and bottom, inclusive. */
type Box = [left: number, top: number, right: number, bottom: number];

const NONE: Box = [Infinity, Infinity, -Infinity, -Infinity];

/** Something that takes paint: the wall, or a sheet. */
type Surface = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /**
   * Five numbers to a pixel: its paint's red, green and blue, each times how
   * opaque the paint is, then how opaque it is, then how much of it there is.
   */
  paint: Float32Array;
  /** The paint still wet, a number to each square of `WET` pixels. */
  wet: Float32Array;
  image: ImageData;
  /** How much of each pixel the can reaches, of 255. All of it when unset. */
  open?: Uint8Array;
  /** How much of each pixel of a sheet is card, of 255. */
  card?: Uint8Array;
  /** From CSS pixels on the wall to its own pixels. */
  to: Matrix;
  /** How many of its pixels a CSS pixel takes. */
  k: number;
  /** The pixels to draw again, in a few boxes, one around each change. */
  dirty: Box[];
  /** The squares of wet paint the can has just added to. */
  soaked: Box;
};

type Sheet = Surface &
  Stencil & {
    card: Uint8Array;
    /** The card as a canvas, to draw where it shields what is below. */
    mask: HTMLCanvasElement;
  };

/** Paint running down from a heavy spot. */
type Drip = {
  on: Surface;
  /** Its tip, and where it began, in its surface's pixels. */
  x: number;
  y: number;
  rootX: number;
  rootY: number;
  /** How far it has run, in CSS pixels. */
  ran: number;
  /** The paint feeding it, and its luck in how far that takes it. */
  load: number;
  luck: number;
  width: number;
  /** How near to it another may start, in CSS pixels. */
  room: number;
  color: Rgb;
  wander: (t: number) => number;
  /** How big its bead is against its width. */
  bead: number;
  /** When it starts to run, and when it last took on paint, in seconds. */
  due: number;
  fed: number;
  /** Whether it has stopped. More paint starts it again. */
  set: boolean;
  /** Where its bead was last drawn. */
  seen?: Box;
};

/** How opaque paint is for how much of it there is. */
const COVER = 1.3;

/** Past this much, paint sits a touch deeper. */
const FULL = 4;

/** How far past its radius a cone reaches, and past its width the mist. */
const REACH = 1.6;
const DRIFT = 3.9;

/** How much paint the can lays at its middle in a second. */
const FLOW = 82;

/** The mist's share of it. */
const HAZE = 0.0066;

/**
 * The droplets a second from a cap that sprays a line 7 pixels wide: packed
 * into the core, as dust off its edge, and thrown out as spatters.
 */
const CORE = 4960;
const DUST = 4530;
const SPATTER = 70;

/** How much wet paint a spot holds before it runs. */
const SAG = 14;

/** How long wet paint takes to dry to a third, in seconds. */
const DRY = 4;

/** The side of a square of wet paint, in pixels. */
const WET = 4;

/** The most pixels one of a sheet's units is drawn with. */
const FINEST = 12;

/** How far under the card's edge paint creeps, in CSS pixels. */
const CREEP = 2.6;

/** How much paint a finger leaves of what it carries, at its middle. */
const LEAVE = 0.3;
/** And how much it picks up of what it passes over. */
const PICK = 0.22;
/** And how much of what it carries the wall soaks up as it goes. */
const SOAK = 0.12;

/** The steps in a profile across a cone or the mist. */
const STEPS = 512;

/**
 * A wall `cssWidth` by `cssHeight` pixels on a canvas, to spray, to lay
 * stencils on and to smear.
 */
export function wall(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  scale: number,
) {
  const rand = Math.random;
  const clock = () => performance.now() / 1000;

  // How opaque paint is for `x`, its amount times `COVER`: `1 - e^-x`, in
  // steps of a 64th up to 16.
  const OPAQUE = Float32Array.from(
    { length: 1026 },
    (_, i) => 1 - Math.exp(-i / 64),
  );

  // The can's cone over the square of the distance from its middle: solid,
  // with a short soft edge.
  const CONE = Float32Array.from({ length: STEPS }, (_, i) =>
    Math.exp(-(((i + 0.5) / STEPS) ** 2 * REACH ** 4) * Math.LN2 * 4),
  );

  // The mist the same way: wide and faint, down to nothing at its edge.
  const edge = Math.exp(-((DRIFT / 1.5) ** 2) / 2);
  const MIST = Float32Array.from(
    { length: STEPS },
    (_, i) =>
      (Math.exp((-((i + 0.5) / STEPS) * (DRIFT / 1.5) ** 2) / 2) - edge) /
      (1 - edge),
  );

  // Noise, 256 pixels square: a fine grain where paint is thin, and the luck
  // of what creeps under a sheet.
  const GRAIN = Float32Array.from({ length: 65536 }, rand);

  /** The card's colour. */
  let card: Rgb = [128, 128, 128];

  /** The paint being laid. */
  let r = 0;
  let g = 0;
  let b = 0;
  const ink = (color: Rgb) => {
    r = color[0];
    g = color[1];
    b = color[2];
  };

  /** A canvas `w` by `h` pixels and what holds its paint. */
  const make = (canvas: HTMLCanvasElement, w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    return {
      canvas,
      ctx,
      w,
      h,
      paint: new Float32Array(w * h * 5),
      wet: new Float32Array(Math.ceil(w / WET) * Math.ceil(h / WET)),
      image: ctx.createImageData(w, h),
      dirty: [[0, 0, w - 1, h - 1]] as Box[],
      soaked: [...NONE] as Box,
    };
  };

  const ground: Surface = {
    ...make(
      canvas,
      Math.round(cssWidth * scale),
      Math.round(cssHeight * scale),
    ),
    to: [scale, 0, 0, scale, 0, 0],
    k: scale,
  };

  /** The sheets, from the one on the wall to the one on top. */
  let sheets: Sheet[] = [];
  let surfaces: Surface[] = [ground];
  let drips: Drip[] = [];

  /**
   * Notes pixels to draw again: in the box already near them, or one of their
   * own, so a drip far from the can doesn't have all the wall between them
   * drawn again.
   */
  const mark = (s: Surface, x0: number, y0: number, x1: number, y1: number) => {
    const boxes = s.dirty;
    let box: Box | undefined;
    for (let i = 0; i < boxes.length && !box; i++) {
      const near = boxes[i];
      if (
        x0 <= near[2] + 16 &&
        x1 >= near[0] - 16 &&
        y0 <= near[3] + 16 &&
        y1 >= near[1] - 16
      )
        box = near;
    }
    if (!box && boxes.length > 11) box = boxes[0];
    if (!box) return void boxes.push([x0, y0, x1, y1]);
    if (x0 < box[0]) box[0] = x0;
    if (y0 < box[1]) box[1] = y0;
    if (x1 > box[2]) box[2] = x1;
    if (y1 > box[3]) box[3] = y1;
  };

  // Wet paint dries: every square by the same share, kept as one number
  // rather than taken off each square.
  let fade = 1;
  let dried = clock();
  const dry = (now: number) => {
    fade = Math.exp(-(now - dried) / DRY);
    if (fade > 1e-3) return;
    for (const { wet } of surfaces)
      for (let i = 0; i < wet.length; i++) wet[i] *= fade;
    dried = now;
    fade = 1;
  };

  /**
   * Lays a round of paint on a surface, from `(x, y)` on the wall out to
   * `reach`: `amount` at its middle, less further out by `profile`. `soak`
   * counts it as wet paint that can run.
   */
  const lay = (
    s: Surface,
    x: number,
    y: number,
    reach: number,
    profile: Float32Array,
    amount: number,
    soak: boolean,
  ) => {
    const { w, h, paint, open, to } = s;
    const cx = to[0] * x + to[2] * y + to[4];
    const cy = to[1] * x + to[3] * y + to[5];
    const R = reach * s.k;
    const x0 = Math.max(0, Math.floor(cx - R));
    const x1 = Math.min(w - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R));
    const y1 = Math.min(h - 1, Math.ceil(cy + R));
    if (x1 < x0 || y1 < y0) return;
    const per = STEPS / (R * R);
    const thick = amount * COVER * 64;
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      const row = py * w;
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - cx;
        const u = (dx * dx + dy * dy) * per;
        if (u >= STEPS) continue;
        const i = row + px;
        const e = open ? open[i] : 255;
        if (!e) continue;
        const f = (profile[u | 0] * e) / 255;
        const t = f * thick;
        const j = t | 0;
        const a =
          j >= 1024 ? 1 : OPAQUE[j] + (OPAQUE[j + 1] - OPAQUE[j]) * (t - j);
        const p = i * 5;
        paint[p] += (r - paint[p]) * a;
        paint[p + 1] += (g - paint[p + 1]) * a;
        paint[p + 2] += (b - paint[p + 2]) * a;
        paint[p + 3] += (1 - paint[p + 3]) * a;
        paint[p + 4] += f * amount;
      }
    }
    mark(s, x0, y0, x1, y1);
    if (!soak) return;
    const across = Math.ceil(w / WET);
    const wx0 = Math.floor(x0 / WET);
    const wx1 = Math.floor(x1 / WET);
    const wy0 = Math.floor(y0 / WET);
    const wy1 = Math.floor(y1 / WET);
    for (let wy = wy0; wy <= wy1; wy++)
      for (let wx = wx0; wx <= wx1; wx++) {
        const mx = Math.min(w - 1, wx * WET + WET / 2);
        const my = Math.min(h - 1, wy * WET + WET / 2);
        const u = ((mx - cx) ** 2 + (my - cy) ** 2) * per;
        if (u >= STEPS) continue;
        const e = open ? open[my * w + mx] : 255;
        s.wet[wy * across + wx] += (profile[u | 0] * amount * e) / 255 / fade;
      }
    const wetted = s.soaked;
    if (wx0 < wetted[0]) wetted[0] = wx0;
    if (wy0 < wetted[1]) wetted[1] = wy0;
    if (wx1 > wetted[2]) wetted[2] = wx1;
    if (wy1 > wetted[3]) wetted[3] = wy1;
  };

  /**
   * A dab of paint on a surface, in its own pixels: a small disc, its edge
   * softened by how much of a pixel it covers. It lands only as far as
   * `through` lets it, of 255, or everywhere without one.
   */
  const dab = (
    s: Surface,
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    through?: Uint8Array,
  ) => {
    const { w, h, paint } = s;
    const R = Math.max(0.5, radius);
    const x0 = Math.max(0, Math.floor(cx - R - 1));
    const x1 = Math.min(w - 1, Math.ceil(cx + R + 1));
    const y0 = Math.max(0, Math.floor(cy - R - 1));
    const y1 = Math.min(h - 1, Math.ceil(cy + R + 1));
    if (x1 < x0 || y1 < y0) return;
    // A dab smaller than a pixel paints less of it.
    const thin = Math.min(1, radius / 0.5) ** 2 * amount;
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      const row = py * w;
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - cx;
        const cover = R + 0.5 - Math.sqrt(dx * dx + dy * dy);
        if (cover <= 0) continue;
        const i = row + px;
        const e = through ? through[i] : 255;
        if (!e) continue;
        const laid = ((cover > 1 ? thin : cover * thin) * e) / 255;
        const t = laid * COVER * 64;
        const j = t | 0;
        const a =
          j >= 1024 ? 1 : OPAQUE[j] + (OPAQUE[j + 1] - OPAQUE[j]) * (t - j);
        const p = i * 5;
        paint[p] += (r - paint[p]) * a;
        paint[p + 1] += (g - paint[p + 1]) * a;
        paint[p + 2] += (b - paint[p + 2]) * a;
        paint[p + 3] += (1 - paint[p + 3]) * a;
        paint[p + 4] += laid;
      }
    }
    mark(s, x0, y0, x1, y1);
  };

  /** A droplet from the can at `(x, y)` on the wall, on whatever is there. */
  const land = (x: number, y: number, radius: number, amount: number) => {
    for (const s of surfaces) {
      const { to } = s;
      dab(
        s,
        to[0] * x + to[2] * y + to[4],
        to[1] * x + to[3] * y + to[5],
        radius * s.k,
        amount,
        s.open,
      );
    }
  };

  /** The can while it sprays. */
  let can:
    | {
        width: number;
        color: Rgb;
        /** Where the paint lands, and where the pointer last was. */
        at: Point;
        last: Point;
        /** Where the pointer has been since the last frame. */
        path: Point[];
        /** When it began to spray, in seconds. */
        since: number;
        /** How long, and how far, since it last laid mist. */
        haze: number;
        gone: number;
        /** How far from the wall the hand holds it, as it wavers. */
        breath: (t: number) => number;
      }
    | undefined;

  /** Sprays for `dt` seconds along the pointer's path since the last frame. */
  const emit = (dt: number, now: number) => {
    if (!can) return;
    const { width, path } = can;
    // The path with its corners rounded: from the middle of one move to the
    // middle of the next, bending around the point between.
    const line: Point[] = [can.at];
    for (const to of path) {
      const [ax, ay] = can.at;
      const [cx, cy] = can.last;
      const bx = (cx + to[0]) / 2;
      const by = (cy + to[1]) / 2;
      const parts = Math.max(
        1,
        Math.ceil(
          (Math.hypot(cx - ax, cy - ay) + Math.hypot(bx - cx, by - cy)) / 4,
        ),
      );
      for (let i = 1; i <= parts; i++) {
        const t = i / parts;
        const u = 1 - t;
        line.push([
          u * u * ax + 2 * u * t * cx + t * t * bx,
          u * u * ay + 2 * u * t * cy + t * t * by,
        ]);
      }
      can.at = [bx, by];
      can.last = to;
    }
    path.length = 0;
    // Held still, the paint catches up with the pointer.
    if (line.length === 1 && can.at !== can.last) {
      line.push(can.last);
      can.at = can.last;
    }
    const runs = line.map((point, i) =>
      i ? Math.hypot(point[0] - line[i - 1][0], point[1] - line[i - 1][1]) : 0,
    );
    const length = runs.reduce((sum, run) => sum + run, 0);

    const far = 1 + 0.13 * can.breath((now - can.since) * 1.3);
    const radius = (width / 2) * far;
    const count = Math.max(1, Math.ceil(length / Math.max(0.6, radius / 4)));
    // The valve opens over a moment.
    const flow = Math.min(1, 0.5 + (now - can.since) * 8);
    /** How long the can spends on each stamp, in seconds. */
    const each = (dt * flow) / count;
    // A wider cap throws droplets a little bigger, as thick over its area,
    // and no more spatters for its width.
    const big = (width / 7) ** 0.3;
    const many = (width / 7) ** 1.4 * each;
    const few = (width / 7) * each;
    ink(can.color);
    let at = 1;
    let walked = 0;
    for (let n = 0; n < count; n++) {
      const target = ((n + 0.5) / count) * length;
      while (at < line.length - 1 && walked + runs[at] < target)
        walked += runs[at++];
      const from = line[at - 1] ?? line[0];
      const to = line[at] ?? from;
      const t = runs[at] ? (target - walked) / runs[at] : 0;
      // A hand is never quite still.
      const x = from[0] + (to[0] - from[0]) * t + gaussian(rand) * 0.3;
      const y = from[1] + (to[1] - from[1]) * t + gaussian(rand) * 0.3;
      for (const s of surfaces)
        lay(s, x, y, radius * REACH, CONE, (FLOW * each) / far ** 1.5, true);
      // Droplets packed into the core.
      for (let d = Math.floor(CORE * many + rand()); d > 0; d--)
        land(
          x + gaussian(rand) * radius * 0.5,
          y + gaussian(rand) * radius * 0.5,
          (0.15 + rand() ** 3 * 0.45) * big,
          0.5 + rand(),
        );
      // A dust of fine ones off the edge of the cone.
      for (let d = Math.floor(DUST * many + rand()); d > 0; d--) {
        const a = rand() * Math.PI * 2;
        const out = radius * (0.8 + Math.abs(gaussian(rand)) * 0.5);
        land(
          x + Math.cos(a) * out,
          y + Math.sin(a) * out,
          (0.1 + rand() ** 5 * 0.6) * big,
          0.6 + rand() * 1.6,
        );
      }
      // And now and then a big spatter, thrown further out.
      for (let d = Math.floor(SPATTER * few + rand()); d > 0; d--) {
        const a = rand() * Math.PI * 2;
        const out = radius * (1.6 + Math.abs(gaussian(rand)) * 3.2);
        land(
          x + Math.cos(a) * out,
          y + Math.sin(a) * out,
          (0.3 + rand() ** 2 * 1.1) * big,
          3,
        );
      }
    }

    // The mist, wide and faint, every so often.
    can.haze += dt * flow;
    can.gone += length;
    if (can.gone < Math.max(4, width * 0.4) && can.haze < 0.08) return;
    const [x, y] = can.at;
    for (const s of surfaces)
      lay(s, x, y, width * DRIFT, MIST, FLOW * HAZE * can.haze, false);
    can.haze = 0;
    can.gone = 0;
  };

  /** How far a drip runs, in CSS pixels, how thick, and how big its bead is. */
  const span = (drip: Drip) =>
    Math.min(480, (3 + drip.load ** 0.8 * 0.1) * drip.luck);
  const girth = (drip: Drip) =>
    drip.width * (1 + Math.min(0.8, Math.sqrt(drip.load) * 0.012));
  const pearl = (drip: Drip) =>
    girth(drip) * drip.bead * Math.min(1, 0.55 + drip.ran / 30);

  /** How far to one side a drip has wandered once it has run `d` pixels. */
  const lean = (drip: Drip, d: number) =>
    drip.wander(d / 30) * 0.9 * smoothstep(0, 12, d);

  /**
   * Where the can has just laid more wet paint than a surface holds, the
   * excess sinks to the foot of the wet paint below it and runs from there:
   * into the drip already there, or as a new one.
   */
  const sag = (s: Surface, width: number, now: number) => {
    const [x0, y0, x1, y1] = s.soaked;
    s.soaked = [...NONE];
    if (x1 < x0) return;
    const across = Math.ceil(s.w / WET);
    const down = Math.ceil(s.h / WET);
    // One step down the wall, in the surface's pixels.
    const gx = s.to[2] / s.k;
    const gy = s.to[3] / s.k;
    const cell = WET / s.k;
    for (let wy = y0; wy <= y1; wy++)
      for (let wx = x0; wx <= x1; wx++) {
        const c = wy * across + wx;
        const over = s.wet[c] * fade - SAG;
        if (!(over > 0)) continue;
        s.wet[c] = SAG / fade;
        let fx = wx + 0.5;
        let fy = wy + 0.5;
        for (let n = 0; n < 80; n++) {
          const nx = fx + gx;
          const ny = fy + gy;
          if (nx < 0 || ny < 0 || nx >= across || ny >= down) break;
          if (s.wet[(ny | 0) * across + (nx | 0)] * fade < SAG * 0.4) break;
          fx = nx;
          fy = ny;
        }
        const px = fx * WET;
        const py = fy * WET;
        const load = over * cell * cell;
        const near = drips.find((drip) => {
          if (drip.on !== s) return false;
          const dx = (drip.rootX - px) / s.k;
          const dy = (drip.rootY - py) / s.k;
          return (
            Math.abs(dx * gy - dy * gx) < drip.room &&
            Math.abs(dx * gx + dy * gy) < drip.room * 2 + 6
          );
        });
        if (near) {
          near.load += load;
          near.fed = now;
          near.set = false;
          continue;
        }
        // The drip is the colour of the paint it runs from.
        const p =
          (Math.min(s.h - 1, py | 0) * s.w + Math.min(s.w - 1, px | 0)) * 5;
        const a = s.paint[p + 3];
        drips.push({
          on: s,
          x: px,
          y: py,
          rootX: px,
          rootY: py,
          ran: 0,
          load,
          luck: 0.3 + rand() ** 2 * 1.6,
          width: width ** 0.6 * 0.36 * (0.8 + rand() * 0.4),
          room: width * (0.35 + rand() * 0.5),
          color:
            a > 0.1
              ? [s.paint[p] / a, s.paint[p + 1] / a, s.paint[p + 2] / a]
              : [r, g, b],
          wander: noise(rand),
          bead: 0.5 + rand() * 0.15,
          // It gathers a moment before it runs.
          due: now + 0.15 + rand() * 0.5,
          fed: now,
          set: false,
        });
      }
  };

  /** Stops a drip where it is, with its bead as part of the paint. */
  const rest = (drip: Drip) => {
    const s = drip.on;
    const bead = pearl(drip) * s.k;
    ink(drip.color);
    dab(
      s,
      drip.x - (s.to[2] / s.k) * bead * 0.2,
      drip.y - (s.to[3] / s.k) * bead * 0.2,
      bead * 1.06,
      4,
      s.card,
    );
    drip.set = true;
    if (drip.seen) mark(s, ...drip.seen);
    drip.seen = undefined;
  };

  /**
   * Runs each drip on for `dt` seconds, down the wall however its surface is
   * turned: fast at first, slowing as the paint in it thins out. It leaves a
   * neck that narrows from the paint, then a thin run. A drip on a sheet
   * stops at the card's edge.
   */
  const run = (dt: number, now: number) => {
    for (const drip of drips) {
      if (drip.set || now < drip.due) continue;
      const s = drip.on;
      const far = span(drip);
      const left = far - drip.ran;
      const pace = 3 / (5 + far / 6);
      if (left * pace < 0.4) {
        rest(drip);
        continue;
      }
      let go = left * (1 - Math.exp(-pace * dt));
      const gx = s.to[2] / s.k;
      const gy = s.to[3] / s.k;
      const w = girth(drip);
      const neck = Math.min(far * 0.5, w * 2.2 + drip.room * 0.5);
      ink(drip.color);
      while (go > 0) {
        const step = Math.min(0.5, go);
        go -= step;
        const sway = lean(drip, drip.ran + step) - lean(drip, drip.ran);
        drip.ran += step;
        drip.x += (gx * step + gy * sway) * s.k;
        drip.y += (gy * step - gx * sway) * s.k;
        const off = drip.x < 0 || drip.y < 0 || drip.x >= s.w || drip.y >= s.h;
        if (
          off ||
          (s.card && s.card[(drip.y | 0) * s.w + (drip.x | 0)] < 128)
        ) {
          rest(drip);
          break;
        }
        const flare =
          drip.ran < neck ? (1 - drip.ran / neck) ** 2 * w * 1.8 : 0;
        const half = (w * (1 - (0.22 * drip.ran) / far) + flare) / 2;
        dab(s, drip.x, drip.y, half * s.k, 3, s.card);
      }
    }
  };

  /**
   * Paint to pixels, where a surface has changed: the more paint, the less
   * of what is under it shows, which is the card on a sheet and the page on
   * the wall.
   */
  const develop = (s: Surface) => {
    const { paint, w, card: sheet } = s;
    const data = s.image.data;
    for (const box of s.dirty.splice(0)) {
      const x0 = Math.max(0, box[0]);
      const y0 = Math.max(0, box[1]);
      const x1 = Math.min(s.w - 1, box[2]);
      const y1 = Math.min(s.h - 1, box[3]);
      if (x1 < x0 || y1 < y0) continue;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const i = y * w + x;
          const p = i * 5;
          const o = i * 4;
          const a = paint[p + 3];
          const under = sheet ? sheet[i] / 255 : 0;
          if (a < 0.002) {
            data[o] = card[0];
            data[o + 1] = card[1];
            data[o + 2] = card[2];
            data[o + 3] = under * 255;
            continue;
          }
          // A fine grain, as paint lands unevenly where it is thin.
          const grain = GRAIN[((y & 255) << 8) | (x & 255)];
          const cover = a * (1 + (grain - 0.5) * 0.35 * (1 - a));
          // Heavier paint sits a touch deeper.
          const heavy = Math.min(1, (paint[p + 4] - FULL) / (FULL * 1.5));
          const deep =
            heavy > 0 ? 1 - 0.12 * heavy * heavy * (3 - 2 * heavy) : 1;
          const all = cover + under * (1 - cover);
          const below = (under * (1 - cover)) / all;
          const tone = (deep / a) * (1 - below);
          data[o] = paint[p] * tone + card[0] * below;
          data[o + 1] = paint[p + 1] * tone + card[1] * below;
          data[o + 2] = paint[p + 2] * tone + card[2] * below;
          data[o + 3] = all * 255;
        }
      s.ctx.putImageData(s.image, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }
  };

  /** Draws what has changed, and the bead at the tip of each running drip. */
  const render = () => {
    const running = drips.filter((drip) => !drip.set && drip.ran > 0);
    for (const drip of running) {
      const s = drip.on;
      if (drip.seen) mark(s, ...drip.seen);
      const reach = pearl(drip) * s.k * 1.2 + 2;
      drip.seen = [
        Math.floor(drip.x - reach),
        Math.floor(drip.y - reach),
        Math.ceil(drip.x + reach),
        Math.ceil(drip.y + reach),
      ];
      mark(s, ...drip.seen);
    }
    for (const s of surfaces) develop(s);
    for (const drip of running) {
      const { ctx, to, k } = drip.on;
      const bead = pearl(drip) * k;
      // As deep as the heavy paint behind it.
      ctx.fillStyle = `rgb(${drip.color.map((c) => Math.round(c * 0.88))})`;
      ctx.beginPath();
      ctx.ellipse(
        drip.x - (to[2] / k) * bead * 0.2,
        drip.y - (to[3] / k) * bead * 0.2,
        bead,
        bead * 1.12,
        Math.atan2(to[3], to[2]) - Math.PI / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };

  // Frame by frame while the can sprays or a drip runs.
  let frame = 0;
  let then = 0;
  const step = (now: number) => {
    // However long a frame takes, the can lays as much paint as it did in
    // that time, short of a frame that never came.
    const dt = Math.min(0.5, now - then);
    then = now;
    dry(now);
    if (can) {
      emit(dt, now);
      for (const s of surfaces) sag(s, can.width, now);
    }
    run(dt, now);
    drips = drips.filter((drip) => !drip.set || now - drip.fed < 20);
    render();
  };
  const tick = () => {
    step(clock());
    frame =
      can || drips.some((drip) => !drip.set) ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => {
    if (frame) return;
    then = clock();
    frame = requestAnimationFrame(tick);
  };

  /** Starts to spray at a point on the wall, a line `width` pixels wide. */
  const press = (at: Point, color: Rgb, width: number) => {
    const now = clock();
    dry(now);
    can = {
      width,
      color,
      at,
      last: at,
      path: [],
      since: now,
      haze: 0,
      gone: 0,
      breath: noise(rand),
    };
    // The can often spits a few big drops as it starts.
    if (rand() < 0.3) {
      ink(color);
      for (let n = 4 + Math.floor(rand() * 8); n > 0; n--) {
        const a = rand() * Math.PI * 2;
        const out = width * (0.6 + Math.abs(gaussian(rand)) * 1.4);
        land(
          at[0] + Math.cos(a) * out,
          at[1] + Math.sin(a) * out,
          (0.3 + rand() ** 2 * 1.1) * (width / 7) ** 0.3,
          3,
        );
      }
    }
    wake();
  };

  /** Moves the can on to a point. */
  const move = (to: Point) => can?.path.push(to);

  /** Stops spraying. Drips already running run on. */
  const release = () => {
    if (!can) return;
    step(clock());
    can = undefined;
  };

  // A finger's tip: the paint it carries, as its red, green and blue times
  // how much of it there is, then how much, and how unevenly its skin takes it.
  const finger = {
    carry: new Float32Array(),
    ridges: new Float32Array(),
    on: false,
  };

  /**
   * A finger's touch at `(fx, fy)` on the wall, on one surface. It trades in
   * amounts of paint, so thick paint smears further than thin, and two
   * colours mix by how much there is of each.
   */
  const rub = (
    s: Surface,
    fx: number,
    fy: number,
    radius: number,
    R: number,
  ) => {
    const { w, h, paint, open, to } = s;
    const { carry, ridges } = finger;
    const size = R * 2 + 1;
    const cx = to[0] * fx + to[2] * fy + to[4];
    const cy = to[1] * fx + to[3] * fy + to[5];
    const reach = radius * s.k;
    const x0 = Math.max(0, Math.floor(cx - reach));
    const x1 = Math.min(w - 1, Math.ceil(cx + reach));
    const y0 = Math.max(0, Math.floor(cy - reach));
    const y1 = Math.min(h - 1, Math.ceil(cy + reach));
    if (x1 < x0 || y1 < y0) return;
    // From the surface's pixels to the finger's, which lie as the wall's do.
    const back = invert(to);
    for (let py = y0; py <= y1; py++)
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - cx;
        const dy = py + 0.5 - cy;
        const d = (dx * dx + dy * dy) / (reach * reach);
        if (d > 1) continue;
        const i = py * w + px;
        const e = open ? open[i] : 255;
        if (!e) continue;
        const ux = Math.round((back[0] * dx + back[2] * dy) * scale) + R;
        const uy = Math.round((back[1] * dx + back[3] * dy) * scale) + R;
        if (ux < 0 || uy < 0 || ux >= size || uy >= size) continue;
        const c = uy * size + ux;
        const p = i * 5;
        const q = c * 4;
        // The paint here, as the finger carries it.
        const a = paint[p + 3];
        const here = paint[p + 4];
        const tone = a > 1e-4 ? here / a : 0;
        // Put down on fresh paint, it only takes up what is there.
        if (!finger.on) {
          if (e < 128) continue;
          for (let n = 0; n < 3; n++) carry[q + n] = paint[p + n] * tone;
          carry[q + 3] = here;
          continue;
        }
        const weight = (Math.min(1, (1 - d) ** 2 * ridges[c]) * e) / 255;
        const held = carry[q + 3];
        const left = here + (held - here) * LEAVE * weight;
        const kept = 1 - SOAK * weight;
        // As opaque as that much paint is, in its mixed colour.
        const cover = left > 1e-4 ? (1 - Math.exp(-COVER * left)) / left : 0;
        for (let n = 0; n < 3; n++) {
          const mine = paint[p + n] * tone;
          const its = carry[q + n];
          paint[p + n] = (mine + (its - mine) * LEAVE * weight) * cover;
          carry[q + n] = (its + (mine - its) * PICK * weight) * kept;
        }
        paint[p + 3] = cover * left;
        paint[p + 4] = left;
        carry[q + 3] = (held + (here - held) * PICK * weight) * kept;
      }
    mark(s, x0, y0, x1, y1);
  };

  /**
   * Drags a finger `radius` CSS pixels across from `from` to `to`, or puts it
   * down at `to` without one. Along the way it leaves some of what it carries
   * and picks up some of what it passes, most at its middle, on whatever is
   * on top: the wall, or a sheet.
   */
  const smear = (from: Point | undefined, to: Point, radius: number) => {
    const R = Math.max(1, Math.round(radius * scale));
    const size = R * 2 + 1;
    if (finger.ridges.length !== size * size) {
      finger.carry = new Float32Array(size * size * 4);
      // The skin isn't even, so it drags paint in fine streaks.
      finger.ridges = Float32Array.from(
        { length: size * size },
        () => 0.4 + rand() * 1.2,
      );
      finger.on = false;
    }
    if (!from) finger.on = false;
    const [ax, ay] = from ?? to;
    const steps = Math.max(
      1,
      Math.ceil(
        (Math.hypot(to[0] - ax, to[1] - ay) * scale) / Math.max(1, R * 0.25),
      ),
    );
    for (let n = from ? 1 : steps; n <= steps; n++) {
      const fx = ax + ((to[0] - ax) * n) / steps;
      const fy = ay + ((to[1] - ay) * n) / steps;
      for (const s of surfaces) rub(s, fx, fy, radius, R);
      finger.on = true;
    }
    render();
  };

  /** A sheet's transform, from where it lies. */
  const lie = (sheet: Sheet) => {
    const k = sheet.w / SHEET / sheet.size;
    const cos = Math.cos(sheet.angle);
    const sin = Math.sin(sheet.angle);
    const half = sheet.w / 2;
    sheet.k = k;
    sheet.to = [
      k * cos,
      -k * sin,
      k * sin,
      k * cos,
      half - k * (cos * sheet.x + sin * sheet.y),
      half - k * (cos * sheet.y - sin * sheet.x),
    ];
  };

  /**
   * Draws a sheet with the pixels its size needs: its card cut again, and the
   * paint on it carried over.
   */
  const fit = (sheet: Sheet) => {
    const side = Math.round(SHEET * Math.min(FINEST, sheet.size * scale));
    if (side === sheet.w) return lie(sheet);
    const { paint: old, w: was } = sheet;
    Object.assign(sheet, make(sheet.canvas, side, side));
    if (was > 1) {
      const fresh = sheet.paint;
      const ratio = was / side;
      for (let y = 0; y < side; y++) {
        const sy = Math.min(was - 1.001, Math.max(0, (y + 0.5) * ratio - 0.5));
        const top = sy | 0;
        const fy = sy - top;
        for (let x = 0; x < side; x++) {
          const sx = Math.min(
            was - 1.001,
            Math.max(0, (x + 0.5) * ratio - 0.5),
          );
          const left = sx | 0;
          const fx = sx - left;
          const a = (top * was + left) * 5;
          const c = a + was * 5;
          const o = (y * side + x) * 5;
          for (let n = 0; n < 5; n++)
            fresh[o + n] =
              (old[a + n] * (1 - fx) + old[a + 5 + n] * fx) * (1 - fy) +
              (old[c + n] * (1 - fx) + old[c + 5 + n] * fx) * fy;
          // As opaque again as that much paint is.
          const faint = fresh[o + 3];
          const more =
            faint > 1e-4 ? (1 - Math.exp(-COVER * fresh[o + 4])) / faint : 0;
          for (let n = 0; n < 4; n++) fresh[o + n] *= more;
        }
      }
      for (const drip of drips) {
        if (drip.on !== sheet) continue;
        drip.x /= ratio;
        drip.y /= ratio;
        drip.rootX /= ratio;
        drip.rootY /= ratio;
        drip.seen = undefined;
      }
    }
    // The card: the sheet, less its cut.
    const unit = side / SHEET;
    const inset = ((SHEET - ART) / 2) * unit;
    sheet.mask.width = sheet.mask.height = side;
    const ctx = sheet.mask.getContext('2d', { willReadFrequently: true })!;
    ctx.beginPath();
    ctx.roundRect(1, 1, side - 2, side - 2, ROUND * unit);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(sheet.cut, inset, inset, ART * unit, ART * unit);
    const data = ctx.getImageData(0, 0, side, side).data;
    sheet.card = new Uint8Array(side * side);
    for (let i = 0; i < sheet.card.length; i++) sheet.card[i] = data[i * 4 + 3];
    sheet.open = sheet.card;
    lie(sheet);
  };

  /** Blurs `w` by `h` numbers in place, twice with a box `radius` wide. */
  const blur = (values: Float32Array, w: number, h: number, radius: number) => {
    const other = new Float32Array(values.length);
    const span = radius * 2 + 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        const row = y * w;
        let sum = 0;
        for (let x = -radius; x <= radius; x++)
          sum += values[row + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) {
          other[row + x] = sum / span;
          sum +=
            values[row + Math.min(w - 1, x + radius + 1)] -
            values[row + Math.max(0, x - radius)];
        }
      }
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let y = -radius; y <= radius; y++)
          sum += other[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) {
          values[y * w + x] = sum / span;
          sum +=
            other[Math.min(h - 1, y + radius + 1) * w + x] -
            other[Math.max(0, y - radius) * w + x];
        }
      }
    }
  };

  /** How loose the card sits at a pixel of the wall, in slow lumps. */
  const loose = (x: number, y: number) => {
    const gx = x / (40 * scale);
    const gy = y / (40 * scale);
    const i = Math.floor(gx);
    const j = Math.floor(gy);
    const knot = (i: number, j: number) => GRAIN[((j & 255) << 8) | (i & 255)];
    const top = knot(i, j) + (knot(i + 1, j) - knot(i, j)) * (gx - i);
    const bottom =
      knot(i, j + 1) + (knot(i + 1, j + 1) - knot(i, j + 1)) * (gx - i);
    const lump = top + (bottom - top) * (gy - j);
    return 0.15 + 2 * lump * lump;
  };

  // Where the sheets are drawn to work out what they shield.
  const veil = document.createElement('canvas');
  const lid = document.createElement('canvas');

  /**
   * Works out what the can reaches now the sheets lie where they do: on each
   * sheet, its card where no sheet above covers it, and on the wall, what no
   * card covers, with a dust of what creeps under the card's edges.
   */
  const arrange = () => {
    for (const sheet of sheets) fit(sheet);
    sheets.forEach((sheet, at) => {
      const above = sheets.slice(at + 1);
      if (!above.length) return void (sheet.open = sheet.card);
      lid.width = lid.height = sheet.w;
      const ctx = lid.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(sheet.mask, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      for (const over of above) {
        ctx.setTransform(...chain(invert(over.to), sheet.to));
        ctx.drawImage(over.mask, 0, 0);
      }
      const data = ctx.getImageData(0, 0, sheet.w, sheet.w).data;
      const open = new Uint8Array(sheet.card.length);
      for (let i = 0; i < open.length; i++) open[i] = data[i * 4 + 3];
      sheet.open = open;
    });

    const { w, h } = ground;
    if (!sheets.length) return void (ground.open = undefined);
    veil.width = w;
    veil.height = h;
    const ctx = veil.getContext('2d', { willReadFrequently: true })!;
    const pad = Math.round(CREEP * scale) * 2 + 2;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const sheet of sheets) {
      const out = chain(invert(sheet.to), ground.to);
      ctx.setTransform(...out);
      ctx.drawImage(sheet.mask, 0, 0);
      for (const [x, y] of [
        [0, 0],
        [sheet.w, 0],
        [0, sheet.w],
        [sheet.w, sheet.w],
      ]) {
        const px = out[0] * x + out[2] * y + out[4];
        const py = out[1] * x + out[3] * y + out[5];
        x0 = Math.min(x0, px - pad);
        y0 = Math.min(y0, py - pad);
        x1 = Math.max(x1, px + pad);
        y1 = Math.max(y1, py + pad);
      }
    }
    const open = (ground.open ??= new Uint8Array(w * h));
    open.fill(255);
    x0 = Math.max(0, Math.floor(x0));
    y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(w - 1, Math.ceil(x1));
    y1 = Math.min(h - 1, Math.ceil(y1));
    if (x1 < x0 || y1 < y0) return;
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const data = ctx.getImageData(x0, y0, bw, bh).data;
    // How much bare wall is near each pixel, for how far the dust creeps.
    const near = new Float32Array(bw * bh);
    for (let i = 0; i < near.length; i++) near[i] = 255 - data[i * 4 + 3];
    blur(near, bw, bh, Math.round(CREEP * scale));
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        const i = y * bw + x;
        const shut = data[i * 4 + 3];
        let e = 255 - shut;
        if (shut > 127) {
          const X = x + x0;
          const Y = y + y0;
          const n = near[i] / 255;
          const luck = GRAIN[((Y & 255) << 8) | (X & 255)];
          if (luck < n * n * 0.5 * loose(X, Y))
            e = Math.max(
              e,
              255 *
                (0.3 + 0.6 * GRAIN[(((Y + 97) & 255) << 8) | ((X + 41) & 255)]),
            );
        }
        open[(y + y0) * w + x + x0] = e;
      }
  };

  /**
   * Takes the stencils on the wall, from the one under the rest to the one on
   * top: new ones are laid down clean, and ones left out are gone with their
   * paint. `settled` is false while one is still being moved, when the can
   * can't spray anyway.
   */
  const sync = (list: Stencil[], settled = true) => {
    sheets = list.map((item) => {
      let sheet = sheets.find(
        ({ id, canvas }) => id === item.id && canvas === item.canvas,
      );
      const { x, y, angle, size } = item;
      if (sheet) {
        Object.assign(sheet, { x, y, angle, size });
        lie(sheet);
      } else {
        sheet = {
          ...item,
          w: 0,
          paint: new Float32Array(),
          mask: document.createElement('canvas'),
        } as Sheet;
        fit(sheet);
      }
      return sheet;
    });
    surfaces = [ground, ...sheets];
    drips = drips.filter(({ on }) => surfaces.includes(on));
    if (settled) arrange();
    render();
  };

  /** Wipes the paint off the wall. */
  const clear = () => {
    ground.paint.fill(0);
    ground.wet.fill(0);
    drips = drips.filter(({ on }) => on !== ground);
    mark(ground, 0, 0, ground.w - 1, ground.h - 1);
    render();
  };

  /** Fits the wall to a new size, keeping the paint that still fits on it. */
  const resize = (cssWidth: number, cssHeight: number) => {
    const w = Math.round(cssWidth * scale);
    const h = Math.round(cssHeight * scale);
    if (w === ground.w && h === ground.h) return;
    const { paint: old, w: was, h: tall } = ground;
    Object.assign(ground, make(canvas, w, h));
    const run = Math.min(w, was) * 5;
    for (let y = Math.min(h, tall) - 1; y >= 0; y--)
      ground.paint.set(old.subarray(y * was * 5, y * was * 5 + run), y * w * 5);
    ground.open = undefined;
    arrange();
    render();
  };

  /** Sets the card's colour, as red, green and blue. */
  const tint = (color: Rgb) => {
    card = color;
    for (const sheet of sheets) mark(sheet, 0, 0, sheet.w - 1, sheet.h - 1);
    render();
  };

  /** Stops the frames. */
  const stop = () => cancelAnimationFrame(frame);

  return { press, move, release, smear, sync, clear, resize, tint, stop };
}
