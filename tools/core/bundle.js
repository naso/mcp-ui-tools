// Bundles a package's stdio server into one file with no dependencies, with
// its views inlined. Run from the package's folder.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/stdio.ts'],
  outfile: 'dist/stdio.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  minify: true,
  loader: { '.html': 'text' },
  banner: {
    js: [
      '#!/usr/bin/env node',
      // Bundled CommonJS dependencies still call `require`.
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
    ].join('\n'),
  },
  logLevel: 'warning',
});
