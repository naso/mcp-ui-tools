/** Where a node sits in the code, as offsets. */
export type Range = { start: number; end: number };

export type Literal = Range &
  (
    | { type: 'string'; value: string; quote: string; jsx?: boolean }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
  );

export type Value =
  | Literal
  | Element
  | (Range & { type: 'null' | 'undefined' })
  | (Range & { type: 'name'; path: string[] })
  | (Range & { type: 'array'; items: Value[] })
  | (Range & { type: 'object'; entries: [string, Value][] });

/** A prop, its value `null` when it is written alone, or a spread. */
export type Attribute = Range & {
  name: string;
  value: Value | null;
  spread?: boolean;
};

export type Text = Range & { type: 'text'; raw: string };

export type Child = Element | Text | Value;

/** An element. A fragment has no name. */
export type Element = Range & {
  type: 'element';
  name: string;
  attributes: Attribute[];
  children: Child[];
};

/** Why code cannot run, worded for the reader. */
export class CodeError extends Error {}

const NAME = /[A-Za-z_$][\w$-]*/y;
const NUMBER = /-?(?:\d[\d_]*\.?\d*|\.\d+)(?:e[+-]?\d+)?/iy;
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** JSX text with its entities read. */
export const decode = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, body: string) =>
    body[0] === '#'
      ? String.fromCodePoint(
          body[1] === 'x' || body[1] === 'X'
            ? parseInt(body.slice(2), 16)
            : +body.slice(1),
        )
      : (ENTITIES[body] ?? entity),
  );

const unescape = (text: string) =>
  text.replace(
    /\\(u\{[\da-f]+\}|u[\da-f]{4}|x[\da-f]{2}|[\s\S])/gi,
    (_, code: string) =>
      code.length > 1
        ? String.fromCodePoint(parseInt(code.replace(/[ux{}]/gi, ''), 16))
        : ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' }[
            code
          ] ?? code),
  );

/**
 * Reads JSX: elements, their props and children. A value is a string, a
 * number, a boolean, `null`, `undefined`, a list, an object, an element or a
 * name with its members. Anything else is a `CodeError`.
 */
export function parse(source: string): Element[] {
  let at = 0;

  const fail = (message: string): never => {
    throw new CodeError(message);
  };
  const near = () => source.slice(at, at + 12).split('\n')[0];
  const read = (pattern: RegExp) => {
    pattern.lastIndex = at;
    const match = pattern.exec(source)?.[0];
    if (match) at += match.length;
    return match;
  };
  const space = () => {
    for (;;) {
      read(/\s+/y);
      if (source.startsWith('//', at)) read(/\/\/.*/y);
      else if (source.startsWith('/*', at)) {
        const end = source.indexOf('*/', at + 2);
        at = end < 0 ? source.length : end + 2;
      } else return;
    }
  };
  const is = (text: string) => (space(), source.startsWith(text, at));
  const expect = (text: string) => {
    if (!is(text)) fail(`Expected \`${text}\` at \`${near()}\`.`);
    at += text.length;
  };

  function name() {
    const first = read(NAME) ?? fail(`Expected a name at \`${near()}\`.`);
    const path = [first];
    while (source[at] === '.') {
      at++;
      path.push(read(NAME) ?? fail('Expected a name after `.`.'));
    }
    return path;
  }

  /** A string. A JSX attribute's takes entities, and no escapes. */
  function string(start: number, jsx = false): Literal {
    const quote = source[at];
    let end = at + 1;
    while (end < source.length && source[end] !== quote) {
      if (source[end] === '\\' && !jsx) end++;
      end++;
    }
    if (end >= source.length) fail('A string is not closed.');
    const raw = source.slice(at + 1, end);
    if (quote === '`' && raw.includes('${')) {
      fail('A template string cannot run here.');
    }
    at = end + 1;
    const value = jsx ? decode(raw) : unescape(raw);
    return { type: 'string', value, quote, jsx, start, end: at };
  }

  function value(): Value {
    space();
    const start = at;
    const char = source[at];
    if (char === '"' || char === "'" || char === '`') return string(start);
    if (char === '<') return element();
    if (char === '(') {
      at++;
      const inner = value();
      expect(')');
      return inner;
    }
    if (char === '[') {
      at++;
      const items: Value[] = [];
      while (!is(']')) {
        items.push(value());
        if (!is(']')) expect(',');
      }
      at++;
      return { type: 'array', items, start, end: at };
    }
    if (char === '{') {
      at++;
      const entries: [string, Value][] = [];
      while (!is('}')) {
        const from = at;
        const quoted = source[at] === '"' || source[at] === "'";
        const key = quoted ? (string(at).value as string) : name()[0];
        const shorthand: Value = {
          type: 'name',
          path: [key],
          start: from,
          end: at,
        };
        entries.push([key, is(':') ? (at++, value()) : shorthand]);
        if (!is('}')) expect(',');
      }
      at++;
      return { type: 'object', entries, start, end: at };
    }
    const number = read(NUMBER);
    if (number) {
      return {
        type: 'number',
        value: +number.replace(/_/g, ''),
        start,
        end: at,
      };
    }
    const path = name();
    const end = at;
    if (path.length === 1) {
      const word = path[0];
      if (word === 'true' || word === 'false') {
        return { type: 'boolean', value: word === 'true', start, end };
      }
      if (word === 'null' || word === 'undefined') {
        return { type: word, start, end };
      }
    }
    if (is('('))
      fail(`\`${path.join('.')}()\` is a call, which cannot run here.`);
    return { type: 'name', path, start, end };
  }

  function element(): Element {
    const start = at;
    expect('<');
    const tag = is('>') ? '' : name().join('.');
    const attributes: Attribute[] = [];
    for (;;) {
      if (is('/>')) {
        at += 2;
        return {
          type: 'element',
          name: tag,
          attributes,
          children: [],
          start,
          end: at,
        };
      }
      if (is('>')) break;
      const from = at;
      if (is('{')) {
        at++;
        expect('...');
        const spread = value();
        expect('}');
        attributes.push({
          name: '',
          value: spread,
          spread: true,
          start: from,
          end: at,
        });
        continue;
      }
      const prop =
        read(/[\w$:-]+/y) ?? fail(`Expected a prop at \`${near()}\`.`);
      const named = at;
      let attribute: Value | null = null;
      if (is('=')) {
        at++;
        space();
        if (source[at] === '{') {
          at++;
          attribute = value();
          expect('}');
        } else if (source[at] === '"' || source[at] === "'") {
          attribute = string(at, true);
        } else attribute = value();
      }
      attributes.push({
        name: prop,
        value: attribute,
        start: from,
        end: attribute ? at : named,
      });
    }
    at++;

    const children: Child[] = [];
    for (;;) {
      if (at >= source.length) fail(`\`<${tag}>\` is not closed.`);
      const from = at;
      if (source.startsWith('</', at)) {
        at += 2;
        space();
        const closing = source[at] === '>' ? '' : name().join('.');
        if (closing !== tag)
          fail(`\`</${closing}>\` does not close \`<${tag}>\`.`);
        expect('>');
        return {
          type: 'element',
          name: tag,
          attributes,
          children,
          start,
          end: at,
        };
      }
      if (source[at] === '<') children.push(element());
      else if (source[at] === '{') {
        at++;
        if (!is('}')) children.push(value());
        expect('}');
      } else {
        at = source.slice(at).search(/[<{]/) + at;
        if (at < from) at = source.length;
        children.push({
          type: 'text',
          raw: source.slice(from, at),
          start: from,
          end: at,
        });
      }
    }
  }

  const elements: Element[] = [];
  while (!is(';') && at < source.length) {
    if (source[at] !== '<' && source[at] !== '(')
      fail(`Expected an element at \`${near()}\`.`);
    const node = value();
    if (node.type !== 'element') fail('Expected an element.');
    elements.push(node as Element);
  }
  return elements;
}
