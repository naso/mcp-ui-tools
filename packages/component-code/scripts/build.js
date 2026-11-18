// Bundles each entry into a minified module with its stylesheet inlined, the
// code they share in a chunk of its own, and records their sizes for the site.
// With `--watch`, it rebuilds the modules and their types on every change.
import { spawn } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build, context, transform } from 'esbuild';

const LIMIT = 22 * 1024;

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
      // esbuild keeps the spaces in custom properties and around commas.
      const tight = code
        .trim()
        .replace(/(--[\w-]+): /g, '$1:')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/,\s+/g, ',')
        // Spaces around `*` and `/` are optional, unlike `+` and `-`.
        .replace(/ ([*/]) /g, '$1');
      return { contents: tight, loader: 'text' };
    });
  },
};

const options = {
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
};

// Chunks from earlier builds would otherwise be published too.
await rm('dist', { recursive: true, force: true });

if (process.argv.includes('--watch')) {
  await (await context({ ...options, logLevel: 'info' })).watch();
  spawn(
    'tsc',
    ['-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'],
    { stdio: 'inherit' },
  );
} else {
  await report(await build(options));
}

/** Records the size of each entry with the chunks it imports. */
async function report({ metafile }) {
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
}
