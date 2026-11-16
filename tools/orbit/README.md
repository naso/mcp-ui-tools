# @fabiocv/orbit-mcp

An MCP App that shows Orbit in the chat: a one-button game to play while the
agent works.

It is one of the [`mcp-ui-tools`](../mcp-ui-tools), and installs on its own or
with the others.

Ask your agent for a game while it works, such as "give me something to play
while you build this".

## Add it

Claude Code:

```sh
claude mcp add orbit -- npx -y @fabiocv/orbit-mcp
```

Claude Desktop, in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "orbit": {
      "command": "npx",
      "args": ["-y", "@fabiocv/orbit-mcp"]
    }
  }
}
```

VS Code:

```sh
code --add-mcp '{"name":"orbit","command":"npx","args":["-y","@fabiocv/orbit-mcp"]}'
```

Claude.ai, ChatGPT and other hosts that take a remote connector:

```
https://mcp-ui-tools.fabio.cv/orbit/mcp
```

## The tool

`play_while_you_wait`, titled Play while you wait, takes no input. It returns at
once and the game keeps running, so the agent carries on with the task.

## How to play

A dot circles two rings. Tap, click or press space to move it to the other ring
and miss the arcs ahead. Each arc passed scores a point, and the dot speeds up.

## How it runs

- The game is one HTML file with a canvas. The host shows it in a sandboxed
  frame.
- It loads Geist Mono from jsDelivr, which the resource declares.
- It follows the host's light or dark theme.
- It keeps the best score where the host lets the frame store it.
- The host does not tell an MCP App when the agent finishes, so the game cannot
  say the answer is ready.

## Licence

MIT
