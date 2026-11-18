// Takes drawings out of the gallery, by their id or their image's URL, and
// stops their images being served:
//
//   pnpm --filter site hide <id or URL> [...]
//
// `--local` hides them in the database `pnpm --filter site api` uses.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const local = args.includes('--local');
const ids = args
  .filter((arg) => arg !== '--local')
  .map(
    (arg) =>
      arg
        .replace(/[?#].*$/, '')
        .split('/')
        .filter(Boolean)
        .at(-1) ?? '',
  );

if (!ids.length || ids.some((id) => !/^[0-9a-f]{16}$/.test(id))) {
  console.error('Usage: pnpm --filter site hide <id or image URL> [...]');
  process.exit(1);
}

execFileSync(
  'wrangler',
  [
    'd1',
    'execute',
    'gallery',
    local ? '--local' : '--remote',
    '--command',
    `UPDATE drawings SET hidden = 1 WHERE id IN (${ids.map((id) => `'${id}'`).join(', ')})`,
  ],
  { stdio: 'inherit' },
);
