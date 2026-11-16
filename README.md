# Component Code

A React component beside the code that makes it, where every value in the code
is a control. In your chat as an MCP App, and in your Storybook and docs.

https://componentcode.fabio.cv

| Folder                    | What it is                                                 |
| ------------------------- | ---------------------------------------------------------- |
| `packages/component-code` | [`component-code`](packages/component-code), the component |
| `packages/mcp`            | [`component-code-mcp`](packages/mcp), the MCP App          |
| `site`                    | The website, which also serves the MCP App at `/mcp`       |

## Develop

On Node 24 with pnpm:

```sh
pnpm install
pnpm dev          # the website at http://localhost:5173
pnpm test
pnpm check-types
```

`pnpm --filter component-code-mcp host` serves a stand-in chat host that loads
the built preview under the default security policy of MCP Apps and sends it a
tool call. Build the package first with `pnpm build`.

Both entries, `component-code` and `component-code/html`, must stay under 20 kB
minified, each counted with the chunk they share. The build fails past that and
writes their sizes to `dist/size.json`, which the website shows.

## Release

Both packages share a version.

1. Add the release to `CHANGELOG.md`, and set the version in both
   `package.json` files.
2. `pnpm build && pnpm test`
3. `pnpm --filter component-code publish` and
   `pnpm --filter component-code-mcp publish`
4. `pnpm --filter site deploy` publishes the website and the hosted MCP App
   to Cloudflare Workers.

## Licence

MIT
