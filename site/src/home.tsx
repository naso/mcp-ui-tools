import { Changelog } from './changelog';
import { SoonLogo } from './logos';
import { HOME, SITE, TOOLS } from './pages';
import { Clients, Shell } from './shell';

const LINKS = [
  { id: 'tools', label: 'Tools' },
  { id: 'install', label: 'Install' },
  { id: 'changelog', label: 'Changelog', wide: true },
];

export function HomePage() {
  return (
    <Shell page={HOME} links={LINKS} npm="mcp-ui-tools">
      <div className="hero">
        <p className="lead">
          MCP Apps that show UI in your chat. Your agent calls a tool, and the
          chat shows it running: a component to change, or a game while you
          wait. Add the ones you want, or all of them.
        </p>
        <div className="tools" id="tools">
          {TOOLS.map(({ id, name, path, summary, Logo }) => (
            <a className="tool" key={id} href={path}>
              <Logo size={40} />
              <h3>{name}</h3>
              <p>{summary}</p>
            </a>
          ))}
          {/* A tool still to come, its name and summary not yet written. */}
          <div
            className="tool tool-soon"
            role="group"
            aria-label="Another tool, coming soon"
          >
            <SoonLogo size={40} />
            <span className="soon">Soon</span>
            <div className="tool-soon-title">
              <span className="skeleton" style={{ width: 112 }} />
            </div>
            <p aria-hidden>
              <span className="skeleton" />
              <span className="skeleton" style={{ width: '60%' }} />
            </p>
          </div>
        </div>
      </div>

      <section id="install">
        <div className="label">Install</div>
        <h2>Add them all</h2>
        <p>
          One server with every tool. To add a tool on its own, go to its page.
        </p>
        <Clients
          name="mcp-ui-tools"
          pkg="mcp-ui-tools"
          remote={`${SITE}/mcp`}
        />
      </section>

      <section id="changelog">
        <div className="label">Changelog</div>
        <h2>What changed</h2>
        <Changelog />
      </section>
    </Shell>
  );
}
