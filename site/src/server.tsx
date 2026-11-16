import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';

import { styles } from 'component-code';
import { styles as pageStyles } from 'component-code/html';

import { App } from './App';

/** The page as HTML, and the components' stylesheets for its head. */
export function render() {
  return {
    html: renderToString(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
    head: `<style id="component-code">${styles}</style><style id="component-code-html">${pageStyles}</style>`,
  };
}
