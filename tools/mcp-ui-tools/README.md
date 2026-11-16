# mcp-ui-tools

MCP Apps that show UI in the chat, in Claude, ChatGPT, VS Code and other MCP
hosts. This package is one server with every tool. Each tool also installs on
its own.

| Tool                                               | What it shows                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| [`@fabiocv/component-code-mcp`](../component-code) | A React component or a page beside its code, every value a control |
| [`@fabiocv/orbit-mcp`](../orbit)                   | A one-button game to play while the agent works                    |

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

Claude.ai, ChatGPT and other hosts that take a remote connector:

```
https://mcp-ui-tools.fabio.cv/mcp
```

## Licence

MIT
