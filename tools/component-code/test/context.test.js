import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describe } from '../view/context.ts';

test('describes a changed prop with the whole code', () => {
  const text = describe({
    prop: 'label',
    value: 'A very long label',
    file: 'Tag.tsx',
    files: { 'Tag.tsx': '<Tag label="A very long label" />' },
  });
  assert.match(text, /set `label` to `"A very long label"` in `Tag.tsx`/);
  assert.match(text, /```tsx\n<Tag label="A very long label" \/>\n```/);
  assert.match(text, /renders without throwing/);
});

test('gives every file of a page and what the preview threw', () => {
  const text = describe({
    prop: '--speed',
    value: 0,
    file: 'style.css',
    files: { 'index.html': '<canvas></canvas>', 'style.css': ':root {}' },
    problem: 'Division by zero',
  });
  assert.match(text, /set `--speed` to `0`/);
  assert.match(text, /```html\n<canvas><\/canvas>\n```/);
  assert.match(text, /```css\n:root \{\}\n```/);
  assert.match(text, /throws instead of rendering: Division by zero/);
});
