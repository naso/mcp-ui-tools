/** The role a piece of code takes its colour from. Code between tokens is text. */
export type Ink = 'tag' | 'attribute' | 'string' | 'keyword';

export type Token = { ink: Ink; start: number; end: number };

const KEYWORDS = new Set(
  'as async await break case catch class const continue default delete do else enum export extends false finally for from function if import in instanceof interface let new null of return satisfies static switch this throw true try type typeof undefined var void while yield'.split(
    ' ',
  ),
);

/** What comes before a `<` that opens JSX rather than comparing. */
const BEFORE_JSX = /^(|[(,=:?[{}>&|!]|return)$/;

type Mode =
  | { in: 'code'; depth: number }
  | { in: 'tag'; named: boolean }
  | { in: 'text' };

/**
 * Splits TSX into tokens by role: tags, types and functions; attributes and
 * properties; strings; keywords, booleans, `null` and numbers.
 */
export function highlight(source: string): Token[] {
  const tokens: Token[] = [];
  const stack: Mode[] = [{ in: 'code', depth: 0 }];
  let at = 0;
  let last = '';

  const take = (pattern: RegExp) => {
    pattern.lastIndex = at;
    return pattern.exec(source)?.[0] ?? '';
  };
  const mark = (ink: Ink, length: number) => {
    if (length) tokens.push({ ink, start: at, end: at + length });
    at += length;
  };
  const quoted = (quote: string) => {
    let end = at + 1;
    while (end < source.length && source[end] !== quote) {
      end += source[end] === '\\' ? 2 : 1;
    }
    mark('string', Math.min(end + 1, source.length) - at);
  };

  while (at < source.length) {
    const mode = stack[stack.length - 1];
    const char = source[at];

    if (mode.in === 'text') {
      if (char === '{') {
        at++;
        stack.push({ in: 'code', depth: 0 });
      } else if (char === '<') {
        at++;
        if (source[at] === '/') {
          at++;
          mark('tag', take(/[\w$.:-]*/y).length);
          at = Math.max(at, source.indexOf('>', at) + 1);
          stack.pop();
        } else stack.push({ in: 'tag', named: false });
      } else {
        const end = source.slice(at).search(/[<{]/);
        at = end < 0 ? source.length : at + end;
      }
      continue;
    }

    if (mode.in === 'tag') {
      const word = take(/[\w$.:-]+/y);
      if (word) mark(mode.named ? 'attribute' : 'tag', word.length);
      else if (char === '"' || char === "'") quoted(char);
      else if (char === '{') {
        at++;
        stack.push({ in: 'code', depth: 0 });
      } else if (char === '>') {
        at++;
        stack[stack.length - 1] = { in: 'text' };
      } else if (source.startsWith('/>', at)) {
        at += 2;
        stack.pop();
      } else at++;
      mode.named = true;
      continue;
    }

    const space = take(/\s+|\/\/.*|\/\*[\s\S]*?(\*\/|$)/y);
    if (space) {
      at += space.length;
      continue;
    }
    const word = take(/[A-Za-z_$][\w$]*/y);
    if (word) {
      const next = source.slice(at + word.length).match(/^\s*(\S)/)?.[1];
      const ink: Ink | undefined = KEYWORDS.has(word)
        ? 'keyword'
        : next === '(' || /^[A-Z]/.test(word)
          ? 'tag'
          : source[at - 1] === '.' || (next === ':' && last !== '?')
            ? 'attribute'
            : undefined;
      if (ink) mark(ink, word.length);
      else at += word.length;
      last = word === 'return' ? word : 'name';
      continue;
    }
    const number = take(/\d[\d_]*\.?\d*(e[+-]?\d+)?n?|\.\d+/iy);
    if (number) {
      mark('keyword', number.length);
      last = 'name';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quoted(char);
      last = 'name';
      continue;
    }
    if (
      char === '<' &&
      BEFORE_JSX.test(last) &&
      /[A-Za-z>]/.test(source[at + 1] ?? '')
    ) {
      at++;
      stack.push({ in: 'tag', named: source[at] === '>' });
      if (source[at] === '>') {
        at++;
        stack[stack.length - 1] = { in: 'text' };
      }
      continue;
    }
    if (char === '{') mode.depth++;
    if (char === '}') {
      if (mode.depth === 0 && stack.length > 1) {
        at++;
        stack.pop();
        continue;
      }
      mode.depth--;
    }
    last =
      source.startsWith('&&', at) || source.startsWith('||', at) ? '&' : char;
    at++;
  }
  return tokens;
}
