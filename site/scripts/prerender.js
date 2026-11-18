// Renders each page into its own index.html, so it shows before its script
// runs, and a copy for each of its sections.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const { render, SITE } = await import('../dist-server/server.js');
const template = await readFile('dist/index.html', 'utf8');
const pages = render();
const listed = pages.filter(({ hidden }) => !hidden);

// The pages, without their sections' copies, which point to the page as
// canonical.
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${listed.map(({ path }) => `  <url><loc>${SITE}${path}</loc></url>`).join('\n')}
</urlset>
`,
);

for (const { path, meta, head, html } of pages) {
  // Functions, so a `$` in a page is not read as a pattern.
  const page = template
    .replace(/<!--meta-->[\s\S]*<!--\/meta-->/, () => meta)
    .replace('<!--head-->', () => head)
    .replace('<!--app-->', () => html);
  await mkdir(`dist${path}`, { recursive: true });
  await writeFile(`dist${path}index.html`, page);

  // Each section the header links to has its own address, such as
  // `/install`, which opens the same page there.
  const links = html.match(/<nav class="links">[\s\S]*?<\/nav>/)?.[0] ?? '';
  for (const [, section] of links.matchAll(/href="(\/[^"]+[^/])"/g)) {
    await writeFile(`dist${section}.html`, page);
  }
}
await rm('dist-server', { recursive: true });
