import { Changelog } from './changelog';
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
