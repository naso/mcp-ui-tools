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

/** The width a side keeps while dragged, before it starts to resist. */
const MIN = 160;
/** How far a resisting side gives at most, in pixels. */
const GIVE = 40;
/** How far past `MIN` the pointer goes before the side closes. */
const CLOSE = 80;
/** A critically damped spring that settles in about a third of a second. */
const STIFFNESS = ((2 * Math.PI) / 0.35) ** 2;
const DAMPING = (4 * Math.PI) / 0.35;

/**
 * The line between the preview and its code, dragged to share the width as
 * `--split`, the preview's share. Past `MIN` a side resists, easing more the
 * closer it gets to the edge, and `CLOSE` past it the side closes. A closed
 * side, before the drag or during it, opens with the pointer as soon as it
 * turns back, without resisting until it reaches `MIN`. The line follows the
 * pointer; when a side closes, or is let go short of `MIN` and goes to it, a
 * spring takes it from where it was. A double click springs it back to halves.
 */
function Split() {
  const line = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handle = line.current!;
    const root = handle.parentElement!;
    const frame = root.firstElementChild!;
    // Where the line is going, as the preview's share, and how far it is from
    // there, which the spring takes to nothing as the line follows along.
    let to = 0.5;
    let off = 0;
    let speed = 0;
    let track = 1;
    // Which side is closed: the preview, `-1`, or the code, `1`.
    let closed = 0;
    let grab: number | undefined;
    let last = 0;
    let frameId = 0;

    const show = () =>
      root.style.setProperty(
        '--split',
        `${Math.min(1, Math.max(0, to + off))}`,
      );
    const tick = (now: number) => {
      const time = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (let step = 0; step < time; step += 0.001) {
        speed -= (STIFFNESS * off + DAMPING * speed) * 0.001;
        off += speed * 0.001;
      }
      if (Math.abs(off) * track < 0.5) off = speed = frameId = 0;
      else frameId = requestAnimationFrame(tick);
      show();
    };
    const jump = (next: number) => {
      off = matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : off + to - next;
      to = next;
      if (!frameId) {
        last = performance.now();
        frameId = requestAnimationFrame(tick);
      }
    };
    // A side `wanted` wide: resisting under `MIN`, and closed `CLOSE` past it.
    const ease = (wanted: number) => {
      const over = MIN - wanted;
      return over <= 0
        ? wanted
        : over > CLOSE
          ? 0
          : MIN - GIVE * (1 - Math.exp(-over / GIVE));
    };

    // Only the main button drags, as another's release can go to a menu.
    handle.onpointerdown = (event) => {
      if (event.button) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      // The frame's width less its padding and the gap.
      track = frame.clientWidth - 6;
      grab = event.clientX - to * track;
    };
    handle.onpointermove = (event) => {
      if (grab === undefined) return;
      // A release the line never heard of, such as outside the window after
      // the capture was lost, lets go here instead.
      if (!(event.buttons & 1)) return release();
      let wanted = event.clientX - grab;
      if (closed) {
        // Pushed past the edge, a closed side stays there, so it opens as
        // soon as the pointer turns back.
        const past =
          closed < 0 ? Math.min(wanted, 0) : Math.max(wanted - track, 0);
        grab += past;
        wanted -= past;
        if ((closed < 0 ? wanted : track - wanted) < MIN) {
          to = wanted / track;
          show();
          return;
        }
        closed = 0;
      }
      const preview = ease(wanted);
      const code = ease(track - wanted);
      closed = preview ? (code ? 0 : 1) : -1;
      if (closed) {
        // It closes with a spring, and opens again from where the pointer is.
        jump(closed < 0 ? 0 : 1);
        grab = event.clientX - to * track;
      } else to = (preview === wanted ? track - code : preview) / track;
      show();
    };
    const release = () => {
      if (grab === undefined) return;
      grab = undefined;
      // A side let go short of `MIN` goes to it, unless it was closed and is
      // still short of where it would close, when it closes again.
      const preview = to * track;
      const side = Math.min(preview, track - preview);
      if (closed && side < MIN - CLOSE) jump(closed < 0 ? 0 : 1);
      else if (side < MIN) {
        closed = 0;
        jump((preview < MIN ? MIN : track - MIN) / track);
      }
    };
    handle.onpointerup =
      handle.onpointercancel =
      handle.onlostpointercapture =
        release;
    // A double click springs back to halves, opening a closed side.
    handle.ondblclick = () => {
      closed = 0;
      jump(0.5);
    };
    return () => cancelAnimationFrame(frameId);
  }, []);
  return <div ref={line} className="cc-split" aria-hidden />;
}

/** The preview beside the code, with the code's tab, copy and reset. */
export function Panel({
  className,
  theme,
  preview,
  tab,
  source,
  changed,
  note,
  onReset,
  ...code
}: {
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
  return (
    <div className={className ? `cc ${className}` : 'cc'} data-theme={theme}>
      <div className="cc-frame">
        <div className="cc-preview">{preview}</div>
        <div className="cc-code" data-note={note}>
          {tab}
          <Actions
            source={source}
            changed={changed}
            note={note}
            onReset={onReset}
          />
          <Code source={source} {...code} />
        </div>
      </div>
      <div className="cc-tab">Preview</div>
      <Split />
    </div>
  );
}
