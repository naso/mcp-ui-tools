import { Popover } from '@base-ui/react/popover';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { LONGEST_NAME } from './drawings';
import type { Drawing } from './drawings';

/** The gallery's API, which the site's Worker answers. */
const API = '/api/drawings';

/** Where the name last given is kept, to give it again next time. */
const NAME = 'wall:name';

const remembered = () => {
  try {
    return localStorage.getItem(NAME) ?? '';
  } catch {
    return '';
  }
};

const remember = (name: string) => {
  try {
    localStorage.setItem(NAME, name);
  } catch {
    // Kept for this time only, where the frame may not store anything.
  }
};

/** What to say when the drawing doesn't reach the gallery. */
const UNSAVED = "It didn't save. Try again.";

/**
 * Save's popup, above its button: a field for the painter's name, and the
 * button that sends the wall to the gallery as `picture` draws it.
 */
export function SavePopup({
  picture,
  onSaved,
}: {
  picture: () => Promise<Blob>;
  onSaved: (drawing: Drawing) => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(remembered);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const given = name.trim();
    if (!given || sending) return;
    setSending(true);
    setError(undefined);
    let problem = UNSAVED;
    try {
      const form = new FormData();
      form.set('name', given);
      form.set('image', await picture(), 'drawing');
      const response = await fetch(API, { method: 'POST', body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        problem = body.error ?? UNSAVED;
        throw new Error(problem);
      }
      onSaved(body);
    } catch {
      setError(problem);
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover.Portal>
      <Popover.Positioner side="top" sideOffset={8} className="tip-place">
        <Popover.Popup className="save" initialFocus={field}>
          <form onSubmit={submit}>
            <input
              ref={field}
              name="name"
              aria-label="Your name"
              placeholder="Your name"
              autoComplete="nickname"
              enterKeyHint="send"
              maxLength={LONGEST_NAME}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                remember(event.target.value);
              }}
            />
            <button
              type="submit"
              className="pick"
              disabled={sending || !name.trim()}
            >
              {sending ? 'Saving…' : 'Save'}
            </button>
          </form>
          {error && (
            <p className="save-error" role="alert">
              {error}
            </p>
          )}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}

/**
 * The drawings saved from the wall, newest first, over the whole wall, which
 * stays as it was underneath. Each page loads as the end of the last comes
 * into view. Escape, or the corner's button, goes back to the wall.
 */
export function Gallery({ onClose }: { onClose: () => void }) {
  const self = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  /** The cursor to the next page, or null at the last. */
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  /** A page of drawings: the first, or the one from before `before`. */
  const load = async (before?: string) => {
    if (busy.current) return;
    busy.current = true;
    setState('loading');
    try {
      const response = await fetch(
        before ? `${API}?before=${encodeURIComponent(before)}` : API,
      );
      if (!response.ok) throw new Error();
      const page: { drawings: Drawing[]; next: string | null } =
        await response.json();
      setDrawings((list) =>
        before ? [...list, ...page.drawings] : page.drawings,
      );
      setNext(page.next);
      setState('ready');
    } catch {
      setState('failed');
    } finally {
      busy.current = false;
    }
  };

  // The gallery takes the focus, so Tab goes on through it, without a ring
  // on its first button for a key pressed before it opened.
  useEffect(() => {
    self.current?.focus();
    load();
  }, []);

  // The next page, a little before the end of this one comes into view.
  useEffect(() => {
    if (!next || state !== 'ready') return;
    const watch = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && load(next),
      { root: end.current!.parentElement, rootMargin: '200px' },
    );
    watch.observe(end.current!);
    return () => watch.disconnect();
  }, [next, state]);

  useEffect(() => {
    const press = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', press);
    return () => window.removeEventListener('keydown', press);
  }, [onClose]);

  return (
    <section ref={self} className="gallery" aria-label="Gallery" tabIndex={-1}>
      <div className="tab">Gallery</div>
      <div className="copy">
        <button type="button" aria-label="Back to the wall" onClick={onClose}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
        </button>
      </div>
      <div className="gallery-list">
        {drawings.length > 0 && (
          <ul className="gallery-grid">
            {drawings.map(({ id, name }) => (
              <li key={id}>
                <img src={`${API}/${id}`} alt={`By ${name}`} loading="lazy" />
                <span aria-hidden>{name}</span>
              </li>
            ))}
          </ul>
        )}
        {state === 'loading' && !drawings.length && (
          <p className="gallery-note">Loading…</p>
        )}
        {state === 'ready' && !drawings.length && (
          <p className="gallery-note">
            Nothing here yet. Paint something and save it.
          </p>
        )}
        {state === 'failed' && (
          <p className="gallery-note">
            The gallery didn't load.{' '}
            <button
              type="button"
              className="pick"
              onClick={() => load(next ?? undefined)}
            >
              Try again
            </button>
          </p>
        )}
        <div ref={end} className="gallery-end" />
      </div>
    </section>
  );
}
