import { Collapsible } from '@base-ui/react/collapsible';
import { Menu } from '@base-ui/react/menu';
import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { AddToAgent, Code } from './blocks';
import { Graffiti, graffitiHeight } from './graffiti';
import { clients, GITHUB, installPrompt, PAGES } from './pages';
import type { Page } from './pages';

/** What the graffiti by the opening says. */
const GRAFFITI = 'of dubious\nutility';

/** The arrow beside a menu or a section's toggle, which turns over when open. */
export function Chevron() {
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
 * tool. Base UI's menu moves focus into it, steps through it with the arrow
 * keys, and closes it on Escape or a click outside.
 */
function Switcher({ page }: { page: Page }) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className="switcher"
        aria-label={`${page.name}, switch page`}
      >
        <page.Logo />
        {page.name}
        <Chevron />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="menu-positioner"
          align="start"
          alignOffset={-4}
          sideOffset={4}
        >
          <Menu.Popup className="menu">
            {PAGES.map(({ id, name, path, summary, Logo }) => (
              <Menu.LinkItem
                key={id}
                href={path}
                aria-current={id === page.id ? 'page' : undefined}
              >
                <Logo size={32} />
                <span>
                  <b>{name}</b>
                  {summary}
                </span>
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * The section a path names below its page, such as `install` for `/install`
 * or `play` for `/orbit/play`.
 */
const sectionAt = (page: Page, path: string) =>
  path.startsWith(page.path)
    ? path.slice(page.path.length).replace(/(\.html|\/)$/, '')
    : '';

/** Scrolls to the section the address names, or to the top. */
function scrollToSection(page: Page, behavior: ScrollBehavior) {
  const id = sectionAt(page, location.pathname);
  const target = id && document.getElementById(id);
  if (target) target.scrollIntoView({ behavior });
  else if (!id) window.scrollTo({ top: 0, behavior });
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
  // A section's own address, such as `/install`, opens the page there, and
  // back and forward move between sections.
  useEffect(() => {
    if (sectionAt(page, location.pathname)) scrollToSection(page, 'instant');
    const move = () => scrollToSection(page, 'smooth');
    window.addEventListener('popstate', move);
    return () => window.removeEventListener('popstate', move);
  }, [page]);

  return (
    <div
      className="page"
      style={{ '--graffiti': `${graffitiHeight(GRAFFITI)}px` } as CSSProperties}
    >
      <div className="edge" aria-hidden>
        <div className="edge-ground" />
        <div className="edge-wide" />
        <div className="edge-sharp" />
        <div className="edge-sharp" />
        <div className="edge-sharp" />
        <div className="edge-sharp" />
      </div>
      <Graffiti text={GRAFFITI} />
      <header className="top">
        <Switcher page={page} />
        <nav className="links">
          {links.map(({ id, label, wide }) => (
            <a
              key={id}
              href={`${page.path}${id}`}
              className={wide ? 'wide' : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                history.pushState(null, '', event.currentTarget.href);
                scrollToSection(page, 'smooth');
              }}
            >
              {label}
            </a>
          ))}
          <a href={GITHUB}>GitHub</a>
        </nav>
      </header>

      <main>{children}</main>

      <footer>
        <span>
          MIT licence. Hallucinated by <a href="https://fabio.cv">Fabio</a>.
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
 * How to add an MCP server: a button that copies a prompt for a coding agent.
 * Manually opens each client's command or config and the URL for remote
 * connectors.
 */
export function Clients(props: Parameters<typeof clients>[0]) {
  return (
    <div className="clients">
      <Collapsible.Root>
        <div className="installs">
          <AddToAgent prompt={installPrompt(props)} />
          <Collapsible.Trigger className="manual">
            Manually
            <Chevron />
          </Collapsible.Trigger>
        </div>
        {/* Find in page opens it to show a match. */}
        <Collapsible.Panel className="clients manual-panel" hiddenUntilFound>
          {clients(props).map(({ name, code }) => (
            <Code key={name} name={name} code={code} />
          ))}
          <Code
            name="Claude.ai, ChatGPT and other remote connectors"
            code={props.remote}
            plain
          />
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}
