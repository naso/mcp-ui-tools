import { useEffect, useInsertionEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { Control } from './controls';
import type { Token } from './highlight';

import css from './styles.css?inline';

/** The stylesheet both entries share. */
export const base: string = css;

export type Value = string | number | boolean;

/** Adds `css` to the page once, first, so the page's own styles win. */
export function useStyles(id: string, css: string) {
  useInsertionEffect(() => {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.prepend(style);
  }, []);
}

/** Code without the blank lines around it or the indent its lines share. */
export function dedent(code: string) {
  const lines = code
    .replace(/^\s*\n/, '')
    .trimEnd()
    .split('\n');
  const indent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.search(/\S/)),
  );
  return lines.map((line) => line.slice(indent)).join('\n');
}

const tint = (control: Control) =>
  control.kind === 'boolean' || typeof control.value === 'number'
    ? 'cc-box cc-keyword'
    : control.quote
      ? 'cc-box cc-string'
      : 'cc-box';

const COPY = 'M8 7.5h7.5v8H8zM12 4.5H4.5v8';
const CHECK = 'M5 10.5l3 3 7-7';
const RESET = 'M5 8.5a5.5 5.5 0 1 1 .5 4.5M5 4.5v4h4';
const INFO = 'M16 10a6 6 0 1 1-12 0a6 6 0 0 1 12 0M10 9.5V13m0-6v.01';

type Props = {
  control: Control;
  /** The value as the code writes it. */
  written: string;
  onChange: (value: Value) => void;
};

/** A number, dragged sideways or stepped with the arrow keys. Shift takes ten. */
function Scrub({ control, onChange, written }: Props) {
  const { min = -Infinity, max = Infinity, step } = control;
  const value = control.value as number;
  const from = useRef<{ x: number; value: number } | null>(null);
  // A whole range takes `240px`, a step `2px` to `12px`; `6px` without one.
  const width =
    max - min < Infinity
      ? Math.min(12, Math.max(2, (240 * step) / (max - min)))
      : 6;
  const stop = () => (from.current = null);
  const set = (next: number) => {
    next = Math.min(max, Math.max(min, next));
    if (next !== value) onChange(next);
  };
  return (
    <span
      className={`${tint(control)} cc-scrub`}
      role="slider"
      tabIndex={0}
      aria-label={control.prop}
      aria-valuenow={value}
      aria-valuemin={min > -Infinity ? min : undefined}
      aria-valuemax={max < Infinity ? max : undefined}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        from.current = { x: event.clientX, value };
      }}
      onPointerMove={(event) => {
        if (from.current) {
          const steps = Math.round((event.clientX - from.current.x) / width);
          set(from.current.value + steps * step);
        }
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        const by = event.shiftKey ? step * 10 : step;
        const next = {
          ArrowUp: value + by,
          ArrowRight: value + by,
          ArrowDown: value - by,
          ArrowLeft: value - by,
          Home: min,
          End: max,
        }[event.key];
        if (next !== undefined && isFinite(next)) {
          event.preventDefault();
          set(next);
        }
      }}
    >
      {written}
    </span>
  );
}

/** A boolean, switched with a click. */
function Switch({ control, onChange, written }: Props) {
  return (
    <button
      type="button"
      className={tint(control)}
      aria-label={control.prop}
      aria-pressed={control.value as boolean}
      onClick={() => onChange(!control.value)}
    >
      {written}
    </button>
  );
}

/** Text, typed over in place. Enter or Escape leaves it. */
function Field({ control, onChange }: Props) {
  const value = `${control.value}`;
  const { quote } = control;
  return (
    <label className={tint(control)}>
      {quote}
      <span className="cc-field" data-value={value}>
        <input
          size={1}
          value={value}
          aria-label={control.prop}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') {
              event.currentTarget.blur();
            }
          }}
        />
      </span>
      {quote}
    </label>
  );
}

/** A value picked from a menu, which stays open to try the others. */
function Options({ control, onChange, written }: Props) {
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const shown = (option: Value) => {
    const quote = typeof option === 'string' ? control.quote : '';
    return quote + option + quote;
  };
  const items = () => [...menu.current!.children] as HTMLElement[];

  useEffect(() => {
    const list = menu.current!;
    const toggle = (event: Event) =>
      setOpen((event as ToggleEvent).newState === 'open');
    // A scroll would leave the menu behind its value.
    const close = () => list.matches(':popover-open') && list.hidePopover();
    list.addEventListener('toggle', toggle);
    addEventListener('scroll', close, true);
    return () => {
      list.removeEventListener('toggle', toggle);
      removeEventListener('scroll', close, true);
    };
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={tint(control)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={control.prop}
        onClick={(event) => {
          const list = menu.current!;
          const { left, bottom } = event.currentTarget.getBoundingClientRect();
          list.style.left = `${left}px`;
          list.style.top = `${bottom + 4}px`;
          list.showPopover();
          list.querySelector<HTMLElement>('[aria-checked=true]')?.focus();
        }}
      >
        {written}
      </button>
      <div
        ref={menu}
        className="cc-menu"
        popover="auto"
        role="menu"
        onKeyDown={(event) => {
          const all = items();
          const at = all.indexOf(document.activeElement as HTMLElement);
          const { key } = event;
          // A letter jumps to the next option that starts with it.
          const typed =
            key.length === 1 &&
            [...all.slice(at + 1), ...all].find((item) =>
              item.textContent!.replace(/^\W/, '').startsWith(key),
            );
          const to = typed
            ? all.indexOf(typed)
            : { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: -1 }[key];
          // Escape closes the menu by itself, and the value takes the focus
          // back so the reader carries on from there.
          if (key === 'Escape') button.current!.focus();
          if (to !== undefined) {
            event.preventDefault();
            all.at(to % all.length)!.focus();
          }
        }}
      >
        {control.options!.map((option) => (
          <button
            key={`${option}`}
            type="button"
            role="menuitemradio"
            aria-checked={option === control.value}
            onClick={() => onChange(option)}
          >
            {shown(option)}
          </button>
        ))}
      </div>
    </>
  );
}

/** The code, coloured, with each control in place of its value. */
function Code({
  source,
  tokens,
  controls,
  onChange,
}: {
  source: string;
  tokens: Token[];
  controls: Control[];
  onChange: (control: Control, value: Value) => void;
}) {
  const nodes: ReactNode[] = [];
  let at = 0;
  let next = 0;

  const plain = (end: number) => {
    while (at < end) {
      while (next < tokens.length && tokens[next].end <= at) next++;
      const token = tokens[next];
      if (token && token.start <= at) {
        const stop = Math.min(token.end, end);
        nodes.push(
          <span key={at} className={`cc-${token.ink}`}>
            {source.slice(at, stop)}
          </span>,
        );
        at = stop;
      } else {
        const stop = Math.min(token?.start ?? end, end);
        nodes.push(source.slice(at, stop));
        at = stop;
      }
    }
  };

  controls.forEach((control, index) => {
    plain(control.range.start);
    const written = source.slice(control.range.start, control.range.end);
    const props: Props = {
      control,
      written,
      onChange: (value) => onChange(control, value),
    };
    const Control = {
      boolean: Switch,
      number: Scrub,
      option: Options,
      text: Field,
    }[control.kind];
    nodes.push(<Control key={`c${index}`} {...props} />);
    at = control.range.end;
  });
  plain(source.length);

  return (
    <div className="cc-body">
      <div className="cc-lines" aria-hidden>
        {source
          .split('\n')
          .map((_, line) => line + 1)
          .join('\n')}
      </div>
      <div className="cc-scroll">
        <code>{nodes}</code>
      </div>
    </div>
  );
}

/** A button in the code's tab, in a slot that opens as `--shown` turns on. */
function Action({
  slot,
  label,
  d,
  hidden,
  onClick,
}: {
  slot: string;
  label: string;
  d: string;
  hidden?: boolean;
  onClick?: () => void;
}) {
  return (
    <span className={`cc-slot${slot}`}>
      <button
        type="button"
        className="cc-action"
        aria-label={label}
        tabIndex={hidden ? -1 : 0}
        onClick={onClick}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d={d} />
        </svg>
      </button>
    </span>
  );
}

function Actions({
  source,
  changed,
  note,
  onReset,
}: {
  source: string;
  changed: boolean;
  note?: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`cc-tab cc-actions${changed ? ' cc-changed' : ''}`}>
      {note && (
        <Action slot=" cc-note" label={note} d={INFO} hidden={!changed} />
      )}
      <Action
        slot=" cc-reset"
        label="Reset code"
        d={RESET}
        hidden={!changed}
        onClick={onReset}
      />
      {/* Last, as it shows only on hover, so the others stay put. */}
      <Action
        slot=""
        label={copied ? 'Copied' : 'Copy code'}
        d={copied ? CHECK : COPY}
        onClick={() =>
          navigator.clipboard.writeText(source).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      />
    </div>
  );
}

/** A critically damped spring that settles in about a third of a second. */
const STIFFNESS = ((2 * Math.PI) / 0.35) ** 2;
const DAMPING = (4 * Math.PI) / 0.35;

/**
 * Where the line is going on one axis, as the preview's share in `prop`, and
 * how far it is from there, which a spring takes to nothing as the line
 * follows along. `min` is how long a side keeps while dragged before it
 * resists; it gives `min / 4` at most, and closes `min / 2` past it. `home` is
 * where a double click sends it.
 */
function motion(root: HTMLElement, prop: string, min: number, start?: number) {
  const m = {
    min,
    // Which side is closed: the preview, `-1`, or the code, `1`.
    closed: start === undefined ? 0 : start * 2 - 1,
    to: start ?? 0.5,
    home: 0.5,
    off: 0,
    speed: 0,
    track: 1,
    show() {
      root.style.setProperty(prop, `${Math.min(1, Math.max(0, m.to + m.off))}`);
    },
    jump(next: number) {
      m.off = matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : m.off + m.to - next;
      m.to = next;
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    },
    // A side `wanted` long: resisting under `min`, and closed past it.
    ease(wanted: number) {
      const over = min - wanted;
      return over <= 0
        ? wanted
        : over > min / 2
          ? 0
          : min - (min / 4) * (1 - Math.exp((-4 * over) / min));
    },
    stop: () => cancelAnimationFrame(frame),
  };
  let last = 0;
  let frame = 0;
  const tick = (now: number) => {
    const time = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let step = 0; step < time; step += 0.001) {
      m.speed -= (STIFFNESS * m.off + DAMPING * m.speed) * 0.001;
      m.off += m.speed * 0.001;
    }
    if (Math.abs(m.off) * m.track < 0.5) m.off = m.speed = frame = 0;
    else frame = requestAnimationFrame(tick);
    m.show();
  };
  return m;
}

/**
 * The line between the preview and its code. Side by side it shares the width
 * as `--split`; stacked, the height as `--share`, which the first drag fixes at
 * what the sides had. Past a side's minimum it resists, easing more the closer
 * it gets to the edge, and further on that side closes. A closed side, before
 * the drag or during it, opens with the pointer as soon as it turns back,
 * without resisting until it reaches the minimum. The line follows the
 * pointer; when a side closes, or is let go short of its minimum and goes to
 * it, a spring takes it from where it was. A double click springs it back:
 * across to halves, and stacked to the heights the sides had.
 */
function Split({ start }: { start?: number }) {
  const line = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handle = line.current!;
    const root = handle.parentElement!;
    const frame = root.firstElementChild as HTMLElement;
    const preview = frame.firstElementChild as HTMLElement;
    const across = motion(root, '--split', 160, start);
    const down = motion(root, '--share', 80);
    let m = across;
    let grab: number | undefined;
    // Stacked, as the stylesheet has it under `640px`.
    const pick = () => (m = root.clientWidth < 640 ? down : across);
    const at = (event: PointerEvent) =>
      m === down ? event.clientY : event.clientX;

    // Until the line is first dragged stacked, it sits where the preview ends.
    // Some test environments have no `ResizeObserver`.
    const rest =
      globalThis.ResizeObserver &&
      new ResizeObserver(() =>
        root.style.setProperty(
          '--rest',
          `${preview.offsetTop + preview.offsetHeight}px`,
        ),
      );
    rest?.observe(preview);

    // Only the main button drags, as another's release can go to a menu.
    handle.onpointerdown = (event) => {
      if (event.button) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      if (pick() === down) {
        if (!('stack' in root.dataset)) {
          // The first drag keeps the height the sides had.
          const stack = frame.clientHeight - 4;
          down.to = down.home = preview.offsetHeight / (stack - 2);
          down.show();
          root.style.setProperty('--stack', `${stack}px`);
          root.dataset.stack = '';
        }
        // The frame's height less its padding and the gap.
        down.track = frame.clientHeight - 6;
      } else across.track = frame.clientWidth - 6;
      grab = at(event) - m.to * m.track;
    };
    handle.onpointermove = (event) => {
      if (grab === undefined) return;
      // A release the line never heard of, such as outside the window after
      // the capture was lost, lets go here instead.
      if (!(event.buttons & 1)) return release();
      const { track } = m;
      let wanted = at(event) - grab;
      if (m.closed) {
        // Pushed past the edge, a closed side stays there, so it opens as
        // soon as the pointer turns back.
        const past =
          m.closed < 0 ? Math.min(wanted, 0) : Math.max(wanted - track, 0);
        grab += past;
        wanted -= past;
        if ((m.closed < 0 ? wanted : track - wanted) < m.min) {
          m.to = wanted / track;
          m.show();
          return;
        }
        m.closed = 0;
      }
      const preview = m.ease(wanted);
      const code = m.ease(track - wanted);
      m.closed = preview ? (code ? 0 : 1) : -1;
      if (m.closed) {
        // It closes with a spring, and opens again from where the pointer is.
        m.jump(m.closed < 0 ? 0 : 1);
        grab = at(event) - m.to * track;
      } else m.to = (preview === wanted ? track - code : preview) / track;
      m.show();
    };
    const release = () => {
      if (grab === undefined) return;
      grab = undefined;
      // A side let go short of its minimum goes to it, unless it was closed
      // and is still short of where it would close, when it closes again.
      const { min, track } = m;
      const preview = m.to * track;
      const side = Math.min(preview, track - preview);
      if (m.closed && side < min / 2) m.jump(m.closed < 0 ? 0 : 1);
      else if (side < min) {
        m.closed = 0;
        m.jump((preview < min ? min : track - min) / track);
      }
    };
    handle.onpointerup =
      handle.onpointercancel =
      handle.onlostpointercapture =
        release;
    // A double click springs back, opening a closed side.
    handle.ondblclick = () => {
      if (pick() === down && !('stack' in root.dataset)) return;
      m.closed = 0;
      m.jump(m.home);
    };
    return () => {
      across.stop();
      down.stop();
      rest?.disconnect();
    };
  }, []);
  return <div ref={line} className="cc-split" aria-hidden />;
}

/** How the panel is laid out, which both entries take as props. */
export type Layout = {
  /** The preview's tab. `Preview` when left out. */
  title?: string;
  /** `false` hides the tabs: the preview's and the code's. */
  tabs?: boolean;
  /** The side that starts closed, which the line between them opens. */
  collapsed?: 'preview' | 'code';
  /** The one side shown, without the other or the line between them. */
  only?: 'preview' | 'code';
};

/** The preview beside the code, with the code's tab, copy and reset. */
export function Panel({
  className,
  theme,
  title = 'Preview',
  tabs = true,
  collapsed,
  only,
  preview,
  tab,
  source,
  changed,
  note,
  onReset,
  ...code
}: Layout & {
  className?: string;
  theme?: 'light' | 'dark';
  preview: ReactNode;
  tab: ReactNode;
  source: string;
  changed: boolean;
  note?: string;
  onReset: () => void;
  tokens: Token[];
  controls: Control[];
  onChange: (control: Control, value: Value) => void;
}) {
  // The preview's share, `0` or `1` with a side closed from the first paint,
  // before the line takes `--split` over.
  const start = only || !collapsed ? undefined : +(collapsed === 'code');
  return (
    <div
      className={className ? `cc ${className}` : 'cc'}
      data-theme={theme}
      data-tabs={tabs ? undefined : 'hidden'}
      data-only={only}
      style={start === undefined ? undefined : ({ '--split': start } as {})}
    >
      <div className="cc-frame">
        {only !== 'code' && <div className="cc-preview">{preview}</div>}
        {only !== 'preview' && (
          <div className="cc-code" data-note={note}>
            {tabs && tab}
            <Actions
              source={source}
              changed={changed}
              note={note}
              onReset={onReset}
            />
            <Code source={source} {...code} />
          </div>
        )}
      </div>
      {tabs && only !== 'code' && <div className="cc-tab">{title}</div>}
      {!only && <Split start={start} />}
    </div>
  );
}
