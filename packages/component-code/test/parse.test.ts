import { expect, it } from 'vitest';

import { CodeError, parse } from '../src/parse';
import type { Element } from '../src/parse';

it('reads elements, props and children', () => {
  const [card] = parse(`
    <Card.Root title="Hi &amp; bye" size={2} open tags={['a', "b"]} style={{ gap: 4, color }}>
      Text {"string"}
      <br />
    </Card.Root>
  `);
  expect(card.name).toBe('Card.Root');
  expect(card.attributes.map(({ name }) => name)).toEqual([
    'title',
    'size',
    'open',
    'tags',
    'style',
  ]);
  expect(card.attributes[0].value).toMatchObject({
    value: 'Hi & bye',
    jsx: true,
  });
  expect(card.attributes[1].value).toMatchObject({ type: 'number', value: 2 });
  expect(card.attributes[2].value).toBeNull();
  expect(card.attributes[4].value).toMatchObject({
    type: 'object',
    entries: [
      ['gap', { type: 'number', value: 4 }],
      ['color', { type: 'name', path: ['color'] }],
    ],
  });
  expect(card.children.map((child) => child.type)).toEqual([
    'text',
    'string',
    'text',
    'element',
    'text',
  ]);
});

it('reads fragments, spreads, elements in props and comments', () => {
  const [fragment] = parse(`<>
    {/* a comment */}
    <Button {...props} icon={<Arrow />} />
  </>`);
  expect(fragment.name).toBe('');
  const button = fragment.children.find(
    (child) => child.type === 'element',
  ) as Element;
  expect(button.attributes[0]).toMatchObject({ spread: true });
  expect(button.attributes[1].value).toMatchObject({ name: 'Arrow' });
});

it('says why code cannot run', () => {
  expect(() => parse('<A onClick={() => go()} />')).toThrow(CodeError);
  expect(() => parse('<A value={format(1)} />')).toThrow(
    '`format()` is a call, which cannot run here.',
  );
  expect(() => parse('<A>')).toThrow('`<A>` is not closed.');
  expect(() => parse('<A></B>')).toThrow('`</B>` does not close `<A>`.');
});
