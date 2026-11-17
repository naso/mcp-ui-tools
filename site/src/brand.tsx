import { BRAND } from './pages';
import { Shell } from './shell';
import { Wall } from './wall';

export function BrandPage() {
  return (
    <Shell page={BRAND} links={[]} npm="mcp-ui-tools">
      <div className="hero">
        <p className="lead">
          The logos are stencils, and the words beside them are sprayed by hand.
          Lay a stencil on the wall, spray over it, and lift it to see what it
          left. The paint stays wet, so a finger smudges it.
        </p>
        <Wall />
      </div>
    </Shell>
  );
}
