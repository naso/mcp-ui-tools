import { BrandPage } from './brand';
import { ComponentCodePage } from './component-code';
import { HomePage } from './home';
import { OrbitPage } from './orbit';
import type { PageId } from './pages';
import { WallPage } from './wall';

const PAGES = {
  home: HomePage,
  'component-code': ComponentCodePage,
  orbit: OrbitPage,
  brand: BrandPage,
  wall: WallPage,
} satisfies Record<PageId, () => unknown>;

export function App({ page }: { page: PageId }) {
  const Page = PAGES[page];
  return <Page />;
}
