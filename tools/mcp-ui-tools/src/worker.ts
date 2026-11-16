import { register as componentCode } from '@fabiocv/component-code-mcp/src/index.ts';
import { createServer } from '@fabiocv/mcp-ui-tools-core';
import type { Register } from '@fabiocv/mcp-ui-tools-core';
import { register as orbit } from '@fabiocv/orbit-mcp/src/index.ts';
import { createMcpHandler } from '@modelcontextprotocol/server';

import { version } from '../package.json';

const handler = (name: string, ...registers: Register[]) =>
  createMcpHandler(() => createServer({ name, version }, ...registers));

/** Every tool at `/mcp`, and each tool on its own under its page's path. */
const HANDLERS: Record<string, ReturnType<typeof createMcpHandler>> = {
  '/mcp': handler('mcp-ui-tools', componentCode, orbit),
  '/component-code/mcp': handler('component-code', componentCode),
  '/orbit/mcp': handler('orbit', orbit),
};

/** The site's static files, when the worker runs beside them. */
type Env = { ASSETS?: { fetch(request: Request): Promise<Response> } };

/**
 * Serves MCP over HTTP. Static assets answer everything else, and a browser
 * opening a tool's `/mcp` gets that section of its page.
 */
export default {
  fetch(request: Request, env: Env = {}) {
    const handler = HANDLERS[new URL(request.url).pathname];
    const page =
      request.method === 'GET' &&
      request.headers.get('accept')?.includes('text/html');
    if (handler && page && env.ASSETS) return env.ASSETS.fetch(request);
    return handler
      ? handler.fetch(request)
      : new Response('Not found', { status: 404 });
  },
};
