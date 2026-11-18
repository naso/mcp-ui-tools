import { useEffect, useMemo, useRef, useState } from 'react';

import { base, dedent, Panel, useStyles } from '../panel';
import { runner } from './frame';
import { edit, languageOf, read } from './languages';
import type { Controls, Language } from './languages';
import type { Runner } from './frame';
import type { Layout } from '../panel';

import css from './styles.css?inline';

export type { ControlOptions } from './languages';

/**
 * The stylesheet, which the component adds itself. Put it in the page's head
 * when rendering on a server.
 */
export const styles = base + css;

/** A value the reader changed, and what to. */
export type ComponentCodeChange = {
  file: string;
  prop: string;
  value: string | number | boolean;
  /** The whole file after the change. */
  code: string;
};

export type ComponentCodeProps = {
  /**
   * The files by name, each in its own tab: `.html`, `.css` and `.js`. They
   * run together as one page. The blank lines around each and its shared
   * indent are dropped.
   */
  files: Readonly<Record<string, string>>;
  /**
   * The values the reader can change: an attribute, as `r` or `circle.r`, a
   * CSS property or custom property, as `--speed`, or a JS `const`, `let` or
   * `var`.
   */
  controls?: Controls;
  /** Called as the reader changes a value. */
  onChange?: (change: ComponentCodeChange) => void;
  /** Sets light or dark. Without it, the page's `color-scheme` decides. */
  theme?: 'light' | 'dark';
  /** A line from an info icon beside reset, once the reader changes a value. */
  note?: string;
  className?: string;
} & Layout;

/** The files of one language, as one. */
const join = (files: Record<string, string>, language: Language) =>
  Object.keys(files)
    .filter((name) => languageOf(name) === language)
    .map((name) => files[name])
    .join('\n');

/**
 * The page the files make, in a sandboxed frame. CSS changes in place, so a
 * script reading custom properties follows along; HTML and JS run again.
 */
function Run({
  html,
  css,
  js,
  theme,
}: {
  html: string;
  css: string;
  js: string;
  theme?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frames = useRef<Runner>(null);
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    const run = runner(box.current!, setProblem);
    frames.current = run;
    return run.stop;
  }, []);

  useEffect(() => frames.current!.css(css), [css]);

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    // The page starts with the panel's scheme, colour and font, as a
    // component in the other entry does.
    const start = () => {
      const { colorScheme, color, fontFamily } = getComputedStyle(box.current!);
      const dark =
        colorScheme.includes('dark') &&
        (!colorScheme.includes('light') || media.matches);
      frames.current!.run(
        html,
        js,
        `color-scheme:${dark ? 'dark' : 'light'};color:${color};font-family:${fontFamily}`,
      );
    };
    start();
    media.addEventListener('change', start);
    return () => media.removeEventListener('change', start);
  }, [html, js, theme]);

  return (
    <>
      {problem && <p className="cc-problem">{problem}</p>}
      <div ref={box} className="cc-run" hidden={!!problem} />
    </>
  );
}

/**
 * HTML, CSS and JS running beside their code, a tab for each file. The values
 * named in `controls` are controls the reader can change.
 */
export function ComponentCode({
  files,
  controls: options = {},
  onChange,
  theme,
  note,
  className,
  ...layout
}: ComponentCodeProps) {
  useStyles('component-code-html', styles);

  const key = JSON.stringify(files);
  const written = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(files).map(([name, code]) => [name, dedent(code)]),
      ),
    [key],
  );
  const names = Object.keys(written);
  const [open, setOpen] = useState(names[0]);
  const file = names.includes(open) ? open : names[0];
  const [edited, setEdited] = useState({ from: written, to: written });
  // New files drop the reader's changes.
  if (edited.from !== written) setEdited({ from: written, to: written });
  const sources = edited.from === written ? edited.to : written;
  const language = languageOf(file);
  const { tokens, controls } = read[language](sources[file], options);

  return (
    <Panel
      className={className}
      theme={theme}
      {...layout}
      preview={
        <Run
          html={join(sources, 'html')}
          css={join(sources, 'css')}
          js={join(sources, 'js')}
          theme={theme}
        />
      }
      tab={
        <div className="cc-tab cc-files" role="tablist">
          {names.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={name === file}
              onClick={() => setOpen(name)}
            >
              {name}
            </button>
          ))}
        </div>
      }
      source={sources[file]}
      changed={names.some((name) => sources[name] !== written[name])}
      note={note}
      onReset={() => setEdited({ from: written, to: written })}
      tokens={tokens}
      controls={controls}
      onChange={(control, value) => {
        const code = edit(language, sources[file], control, value);
        setEdited({ from: written, to: { ...sources, [file]: code } });
        onChange?.({ file, prop: control.prop, value, code });
      }}
    />
  );
}
