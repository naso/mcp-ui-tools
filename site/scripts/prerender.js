// Renders each page into its own index.html, so it shows before its script
// runs.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const { render } = await import('../dist-server/server.js');
const template = await readFile('dist/index.html', 'utf8');

for (const { path, meta, head, html } of render()) {
  // Functions, so a `$` in a page is not read as a pattern.
  const page = template
    .replace(/<!--meta-->[\s\S]*<!--\/meta-->/, () => meta)
    .replace('<!--head-->', () => head)
    .replace('<!--app-->', () => html);
  await mkdir(`dist${path}`, { recursive: true });
  await writeFile(`dist${path}index.html`, page);
}
await rm('dist-server', { recursive: true });
