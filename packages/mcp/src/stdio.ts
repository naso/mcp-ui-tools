import { serveStdio } from '@modelcontextprotocol/server/stdio';

import html from '../dist/preview.html';
import { createServer } from './server.ts';

serveStdio(() => createServer(html));
