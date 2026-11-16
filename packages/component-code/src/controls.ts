import { round, stepOf } from './number';
import { decode, parse } from './parse';
import type { Element, Literal, Range, Text } from './parse';

/**
 * How a prop is changed: picked from a list, dragged within a range, or kept
 * as written with `false`.
 */
export type ControlOptions =
  | false
  | readonly (string | number)[]
  | { min?: number; max?: number; step?: number };

export type Control = {
  /** The prop's name, or `children` for text. */
  prop: string;
  kind: 'number' | 'boolean' | 'text' | 'option';
  value: string | number | boolean;
  /** Where the value is, with any quotes. */
  range: Range;
  /** The quote around a string, if it has one. */
  quote: string;
  /** JSX text or a JSX attribute, which take entities rather than escapes. */
  jsx: boolean;
  options?: readonly (string | number)[];
  min?: number;
  max?: number;
  step: number;
};

/**
 * Each element's strings, numbers and booleans, and its text where that is
 * all it holds, on one line. `options` is read by `Element.prop`, then by
 * `prop`.
 */
export function findControls(
  elements: Element[],
  options: Readonly<Record<string, ControlOptions>> = {},
): Control[] {
  const controls: Control[] = [];

  const add = (element: string, prop: string, node: Literal) => {
    const option = options[`${element}.${prop}`] ?? options[prop];
    const { value } = node;
    const quote = node.type === 'string' ? node.quote : '';
    if (option === false || quote === '`' || `${value}`.includes('\n')) return;
    controls.push({
      prop,
      kind: Array.isArray(option)
        ? 'option'
        : node.type === 'string'
          ? 'text'
          : node.type,
      value,
      range: { start: node.start, end: node.end },
      quote,
      jsx: node.type === 'string' && (!quote || !!node.jsx),
      step: typeof value === 'number' ? stepOf(value) : 1,
      ...(Array.isArray(option) ? { options: option } : option),
    });
  };

  const visit = (element: Element) => {
    for (const { name, value } of element.attributes) {
      if (value?.type === 'element') visit(value);
      else if (
        value?.type === 'string' ||
        value?.type === 'number' ||
        value?.type === 'boolean'
      ) {
        add(element.name, name, value);
      }
    }
    const [only] = element.children;
    const text = only?.type === 'text' ? only.raw.trim() : '';
    if (element.children.length === 1 && text && !text.includes('\n')) {
      const start = only.start + (only as Text).raw.indexOf(text);
      add(element.name, 'children', {
        type: 'string',
        value: decode(text),
        quote: '',
        start,
        end: start + text.length,
      });
    }
    for (const child of element.children) {
      if (child.type === 'element') visit(child);
    }
  };

  elements.forEach(visit);
  return controls;
}

/** A value as code, written so it reads back the same. */
function write(control: Control, value: string | number | boolean) {
  const { quote } = control;
  if (typeof value !== 'string') {
    const raw =
      typeof value === 'number' ? round(value, control.step) : `${value}`;
    // A JSX attribute string takes braces once it holds a number.
    return control.jsx && quote ? `{${raw}}` : raw;
  }
  if (!control.jsx) {
    const mark = quote || '"';
    return (
      mark + value.replaceAll('\\', '\\\\').replaceAll(mark, `\\${mark}`) + mark
    );
  }
  const text = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  return quote
    ? quote +
        text.replaceAll(quote, quote === '"' ? '&quot;' : '&apos;') +
        quote
    : text
        .replaceAll('>', '&gt;')
        .replaceAll('{', '&#123;')
        .replaceAll('}', '&#125;');
}

/** The code with one control's value changed. */
export function edit(
  source: string,
  control: Control,
  value: string | number | boolean,
) {
  const { start, end } = control.range;
  return source.slice(0, start) + write(control, value) + source.slice(end);
}

/**
 * The code with each prop written alone spelled `={true}`, so it can switch
 * in place.
 */
export function spellBooleans(source: string) {
  const bare: number[] = [];
  const visit = (element: Element) => {
    for (const attribute of element.attributes) {
      if (!attribute.value && !attribute.spread) bare.push(attribute.end);
      else if (attribute.value?.type === 'element') visit(attribute.value);
    }
    for (const child of element.children) {
      if (child.type === 'element') visit(child);
    }
  };
  parse(source).forEach(visit);
  return bare
    .reverse()
    .reduce(
      (code, at) => code.slice(0, at) + '={true}' + code.slice(at),
      source,
    );
}
