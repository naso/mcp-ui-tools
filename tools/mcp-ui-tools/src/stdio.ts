import { register as componentCode } from '@fabiocv/component-code-mcp/src/index.ts';
import { createServer } from '@fabiocv/mcp-ui-tools-core';
import { register as orbit } from '@fabiocv/orbit-mcp/src/index.ts';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { version } from '../package.json';

serveStdio(() =>
  createServer({ name: 'mcp-ui-tools', version }, componentCode, orbit),
);
