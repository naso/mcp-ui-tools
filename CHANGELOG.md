# Changelog

Both packages share a version. Each release lists what changed in each.

## 0.1.0 – Unreleased

### component-code

- `ComponentCode` shows a component beside the code that makes it. With
  `scope` the preview is rendered from the code, so the two cannot differ.
  `children` sets the preview for code that cannot run from its text.
- `interactive` turns each string, number, boolean and line of text in the
  code into a control: numbers drag and step with the arrow keys, booleans
  switch, and text is typed in place.
- `controls` turns a prop into options picked from a menu, or sets a number's
  range and step.
- Copy and reset, line numbers and syntax colours.
- Light and dark, from the page's `color-scheme` or from `theme`.
- `component-code/html` runs HTML, CSS and JS beside their code, with a tab
  for each file. The values named in `controls` become controls: CSS changes
  in place, and HTML and JS run the page again.

### component-code-mcp

- `show_in_component_code` shows a component in the chat in Component Code, as
  an MCP App.
- `show_html_in_component_code` shows HTML, CSS and JS running in the chat.
- Runs over stdio with `npx component-code-mcp`, and over HTTP at `/mcp`.
