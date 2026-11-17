import orbit from '@fabiocv/orbit-mcp/dist/orbit.html?raw';

import { Changelog } from './changelog';
import { SITE, TOOLS } from './pages';
import { Clients, Shell } from './shell';

const LINKS = [
  { id: 'mcp', label: 'MCP' },
  { id: 'changelog', label: 'Changelog', wide: true },
];

export function OrbitPage() {
  const page = TOOLS[1];
  return (
    <Shell page={page} links={LINKS} npm="@fabiocv/orbit-mcp">
      <div className="hero">
        <p className="lead">
          A one-button game in your chat, to play while your agent works. Ask
          for something to play, and the agent shows Orbit, then carries on with
          the task.
        </p>
        <iframe
          className="game"
          title="Orbit"
          sandbox="allow-scripts"
          srcDoc={orbit}
        />
      </div>

      <section id="mcp">
        <div className="label">MCP</div>
        <h2>Play while you wait</h2>
        <p>
          Ask your agent for something to do while it works, such as “give me a
          game while you build this”. The tool returns at once, so the agent
          gets on with the task while you play.
        </p>
        <p style={{ marginTop: 32 }}>Add it to your agent:</p>
        <Clients
          name="orbit"
          pkg="@fabiocv/orbit-mcp"
          remote={`${SITE}/orbit/mcp`}
        />
      </section>

      <section id="changelog">
        <div className="label">Changelog</div>
        <h2>What changed</h2>
        <Changelog packages={page.packages} />
      </section>
    </Shell>
  );
}
