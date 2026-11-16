import { ComponentCode } from 'component-code';
import { ComponentCode as PageCode } from 'component-code/html';

import size from '../../packages/component-code/dist/size.json';
import { Code, Prompt } from './blocks';
import { Changelog } from './changelog';
import { Badge, Button, Toggle } from './demos';
import { WAVES, WAVES_CONTROLS } from './waves';

const SITE = 'https://componentcode.fabio.cv';
const GITHUB = 'https://github.com/naso/component-code';
const NPM = 'https://www.npmjs.com/package/component-code';

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;
const gzip = kb(size.index.gzip);

const CLIENTS = [
  {
    name: 'Claude Code',
    code: 'claude mcp add component-code -- npx -y component-code-mcp',
  },
  {
    name: 'claude_desktop_config.json',
    code: `{
  "mcpServers": {
    "component-code": {
      "command": "npx",
      "args": ["-y", "component-code-mcp"]
    }
  }
}`,
  },
  {
    name: 'VS Code',
    code: `code --add-mcp '{"name":"component-code","command":"npx","args":["-y","component-code-mcp"]}'`,
  },
  {
    name: 'Claude.ai, ChatGPT and other remote connectors',
    code: `${SITE}/mcp`,
    plain: true,
  },
];

const IDEAS = [
  {
    title: 'Try it before you build it',
    text: 'See a component working, and change it, before any of it is in your codebase.',
    prompt:
      'Build me a pricing card with a plan name, a price, a list of features and a highlighted state. Show it in Component Code.',
  },
  {
    title: 'Tune the numbers',
    text: 'Drag sizes, durations and spacing until it feels right, then copy the code.',
    prompt:
      'Make a progress ring with its size, stroke width and value as numbers. Show it in Component Code so I can drag them.',
  },
  {
    title: 'Look at a component from your repo',
    text: 'Bring a component into the chat to try its props, without running the app.',
    prompt:
      'Read src/components/Avatar.tsx and show it in Component Code with its sizes as options and its name as text.',
  },
  {
    title: 'Learn by changing it',
    text: 'Explain a layout or an effect with something to play with, not only words.',
    prompt:
      'Explain CSS flexbox with a small component in Component Code where I can change the direction, the alignment and the gap.',
  },
  {
    title: 'Check the edge cases',
    text: 'Type a long name, an empty one or an emoji, and see where it breaks.',
    prompt:
      'Show our Tag in Component Code with its label as text, so I can try long labels, empty ones and emoji.',
  },
  {
    title: 'Document your design system',
    text: 'Have your agent write docs with live examples that cannot drift from the code.',
    prompt:
      'Write a Storybook MDX page for our Badge that uses ComponentCode from component-code, with its tones as options and its count as a number.',
  },
];

const PROPS: [string, string][] = [
  [
    'code',
    'The code as it is written. The blank lines around it and its shared indent are dropped.',
  ],
  [
    'scope',
    'What the code can name: your components and values. With it, the preview is the code itself, rendered.',
  ],
  [
    'interactive',
    'Makes each string, number, boolean and line of text in the code a control.',
  ],
  [
    'controls',
    'How a prop is changed, by its name or by `Element.prop`: a list of options, `{ min, max, step }` for a number, or `false` to keep it as written.',
  ],
  [
    'onChange',
    'Called with `{ prop, value, code }` as the reader changes a value.',
  ],
  [
    'children',
    'The preview, for code that cannot run from its text, such as code with a hook.',
  ],
  ['file', "The file named in the code's tab. `Code` when left out."],
  [
    'theme',
    "`light` or `dark`. Without it, the page's `color-scheme` decides.",
  ],
];

const MDX = `import { ComponentCode } from 'component-code';
import { Badge } from './Badge';

# Badge

<ComponentCode
  interactive
  scope={{ Badge }}
  controls={{ tone: ['neutral', 'success', 'warning'] }}
  code={\`
    <Badge tone="success" count={3}>
      Live
    </Badge>
  \`}
/>`;

const inline = (text: string) =>
  text
    .split(/`([^`]+)`/)
    .map((piece, index) =>
      index % 2 ? <code key={index}>{piece}</code> : piece,
    );

function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--subtle)" />
      <rect x="2" y="2" width="13" height="28" rx="6" fill="var(--surface)" />
      <rect x="17" y="2" width="13" height="28" rx="6" fill="var(--sunken)" />
    </svg>
  );
}

export function App() {
  return (
    <div className="page">
      <header className="top">
        <a className="brand" href="/">
          <Mark />
          Component Code
        </a>
        <nav className="links">
          <a href="#mcp">MCP</a>
          <a href="#react">React</a>
          <a className="wide" href="#html">
            HTML
          </a>
          <a className="wide" href="#ideas">
            Ideas
          </a>
          <a className="wide" href="#changelog">
            Changelog
          </a>
          <a href={GITHUB}>GitHub</a>
        </nav>
      </header>

      <main>
        <div className="hero">
          <h1>Component Code</h1>
          <p className="lead">
            A component beside the code that makes it, where every value is a
            control. Drag a number, switch a boolean, type over the text. Ask
            for it in your chat, or put it in your Storybook and docs.
          </p>
          <ComponentCode
            interactive
            file="Button.tsx"
            scope={{ Button }}
            controls={{
              variant: ['primary', 'secondary', 'ghost'],
              size: ['small', 'medium', 'large'],
              radius: { min: 0, max: 22 },
            }}
            code={`
              <Button
                variant="primary"
                size="medium"
                radius={8}
                disabled={false}
              >
                Ship it
              </Button>
            `}
          />
          <dl className="facts">
            <div>
              <dt>{gzip}</dt>
              <dd>Gzipped, with no dependencies</dd>
            </div>
            <div>
              <dt>MCP App</dt>
              <dd>In Claude, ChatGPT, VS Code and more</dd>
            </div>
            <div>
              <dt>Live</dt>
              <dd>The preview is the code, so they never differ</dd>
            </div>
            <div>
              <dt>Light and dark</dt>
              <dd>From your page, or set it</dd>
            </div>
          </dl>
        </div>

        <section id="mcp">
          <div className="label">MCP</div>
          <h2>Show it in the chat</h2>
          <p>
            Ask your agent for a component and say “show it in Component Code”.
            It writes the component, and the chat shows it running beside the
            code that uses it, with every value a control.
          </p>
          <div className="chat">
            <p className="ask">
              Build me a toggle with a label and a disabled state. Show it in
              Component Code.
            </p>
            <ComponentCode
              interactive
              file="Toggle.tsx"
              scope={{ Toggle }}
              code={`
                <Toggle
                  label="Notifications"
                  checked={true}
                  disabled={false}
                />
              `}
            />
            <p className="answer">
              Here it is. Switch it, or change its label and state in the code.
            </p>
          </div>
          <p style={{ marginTop: 32 }}>Add it to your agent:</p>
          <div className="clients">
            {CLIENTS.map(({ name, code, plain }) => (
              <Code key={name} name={name} code={code} plain={plain} />
            ))}
          </div>
          <p style={{ marginTop: 24 }}>
            The component can import React and nothing else, and the code that
            uses it is plain JSX: elements, props and text. A component keeps
            any state inside itself.
          </p>
        </section>

        <section id="react">
          <div className="label">React</div>
          <h2>Put it in your docs</h2>
          <p>
            One component, {gzip} gzipped, with no dependencies beyond React.
            Give it your components in <code>scope</code> and the code renders
            as its own preview, so your docs cannot drift from what they show.
          </p>
          <div className="stack">
            <Code name="Terminal" code="npm install component-code" />
            <ComponentCode file="Badge.mdx" code={MDX}>
              <ComponentCode
                interactive
                scope={{ Badge }}
                controls={{ tone: ['neutral', 'success', 'warning'] }}
                code={`
                  <Badge tone="success" count={3}>
                    Live
                  </Badge>
                `}
              />
            </ComponentCode>
          </div>
          <p style={{ marginTop: 24 }}>
            It reads the code rather than running it: elements, props, text,
            strings, numbers, booleans, lists, objects and the names in{' '}
            <code>scope</code>. Anything else says why in place of the preview.
            For code with a hook, pass the preview as <code>children</code>.
          </p>
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Prop</th>
                  <th>What it sets</th>
                </tr>
              </thead>
              <tbody>
                {PROPS.map(([prop, text]) => (
                  <tr key={prop}>
                    <td>
                      <code>{prop}</code>
                    </td>
                    <td>{inline(text)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="html">
          <div className="label">HTML</div>
          <h2>Or plain HTML, CSS and JS</h2>
          <p>
            For a canvas, an SVG or anything without React, import it from{' '}
            <code>component-code/html</code> and give it files. They run
            together in a sandboxed frame, a tab for each, and the values you
            name in <code>controls</code> become controls. It is{' '}
            {kb(size.html.gzip)} gzipped.
          </p>
          <PageCode files={WAVES} controls={WAVES_CONTROLS} />
          <p style={{ marginTop: 24 }}>
            A CSS value changes as you drag it, so a script that reads custom
            properties each frame follows along. A change to the HTML or JS runs
            the page again. Name a value by its attribute, as <code>r</code> or{' '}
            <code>circle.r</code>, its CSS property or custom property, or the
            JS <code>const</code> it sets. In the chat, ask for plain HTML, CSS
            and JS.
          </p>
        </section>

        <section id="ideas">
          <div className="label">Ideas</div>
          <h2>What to ask for</h2>
          <p>Copy a prompt, then make it yours.</p>
          <div className="ideas">
            {IDEAS.map(({ title, text, prompt }) => (
              <div className="idea" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
                <Prompt>{prompt}</Prompt>
              </div>
            ))}
          </div>
        </section>

        <section id="changelog">
          <div className="label">Changelog</div>
          <h2>What changed</h2>
          <Changelog />
        </section>
      </main>

      <footer>
        <span>
          MIT licence. Made by <a href="https://fabio.cv">Fabio Azevedo</a>.
        </span>
        <nav>
          <a href={GITHUB}>GitHub</a>
          <a href={NPM}>npm</a>
        </nav>
      </footer>
    </div>
  );
}
