import { Component, createElement, Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { edit, findControls, spellBooleans } from './controls';
import { highlight } from './highlight';
import { base, dedent, Panel, useStyles } from './panel';
import { CodeError, parse } from './parse';
import { render } from './run';
import type { Control, ControlOptions } from './controls';
import type { Scope } from './run';

/**
 * The stylesheet, which the component adds itself. Put it in the page's head
 * when rendering on a server.
 */
export const styles = base;

export type { ControlOptions, Scope };

/** A prop the reader changed, and what to. */
export type ComponentCodeChange = {
  prop: string;
  value: string | number | boolean;
  /** The whole code after the change. */
  code: string;
};

export type ComponentCodeProps = {
  /**
   * The code as it is written. The blank lines around it and its shared
   * indent are dropped.
   */
  code: string;
  /** The file named in the code's tab. */
  file?: string;
  /** Sets light or dark. Without it, the page's `color-scheme` decides. */
  theme?: 'light' | 'dark';
  className?: string;
} & (
  | {
      /**
       * What the code can name. With it, the preview is the code itself,
       * rendered: elements, props, text, strings, numbers, booleans, lists,
       * objects and these names.
       */
      scope: Scope;
      /** Makes each value in the code a control the reader can change. */
      interactive?: boolean;
      /** How a prop is changed, by its name or by `Element.prop`. */
      controls?: Readonly<Record<string, ControlOptions>>;
      /** Called as the reader changes a prop. */
      onChange?: (change: ComponentCodeChange) => void;
      children?: undefined;
    }
  | {
      /** The preview, for code that cannot run from its text, such as a hook. */
      children: ReactNode;
      scope?: undefined;
      interactive?: undefined;
      controls?: undefined;
      onChange?: undefined;
    }
);

type BoundaryProps = { source: string; children: ReactNode };
type BoundaryState = { source?: string; problem?: string };

/** Shows what a component threw in its place, until the code changes. */
class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {};

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { problem: error instanceof Error ? error.message : `${error}` };
  }

  static getDerivedStateFromProps(
    { source }: BoundaryProps,
    state: BoundaryState,
  ): BoundaryState | null {
    return state.source === source ? null : { source, problem: undefined };
  }

  render() {
    const { problem } = this.state;
    return problem ? (
      <p className="cc-problem">{problem}</p>
    ) : (
      this.props.children
    );
  }
}

/**
 * A component beside the code that makes it. With `scope` the preview is
 * rendered from the code, so the two cannot differ, and `interactive` lets
 * the reader change its values in the code.
 */
export function ComponentCode({
  code,
  file = 'Code',
  theme,
  className,
  scope,
  interactive,
  controls: options,
  onChange,
  children,
}: ComponentCodeProps) {
  useStyles('component-code', styles);

  const written = useMemo(() => {
    const text = dedent(code);
    try {
      return interactive ? spellBooleans(text) : text;
    } catch {
      return text;
    }
  }, [code, interactive]);
  const [edited, setEdited] = useState({ from: written, to: written });
  // New code drops the reader's changes.
  if (edited.from !== written) setEdited({ from: written, to: written });
  const source = edited.from === written ? edited.to : written;
  const tokens = useMemo(() => highlight(source), [source]);

  let preview: ReactNode = children;
  let problem: string | undefined;
  let controls: Control[] = [];
  if (scope) {
    try {
      const elements = parse(source);
      preview = createElement(
        Fragment,
        null,
        ...elements.map((element) => render(element, scope)),
      );
      if (interactive) controls = findControls(elements, options);
    } catch (error) {
      if (!(error instanceof CodeError)) throw error;
      problem = error.message;
    }
  }

  return (
    <Panel
      className={className}
      theme={theme}
      preview={
        problem ? (
          <p className="cc-problem">{problem}</p>
        ) : (
          <Boundary source={source}>{preview}</Boundary>
        )
      }
      tab={<div className="cc-tab">{file}</div>}
      source={source}
      changed={source !== written}
      onReset={() => setEdited({ from: written, to: written })}
      tokens={tokens}
      controls={controls}
      onChange={(control, value) => {
        const next = edit(source, control, value);
        setEdited({ from: written, to: next });
        onChange?.({ prop: control.prop, value, code: next });
      }}
    />
  );
}
