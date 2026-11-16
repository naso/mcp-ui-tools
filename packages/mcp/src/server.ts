import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/server';

import { version } from '../package.json';
import { FONT_ORIGIN } from './fonts.ts';
import { PageInput, PreviewInput } from './input.ts';

const URI = 'ui://component-code/preview.html';

/** The server, sending `html` as the preview. */
export function createServer(html: string) {
  const server = new McpServer({ name: 'component-code', version });

  registerAppTool(
    server,
    'show_in_component_code',
    {
      title: 'Show in Component Code',
      description:
        'Shows a React component in the chat in Component Code: a live preview beside the code that uses it. Each string, number and boolean in the code becomes a control the reader can change. Use it when someone asks to show a component in Component Code, or to see, preview or try one.',
      inputSchema: PreviewInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: URI } },
    },
    ({ file, code }) => ({
      content: [
        {
          type: 'text',
          text: `Showing ${file ?? 'the component'} in Component Code:\n\n${code}`,
        },
      ],
    }),
  );

  registerAppTool(
    server,
    'show_html_in_component_code',
    {
      title: 'Show HTML in Component Code',
      description:
        'Shows HTML, CSS and JS running in the chat in Component Code: the page beside its code, with a tab for each file. The values named in `controls` become controls the reader can change. Use it when someone asks to show HTML, CSS, JS, a canvas or an SVG in Component Code, or for an experiment without React.',
      inputSchema: PageInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: URI } },
    },
    ({ files }) => ({
      content: [
        {
          type: 'text',
          text: `Showing ${Object.keys(files).join(', ')} in Component Code.`,
        },
      ],
    }),
  );

  registerAppResource(
    server,
    'Component Code',
    URI,
    { description: 'A component or page beside the code that makes it.' },
    () => ({
      contents: [
        {
          uri: URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: { ui: { csp: { resourceDomains: [FONT_ORIGIN] } } },
        },
      ],
    }),
  );

  return server;
}
