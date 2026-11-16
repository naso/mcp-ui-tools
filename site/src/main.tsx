import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import { App } from './App';
import { pageAt } from './pages';

import './site.css';

const page = pageAt(location.pathname);
const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App page={page.id} />
  </StrictMode>
);

// The build renders each page ahead of time; the dev server does not.
if (root.firstElementChild) hydrateRoot(root, app);
else {
  document.title = page.name;
  document.querySelector('link[rel="icon"]')?.setAttribute('href', page.icon);
  createRoot(root).render(app);
}
