import { createMcpHandler } from '@modelcontextprotocol/server';

import html from '../dist/preview.html';
import { createServer } from './server.ts';

const handler = createMcpHandler(() => createServer(html));

/** Serves MCP over HTTP at `/mcp`. Static assets answer everything else. */
export default {
  fetch(request: Request) {
    return new URL(request.url).pathname === '/mcp'
      ? handler.fetch(request)
      : new Response('Not found', { status: 404 });
  },
};
