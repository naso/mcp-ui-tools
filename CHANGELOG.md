# Changelog

Every package shares a version. Each release lists what changed in each.

## Unreleased

### @fabiocv/component-code

- The menu of a prop's options answers Home and End, jumps to an option by
  its first letter, and gives the focus back to the value on Escape.

### @fabiocv/component-code-mcp

- The same menu, in the chat.

### mcp-ui-tools

- The same menu, in the chat.

## 0.1.1 – 2026-11-16

### @fabiocv/component-code

- Links to its repository, github.com/naso/mcp-ui-tools.

### @fabiocv/component-code-mcp

- Links to its repository, github.com/naso/mcp-ui-tools.

### @fabiocv/orbit-mcp

- Links to its repository, github.com/naso/mcp-ui-tools.

### mcp-ui-tools

- Links to its repository, github.com/naso/mcp-ui-tools.

## 0.1.0 – 2026-11-16

### @fabiocv/component-code

- `ComponentCode` shows a component beside the code that makes it. With `scope`
  the preview is rendered from the code, so the two cannot differ. `children`
  sets the preview for code that cannot run from its text.
- `interactive` turns each string, number, boolean and line of text in the code
  into a control: numbers drag and step with the arrow keys, booleans switch,
  and text is typed in place.
- `controls` turns a prop into options picked from a menu, or sets a number's
  range and step.
- Copy and reset, line numbers and syntax colours.
- Light and dark, from the page's `color-scheme` or from `theme`.
- `note` shows a line from an info icon beside reset, once the reader changes a
  value.
- `@fabiocv/component-code/html` runs HTML, CSS and JS beside their code, with a
  tab for each file. The values named in `controls` become controls: CSS changes
  in place, and HTML and JS run the page again.

### @fabiocv/component-code-mcp

- `show_in_component_code` shows a component in the chat in Component Code, as
  an MCP App.
- `show_html_in_component_code` shows HTML, CSS and JS running in the chat.
- As the reader changes a value, the agent gets the code as it now is, and what
  the preview threw, with their next message, in hosts that take model context.
  An info icon tells the reader the chat sees this state.
- Runs over stdio with `npx @fabiocv/component-code-mcp`, and over HTTP at
  `https://mcp-ui-tools.fabio.cv/component-code/mcp`.

### @fabiocv/orbit-mcp

- `play_while_you_wait` shows Orbit in the chat, a one-button game to play while
  the agent works. It returns at once, so the agent carries on.
- Runs over stdio with `npx @fabiocv/orbit-mcp`, and over HTTP at
  `https://mcp-ui-tools.fabio.cv/orbit/mcp`.

### mcp-ui-tools

- Every tool in one server, over stdio with `npx mcp-ui-tools`, and over HTTP at
  `https://mcp-ui-tools.fabio.cv/mcp`.
