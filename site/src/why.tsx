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
 * it meets the edges. It holds its name.
 */
function Notch({
  x,
  y,
  w,
  ground,
}: {
  x: number;
  y: number;
  w: number;
  ground: string;
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
      <Bar x={x + 10} y={y + h / 2} w={w - 24} />
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
  framed,
}: {
  box: Box;
  rows: Row[];
  preview: (box: Box) => ReactNode;
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
      <Notch x={code.x} y={code.y} w={64} ground="surface" />
      <Code box={code} rows={rows} />
      <Notch x={box.x} y={box.y} w={72} ground="subtle" />
    </>
  );
}

/** The arrows a number shows while it is dragged. */
function Drag({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="cursor"
      transform={`translate(${x} ${y}) scale(1.4)`}
      d="M-10 0l4.5-4.5v3h11v-3L10 0l-4.5 4.5v-3h-11v3z"
    />
  );
}

const FULL = { x: 0, y: 0, w: W, h: H };

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

/**
 * The component in the chat with a value changed until it broke, its label
 * spilling out of its button, then the reader saying so and the reply.
 */
function Broke() {
  return (
    <>
      <rect className="surface" {...rect(FULL)} />
      <Panel
        framed
        box={{ x: 20, y: 20, w: 332, h: 128 }}
        rows={[
          { tag: 36 },
          { prop: 32, value: 70, ink: 'string', active: true },
          { prop: 28, value: 14, ink: 'keyword' },
          { tag: 12 },
        ]}
        preview={(preview) => {
          const { cx, cy } = centre(preview);
          return (
            <>
              <rect
                className="code-string box"
                x={cx - 34}
                y={cy - 13}
                width={68}
                height={26}
                rx={13}
              />
              <Bar className="code-string" x={cx - 22} y={cy} w={92} />
            </>
          );
        }}
      />
      <rect
        className="subtle"
        x={188}
        y={170}
        width={164}
        height={42}
        rx={14}
      />
      <Bar x={204} y={185} w={124} />
      <Bar x={204} y={197} w={64} />
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

/** A flex row, its gap's number dragged, and the gaps it sets tinted. */
function Flex() {
  const code = codeOf(FULL);
  const y = rowY(code, 3);
  const x = valueX(code, 24);
  return (
    <>
      <Panel
        box={FULL}
        rows={[
          { tag: 40 },
          { prop: 52, value: 28, ink: 'string' },
          { prop: 34, value: 40, ink: 'string' },
          { prop: 24, value: 14, ink: 'keyword', active: true },
          { tag: 12 },
        ]}
        preview={(preview) => {
          const { cx, cy } = centre(preview);
          const size = 36;
          const gap = 14;
          const left = cx - (3 * size + 2 * gap) / 2;
          return (
            <>
              {[0, 1].map((index) => (
                <rect
                  key={index}
                  className="code-keyword active"
                  x={left + size + index * (size + gap)}
                  y={cy - size / 2}
                  width={gap}
                  height={size}
                />
              ))}
              {[0, 1, 2].map((index) => (
                <rect
                  key={index}
                  className="ink"
                  x={left + index * (size + gap)}
                  y={cy - size / 2}
                  width={size}
                  height={size}
                  rx={9}
                />
              ))}
            </>
          );
        }}
      />
      <Drag x={x + 12} y={y + 14} />
    </>
  );
}

const REASONS: {
  group?: string;
  title: string;
  text: string;
  Diagram: () => ReactNode;
}[] = [
  {
    group: 'In the chat, with your agent',
    title: "Review an agent's work",
    text: 'Try the API it wrote in the chat, before it lands in your codebase.',
    Diagram: Review,
  },
  {
    title: 'Say what broke',
    text: 'Break it, then say so. The agent already has the code as you left it.',
    Diagram: Broke,
  },
  {
    group: 'In your codebase, as a package',
    title: 'Code as docs you can try',
    text: 'Every prop is a control, and the docs never drift.',
    Diagram: Docs,
  },
  {
    title: 'Learn by changing it',
    text: 'Explain a layout or an effect with something to play with.',
    Diagram: Flex,
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

/**
 * "or" between the two uses, on the cards' ground: a rect as wide as the gap
 * between them, which flows into each card's edge above and below.
 */
function Or() {
  return (
    <div className="or" aria-hidden>
      <svg width="16" height="40" viewBox="-8 -20 16 40">
        <path d="M-8 -20A8 8 0 0 0 0 -12A8 8 0 0 0 8 -20V20A8 8 0 0 0 0 12A8 8 0 0 0 -8 20Z" />
        <text y="3.5" textAnchor="middle">
          or
        </text>
      </svg>
    </div>
  );
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
      // In a row of four, every card is in full.
      const row = track.scrollWidth <= track.clientWidth;
      const fars = [...slots].map((slot) =>
        row
          ? { far: 0, beyond: 0 }
          : against(
              origin + slot.offsetLeft,
              slot.offsetWidth,
              step,
              start,
              end,
            ),
      );
      fars.forEach(({ far, beyond }, index) => {
        const slot = slots[index];
        const { style } = slot.firstElementChild as HTMLElement;
        style.filter = far ? `grayscale(${Math.min(1, far)})` : '';
        style.setProperty('--dim', far ? `${Math.min(0.75, far * DIM)}` : '');
        style.transform = far
          ? `translateX(${-beyond * STACK}px) scale(${Math.max(0.76, 1 - far * SHRINK)})`
          : '';
        slot.style.zIndex = far ? `${-Math.round(far * 100)}` : '';
        // "or" flows into the cards either side, so only while both are whole.
        const or = slot.querySelector<HTMLElement>('.or');
        if (or) or.hidden = Boolean(far || fars[index + 1].far);
      });
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
      <div className="label">What for</div>
      <div className="reasons-head">
        <h2>Two ways to use it</h2>
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
        {REASONS.map(({ group, title, text, Diagram }, index) => (
          <li key={title}>
            <div className="unit">
              {group && <div className="label">{group}</div>}
              <div className="reason">
                <svg className="diagram" viewBox={`0 0 ${W} ${H}`} aria-hidden>
                  <Diagram />
                </svg>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
            {index > 0 && REASONS[index + 1]?.group && <Or />}
          </li>
        ))}
      </ul>
    </section>
  );
}
