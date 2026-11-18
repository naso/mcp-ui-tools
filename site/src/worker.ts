import mcp from '../../tools/mcp-ui-tools/src/worker.ts';

import { drawings } from './drawings';
import type { Env as Gallery } from './drawings';

type Env = Gallery & NonNullable<Parameters<typeof mcp.fetch>[1]>;

/** The gallery's API under `/api/drawings`, and the MCP servers for the rest. */
export default {
  fetch(
    request: Request,
    env: Env,
    context?: { waitUntil(promise: Promise<unknown>): void },
  ) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/drawings' || pathname.startsWith('/api/drawings/'))
      return drawings(request, env, context);
    return mcp.fetch(request, env);
  },
};
