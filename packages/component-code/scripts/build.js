// Bundles each entry into a minified module with its stylesheet inlined, the
// code they share in a chunk of its own, and records their sizes for the site.
import { readFile, writeFile } from 'node:fs/promises';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build, transform } from 'esbuild';

const LIMIT = 20 * 1024;

const inlineCss = {
  name: 'inline-css',
  setup(build) {
    build.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
      path: new URL(
        args.path.replace('?inline', ''),
        `file://${args.resolveDir}/`,
      ).pathname,
      namespace: 'inline-css',
    }));
    build.onLoad({ filter: /.*/, namespace: 'inline-css' }, async (args) => {
      const css = await readFile(args.path, 'utf8');
      const { code } = await transform(css, { loader: 'css', minify: true });
      return { contents: code.trim(), loader: 'text' };
    });
  },
};

const { metafile } = await build({
  entryPoints: { index: 'src/index.ts', html: 'src/html/index.ts' },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  metafile: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  banner: { js: "'use client';" },
  plugins: [inlineCss],
  logLevel: 'warning',
});

/** An output with each chunk it imports, as one file. */
async function files(output, seen = new Set()) {
  seen.add(output);
  const parts = [await readFile(output)];
  for (const { path } of metafile.outputs[output].imports) {
    if (path.startsWith('dist/') && !seen.has(path)) {
      parts.push(...(await files(path, seen)));
    }
  }
  return parts;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
const sizes = {};
for (const name of ['index', 'html']) {
  const code = Buffer.concat(await files(`dist/${name}.js`));
  const size = {
    minified: code.length,
    gzip: gzipSync(code, { level: 9 }).length,
    brotli: brotliCompressSync(code).length,
  };
  sizes[name] = size;
  console.log(
    `${name}  ${kb(size.minified)} minified, ${kb(size.gzip)} gzip, ${kb(size.brotli)} brotli`,
  );
  if (size.minified > LIMIT) {
    console.error(`${name} is over the ${kb(LIMIT)} limit.`);
    process.exitCode = 1;
  }
}
await writeFile('dist/size.json', `${JSON.stringify(sizes)}\n`);
