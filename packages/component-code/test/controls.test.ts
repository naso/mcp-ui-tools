import { expect, it } from 'vitest';

import { edit, findControls, spellBooleans } from '../src/controls';
import { parse } from '../src/parse';

const controlsOf = (source: string, options = {}) =>
  findControls(parse(source), options);

it('finds strings, numbers, booleans and one-line text', () => {
  const controls = controlsOf(
    `<Button size="small" gap={4} wide={false} label={'Go'} icon={<Arrow turn={0.5} />}>View work</Button>`,
  );
  expect(controls.map(({ prop, kind }) => [prop, kind])).toEqual([
    ['size', 'text'],
    ['gap', 'number'],
    ['wide', 'boolean'],
    ['label', 'text'],
    ['turn', 'number'],
    ['children', 'text'],
  ]);
  expect(controls[4].step).toBe(0.1);
});

it('reads options by element and prop, then by prop', () => {
  const source = '<Card size="small"><Tag size="small" /></Card>';
  const controls = controlsOf(source, {
    size: ['small', 'large'],
    'Tag.size': false,
  });
  expect(controls.map(({ kind }) => kind)).toEqual(['option']);
});

it('writes values back so they read the same', () => {
  const source = `<A title="Say &quot;hi&quot;" label={'it\\'s'} n={1.5}>a &lt; b</A>`;
  const [title, label, n, text] = controlsOf(source, { n: { step: 0.25 } });
  expect(title.value).toBe('Say "hi"');
  expect(label.value).toBe("it's");
  expect(text.value).toBe('a < b');

  let next = edit(source, title, 'x & "y"');
  expect(next).toContain('title="x &amp; &quot;y&quot;"');
  next = edit(source, label, "don't");
  expect(next).toContain(`label={'don\\'t'}`);
  next = edit(source, n, 1.75000001);
  expect(next).toContain('n={1.75}');
  next = edit(source, text, '{x} > y');
  expect(next).toContain('>&#123;x&#125; &gt; y</A>');

  for (const [control, value] of [
    [title, 'x & "y"'],
    [label, "don't"],
    [text, '{x} > y'],
  ] as const) {
    const again = controlsOf(edit(source, control, value));
    expect(again.find(({ prop }) => prop === control.prop)?.value).toBe(value);
  }
});

it('puts a number picked for a JSX string in braces', () => {
  const source = '<A size="small" />';
  const [size] = controlsOf(source, { size: ['small', 2] });
  expect(edit(source, size, 2)).toBe('<A size={2} />');
});

it('spells props written alone in full', () => {
  expect(spellBooleans('<A open b="x" icon={<B wide />} />')).toBe(
    '<A open={true} b="x" icon={<B wide={true} />} />',
  );
});
