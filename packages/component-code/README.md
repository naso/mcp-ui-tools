# component-code

A React component beside the code that makes it, where every value in the code
is a control. Give it your components in `scope` and the code renders as its
own preview, so the two cannot differ.

Under 8 kB gzipped, with no dependencies beyond React.

```sh
npm install component-code
```

```tsx
import { ComponentCode } from 'component-code';
import { Button } from './Button';

<ComponentCode
  interactive
  file="Button.tsx"
  scope={{ Button }}
  controls={{ size: ['small', 'medium', 'large'] }}
  code={`
    <Button size="medium" disabled={false}>
      Save
    </Button>
  `}
/>;
```

The component adds its own stylesheet, so there is nothing else to import.

## Props

| Prop          | What it sets                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `code`        | The code as it is written. The blank lines around it and its shared indent are dropped.                   |
| `scope`       | What the code can name: your components and values. With it, the preview is the code itself, rendered.    |
| `interactive` | Makes each string, number, boolean and line of text in the code a control.                                |
| `controls`    | How a prop is changed, by its name or by `Element.prop`.                                                  |
| `onChange`    | Called with `{ prop, value, code }` as the reader changes a value.                                        |
| `children`    | The preview, for code that cannot run from its text, such as code with a hook. Use it instead of `scope`. |
| `file`        | The file named in the code's tab. `Code` when left out.                                                   |
| `theme`       | `light` or `dark`. Without it, the page's `color-scheme` decides.                                         |
| `className`   | A class for the outer element.                                                                            |

## What the code can hold

The code is read, not run. It can hold elements, fragments, props, spreads,
text, strings, numbers, booleans, `null`, `undefined`, lists, objects, other
elements and the names in `scope`, with their members, such as `Card.Title` or
`post.title`. A lowercase tag is the browser's own element.

A function, a call or a condition goes in through `scope` under a name. Code
that cannot run says why in place of the preview, and so does a component that
throws, until the code changes.

## Controls

With `interactive`, each element's strings, numbers and booleans are controls,
and its text where that is all it holds, on one line.

| Value   | Control                                                       | In `controls`        |
| ------- | ------------------------------------------------------------- | -------------------- |
| Number  | Dragged sideways, or stepped with the arrow keys. Shift: ten. | `{ min, max, step }` |
| Boolean | Pressed to switch.                                            |                      |
| Text    | Typed over in place. Enter or Escape leaves it.               |                      |
| Option  | Picked from a menu, which stays open to try the others.       | A list of values     |
| Any     | Left as written.                                              | `false`              |

A number steps by its last decimal place unless `step` is set: `1` for `8`,
`0.1` for `0.5`. A prop written alone, such as `open`, is shown as
`open={true}` so it can switch.

## Styling

It follows the page's `color-scheme`, or `theme`. Each colour and font is a
custom property on `.cc`, which a page can set:

```css
.cc {
  --cc-mono: 'JetBrains Mono', monospace;
  --cc-tag: light-dark(#116329, #7ee787);
}
```

| Property                                                                              | Sets                                               |
| ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `--cc-surface`, `--cc-subtle`, `--cc-sunken`                                          | The preview, frame and code grounds                |
| `--cc-foreground`, `--cc-secondary`, `--cc-muted`, `--cc-disabled`                    | Text and icons                                     |
| `--cc-text`, `--cc-line`, `--cc-tag`, `--cc-attribute`, `--cc-string`, `--cc-keyword` | Code colours                                       |
| `--cc-sans`, `--cc-mono`                                                              | Fonts, Geist and Geist Mono when the page has them |

When rendering on a server, put `styles` in the page's head so the first paint
is styled:

```tsx
import { styles } from 'component-code';

<style id="component-code">{styles}</style>;
```

## HTML, CSS and JS

For a canvas, an SVG or anything without React, import `ComponentCode` from
`component-code/html` and give it files. They run together as one page in a
sandboxed frame, with a tab for each file.

```tsx
import { ComponentCode } from 'component-code/html';

<ComponentCode
  files={{
    'index.html': '<canvas></canvas>',
    'style.css': ':root { --speed: 1; }',
    'script.js': 'const gap = 16;',
  }}
  controls={{ '--speed': { min: 0, max: 4, step: 0.1 }, gap: true }}
/>;
```

| Prop        | What it sets                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `files`     | The files by name, each in its own tab: `.html`, `.css` and `.js`. The HTML is the page's body.           |
| `controls`  | The values the reader can change, by name. Each takes `true`, a list of options, or `{ min, max, step }`. |
| `onChange`  | Called with `{ file, prop, value, code }` as the reader changes a value.                                  |
| `theme`     | `light` or `dark`. Without it, the page's `color-scheme` decides, and the frame takes the same.           |
| `className` | A class for the outer element.                                                                            |

A value is named by its attribute, as `r` or `circle.r`, by its CSS property
or custom property, as `--speed`, or by the JS `const`, `let` or `var` it sets
to a number, string or boolean. A CSS number keeps its unit.

A CSS value changes in place as the reader drags it, so a script that reads
custom properties each frame follows along. A change to the HTML or JS runs the
page again, loading it behind the one shown so the preview does not flash. An
error in the page shows in its place.

When rendering on a server, put its `styles` in the page's head with the id
`component-code-html`.

## In the chat

[`component-code-mcp`](https://www.npmjs.com/package/component-code-mcp) shows
a component in Component Code in Claude, ChatGPT, VS Code and other MCP hosts.

## Licence

MIT
