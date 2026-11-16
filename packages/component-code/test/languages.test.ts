import { expect, it } from 'vitest';

import { edit, read } from '../src/html/languages';
import type { Controls, Language } from '../src/html/languages';

const controlsOf = (language: Language, source: string, options: Controls) =>
  read[language](source, options).controls.map(({ prop, kind, value }) => [
    prop,
    kind,
    value,
  ]);

/** The source with its first control set to `value`. */
const change = (
  language: Language,
  source: string,
  options: Controls,
  value: string | number | boolean,
) => edit(language, source, read[language](source, options).controls[0], value);

it('finds the attributes named, by tag and attribute or attribute', () => {
  const source =
    '<svg viewBox="0 0 10 10"><circle r="4" fill=\'tomato\' /><rect r="2" /></svg>';
  expect(controlsOf('html', source, { 'circle.r': true, fill: true })).toEqual([
    ['r', 'number', 4],
    ['fill', 'text', 'tomato'],
  ]);
});

it('skips what a script or style holds', () => {
  const source = '<script>const a = "<b r=\'1\'>"</script><b r="2"></b>';
  expect(controlsOf('html', source, { r: true })).toEqual([['r', 'number', 2]]);
});

it('writes attributes in their quotes, with entities', () => {
  expect(
    change('html', '<p title="a">x</p>', { title: true }, 'say "hi" & <go>'),
  ).toBe('<p title="say &quot;hi&quot; &amp; &lt;go>">x</p>');
  expect(change('html', '<circle r="4" />', { r: { step: 0.5 } }, 4.5)).toBe(
    '<circle r="4.5" />',
  );
});

it('finds CSS values by property, keeping a number its unit', () => {
  const source = `
    :root { --speed: 1.5; --tone: oklch(62% 0.19 145); }
    .card:hover { border-radius: 12px; padding: 4px 8px }
  `;
  expect(
    controlsOf('css', source, {
      '--speed': { min: 0 },
      '--tone': true,
      'border-radius': true,
      padding: true,
    }),
  ).toEqual([
    ['--speed', 'number', 1.5],
    ['--tone', 'text', 'oklch(62% 0.19 145)'],
    ['border-radius', 'number', 12],
    ['padding', 'text', '4px 8px'],
  ]);
  expect(change('css', 'a { gap: 12px }', { gap: true }, 16)).toBe(
    'a { gap: 16px }',
  );
});

it('keeps a CSS value inside its declaration', () => {
  expect(
    change('css', 'a { color: red }', { color: true }, 'blue; } b {'),
  ).toBe('a { color: blue  b  }');
});

it('colours selectors, properties and values', () => {
  const source = '@media (width > 1px) { .a { color: #fff; gap: 2px } }';
  const inks = read
    .css(source, {})
    .tokens.map(({ ink, start, end }) => [ink, source.slice(start, end)]);
  expect(inks).toEqual([
    ['keyword', '@media'],
    ['tag', '.a'],
    ['attribute', 'color'],
    ['keyword', '#fff'],
    ['attribute', 'gap'],
    ['keyword', '2px'],
  ]);
});

it('finds the JS declarations named', () => {
  const source = `const gap = 16;\nlet label = 'Go';\nvar on = true\nconst other = gap * 2;`;
  expect(
    controlsOf('js', source, { gap: true, label: true, on: true, other: true }),
  ).toEqual([
    ['gap', 'number', 16],
    ['label', 'text', 'Go'],
    ['on', 'boolean', true],
  ]);
  expect(change('js', "const label = 'Go';", { label: true }, "it's")).toBe(
    "const label = 'it\\'s';",
  );
});

it('picks a value from a list', () => {
  expect(controlsOf('css', 'a { gap: 8px }', { gap: ['4px', '8px'] })).toEqual([
    ['gap', 'option', '8px'],
  ]);
});
