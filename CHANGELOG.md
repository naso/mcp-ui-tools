# Changelog

Every package shares a version. Each release opens with a line on what it
brings, then lists what changed in each package.

## 0.4.0 – 2026-11-19

A title for the preview, hidden tabs, a side closed or shown alone, and a line
to drag when the two are stacked.

### @fabiocv/component-code

- `title` names the preview's tab, which is `Preview` without it.
- `tabs={false}` hides the tabs.
- `collapsed="preview"` or `collapsed="code"` starts that side closed, and
  dragging the line opens it.
- `only="preview"` or `only="code"` shows that side alone, without the line.
- Each works the same in `@fabiocv/component-code/html`.
- Stacked on a narrow page, the line between the preview and its code can be
  dragged too, and shares their height between them.

### @fabiocv/component-code-mcp

- The same line to drag when stacked, in the chat.

### mcp-ui-tools

- The same line to drag when stacked, in the chat.

## 0.3.0 – 2026-11-18

A handle on the line between the preview and its code.

### @fabiocv/component-code

- Hovering the line shows its handle: a bar in an indent cut into the code,
  which springs in, grows a little when pressed, and grabs.
- With the code closed, the handle moves into the preview, so it stays in
  reach.
- A Preview tab cut short by a narrow preview keeps its rounded corner.
- A drag lets go however the button is released, and only the main button
  drags.
- `pnpm --filter @fabiocv/component-code dev` rebuilds on every change, for
  linking the package from a local checkout.

### @fabiocv/component-code-mcp

- The same handle, in the chat.

### mcp-ui-tools

- The same handle, in the chat.

## 0.2.2 – 2026-11-18

Draggable panels for the preview and its code.

### @fabiocv/component-code

- Drag the line between the preview and its code to resize them, or to close
  either one.

### @fabiocv/component-code-mcp

- The same panels, in the chat.

### mcp-ui-tools

- The same panels, in the chat.

## 0.2.1 – 2026-11-17

Install steps for Codex, and a way in when an app can't find `npx`.

### @fabiocv/component-code-mcp

- Codex adds it by its URL.
- An app that can't find `npx`, as when Node comes from nvm, adds the URL instead.

### @fabiocv/orbit-mcp

- The same install steps.

### mcp-ui-tools

- The same install steps.

## 0.2.0 – 2026-11-17

A keyboard-friendlier menu of a prop's options, a preview that changes its own
code, and Orbit in the right colours.

### @fabiocv/component-code

- The menu of a prop's options answers Home and End, jumps to an option by
  its first letter, and gives the focus back to the value on Escape.
- A component in the preview can change its own code. For each value the code
  sets, such as `checked={true}`, it gets a handler such as `onCheckedChange`,
  and calling it writes the new value into the code.
- Copy holds the code's top-right corner, and reset shows beside it once the
  code changes, so copy stays in one place.
- Copy sits last in the code's corner, after reset, as it shows only on hover,
  so reset and the note keep their place.

### @fabiocv/component-code-mcp

- The same menu, in the chat.
- A component the agent writes changes its code the same way, so a click in
  the preview shows in the code the agent gets. The tool asks the agent to
  write components that call these handlers.

### @fabiocv/orbit-mcp

- The game draws in the theme's colours when the chat turns dark or light after
  it loads, rather than keeping the colours it started with.
- The focus ring shows only when the game is reached with the keyboard, and
  sits inside its frame rather than past its edges.

### mcp-ui-tools

- The same menu, and the same change to the code, in the chat.
- Orbit's colours and focus ring, as above.

## 0.1.1 – 2026-11-16

Links to the new repository.

### @fabiocv/component-code

- Links to its repository, github.com/naso/mcp-ui-tools.

### @fabiocv/component-code-mcp

- Links to its repository, github.com/naso/mcp-ui-tools.

### @fabiocv/orbit-mcp

- Links to its repository, github.com/naso/mcp-ui-tools.

### mcp-ui-tools

- Links to its repository, github.com/naso/mcp-ui-tools.

## 0.1.0 – 2026-11-16

The first release: Component Code, its MCP App and Orbit.

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
