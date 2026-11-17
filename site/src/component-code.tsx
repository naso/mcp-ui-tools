import { ComponentCode } from '@fabiocv/component-code';
import { ComponentCode as PageCode } from '@fabiocv/component-code/html';

import size from '../../packages/component-code/dist/size.json';
import { Code, Prompt } from './blocks';
import { Changelog } from './changelog';
import { Badge, Button, Toggle } from './demos';
import { WAVES, WAVES_CONTROLS } from './waves';
import { SITE, TOOLS } from './pages';
import { Clients, Shell } from './shell';
import { Why } from './why';

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;
const gzip = kb(size.index.gzip);

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
      'Write a Storybook MDX page for our Badge that uses ComponentCode from @fabiocv/component-code, with its tones as options and its count as a number.',
  },
];

const PROPS: [string, string][] = [
  ['code', 'The code as it is written.'],
  ['scope', 'What the code can name: your components and values.'],
  [
    'interactive',
    'Makes each string, number, boolean and line of text in the code a control.',
  ],
  [
    'controls',
    'How a prop is changed, by its name or by `Element.prop`: a list of options, `{ min, max, step }` for a number, or `false` to keep it as written.',
  ],
];

const MDX = `import { ComponentCode } from '@fabiocv/component-code';
import { Badge } from './Badge';

# Badge

<ComponentCode
  interactive
  scope={{ Badge }}
  controls={{
    tone: ['neutral', 'success', 'warning'],
    count: { min: 0, max: 99 },
  }}
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

const LINKS = [
  { id: 'mcp', label: 'MCP' },
  { id: 'react', label: 'React' },
  { id: 'html', label: 'HTML', wide: true },
  { id: 'ideas', label: 'Ideas', wide: true },
  { id: 'changelog', label: 'Changelog', wide: true },
];

export function ComponentCodePage() {
  const page = TOOLS[0];
  return (
    <Shell page={page} links={LINKS} npm="@fabiocv/component-code">
      <div className="hero">
        <p className="lead">
          A component beside the code that makes it, where every value is a
          control. Drag a number, switch a boolean, type over the text. Ask for
          it in your chat, or put it in your Storybook and docs.
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
      </div>

      <Why />

      <section id="mcp">
        <div className="label">MCP</div>
        <h2>Show it in the chat</h2>
        <p>
          Ask your agent for a component and say “show it in Component Code”.
          The chat shows it running beside its code, with every value a control.
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
            note="The chat sees this state"
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
        <Clients
          name="component-code"
          pkg="@fabiocv/component-code-mcp"
          remote={`${SITE}/component-code/mcp`}
        />
      </section>

      <section id="react">
        <div className="label">React</div>
        <h2>Put it in your docs</h2>
        <p>
          One component, {gzip} gzipped, with no dependencies beyond React. Give
          it your components in <code>scope</code> and the code renders as its
          own preview, so your docs cannot drift from what they show.
        </p>
        <div className="stack">
          <Code name="Terminal" code="npm install @fabiocv/component-code" />
          <ComponentCode file="Badge.mdx" code={MDX}>
            <ComponentCode
              interactive
              scope={{ Badge }}
              controls={{
                tone: ['neutral', 'success', 'warning'],
                count: { min: 0, max: 99 },
              }}
              code={`
                  <Badge tone="success" count={3}>
                    Live
                  </Badge>
                `}
            />
          </ComponentCode>
        </div>
        <div className="table" style={{ marginTop: 24 }}>
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
          It works without React too. Import it from{' '}
          <code>@fabiocv/component-code/html</code> and give it your files.
        </p>
        <PageCode files={WAVES} controls={WAVES_CONTROLS} />
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
        <Changelog packages={page.packages} />
      </section>
    </Shell>
  );
}
