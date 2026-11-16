import {
  AppBridge,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import type { McpUiTheme } from '@modelcontextprotocol/ext-apps';

import game from '@fabiocv/orbit-mcp/dist/orbit.html?raw';
import { FONT_ORIGIN } from '@fabiocv/mcp-ui-tools-core/fonts';

/** The spec's default policy, with the font origin the server declares. */
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'none'",
  `font-src ${FONT_ORIGIN}`,
].join('; ');

const iframe = document.querySelector<HTMLIFrameElement>('#view')!;

let theme: McpUiTheme = matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
document.body.classList.toggle('dark', theme === 'dark');

const bridge = new AppBridge(
  null,
  { name: 'Test host', version: '0.0.0' },
  {},
  { hostContext: { theme } },
);
bridge.oninitialized = () => void bridge.sendToolInput({ arguments: {} });
bridge.onsizechange = ({ height }) => {
  if (height !== undefined) iframe.style.height = `${height}px`;
};

document.querySelector('#theme')!.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('dark', theme === 'dark');
  bridge.setHostContext({ theme });
});

iframe.srcdoc = game.replace(
  '<head>',
  `<head><meta http-equiv="Content-Security-Policy" content="${CSP}">`,
);
await bridge.connect(
  new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
);
