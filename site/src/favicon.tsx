import { renderToStaticMarkup } from 'react-dom/server';

import type { Page } from './pages';

/** The paint's grey, light and dark, as the site's `--disabled`. */
const GROUND = { light: '#a2a4ab', dark: '#5c5d63' };

/** A page's logo as a favicon, its grey following the system's theme. */
export function favicon({ Logo }: Page) {
  return `${renderToStaticMarkup(<Logo size={32} />)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(
      /(<svg[^>]*>)/,
      `$1<style>.ground { fill: ${GROUND.light} } @media (prefers-color-scheme: dark) { .ground { fill: ${GROUND.dark} } }</style>`,
    )}\n`;
}
