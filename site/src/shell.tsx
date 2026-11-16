import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Code, Prompt } from './blocks';
import {
  clients,
  GITHUB,
  installLinks,
  installPrompt,
  PAGES,
} from './pages';
import type { Page } from './pages';

/** The arrow beside a `summary`, which turns over when it opens. */
function Chevron() {
  return (
    <svg
      className="chevron"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

/**
 * The logo and the page's name, which open a menu of the home page and each
 * tool. It is a `details`, so it opens before the script runs.
 */
function Switcher({ page }: { page: Page }) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (event: Event) => {
      const details = menu.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return;
        details.open = false;
        details.querySelector('summary')?.focus();
      } else if (!details.contains(event.target as Node)) {
        details.open = false;
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  return (
    <details className="switcher" ref={menu}>
      <summary aria-label={`${page.name}, switch page`}>
        <page.Logo />
        {page.name}
        <Chevron />
      </summary>
      <nav className="menu">
        {PAGES.map(({ id, name, path, summary, Logo }) => (
          <a
            key={id}
            href={path}
            aria-current={id === page.id ? 'page' : undefined}
          >
            <Logo size={32} />
            <span>
              <b>{name}</b>
              {summary}
            </span>
          </a>
        ))}
      </nav>
    </details>
  );
}

/** A page of the site: its header, its content and the footer. */
export function Shell({
  page,
  links,
  npm,
  children,
}: {
  page: Page;
  /** The page's sections, by id, and its label. `wide` ones hide on phones. */
  links: { id: string; label: string; wide?: boolean }[];
  /** The npm package the footer links to. */
  npm: string;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <div className="edge" aria-hidden>
        <div className="edge-ground" />
        <div className="edge-wide" />
        <div className="edge-sharp" />
        <div className="edge-sharp" />
        <div className="edge-sharp" />
        <div className="edge-sharp" />
      </div>
      <header className="top">
        <Switcher page={page} />
        <nav className="links">
          {links.map(({ id, label, wide }) => (
            <a key={id} href={`#${id}`} className={wide ? 'wide' : undefined}>
              {label}
            </a>
          ))}
          <a href={GITHUB}>GitHub</a>
        </nav>
      </header>

      <main>{children}</main>

      <footer>
        <span>
          MIT licence. Made by <a href="https://fabio.cv">Fabio Azevedo</a>.
        </span>
        <nav>
          <a href={GITHUB}>GitHub</a>
          <a href={`https://www.npmjs.com/package/${npm}`}>npm</a>
        </nav>
      </footer>
    </div>
  );
}

/**
 * How to add an MCP server: a prompt for a coding agent and buttons for the
 * apps that take a link. Manually opens each client's command or config and
 * the URL for remote connectors.
 */
export function Clients(props: Parameters<typeof clients>[0]) {
  const [manual, setManual] = useState(false);
  return (
    <div className="clients">
      <Prompt>{installPrompt(props)}</Prompt>
      <div className="installs">
        {installLinks(props).map(({ name, href, icon }) => (
          <a key={name} className="install" href={href}>
            <svg
              width="16"
              height="16"
              viewBox={icon.viewBox}
              fill="currentColor"
              aria-hidden
            >
              <path d={icon.d} />
            </svg>
            {name}
          </a>
        ))}
        <button
          type="button"
          className="manual"
          aria-expanded={manual}
          aria-controls={`manual-${props.name}`}
          onClick={() => setManual(!manual)}
        >
          Manually
          <Chevron />
        </button>
      </div>
      <div className="clients" id={`manual-${props.name}`} hidden={!manual}>
        {clients(props).map(({ name, code }) => (
          <Code key={name} name={name} code={code} />
        ))}
        <Code
          name="Claude.ai, ChatGPT and other remote connectors"
          code={props.remote}
          plain
        />
      </div>
    </div>
  );
}
