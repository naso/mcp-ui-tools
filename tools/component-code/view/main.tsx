import { useMemo } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { ComponentCode } from '@fabiocv/component-code';
import { ComponentCode as PageCode } from '@fabiocv/component-code/html';
import { createRoot } from 'react-dom/client';
import type { McpUiTheme } from '@modelcontextprotocol/ext-apps';

import { version } from '../package.json';
import { PageInput, PreviewInput } from '../src/input.ts';
import { describe } from './context.ts';
import type { Change } from './context.ts';
import { load } from './load.ts';

function Failed({ error }: { error: unknown }): never {
  throw error;
}

type Changed = (change: Omit<Change, 'problem'>) => void;

function Preview({
  source,
  code,
  file = 'Code',
  controls,
  note,
  onChange,
}: PreviewInput & { onChange: Changed; note?: string }) {
  // Running the module again would make new components and drop their state.
  const loaded = useMemo(() => {
    try {
      return { scope: load(source) };
    } catch (error) {
      return { error };
    }
  }, [source]);

  return loaded.scope ? (
    <ComponentCode
      interactive
      scope={loaded.scope}
      code={code}
      file={file}
      controls={controls}
      note={note}
      onChange={({ prop, value, code }) =>
        onChange({ prop, value, file, files: { [file]: code } })
      }
    />
  ) : (
    <ComponentCode code={code} file={file}>
      <Failed error={loaded.error} />
    </ComponentCode>
  );
}

const app = new App({ name: 'Component Code', version });
const root = createRoot(document.getElementById('root')!);

let theme: McpUiTheme = matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
let args: unknown;
/** The page's files as the reader has left them. */
let files: Record<string, string> = {};
let staged = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Hands the model the state the reader has left, to read with their next
 * message, so they can say what is wrong without copying anything. It waits
 * for a drag to settle, and for the preview to show what it threw.
 */
const stage: Changed = (change) => {
  if (!app.getHostCapabilities()?.updateModelContext) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const problem =
      document.querySelector('.cc-problem')?.textContent || undefined;
    staged = true;
    app
      .updateModelContext({
        content: [{ type: 'text', text: describe({ ...change, problem }) }],
      })
      .catch(() => {});
  }, 400);
};

/** Where the host takes model context, the reader is told the chat sees it. */
const note = () =>
  app.getHostCapabilities()?.updateModelContext
    ? 'The chat sees this state'
    : undefined;

/** A new input is what the model sent, so it needs none of the old state. */
const unstage = () => {
  clearTimeout(timer);
  if (!staged) return;
  staged = false;
  app.updateModelContext({ content: [] }).catch(() => {});
};

/**
 * The page follows the host's theme, so the component and its preview do. A
 * page runs in a frame of its own, so it takes the theme as well.
 */
const show = () => {
  document.documentElement.style.colorScheme = theme;
  if (args === undefined) return;
  const page = PageInput.safeParse(args);
  const input = PreviewInput.safeParse(args);
  root.render(
    page.success ? (
      <PageCode
        {...page.data}
        theme={theme}
        note={note()}
        onChange={({ file, prop, value, code }) => {
          files = { ...files, [file]: code };
          stage({ prop, value, file, files });
        }}
      />
    ) : input.success ? (
      <Preview {...input.data} note={note()} onChange={stage} />
    ) : (
      <p>{input.error.message}</p>
    ),
  );
};

app.addEventListener('toolinput', (input) => {
  args = input.arguments;
  const page = PageInput.safeParse(args);
  files = page.success ? { ...page.data.files } : {};
  unstage();
  show();
});

app.addEventListener('hostcontextchanged', (context) => {
  if (context.theme) theme = context.theme;
  show();
});

await app.connect();
theme = app.getHostContext()?.theme ?? theme;
show();

// What this host lets the app do, to read in its developer tools or logs.
const host = {
  host: app.getHostVersion(),
  capabilities: app.getHostCapabilities(),
};
console.info('Component Code host', host);
if (host.capabilities?.logging) {
  app
    .sendLog({ level: 'info', logger: 'Component Code', data: host })
    .catch(() => {});
}
