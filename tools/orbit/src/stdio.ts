import { createServer } from '@fabiocv/mcp-ui-tools-core';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { version } from '../package.json';
import { register } from './index.ts';

serveStdio(() => createServer({ name: 'orbit', version }, register));
