# mcp-ui-tools

MCP Apps that show UI in the chat, in Claude, ChatGPT, VS Code and other MCP
hosts. This package is one server with every tool. Each tool also installs on
its own.

| Tool                                               | What it shows                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`@fabiocv/component-code-mcp`](../component-code) | Code with live parameters that you can change and see the component update           |
| [`@fabiocv/orbit-mcp`](../orbit)                   | A one-button game to play while the agent works. Switch rings to miss the arcs ahead |

## Add it

Claude Code:

```sh
claude mcp add mcp-ui-tools -- npx -y mcp-ui-tools
```

Claude Desktop, in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-ui-tools": {
      "command": "npx",
      "args": ["-y", "mcp-ui-tools"]
    }
  }
}
```

VS Code:

```sh
code --add-mcp '{"name":"mcp-ui-tools","command":"npx","args":["-y","mcp-ui-tools"]}'
```

Codex:

```sh
codex mcp add mcp-ui-tools --url https://mcp-ui-tools.fabio.cv/mcp
```

Claude.ai, ChatGPT and other hosts that take a remote connector:

```
https://mcp-ui-tools.fabio.cv/mcp
```

If the app can't find `npx`, as when Node comes from nvm, add the URL instead.

## Licence

MIT
