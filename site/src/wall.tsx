import { Tooltip } from '@base-ui/react/tooltip';
import { useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  PointerEvent as Press,
  ReactElement,
  ReactNode,
} from 'react';

import { rgb } from './graffiti';
import { ROUND, SHEET, wall } from './paint';
import type { Place, Point } from './paint';
import { cutOf, STENCILS } from './stencils';

type Tool = 'move' | 'spray' | 'smudge';

/** A tool's icon, for the compact wall's bar: 20px, in a 1.5px line. */
const icon = (path: ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {path}
  </svg>
);

/** Each tool, with the key that picks it: V for Move, as in Figma. */
const TOOLS: { id: Tool; name: string; key: string; icon: ReactNode }[] = [
  {
    id: 'move',
    name: 'Move',
    key: 'V',
    // The pointer's arrow.
    icon: icon(<path d="M5.5 3.5v12l3.2-3.1 2.3 5 2-.9-2.3-5h4.5z" />),
  },
  {
    id: 'spray',
    name: 'Spray',
    key: 'S',
    // A can, its nozzle, and the paint leaving it.
    icon: icon(
      <>
        <rect x="4" y="8" width="7" height="9" rx="1.5" />
        <path d="M6 8V6h3v2M7.5 6V4.5h2" />
        <path d="M13 4.5h.01M15.5 3.5h.01M15.5 6h.01M13.5 7h.01" />
      </>,
    ),
  },
  {
    id: 'smudge',
    name: 'Smudge',
    key: 'M',
    // A hand, its finger out to smudge with.
    icon: icon(
      <path d="M7.5 11V4a1.5 1.5 0 0 1 3 0v5.5M10.5 9.5V9a1.5 1.5 0 0 1 3 0v1M13.5 10a1.5 1.5 0 0 1 3 0v2.5a5 5 0 0 1-5 5h-1a4.5 4.5 0 0 1-3.4-1.6l-2.7-3.3a1.4 1.4 0 0 1 2.1-1.9l1 1" />,
    ),
  },
];

/** The caps, by how wide a line each sprays, in pixels. */
const CAPS = [
  { name: 'Skinny', width: 7 },
  { name: 'Regular', width: 16 },
  { name: 'Fat', width: 34 },
];

/** The cans: the site's colours, as CSS, so they follow the theme. */
const CANS = [
  { name: 'Blue', color: 'var(--spray)' },
  { name: 'Green', color: 'var(--success)' },
  { name: 'Red', color: 'var(--warning)' },
  { name: 'Cyan', color: 'var(--attribute)' },
  { name: 'Purple', color: 'var(--keyword)' },
  { name: 'Grey', color: 'var(--disabled)' },
  { name: 'Ink', color: 'var(--foreground)' },
  { name: 'Wall', color: 'var(--surface)' },
];

/** The can to pick a colour for, before one is picked. */
const OWN = '#ff4f9a';

/** The tip of the finger that smudges, in pixels. */
const FINGER = 11;

/** A sheet's unit in pixels: as it is put down, and at its least and most. */
const SIZE = 4;
const SMALLEST = 2;
const LARGEST = 8;

/** The card's colour. */
const CARD = 'var(--subtle)';

/** How long a sheet takes to lift off, as the stylesheet has it, in ms. */
const LIFT = 200;

/**
 * How near Lift's middle may come to the bars beside and below it, and to the
 * wall's top, where its name and Start over are.
 */
const LIFT_EDGE = { side: 26, top: 40, bottom: 16 };

/** The most pixels the wall is drawn with, however sharp the screen. */
const MOST = 1.8e6;

/** A name that shows beside its button when the pointer rests on it. */
function Tip({
  label,
  shortcut,
  side = 'right',
  children,
}: {
  label: string;
  /** The side of the button it shows on. */
  side?: 'right' | 'top';
  /** The key that does the same, shown after the name. */
  shortcut?: string;
  children: ReactElement;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={8} className="tip-place">
          <Tooltip.Popup className="tip">
            {label}
            {shortcut && <kbd>{shortcut}</kbd>}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** A stencil on the wall. `leaving` while it lifts off. */
type Placed = Place & { id: number; kind: number; leaving?: boolean };

/**
 * A wall to paint. Stencils from the tray lie on it as sheets, to move, turn
 * and size. A can sprays over them, on the card and through its cuts, and a
 * finger smudges the paint. Lifting a sheet shows what it left. `compact`
 * puts the kit in small bars over the wall's sides, for a small frame.
 */
export function Wall({
  compact = false,
  credit = false,
}: {
  compact?: boolean;
  /** Who made it, after its name, for where it plays away from the site. */
  credit?: boolean;
}) {
  const face = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const aim = useRef<HTMLDivElement>(null);
  const paint = useRef<ReturnType<typeof wall>>(undefined);
  /** Each stencil's shape as an image, and each sheet's canvas. */
  const cuts = useRef<HTMLImageElement[]>([]);
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  /** Whether a sheet is being moved, turned or sized. */
  const moving = useRef(false);
  const ids = useRef(0);

  const [tool, setTool] = useState<Tool>('spray');
  const [can, setCan] = useState(0);
  const [own, setOwn] = useState<string>();
  const [cap, setCap] = useState(1);
  /** The sheets, from the one under the rest to the one on top. */
  const [sheets, setSheets] = useState<Placed[]>([]);
  /** The sheet in hand. */
  const [held, setHeld] = useState<number>();

  /** A new sheet in the middle of the wall, a step off for each one there. */
  const put = (kind: number, angle: number, others: number): Placed => {
    const box = face.current!;
    const off = (others % 5) * 24;
    return {
      id: ++ids.current,
      kind,
      x: box.clientWidth / 2 + off,
      y: box.clientHeight / 2 + off,
      angle,
      size: SIZE,
    };
  };

  /** The wall as it opens: the home page's logo, laid down a little askew. */
  const open = () => {
    const first = put(0, -0.07, 0);
    setSheets([first]);
    setHeld(first.id);
  };

  useEffect(() => {
    const box = face.current!;
    const canvas = box.querySelector('canvas')!;
    const area = box.clientWidth * box.clientHeight;
    const engine = wall(
      canvas,
      box.clientWidth,
      box.clientHeight,
      Math.min(2, devicePixelRatio, Math.sqrt(MOST / area)),
    );
    paint.current = engine;
    const tint = () => engine.tint(rgb(canvas, CARD));
    tint();

    // The stencils' shapes, from the tray's drawings of them.
    let live = true;
    Promise.all([...tray.current!.querySelectorAll('svg')].map(cutOf)).then(
      (images) => {
        if (!live) return;
        cuts.current = images;
        open();
      },
    );

    // The wall takes the room it has, and no sheet is left past its edge.
    const resize = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = box;
      engine.resize(w, h);
      setSheets((list) =>
        list.some(({ x, y }) => x > w || y > h)
          ? list.map((sheet) => ({
              ...sheet,
              x: Math.min(w, sheet.x),
              y: Math.min(h, sheet.y),
            }))
          : list,
      );
    });
    resize.observe(box);
    const theme = matchMedia('(prefers-color-scheme: dark)');
    theme.addEventListener('change', tint);
    return () => {
      live = false;
      engine.stop();
      resize.disconnect();
      theme.removeEventListener('change', tint);
    };
  }, []);

  /**
   * On the compact wall, a tool's key picks it and a number puts that stencil
   * down, unless a modifier is held or a field has the keys. Set after each
   * render, so it puts a stencil down by the sheets as they are.
   */
  const keys = useRef<(event: KeyboardEvent) => void>(undefined);
  useEffect(() => {
    keys.current = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as Element).closest?.('input, textarea')) return;
      const found = TOOLS.find(({ key }) => key === event.key.toUpperCase());
      const kind = Number(event.key) - 1;
      if (found) setTool(found.id);
      else if (kind >= 0 && kind < STENCILS.length) add(kind);
      else return;
      // A button clicked before keeps the focus, and a key shows its ring;
      // the bar gives it up, as the pick is the key's, not the button's.
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused.closest('.bar'))
        focused.blur();
    };
  });
  useEffect(() => {
    if (!compact) return;
    const press = (event: KeyboardEvent) => keys.current?.(event);
    window.addEventListener('keydown', press);
    return () => window.removeEventListener('keydown', press);
  }, [compact]);

  // The paint follows the sheets: where each lies, and which are there.
  useEffect(() => {
    paint.current?.sync(
      sheets
        .filter(({ leaving }) => !leaving)
        .map((sheet) => ({
          ...sheet,
          cut: cuts.current[sheet.kind],
          canvas: canvases.current.get(sheet.id)!,
        })),
      !moving.current,
    );
  }, [sheets]);

  /** A pointer's place on the wall. */
  const at = (event: { clientX: number; clientY: number }): Point => {
    const box = face.current!.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  };

  /** Follows the pointer until it lets go, wherever it goes. */
  const follow = (move: (event: PointerEvent) => void, done: () => void) => {
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      done();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  /** Sprays or smudges from where the wall is pressed. */
  const press = (event: Press<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (tool === 'move') return setHeld(undefined);
    event.preventDefault();
    const engine = paint.current!;
    let last = at(event);
    if (tool === 'spray') {
      const color = can < CANS.length ? CANS[can].color : (own ?? OWN);
      const canvas = face.current!.querySelector('canvas')!;
      engine.press(last, rgb(canvas, color), CAPS[cap].width);
    } else engine.smear(undefined, last, FINGER);
    follow(
      (event) => {
        // Every place the pointer has been, not only the last of a frame.
        const all = event.getCoalescedEvents?.() ?? [];
        for (const each of all.length ? all : [event]) {
          const to = at(each);
          if (tool === 'spray') engine.move(to);
          else engine.smear(last, to, FINGER);
          last = to;
        }
      },
      () => engine.release(),
    );
  };

  /** The ring that shows where the can or the finger is. */
  const point = (event: Press<HTMLDivElement>) => {
    const ring = aim.current!;
    ring.hidden = event.pointerType === 'touch';
    const [x, y] = at(event);
    ring.style.translate = `${x}px ${y}px`;
  };

  /** Changes one sheet, to new values or by what `to` makes of it. */
  const change = (
    id: number,
    to: Partial<Placed> | ((sheet: Placed) => Partial<Placed>),
  ) =>
    setSheets((list) =>
      list.map((sheet) =>
        sheet.id === id
          ? { ...sheet, ...(typeof to === 'function' ? to(sheet) : to) }
          : sheet,
      ),
    );

  /**
   * Takes a sheet in hand, on top of the rest, and moves it with the pointer,
   * or turns or sizes it about its middle. Shift turns it in steps of 15°.
   */
  const grab = (
    event: Press<HTMLElement>,
    sheet: Placed,
    how: 'move' | 'turn' | 'size',
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setHeld(sheet.id);
    setSheets((list) => [
      ...list.filter(({ id }) => id !== sheet.id),
      ...list.filter(({ id }) => id === sheet.id),
    ]);
    const box = face.current!;
    const [fromX, fromY] = at(event);
    const angle = Math.atan2(fromY - sheet.y, fromX - sheet.x);
    const far = Math.hypot(fromX - sheet.x, fromY - sheet.y);
    moving.current = true;
    follow(
      (event) => {
        const [x, y] = at(event);
        if (how === 'move')
          change(sheet.id, {
            x: Math.min(box.clientWidth, Math.max(0, sheet.x + x - fromX)),
            y: Math.min(box.clientHeight, Math.max(0, sheet.y + y - fromY)),
          });
        else if (how === 'turn') {
          const turned =
            sheet.angle + Math.atan2(y - sheet.y, x - sheet.x) - angle;
          const step = Math.PI / 12;
          change(sheet.id, {
            angle: event.shiftKey ? Math.round(turned / step) * step : turned,
          });
        } else {
          const size =
            (sheet.size * Math.hypot(x - sheet.x, y - sheet.y)) / far;
          change(sheet.id, {
            size: Math.min(LARGEST, Math.max(SMALLEST, size)),
          });
        }
      },
      () => {
        moving.current = false;
        // A new list, so the paint takes the sheets as they now lie.
        setSheets((list) => [...list]);
      },
    );
  };

  /** Puts a stencil on the wall, in hand. */
  const add = (kind: number) => {
    const added = put(kind, 0, sheets.length);
    setSheets((list) => [...list, added]);
    setHeld(added.id);
    setTool('move');
  };

  /** The sheets still on the wall, and the one Lift takes: in hand, or on top. */
  const down = sheets.filter(({ leaving }) => !leaving);
  const next = down.find(({ id }) => id === held) ?? down.at(-1);

  /**
   * On the compact wall, where Lift goes for the sheet in hand: beside its
   * turning handle, turned with it, and kept in the open wall between the
   * bars, however near an edge the sheet lies. In the wall's own pixels.
   */
  const holding = tool === 'move' && down.find(({ id }) => id === held);
  const liftAt = ((): Point | undefined => {
    const box = face.current;
    if (!compact || !holding || !box) return;
    const { x, y, angle, size } = holding;
    // The handle is 24px above the sheet's top edge; Lift is 34px to its right.
    const along = 34;
    const up = -(SHEET * size) / 2 - 24;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const clamp = (value: number, least: number, most: number) =>
      Math.min(most, Math.max(least, value));
    // The open wall: between the side bars, and above the stencils.
    const wall = box.getBoundingClientRect();
    const bar = (side: string) =>
      box.parentElement!.querySelector(`.bar-${side}`)!.getBoundingClientRect();
    const { side, top, bottom } = LIFT_EDGE;
    const left = bar('left').right - wall.left + side;
    const right = bar('right').left - wall.left - side;
    const low = bar('bottom').top - wall.top - bottom;
    // The wall sits 2px inside its frame.
    return [
      clamp(x + along * cos - up * sin, left, right) + 2,
      clamp(y + along * sin + up * cos, top, low) + 2,
    ];
  })();

  /** Lifts a sheet off the wall, and takes the next one down in hand. */
  const lift = (id: number) => {
    change(id, { leaving: true });
    setHeld(down.filter((sheet) => sheet.id !== id).at(-1)?.id);
    setTimeout(
      () => setSheets((list) => list.filter((sheet) => sheet.id !== id)),
      LIFT,
    );
  };

  /** Cleans the wall, back to how it opened. */
  const reset = () => {
    paint.current!.clear();
    open();
  };

  const reach = tool === 'smudge' ? FINGER * 2 : CAPS[cap].width;

  const tools = (
    <div className="picks" role="group" aria-label="Tool">
      {TOOLS.map(({ id, name, key, icon }) =>
        compact ? (
          <Tip key={id} label={name} shortcut={key}>
            <button
              type="button"
              className="pick"
              aria-label={name}
              aria-keyshortcuts={key}
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
            >
              {icon}
            </button>
          </Tip>
        ) : (
          <button
            key={id}
            type="button"
            className="pick"
            aria-pressed={tool === id}
            onClick={() => setTool(id)}
          >
            {name}
          </button>
        ),
      )}
    </div>
  );

  const caps = (
    <div className="picks" role="group" aria-label="Cap">
      {CAPS.map(({ name }, index) => {
        const button = (
          <button
            key={name}
            type="button"
            className="pick"
            aria-label={`${name} cap`}
            aria-pressed={cap === index}
            onClick={() => {
              setCap(index);
              setTool('spray');
            }}
          >
            <span
              className="dot"
              style={{ '--dot': `${4 + index * 5}px` } as CSSProperties}
            />
          </button>
        );
        return compact ? (
          <Tip key={name} label={`${name} cap`}>
            {button}
          </Tip>
        ) : (
          button
        );
      })}
    </div>
  );

  const cans = (
    <div className="cans" role="group" aria-label="Colour">
      {CANS.map(({ name, color }, index) => (
        <button
          key={name}
          type="button"
          className="can"
          aria-label={name}
          aria-pressed={can === index}
          style={{ '--paint': color } as CSSProperties}
          onClick={() => {
            setCan(index);
            setTool('spray');
          }}
        />
      ))}
      {/* A can of any colour, from the system's picker. */}
      <label
        className="can can-own"
        data-picked={can === CANS.length || undefined}
        style={own ? ({ '--paint': own } as CSSProperties) : undefined}
      >
        <input
          type="color"
          aria-label="Your own colour"
          value={own ?? OWN}
          onChange={(event) => {
            setOwn(event.target.value);
            setCan(CANS.length);
            setTool('spray');
          }}
        />
      </label>
    </div>
  );

  const stencils = (
    <div className="picks" ref={tray} role="group" aria-label="Stencils">
      {STENCILS.map(({ name, Shape }, kind) => {
        const button = (
          <button
            key={name}
            type="button"
            className="pick pick-stencil"
            aria-label={`Put the ${name} stencil on the wall`}
            aria-keyshortcuts={compact ? String(kind + 1) : undefined}
            onClick={() => add(kind)}
          >
            <Shape size={compact ? 20 : 28} />
          </button>
        );
        return compact ? (
          <Tip key={name} label={name} shortcut={String(kind + 1)} side="top">
            {button}
          </Tip>
        ) : (
          button
        );
      })}
    </div>
  );

  const liftButton = (
    <button
      type="button"
      className="pick lift"
      disabled={!next}
      onClick={() => lift(next!.id)}
    >
      Lift
    </button>
  );

  return (
    <div className="wall" data-compact={compact || undefined}>
      <div className="tab">Wall</div>
      <div className="copy">
        <button type="button" aria-label="Start over" onClick={reset}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 8.5a5.5 5.5 0 1 1 .5 4.5M5 4.5v4h4" />
          </svg>
        </button>
      </div>

      <div
        ref={face}
        className="wall-face"
        data-tool={tool}
        onPointerDown={press}
        onPointerMove={point}
        onPointerLeave={() => (aim.current!.hidden = true)}
      >
        <canvas />
        {/* In the order they were put down, so one in focus stays in place. */}
        {[...sheets]
          .sort((a, b) => a.id - b.id)
          .map((sheet) => {
            const side = SHEET * sheet.size;
            const inHand = held === sheet.id && tool === 'move';
            return (
              <div
                key={sheet.id}
                className="sheet"
                role="button"
                aria-label={`${STENCILS[sheet.kind].name} stencil`}
                aria-pressed={inHand}
                tabIndex={tool === 'move' ? 0 : undefined}
                data-held={inHand || undefined}
                data-leaving={sheet.leaving || undefined}
                style={
                  {
                    '--round': `${ROUND * sheet.size}px`,
                    zIndex: sheets.indexOf(sheet) + 1,
                    width: side,
                    height: side,
                    transform: `translate(${sheet.x - side / 2}px, ${sheet.y - side / 2}px) rotate(${sheet.angle}rad)`,
                  } as CSSProperties
                }
                onPointerDown={(event) => grab(event, sheet, 'move')}
                onFocus={() => setHeld(sheet.id)}
                onKeyDown={(event) => {
                  const by = event.shiftKey ? 10 : 1;
                  const step = {
                    ArrowLeft: [-by, 0],
                    ArrowRight: [by, 0],
                    ArrowUp: [0, -by],
                    ArrowDown: [0, by],
                  }[event.key];
                  if (step) {
                    event.preventDefault();
                    change(sheet.id, ({ x, y }) => ({
                      x: x + step[0],
                      y: y + step[1],
                    }));
                  } else if (
                    event.key === 'Backspace' ||
                    event.key === 'Delete'
                  )
                    lift(sheet.id);
                }}
              >
                <canvas
                  ref={(canvas) => {
                    if (canvas) canvases.current.set(sheet.id, canvas);
                    else canvases.current.delete(sheet.id);
                  }}
                />
                {inHand && (
                  <>
                    {[0, 1, 2, 3].map((corner) => (
                      <span
                        key={corner}
                        className="grip"
                        onPointerDown={(event) => grab(event, sheet, 'size')}
                      />
                    ))}
                    <span
                      className="grip grip-turn"
                      onPointerDown={(event) => grab(event, sheet, 'turn')}
                    />
                  </>
                )}
              </div>
            );
          })}
        <div
          ref={aim}
          className="aim"
          style={{ '--aim': `${reach}px` } as CSSProperties}
          hidden
        />
      </div>

      {compact && liftAt && (
        <button
          type="button"
          className="pick sheet-lift"
          style={{ left: liftAt[0], top: liftAt[1] }}
          onClick={() => lift(held!)}
        >
          Lift
        </button>
      )}

      {compact ? (
        <>
          {/* Moving from one to the next shows each name at once. */}
          <Tooltip.Provider>
            <div className="bar bar-left">
              {tools}
              <hr />
              {caps}
            </div>
          </Tooltip.Provider>
          <div className="bar bar-right">{cans}</div>
          {/* The stencils, in the middle of the room the credit leaves. */}
          <div className="bar-row">
            <Tooltip.Provider>
              <div className="bar bar-bottom">{stencils}</div>
            </Tooltip.Provider>
            {credit && (
              <p className="credit">
                <span>hallucinated by</span>{' '}
                <a href="https://x.com/naso" target="_blank">
                  Fabio
                </a>
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="kit">
          <div>
            <div className="label">Tool</div>
            {tools}
          </div>
          <div>
            <div className="label">Cap</div>
            {caps}
          </div>
          <div>
            <div className="label">Colour</div>
            {cans}
          </div>
          <div className="kit-stencils">
            <div className="label">Stencils</div>
            {stencils}
            {liftButton}
          </div>
        </div>
      )}
    </div>
  );
}

/** The wall alone, filling the page, for X to play inside a post. */
export function WallEmbed() {
  return (
    <main className="player">
      <Wall compact credit />
    </main>
  );
}
