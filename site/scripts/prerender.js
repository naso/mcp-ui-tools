// Renders the page into the built index.html, so it shows before its script
// runs.
import { readFile, rm, writeFile } from 'node:fs/promises';

const { render } = await import('../dist-server/server.js');
const { html, head } = render();

const page = await readFile('dist/index.html', 'utf8');
await writeFile(
  'dist/index.html',
  page.replace('<!--head-->', head).replace('<!--app-->', html),
);
await rm('dist-server', { recursive: true });
