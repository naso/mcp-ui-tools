/*
 * The drawings saved from the wall on X: each image in R2, and its name and
 * when it was saved in D1, for the gallery to list, newest first.
 *
 *   GET  /api/drawings              a page of them, the cursor to the next, and
 *                                   on the first, how many there are
 *   POST /api/drawings              a form with `image` and `name`
 *   GET  /api/drawings/<id>         the image
 *
 * A drawing shows as soon as it is saved. `pnpm --filter site hide <id>`
 * takes one out of the gallery and stops its image being served.
 */

/** What the API uses of R2, D1 and the rate limiter. */
type Bucket = {
  put(
    key: string,
    value: ArrayBuffer,
    options: { httpMetadata: { contentType: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream } | null>;
};

type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type Limiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type Env = {
  DB: { prepare(query: string): Statement };
  DRAWINGS: Bucket;
  /** How often one address may save. Left out, it may save as often as it likes. */
  SAVES?: Limiter;
};

/** A drawing as the gallery lists it. */
export type Drawing = { id: string; name: string; created: number };

/** The most an image may weigh, in bytes. */
const HEAVIEST = 2_000_000;

/** The longest name, in characters. */
export const LONGEST_NAME = 40;

/** How many drawings a page of the gallery has. */
const PAGE = 24;

/** A drawing's id: 16 hex digits. */
const ID = /^[0-9a-f]{16}$/;

/** The gallery is public, so a page anywhere, and the player however X frames it, may read it. */
const OPEN = { 'access-control-allow-origin': '*' };

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { ...OPEN, 'cache-control': 'no-store' },
  });

const fail = (status: number, error: string) => json({ error }, status);

/** The image type, by the bytes it starts with: what a canvas saves as. */
function typeOf(bytes: Uint8Array) {
  const at = (offset: number, ...values: number[]) =>
    values.every((value, index) => bytes[offset + index] === value);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50))
    return 'image/webp';
}

/**
 * A name as the gallery shows it: on one line, without control characters or
 * the ones that turn text around, and no longer than `LONGEST_NAME`.
 */
export const clean = (name: unknown) =>
  [
    ...String(name ?? '')
      .replace(/[\p{Cc}‪-‮⁦-⁩]/gu, '')
      .replace(/\s+/g, ' ')
      .trim(),
  ]
    .slice(0, LONGEST_NAME)
    .join('')
    .trim();

/**
 * A page of drawings, newest first, from before `before` when it's given.
 * The first page also says how many the gallery has.
 */
async function list(url: URL, env: Env) {
  const before = url.searchParams.get('before');
  const [created, id] = before?.split('.') ?? [];
  if (before && !(/^\d+$/.test(created) && ID.test(id ?? '')))
    return fail(400, 'That cursor is not one the gallery gave.');
  const { results } = await (
    before
      ? env.DB.prepare(
          `SELECT id, name, created FROM drawings
           WHERE hidden = 0 AND (created < ?1 OR (created = ?1 AND id < ?2))
           ORDER BY created DESC, id DESC LIMIT ?3`,
        ).bind(Number(created), id, PAGE + 1)
      : env.DB.prepare(
          `SELECT id, name, created FROM drawings WHERE hidden = 0
           ORDER BY created DESC, id DESC LIMIT ?1`,
        ).bind(PAGE + 1)
  ).all<Drawing>();
  const drawings = results.slice(0, PAGE);
  const last = drawings.at(-1);
  const count = before
    ? undefined
    : (
        await env.DB.prepare(
          'SELECT COUNT(*) AS count FROM drawings WHERE hidden = 0',
        ).first<{ count: number }>()
      )?.count;
  return json({
    drawings,
    next: results.length > PAGE && last ? `${last.created}.${last.id}` : null,
    count,
  });
}

/** Keeps a drawing, from a form with its `image` and the painter's `name`. */
async function save(request: Request, env: Env) {
  const address = request.headers.get('cf-connecting-ip') ?? 'local';
  if (env.SAVES && !(await env.SAVES.limit({ key: address })).success)
    return fail(429, 'Too many saves at once. Try again in a minute.');
  if (Number(request.headers.get('content-length')) > HEAVIEST + 64_000)
    return fail(413, 'The drawing is too large.');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'Send the drawing as a form.');
  }
  const name = clean(form.get('name'));
  const image = form.get('image');
  if (!name) return fail(400, 'Give a name to save it under.');
  if (!image || typeof image === 'string')
    return fail(400, 'Send the drawing as `image`.');
  if (image.size > HEAVIEST) return fail(413, 'The drawing is too large.');

  const bytes = await image.arrayBuffer();
  const type = typeOf(new Uint8Array(bytes).subarray(0, 12));
  if (!type) return fail(415, 'The drawing must be a PNG, JPEG or WebP.');

  const id = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
  const created = Date.now();
  await env.DRAWINGS.put(`drawings/${id}`, bytes, {
    httpMetadata: { contentType: type },
  });
  await env.DB.prepare(
    'INSERT INTO drawings (id, name, type, created) VALUES (?1, ?2, ?3, ?4)',
  )
    .bind(id, name, type, created)
    .run();
  return json({ id, name, created } satisfies Drawing, 201);
}

/** A drawing's image, unless it has been hidden. */
async function image(id: string, env: Env) {
  const missing = () =>
    new Response('Not found', { status: 404, headers: OPEN });
  if (!ID.test(id)) return missing();
  const row = await env.DB.prepare(
    'SELECT type FROM drawings WHERE id = ?1 AND hidden = 0',
  )
    .bind(id)
    .first<{ type: string }>();
  const object = row && (await env.DRAWINGS.get(`drawings/${id}`));
  if (!row || !object) return missing();
  return new Response(object.body, {
    headers: {
      ...OPEN,
      'content-type': row.type,
      'x-content-type-options': 'nosniff',
      // Not for long, so one that is hidden soon stops showing.
      'cache-control': 'public, max-age=3600',
    },
  });
}

/** Answers the paths under `/api/drawings`. */
export function drawings(request: Request, env: Env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/')[3];
  if (id === undefined || id === '') {
    if (request.method === 'GET') return list(url, env);
    if (request.method === 'POST') return save(request, env);
  } else if (request.method === 'GET') return image(id, env);
  return fail(405, 'Not something the gallery does.');
}
