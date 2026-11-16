import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Root } from 'react-dom/client';

import { ComponentCode } from '../src/html';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.matchMedia = () =>
    ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList;
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const FILES = {
  'index.html': '<canvas width="300"></canvas>',
  'style.css': ':root { --speed: 2; }',
  'script.js': 'const gap = 16;',
};

const tabs = () => [...host.querySelectorAll('[role="tab"]')];
const frame = () => host.querySelector('iframe')!;

it('shows a tab for each file and the open one', () => {
  act(() => root.render(<ComponentCode files={FILES} />));
  expect(tabs().map((tab) => tab.textContent)).toEqual([
    'index.html',
    'style.css',
    'script.js',
  ]);
  expect(host.querySelector('code')!.textContent).toBe(FILES['index.html']);

  act(() => (tabs()[2] as HTMLElement).click());
  expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
  expect(host.querySelector('code')!.textContent).toBe(FILES['script.js']);
});

it('runs the files together in a sandboxed frame', () => {
  act(() => root.render(<ComponentCode files={FILES} />));
  expect(frame().getAttribute('sandbox')).toBe('allow-scripts');
  const page = frame().srcdoc;
  expect(page).toContain('<canvas width="300"></canvas>');
  expect(page).toContain(':root { --speed: 2; }');
  expect(page).toContain('<script>const gap = 16;</script>');
});

it('makes the values named in controls changeable', () => {
  const onChange = vi.fn();
  act(() =>
    root.render(
      <ComponentCode
        files={FILES}
        controls={{ '--speed': true, gap: true }}
        onChange={onChange}
      />,
    ),
  );
  act(() => (tabs()[1] as HTMLElement).click());
  const speed = host.querySelector('[role="slider"]')!;
  expect(speed.getAttribute('aria-label')).toBe('--speed');

  act(() => {
    speed.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
  });
  expect(host.querySelector('code')!.textContent).toBe(':root { --speed: 3; }');
  expect(onChange).toHaveBeenCalledWith({
    file: 'style.css',
    prop: '--speed',
    value: 3,
    code: ':root { --speed: 3; }',
  });
  expect(host.querySelector('.cc-changed')).not.toBeNull();
});
