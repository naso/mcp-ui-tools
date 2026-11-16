import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/server';

import { FONT_ORIGIN } from './fonts.ts';

export { FONT_ORIGIN };

/** What a tool package adds to a server: its tools and their views. */
export type Register = (server: McpServer) => void;

/** A server with the tools of each package passed in. */
export function createServer(
  info: { name: string; version: string },
  ...registers: Register[]
) {
  const server = new McpServer(info);
  for (const register of registers) register(server);
  return server;
}

/**
 * A view: one HTML file the host shows in a sandboxed frame, which may load
 * fonts from `FONT_ORIGIN`.
 */
export function addView(
  server: McpServer,
  view: { uri: string; name: string; description: string; html: string },
) {
  registerAppResource(
    server,
    view.name,
    view.uri,
    { description: view.description },
    () => ({
      contents: [
        {
          uri: view.uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: view.html,
          _meta: { ui: { csp: { resourceDomains: [FONT_ORIGIN] } } },
        },
      ],
    }),
  );
}
