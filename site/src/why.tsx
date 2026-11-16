import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Box = { x: number; y: number; w: number; h: number };

/** A line of code: a tag, or a prop and its value in a box. */
type Row =
  | { tag: number }
  | {
      prop: number;
      value: number;
      ink: 'keyword' | 'string';
      active?: boolean;
    };

/*
 * Drawn on a 372 by 279 grid, which a card shows at about two thirds: `3` is
 * the component's `2px` gap, `9` its `6px` corner and `12` its `8px` one.
 */
const W = 372;
const H = 279;
const GAP = 3;

const rect = ({ x, y, w, h }: Box) => ({ x, y, width: w, height: h });
const half = ({ w }: Box) => (w - 3 * GAP) / 2;
const codeOf = (box: Box): Box => ({
  x: box.x + 2 * GAP + half(box),
  y: box.y + GAP,
  w: half(box),
  h: box.h - 2 * GAP,
});
const rowY = (code: Box, row: number) => code.y + 38 + row * 20;
const propX = (code: Box) => code.x + 26;
const valueX = (code: Box, prop: number) => propX(code) + prop + 6;
const centre = ({ x, y, w, h }: Box) => ({ cx: x + w / 2, cy: y + h / 2 + 6 });

/** A line of text, centred on `y`. */
function Bar({
  x,
  y,
  w,
  className = 'text',
}: {
  x: number;
  y: number;
  w: number;
  className?: string;
}) {
  return (
    <rect
      className={className}
      x={x}
      y={y - 2.5}
      width={w}
      height={5}
      rx={2.5}
    />
  );
}

/**
 * A tab cut into a corner, the colour of what is around it, with fillets where
 * it meets the edges. It holds its name, or `children`.
 */
function Notch({
  x,
  y,
  w,
  ground,
  children,
}: {
  x: number;
  y: number;
  w: number;
  ground: string;
  children?: ReactNode;
}) {
  const h = 20;
  const r = 9;
  return (
    <>
      <path
        className={ground}
        d={`M${x} ${y}h${w}v${h - r}a${r} ${r} 0 0 1-${r} ${r}H${x}z`}
      />
      <path
        className={ground}
        d={`M${x + w} ${y}h${r}a${r} ${r} 0 0 0-${r} ${r}zM${x} ${y + h}h${r}a${r} ${r} 0 0 0-${r} ${r}z`}
      />
      {children ?? <Bar x={x + 10} y={y + h / 2} w={w - 24} />}
    </>
  );
}

function Code({ box, rows }: { box: Box; rows: Row[] }) {
  return rows.map((row, index) => {
    const y = rowY(box, index);
    if ('tag' in row) {
      return (
        <Bar
          key={index}
          className="code-tag"
          x={box.x + 14}
          y={y}
          w={row.tag}
        />
      );
    }
    const at = valueX(box, row.prop);
    return (
      <g key={index}>
        <Bar className="code-attribute" x={propX(box)} y={y} w={row.prop} />
        <rect
          className={`code-${row.ink} ${row.active ? 'active' : 'box'}`}
          x={at}
          y={y - 7}
          width={row.value + 10}
          height={14}
          rx={4}
        />
        <Bar className={`code-${row.ink}`} x={at + 5} y={y} w={row.value} />
      </g>
    );
  });
}

/**
 * The component in small: its preview, its code `2px` in on the sunken ground,
 * and a tab cut into each. `framed` gives it the outline and corners it has on
 * a page; without it, it fills the card.
 */
function Panel({
  box,
  rows,
  preview,
  tab,
  framed,
}: {
  box: Box;
  rows: Row[];
  preview: (box: Box) => ReactNode;
  tab?: (code: Box) => ReactNode;
  framed?: boolean;
}) {
  const code = codeOf(box);
  return (
    <>
      {framed && (
        <rect
          className="subtle"
          x={box.x - 1.5}
          y={box.y - 1.5}
          width={box.w + 3}
          height={box.h + 3}
          rx={13.5}
        />
      )}
      <rect className="surface" {...rect(box)} rx={framed ? 12 : 0} />
      {preview({
        x: box.x + GAP,
        y: box.y + GAP,
        w: half(box),
        h: box.h - 2 * GAP,
      })}
      {/* Filling the card, it nests in the card's `7px` inner corner. */}
      <rect className="sunken" {...rect(code)} rx={framed ? 9 : 7.5} />
      {tab ? (
        tab(code)
      ) : (
        <Notch x={code.x} y={code.y} w={64} ground="surface" />
      )}
      <Code box={code} rows={rows} />
      <Notch x={box.x} y={box.y} w={72} ground="subtle" />
    </>
  );
}

/** The pointer, or with `drag` the arrows a number shows while dragged. */
function Cursor({ x, y, drag }: { x: number; y: number; drag?: boolean }) {
  return (
    <path
      className="cursor"
      transform={`translate(${x} ${y}) scale(1.4)`}
      d={
        drag
          ? 'M-10 0l4.5-4.5v3h11v-3L10 0l-4.5 4.5v-3h-11v3z'
          : 'M0 0v15l4-3.5 3 6.5 2.6-1.2-3-6.3H12z'
      }
    />
  );
}

const FULL = { x: 0, y: 0, w: W, h: H };

/** Dragging a value, and the component growing with it. */
function Feel() {
  const code = codeOf(FULL);
  const y = rowY(code, 3);
  const x = valueX(code, 36);
  return (
    <>
      <Panel
        box={FULL}
        rows={[
          { tag: 44 },
          { prop: 38, value: 40, ink: 'string' },
          { prop: 28, value: 34, ink: 'string' },
          { prop: 36, value: 14, ink: 'keyword', active: true },
          { tag: 12 },
        ]}
        preview={(preview) => {
          const { cx, cy } = centre(preview);
          return (
            <>
              <rect
                className="ghost"
                x={cx - 54}
                y={cy - 20}
                width={108}
                height={40}
                rx={13}
              />
              <rect
                className="ink"
                x={cx - 40}
                y={cy - 15}
                width={80}
                height={30}
                rx={9}
              />
              <Bar className="surface" x={cx - 18} y={cy} w={36} />
            </>
          );
        }}
      />
      <Cursor x={x + 12} y={y + 14} drag />
    </>
  );
}

/** A prompt, and the component answering it in the chat. */
function Review() {
  return (
    <>
      <rect className="surface" {...rect(FULL)} />
      <rect className="subtle" x={188} y={20} width={164} height={42} rx={14} />
      <Bar x={204} y={35} w={128} />
      <Bar x={204} y={47} w={76} />
      <Panel
        framed
        box={{ x: 20, y: 80, w: 332, h: 136 }}
        rows={[
          { tag: 36 },
          { prop: 32, value: 36, ink: 'string' },
          { prop: 38, value: 16, ink: 'keyword' },
          { tag: 12 },
        ]}
        preview={(preview) => {
          const { cx, cy } = centre(preview);
          return (
            <>
              <rect
                className="code-tag"
                x={cx - 40}
                y={cy - 9}
                width={34}
                height={18}
                rx={9}
              />
              <circle className="surface" cx={cx - 15} cy={cy} r={6.5} />
              <Bar x={cx + 4} y={cy} w={40} />
            </>
          );
        }}
      />
      <Bar x={20} y={238} w={200} />
      <Bar x={20} y={252} w={132} />
    </>
  );
}

/** A page of docs with the component in it, and its props below. */
function Docs() {
  return (
    <>
      <rect className="surface" {...rect(FULL)} />
      <rect className="ink" x={20} y={20} width={120} height={10} rx={5} />
      <Bar x={20} y={46} w={300} />
      <Bar x={20} y={58} w={220} />
      <Panel
        framed
        box={{ x: 20, y: 76, w: 332, h: 128 }}
        rows={[
          { tag: 32 },
          { prop: 30, value: 34, ink: 'string' },
          { prop: 28, value: 14, ink: 'keyword' },
          { tag: 12 },
        ]}
        preview={(preview) => {
          const { cx, cy } = centre(preview);
          return (
            <>
              <rect
                className="code-tag box"
                x={cx - 32}
                y={cy - 12}
                width={64}
                height={24}
                rx={12}
              />
              <Bar className="code-tag" x={cx - 16} y={cy} w={32} />
            </>
          );
        }}
      />
      {[228, 246].map((y) => (
        <g key={y}>
          <Bar className="code-attribute" x={20} y={y} w={44} />
          <Bar x={80} y={y} w={180} />
        </g>
      ))}
    </>
  );
}

/** A value's options, open to pick from. */
function Designer() {
  const code = codeOf(FULL);
  const y = rowY(code, 1);
  const menu = { x: valueX(code, 30) - 5, y: y + 14, w: 116, h: 88 };
  const item = (index: number) => menu.y + 2 + index * 28;
  return (
    <>
      <Panel
        box={FULL}
        rows={[
          { tag: 40 },
          { prop: 30, value: 44, ink: 'string', active: true },
          { prop: 36, value: 14, ink: 'keyword' },
          { tag: 12 },
        ]}
        preview={(preview) => {
          const { cx, cy } = centre(preview);
          return (
            <>
              <rect
                className="code-string box"
                x={cx - 42}
                y={cy - 14}
                width={84}
                height={28}
                rx={14}
              />
              <Bar className="code-string" x={cx - 20} y={cy} w={40} />
            </>
          );
        }}
      />
      <rect className="subtle menu" {...rect(menu)} rx={12} />
      <rect
        className="sunken"
        x={menu.x + 3}
        y={item(1)}
        width={menu.w - 6}
        height={28}
        rx={9}
      />
      {[52, 44, 60].map((width, index) => (
        <Bar
          key={index}
          className={index === 1 ? 'ink' : 'text'}
          x={menu.x + 14}
          y={item(index) + 14}
          w={width}
        />
      ))}
      <path
        className="check"
        d={`M${menu.x + menu.w - 26} ${item(0) + 14}l4 4 8-8`}
      />
      <Cursor x={menu.x + 74} y={item(1) + 16} />
    </>
  );
}

/** A canvas of dots beside its files, each in a tab, the open one on a pill. */
function Experiment() {
  return (
    <Panel
      box={FULL}
      rows={[
        { tag: 40 },
        { prop: 44, value: 14, ink: 'keyword' },
        { prop: 34, value: 10, ink: 'keyword' },
        { tag: 8 },
      ]}
      tab={({ x, y }) => (
        <Notch x={x} y={y} w={150} ground="surface">
          <rect
            className="sunken"
            x={x + 52}
            y={y + 3}
            width={46}
            height={14}
            rx={6}
          />
          {[0, 1, 2].map((index) => (
            <Bar
              key={index}
              className={index === 1 ? 'ink' : 'text'}
              x={x + 12 + index * 48}
              y={y + 10}
              w={30}
            />
          ))}
        </Notch>
      )}
      preview={(preview) => {
        const { cx, cy } = centre(preview);
        return Array.from({ length: 11 }, (_, index) => (
          <circle
            key={index}
            className="ink"
            cx={cx - 65 + index * 13}
            cy={cy + Math.sin(index * 0.65) * 30}
            r={5}
          />
        ));
      }}
    />
  );
}

const REASONS = [
  {
    title: 'API design still matters',
    text: 'Feel whether an agent gave you a good API or just a working one.',
    Diagram: Feel,
  },
  {
    title: "Review an agent's work",
    text: 'Try the API it wrote in the chat, before it lands in your codebase.',
    Diagram: Review,
  },
  {
    title: 'Docs you can try',
    text: 'Every prop is a control, and the docs never drift.',
    Diagram: Docs,
  },
  {
    title: 'Hand it to a designer',
    text: 'Anyone can try every value without running the project.',
    Diagram: Designer,
  },
  {
    title: 'Share an experiment',
    text: 'A canvas, an SVG or a CSS idea, with its numbers out in the open.',
    Diagram: Experiment,
  },
];

/*
 * Past the column, like a cover flow: for each card's width further out, a
 * card shrinks by `6%` and dims by `35%`, down to `76%` and `75%`, and greys
 * to none by the first. It slides back a quarter of its way out, so it stacks
 * under the card before it.
 */
const SHRINK = 0.06;
const DIM = 0.35;
const STACK = 0.25;

/**
 * A card against the column. `far` is how many cards' widths its far edge is
 * past the column: `0` inside it, `1` for the next card out. `beyond` is how
 * far its near edge is past the column, to the right or, below `0`, to the
 * left.
 */
function against(
  left: number,
  width: number,
  step: number,
  start: number,
  end: number,
) {
  // Whole pixels, so a card snapped to the column is untouched.
  const away =
    Math.max(0, Math.round(left + width - end)) +
    Math.max(0, Math.round(start - left));
  return {
    far: away / step,
    beyond: Math.max(0, left - end) - Math.max(0, start - left - width),
  };
}

function Arrow({ d }: { d: string }) {
  return (
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
      <path d={d} />
    </svg>
  );
}

/** Why it exists and who it is for, a card each, scrolled sideways. */
export function Why() {
  const list = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  useEffect(() => {
    const track = list.current!;
    // The cards reach out to the window's edges, so measure the gaps to them.
    const fit = () => {
      const { left, right } = track.parentElement!.getBoundingClientRect();
      track.style.setProperty('--left', `${left}px`);
      track.style.setProperty(
        '--right',
        `${document.documentElement.clientWidth - right}px`,
      );
    };
    // Positions come from layout, which the cards' scale does not move.
    const dim = () => {
      const { left: start, right: end } =
        track.parentElement!.getBoundingClientRect();
      const origin = track.getBoundingClientRect().left - track.scrollLeft;
      // The slot stays put for snapping, and the card in it changes. The
      // further out a card is, the further under its neighbours it goes.
      const slots = track.children as HTMLCollectionOf<HTMLElement>;
      const step = slots[1].offsetLeft - slots[0].offsetLeft;
      for (const slot of slots) {
        const { far, beyond } = against(
          origin + slot.offsetLeft,
          slot.offsetWidth,
          step,
          start,
          end,
        );
        const { style } = slot.firstElementChild as HTMLElement;
        style.filter = far ? `grayscale(${Math.min(1, far)})` : '';
        style.setProperty('--dim', far ? `${Math.min(0.75, far * DIM)}` : '');
        style.transform = far
          ? `translateX(${-beyond * STACK}px) scale(${Math.max(0.76, 1 - far * SHRINK)})`
          : '';
        slot.style.zIndex = far ? `${-Math.round(far * 100)}` : '';
      }
    };
    const update = () => {
      dim();
      setEnds({
        start: track.scrollLeft <= 1,
        end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
      });
    };
    let frame = 0;
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const resize = () => {
      fit();
      update();
    };
    resize();
    track.addEventListener('scroll', scroll, { passive: true });
    addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener('scroll', scroll);
      removeEventListener('resize', resize);
    };
  }, []);

  /** Scrolls a card and its gap, back or on, measured from layout. */
  const move = (by: number) => {
    const track = list.current!;
    const [first, second] = track.children as HTMLCollectionOf<HTMLElement>;
    const step = second.offsetLeft - first.offsetLeft;
    track.scrollBy({
      left: by * step,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  return (
    <section id="why">
      <div className="reasons-head">
        <div className="label">Why</div>
        <div className="arrows">
          <button
            type="button"
            aria-label="Previous"
            disabled={ends.start}
            onClick={() => move(-1)}
          >
            <Arrow d="M12 5l-5 5 5 5" />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={ends.end}
            onClick={() => move(1)}
          >
            <Arrow d="M8 5l5 5-5 5" />
          </button>
        </div>
      </div>
      <ul className="reasons" ref={list}>
        {REASONS.map(({ title, text, Diagram }) => (
          <li key={title}>
            <div className="reason">
              <svg className="diagram" viewBox={`0 0 ${W} ${H}`} aria-hidden>
                <Diagram />
              </svg>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
