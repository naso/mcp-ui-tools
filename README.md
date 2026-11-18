# mcp-ui-tools

MCP Apps that show UI in your chat, and `@fabiocv/component-code`, the React
component behind Component Code, for your Storybook and docs. `mcp-ui-tools`
installs every tool, and the rest are under the `@fabiocv` scope on npm.

https://mcp-ui-tools.fabio.cv

| Folder                    | What it is                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `packages/component-code` | [`@fabiocv/component-code`](packages/component-code), the component                 |
| `tools/component-code`    | [`@fabiocv/component-code-mcp`](tools/component-code), Component Code as an MCP App |
| `tools/orbit`             | [`@fabiocv/orbit-mcp`](tools/orbit), a game to play while the agent works           |
| `tools/mcp-ui-tools`      | [`mcp-ui-tools`](tools/mcp-ui-tools), every tool in one server, and the test host   |
| `tools/core`              | What the tools share, bundled into each, so it is not published                     |
| `site`                    | The website: a home page and a page per tool, which also serves the MCP Apps        |

Each MCP tool is its own package, so it installs on its own. `mcp-ui-tools`
installs them all as one server. A new tool goes in `tools/`, exports a
`register` function, and is added to `mcp-ui-tools`, to its server and its
worker. Its page on the site, with its logo, is listed in `site/src/pages.ts`.

## Develop

On Node 24 with pnpm:

```sh
pnpm install
pnpm dev          # the website at http://localhost:5173
pnpm test
pnpm check-types
```

`pnpm --filter mcp-ui-tools host` serves a stand-in chat host that loads each
built view under the default security policy of MCP Apps and sends it a tool
call: Component Code at `/` and Orbit at `/orbit.html`. Build the packages first
with `pnpm build`.

Both entries, `@fabiocv/component-code` and `@fabiocv/component-code/html`, must
stay under 22 kB minified, each counted with the chunk they share. The build
fails past that and writes their sizes to `dist/size.json`, which the website
shows.

## Release

Every package shares a version.

1. Add the release to `CHANGELOG.md`, with a line on what it brings, and set
   the version in every `package.json` file.
2. `pnpm build && pnpm test`
3. `pnpm --filter @fabiocv/component-code publish` and
   `pnpm --filter "./tools/*" publish`, which skips the private core.
4. `pnpm --filter site deploy` publishes the website and the hosted MCP Apps to
   Cloudflare Workers.

## Licence

MIT
