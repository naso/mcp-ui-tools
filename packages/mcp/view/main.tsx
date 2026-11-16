import { useMemo } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { ComponentCode } from 'component-code';
import { ComponentCode as PageCode } from 'component-code/html';
import { createRoot } from 'react-dom/client';
import type { McpUiTheme } from '@modelcontextprotocol/ext-apps';

import { version } from '../package.json';
import { PageInput, PreviewInput } from '../src/input.ts';
import { load } from './load.ts';

function Failed({ error }: { error: unknown }): never {
  throw error;
}

function Preview({ source, code, file, controls }: PreviewInput) {
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
      <PageCode {...page.data} theme={theme} />
    ) : input.success ? (
      <Preview {...input.data} />
    ) : (
      <p>{input.error.message}</p>
    ),
  );
};

app.addEventListener('toolinput', (input) => {
  args = input.arguments;
  show();
});

app.addEventListener('hostcontextchanged', (context) => {
  if (context.theme) theme = context.theme;
  show();
});

await app.connect();
theme = app.getHostContext()?.theme ?? theme;
show();
