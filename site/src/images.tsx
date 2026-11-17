import { renderToStaticMarkup } from 'react-dom/server';

import type { Page } from './pages';
import { SITE } from './pages';

/*
 * The images `scripts/images.js` draws into `public`: a share image and a
 * home-screen icon for each page, and the icons the web manifest lists.
 */

export const OG = { width: 1200, height: 630 };

/** A page's share image: its logo, name and summary, in dark. */
function OgImage({ page }: { page: Page }) {
  const { Logo, name, summary } = page;
  return (
    <div className="og">
      <div className="og-top">
        <Logo size={112} />
        <span className="og-domain">{new URL(SITE).host}</span>
      </div>
      <div>
        <h1>{name}</h1>
        <p>{summary}</p>
      </div>
    </div>
  );
}

/**
 * A page's logo filling a square, for a home screen. The ground runs to the
 * edges, since the system rounds the corners itself.
 */
function Icon({ page, size }: { page: Page; size: number }) {
  const { Logo } = page;
  return (
    <div className="icon" style={{ width: size, height: size }}>
      <Logo size={size} />
    </div>
  );
}

export const ogMarkup = (page: Page) =>
  renderToStaticMarkup(
    <div style={{ colorScheme: 'dark' }}>
      <OgImage page={page} />
    </div>,
  );

export const iconMarkup = (page: Page, size: number) =>
  renderToStaticMarkup(<Icon page={page} size={size} />);

export const imageStyles = `
html, body { margin: 0; overflow: hidden; }
body { background: var(--surface); }
.og {
  box-sizing: border-box;
  width: ${OG.width}px;
  height: ${OG.height}px;
  padding: 80px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--surface);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}
.og-top { display: flex; justify-content: space-between; align-items: flex-start; }
.og h1 {
  margin: 0;
  color: var(--foreground);
  font-size: 72px;
  line-height: 80px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.og p {
  margin: 20px 0 0;
  max-width: 880px;
  color: var(--secondary);
  font-size: 34px;
  line-height: 46px;
}
.og-domain { color: var(--muted); font: 24px/32px var(--mono); }
.icon { background: var(--disabled); }
.icon svg { display: block; }
.icon svg > rect:first-child { rx: 0; }
`;
