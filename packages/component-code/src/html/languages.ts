import { highlight } from '../highlight';
import { round, stepOf } from '../number';
import type { Control } from '../controls';
import type { Ink, Token } from '../highlight';
import type { Value } from '../panel';

/**
 * How a value is changed: `true` to change it as it is, a list of options, or
 * a number's range and step.
 */
export type ControlOptions =
  | true
  | readonly (string | number)[]
  | { min?: number; max?: number; step?: number };

export type Controls = Readonly<Record<string, ControlOptions>>;

export type Language = 'html' | 'css' | 'js';

/** A file's colours, and the controls for the values `controls` names. */
export type Reading = { tokens: Token[]; controls: Control[] };

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;

export const languageOf = (file: string): Language =>
  /\.css$/i.test(file) ? 'css' : /\.m?js$/i.test(file) ? 'js' : 'html';

function control(
  prop: string,
  option: ControlOptions,
  value: Value,
  start: number,
  end: number,
  quote = '',
): Control {
  const list = Array.isArray(option);
  return {
    prop,
    kind: list
      ? 'option'
      : typeof value === 'string'
        ? 'text'
        : (typeof value as 'number' | 'boolean'),
    value,
    range: { start, end },
    quote,
    jsx: false,
    step: typeof value === 'number' ? stepOf(value) : 1,
    ...(list ? { options: option } : option === true ? {} : option),
  };
}

const marker =
  (tokens: Token[]) => (ink: Ink, start: number, length: number) => {
    if (length) tokens.push({ ink, start, end: start + length });
  };

const TAG = /<!--[\s\S]*?(?:-->|$)|<[!/]?([A-Za-z][\w:-]*)([^>]*)>?/g;
const ATTRIBUTE = /([^\s"'=<>/]+)(?:\s*=\s*("[^"]*"?|'[^']*'?|[^\s>]+))?/g;

/** Tags, attributes and their values. A value is named `tag.attribute` or `attribute`. */
function html(source: string, options: Controls): Reading {
  const tokens: Token[] = [];
  const controls: Control[] = [];
  const mark = marker(tokens);
  const pattern = new RegExp(TAG);
  let tag;

  while ((tag = pattern.exec(source))) {
    const [whole, name, rest] = tag;
    if (!name) continue;
    const at = tag.index + whole.indexOf(name);
    mark('tag', at, name.length);
    const element = name.toLowerCase();
    for (const attribute of rest.matchAll(ATTRIBUTE)) {
      const [, prop, written] = attribute;
      const start = at + name.length + attribute.index;
      mark('attribute', start, prop.length);
      if (!written) continue;
      const from = start + attribute[0].length - written.length;
      mark('string', from, written.length);
      const option = options[`${element}.${prop}`] ?? options[prop];
      if (!option) continue;
      const quote = /^["']/.test(written) ? written[0] : '';
      const text = quote ? written.slice(1, -1) : written;
      controls.push(
        control(
          prop,
          option,
          NUMBER.test(text) ? +text : text,
          from,
          from + written.length,
          quote,
        ),
      );
    }
    // A script or style holds code, not tags.
    if (whole[1] !== '/' && (element === 'script' || element === 'style')) {
      const end = source.indexOf(`</${element}`, pattern.lastIndex);
      pattern.lastIndex = end < 0 ? source.length : end;
    }
  }
  return { tokens, controls };
}

const VALUE =
  /(["'])(?:\\.|(?!\1)[^\\])*\1?|#[\da-f]{3,8}\b|(?<![\w-])-?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?|!important/gi;

/**
 * Selectors, properties and their values. A value is named by its property
 * or custom property, and a number keeps its unit.
 */
function css(source: string, options: Controls): Reading {
  const tokens: Token[] = [];
  const controls: Control[] = [];
  const mark = marker(tokens);
  let at = 0;

  while (at < source.length) {
    const space = /\s+|\/\*[\s\S]*?(?:\*\/|$)/y;
    space.lastIndex = at;
    const skipped = space.exec(source)?.[0].length;
    if (skipped) {
      at += skipped;
      continue;
    }

    // The part up to a `{`, `}` or `;` outside strings and brackets.
    let end = at;
    let depth = 0;
    while (end < source.length) {
      const char = source[end];
      if (char === '"' || char === "'") {
        const close = source.indexOf(char, end + 1);
        end = close < 0 ? source.length : close + 1;
        continue;
      }
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (depth <= 0 && /[{};]/.test(char)) break;
      end++;
    }
    const part = source.slice(at, end).trimEnd();
    const colon = part.indexOf(':');

    if (part[0] === '@') {
      mark('keyword', at, part.match(/^@[\w-]*/)![0].length);
    } else if (source[end] === '{') {
      mark('tag', at, part.length);
    } else if (colon > 0) {
      const prop = part.slice(0, colon).trim();
      mark('attribute', at, prop.length);
      const offset = part.slice(colon + 1).search(/\S/);
      const from = at + colon + 1 + offset;
      const value = offset < 0 ? '' : part.slice(colon + 1 + offset);
      for (const piece of value.matchAll(VALUE)) {
        mark(
          piece[1] ? 'string' : 'keyword',
          from + piece.index,
          piece[0].length,
        );
      }
      const option = options[prop];
      const number = value.match(/^(-?(?:\d+\.?\d*|\.\d+))([a-z]*|%)$/i);
      if (option && value) {
        controls.push(
          number && (!Array.isArray(option) || !number[2])
            ? control(prop, option, +number[1], from, from + number[1].length)
            : control(prop, option, value, from, from + value.length),
        );
      }
    }
    at = end + 1;
  }
  return { tokens, controls };
}

const DECLARATION =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(-?(?:\d+\.?\d*|\.\d+)|true|false|(["'])(?:\\.|(?!\3)[^\\\n])*\3)(?=[ \t]*(?:[;,\n]|$))/g;

/** JavaScript, coloured. A value is named by the `const`, `let` or `var` it sets. */
function js(source: string, options: Controls): Reading {
  const controls: Control[] = [];
  for (const declaration of source.matchAll(DECLARATION)) {
    const [whole, name, written, quote = ''] = declaration;
    const option = options[name];
    if (!option) continue;
    const start = declaration.index + whole.length - written.length;
    const value = quote
      ? written.slice(1, -1).replace(/\\(.)/g, '$1')
      : NUMBER.test(written)
        ? +written
        : written === 'true';
    controls.push(
      control(name, option, value, start, start + written.length, quote),
    );
  }
  return { tokens: highlight(source), controls };
}

export const read = { html, css, js };

/** A value as `language` writes it, so it reads back the same. */
function write(language: Language, control: Control, value: Value) {
  const raw =
    typeof value === 'number' ? round(value, control.step) : `${value}`;
  // A value cannot end its declaration or rule.
  if (language === 'css') return raw.replace(/[;{}<]/g, '');
  const { quote } = control;
  if (language === 'html') {
    const text = raw.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
    return quote
      ? quote +
          text.replaceAll(quote, quote === '"' ? '&quot;' : '&#39;') +
          quote
      : text;
  }
  if (typeof value !== 'string') return raw;
  const mark = quote || "'";
  return (
    mark +
    raw
      .replaceAll('\\', '\\\\')
      .replaceAll(mark, `\\${mark}`)
      .replaceAll('\n', '\\n') +
    mark
  );
}

/** The file with one control's value changed. */
export function edit(
  language: Language,
  source: string,
  control: Control,
  value: Value,
) {
  const { start, end } = control.range;
  return (
    source.slice(0, start) + write(language, control, value) + source.slice(end)
  );
}
