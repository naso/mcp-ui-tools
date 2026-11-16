import { expect, it } from 'vitest';

import { highlight } from '../src/highlight';

const inks = (source: string) =>
  highlight(source).map(({ ink, start, end }) => [
    source.slice(start, end),
    ink,
  ]);

it('colours JSX by role and leaves its text alone', () => {
  expect(
    inks('<Button size="small" gap={4} open>if for return</Button>'),
  ).toEqual([
    ['Button', 'tag'],
    ['size', 'attribute'],
    ['"small"', 'string'],
    ['gap', 'attribute'],
    ['4', 'keyword'],
    ['open', 'attribute'],
    ['Button', 'tag'],
  ]);
});

it('colours code with JSX inside it', () => {
  expect(
    inks(`const [on, setOn] = useState(false);
return <Toggle on={on && true} label={user.name} />;`),
  ).toEqual([
    ['const', 'keyword'],
    ['useState', 'tag'],
    ['false', 'keyword'],
    ['return', 'keyword'],
    ['Toggle', 'tag'],
    ['on', 'attribute'],
    ['true', 'keyword'],
    ['label', 'attribute'],
    ['name', 'attribute'],
  ]);
});

it('tells a comparison from a tag', () => {
  expect(inks('if (a < b) x = 1')).toEqual([
    ['if', 'keyword'],
    ['1', 'keyword'],
  ]);
});
