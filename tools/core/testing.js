import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

/**
 * Starts a package's built server, initialises it, and answers each request
 * with its reply.
 */
export async function connect() {
  const server = spawn(process.execPath, ['dist/stdio.js']);
  const replies = new Map();
  createInterface({ input: server.stdout }).on('line', (line) => {
    const message = JSON.parse(line);
    replies.get(message.id)?.(message);
  });
  let id = 0;
  const send = (method, params) =>
    new Promise((resolve) => {
      replies.set(++id, resolve);
      server.stdin.write(
        `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`,
      );
    });
  await send('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '0' },
  });
  return { send, close: () => server.kill() };
}
