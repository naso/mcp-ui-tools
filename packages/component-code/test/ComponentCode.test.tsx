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

function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange?: (checked: boolean, event?: unknown) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked, {})}
    />
  );
}

it('writes what a component in the preview changes into its code', () => {
  const onChange = vi.fn();
  show(
    <ComponentCode
      interactive
      scope={{ Switch }}
      onChange={onChange}
      code={'<Switch checked />'}
    />,
  );
  const toggle = () =>
    act(() => host.querySelector<HTMLElement>('[role="switch"]')!.click());

  toggle();
  expect(code()).toBe('<Switch checked={false} />');
  expect(onChange).toHaveBeenLastCalledWith({
    prop: 'checked',
    value: false,
    code: '<Switch checked={false} />',
  });
  toggle();
  expect(code()).toBe('<Switch checked={true} />');
  expect(
    host.querySelector('[role="switch"]')!.getAttribute('aria-checked'),
  ).toBe('true');
});

it('leaves a handler the code writes, and code that is not interactive', () => {
  const own = vi.fn();
  show(
    <ComponentCode
      interactive
      scope={{ Switch, own }}
      code={'<Switch checked onCheckedChange={own} />'}
    />,
  );
  act(() => host.querySelector<HTMLElement>('[role="switch"]')!.click());
  expect(own).toHaveBeenCalledWith(false, {});
  expect(code()).toBe('<Switch checked={true} onCheckedChange={own} />');

  show(<ComponentCode scope={{ Switch }} code={'<Switch checked />'} />);
  act(() => host.querySelector<HTMLElement>('[role="switch"]')!.click());
  expect(code()).toBe('<Switch checked />');
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

it('moves through a menu of options from the keyboard', () => {
  // jsdom has no popovers.
  HTMLElement.prototype.showPopover ??= function () {};
  HTMLElement.prototype.hidePopover ??= function () {};
  const Tag = ({ tone }: { tone: string }) => <span>{tone}</span>;
  show(
    <ComponentCode
      interactive
      scope={{ Tag }}
      controls={{ tone: ['neutral', 'success', 'warning', 'danger'] }}
      code={'<Tag tone="success" />'}
    />,
  );
  const value = host.querySelector<HTMLButtonElement>('[aria-haspopup]')!;
  const menu = host.querySelector<HTMLElement>('[role="menu"]')!;
  const focused = () => document.activeElement?.textContent;
  const press = (key: string) =>
    act(() => {
      menu.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    });

  act(() => value.click());
  expect(focused()).toBe('"success"');
  press('End');
  expect(focused()).toBe('"danger"');
  press('Home');
  expect(focused()).toBe('"neutral"');
  press('w');
  expect(focused()).toBe('"warning"');
  press('x');
  expect(focused()).toBe('"warning"');
  press('d');
  expect(focused()).toBe('"danger"');
  press('Escape');
  expect(document.activeElement).toBe(value);
});

it('names the preview with title, and hides the tabs with tabs={false}', () => {
  show(
    <ComponentCode
      file="Badge.tsx"
      title="Example"
      code="<b>Hi</b>"
      scope={{}}
    />,
  );
  const tabs = () =>
    [...host.querySelectorAll('.cc-tab:not(.cc-actions)')].map(
      (tab) => tab.textContent,
    );
  expect(tabs()).toEqual(['Badge.tsx', 'Example']);
  show(<ComponentCode tabs={false} code="<b>Hi</b>" scope={{}} />);
  expect(tabs()).toEqual([]);
  expect(host.querySelector('.cc-actions')).not.toBeNull();
});

it('shows one side alone with only', () => {
  show(<ComponentCode only="preview" code="<b>Hi</b>" scope={{}} />);
  expect(preview()).toBe('Hi');
  expect(host.querySelector('.cc-code')).toBeNull();
  expect(host.querySelector('.cc-split')).toBeNull();
  show(<ComponentCode only="code" code="<b>Hi</b>" scope={{}} />);
  expect(host.querySelector('.cc-preview')).toBeNull();
  expect(code()).toBe('<b>Hi</b>');
  expect(host.textContent).not.toContain('Preview');
});

it('starts with a side closed with collapsed', () => {
  show(<ComponentCode collapsed="preview" code="<b>Hi</b>" scope={{}} />);
  const panel = host.querySelector<HTMLElement>('.cc')!;
  expect(panel.style.getPropertyValue('--split')).toBe('0');
  expect(host.querySelector('.cc-split')).not.toBeNull();
  show(<ComponentCode collapsed="code" code="<b>Hi</b>" scope={{}} />);
  expect(panel.style.getPropertyValue('--split')).toBe('1');
});
