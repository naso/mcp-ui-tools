import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';

import { styles } from '@fabiocv/component-code';
import { styles as pageStyles } from '@fabiocv/component-code/html';

import { App } from './App';
import { OG } from './images';
import { PAGES, SITE } from './pages';

export { SITE };

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Each page as HTML, with its meta and the components' stylesheets. */
export function render() {
  return PAGES.map((page) => ({
    path: page.path,
    meta: [
      `<title>${escape(page.name)}</title>`,
      `<meta name="description" content="${escape(page.summary)}" />`,
      `<meta property="og:title" content="${escape(page.name)}" />`,
      `<meta property="og:description" content="${escape(page.summary)}" />`,
      `<meta property="og:url" content="${SITE}${page.path}" />`,
      `<meta property="og:image" content="${SITE}/og/${page.id}.png" />`,
      `<meta property="og:image:width" content="${OG.width}" />`,
      `<meta property="og:image:height" content="${OG.height}" />`,
      `<meta property="og:image:alt" content="${escape(`${page.name}: ${page.summary}`)}" />`,
      `<link rel="canonical" href="${SITE}${page.path}" />`,
      `<link rel="icon" href="${page.icon}" type="image/svg+xml" />`,
      `<link rel="apple-touch-icon" href="/icons/${page.id}-180.png" />`,
    ].join('\n    '),
    head: `<style id="component-code">${styles}</style><style id="component-code-html">${pageStyles}</style>`,
    html: renderToString(
      <StrictMode>
        <App page={page.id} />
      </StrictMode>,
    ),
  }));
}
