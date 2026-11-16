import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { ComponentCode } from '../src';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const show = (node: ReactNode) => act(() => root.render(node));
const preview = () => host.querySelector('.cc-preview')!.textContent;
/** The code as shown, with each text control's value in place. */
const code = () => {
  const shown = host.querySelector('code')!.cloneNode(true) as HTMLElement;
  const values = [...host.querySelectorAll('code input')].map(
    (input) => (input as HTMLInputElement).value,
  );
  shown.querySelectorAll('input').forEach((input, index) => {
    input.replaceWith(values[index]);
  });
  return shown.textContent;
};

function Badge({
  label,
  count,
  round,
}: {
  label: string;
  count: number;
  round?: boolean;
}) {
  return (
    <span>
      {label} {count} {round ? 'round' : 'square'}
    </span>
  );
}

it('renders the code as its preview', () => {
  show(
    <ComponentCode
      scope={{ Badge }}
      code={`
        <Badge label="New" count={3} />
      `}
    />,
  );
  expect(preview()).toBe('New 3 square');
  expect(code()).toBe('<Badge label="New" count={3} />');
  expect(document.getElementById('component-code')).not.toBeNull();
});

it('changes the code and the preview from its controls', () => {
  const onChange = vi.fn();
  show(
    <ComponentCode
      interactive
      scope={{ Badge }}
      onChange={onChange}
      code={'<Badge label="New" count={3} round />'}
    />,
  );
  expect(code()).toBe('<Badge label="New" count={3} round={true} />');

  act(() => host.querySelector<HTMLButtonElement>('[aria-pressed]')!.click());
  expect(preview()).toBe('New 3 square');
  expect(onChange).toHaveBeenLastCalledWith({
    prop: 'round',
    value: false,
    code: '<Badge label="New" count={3} round={false} />',
  });

  const count = host.querySelector<HTMLElement>('[role="slider"]')!;
  act(() => {
    count.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        shiftKey: true,
        bubbles: true,
      }),
    );
  });
  expect(preview()).toBe('New 13 square');

  const input = host.querySelector('input')!;
  act(() => {
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    set.call(input, 'Old');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(preview()).toBe('Old 13 square');

  act(() =>
    host.querySelector<HTMLButtonElement>('[aria-label="Reset code"]')!.click(),
  );
  expect(preview()).toBe('New 3 round');
});

it('says what stops the code from running', () => {
  show(<ComponentCode scope={{}} code="<Missing />" />);
  expect(preview()).toBe('`Missing` is not in `scope`.');
});

it('shows what a preview threw in its place', () => {
  const Broken = (): never => {
    throw new Error('Broken on purpose.');
  };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  show(
    <ComponentCode code="<Broken />">
      <Broken />
    </ComponentCode>,
  );
  expect(preview()).toBe('Broken on purpose.');
});
