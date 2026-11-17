// The page `scripts/images.js` opens to draw one image, named by its query:
// `?image=og&page=orbit`, or `?image=icon&page=home&size=512`.
import { createRoot } from 'react-dom/client';

import { Icon, imageStyles, OgImage } from './images';
import { PAGES } from './pages';

import './site.css';

const query = new URLSearchParams(location.search);
const page = PAGES.find(({ id }) => id === query.get('page'))!;
const og = query.get('image') === 'og';

const style = document.createElement('style');
style.textContent = imageStyles;
document.head.append(style);
// The share images are dark, the icons light.
document.documentElement.style.colorScheme = og ? 'dark' : 'light';

createRoot(document.getElementById('root')!).render(
  og ? (
    <OgImage page={page} />
  ) : (
    <Icon page={page} size={Number(query.get('size'))} />
  ),
);
