# @fabiocv/component-code-mcp

An MCP App that shows a React component in the chat in Component Code: a live
preview beside the code that uses it, where every value is a control.

It is one of the [`mcp-ui-tools`](../mcp-ui-tools), and installs on its own or
with the others.

Ask your agent for a component and say "show it in Component Code".

## Add it

Claude Code:

```sh
claude mcp add component-code -- npx -y @fabiocv/component-code-mcp
```

Claude Desktop, in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "component-code": {
      "command": "npx",
      "args": ["-y", "@fabiocv/component-code-mcp"]
    }
  }
}
```

VS Code:

```sh
code --add-mcp '{"name":"component-code","command":"npx","args":["-y","@fabiocv/component-code-mcp"]}'
```

Claude.ai, ChatGPT and other hosts that take a remote connector:

```
https://mcp-ui-tools.fabio.cv/component-code/mcp
```

## The tool

`show_in_component_code`, titled Show in Component Code, takes:

| Input      | What it is                                                                               |
| ---------- | ---------------------------------------------------------------------------------------- |
| `source`   | The component's module in TSX. It may import only from `react`.                          |
| `code`     | How it is used, in JSX: elements, props and text, with no hooks, calls or conditions.    |
| `file`     | The file named in the code's tab.                                                        |
| `controls` | How a prop is changed: a list of options, `{ min, max, step }` for a number, or `false`. |

The exports of `source` are what `code` can name, and a default export goes in
under its function's name. A component keeps any state inside itself, so `code`
stays plain JSX.

`show_html_in_component_code`, titled Show HTML in Component Code, takes:

| Input      | What it is                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `files`    | The files by name, such as `index.html`, `style.css` and `script.js`, each in its own tab. They run together as one page.       |
| `controls` | The values the reader can change: an attribute, a CSS property or custom property, or a JS `const`. `true`, options or a range. |

## How it runs

- The preview is one HTML file with React, Component Code and Sucrase. The host
  shows it in a sandboxed frame.
- Hosts allow inline scripts but not `eval`, so the preview compiles `source`
  with Sucrase and runs it as a script element.
- It loads Geist from jsDelivr, which the resource declares. Everything else is
  in the file.
- It follows the host's light or dark theme.
- A module that fails to compile, imports anything but `react` or throws shows
  why in place of the preview.
- A page runs in a sandboxed frame inside the preview, under the host's rules,
  so it cannot load anything from the network.

## Licence

MIT
