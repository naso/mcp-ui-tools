import {
  AppBridge,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import type { McpUiTheme } from '@modelcontextprotocol/ext-apps';

import preview from '@fabiocv/component-code-mcp/dist/preview.html?raw';
import { FONT_ORIGIN } from '@fabiocv/mcp-ui-tools-core/fonts';

/** The spec's default policy, with the font origin the server declares. */
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self' data:",
  "connect-src 'none'",
  `font-src ${FONT_ORIGIN}`,
].join('; ');

const SOURCE = `import { useState } from 'react';

type CounterProps = { label: string; start: number; step: number; round: boolean };

export default function Counter({ label, start, step, round }: CounterProps) {
  const [count, setCount] = useState(start);
  return (
    <button
      onClick={() => setCount(count + step)}
      style={{ padding: '8px 16px', borderRadius: round ? 999 : 4, font: 'inherit' }}
    >
      {label}: {count}
    </button>
  );
}`;

const CODE = `<Counter label="Clicks" start={0} step={1} round={true} />`;

/** A canvas drawn from custom properties, which change as they are dragged. */
const PAGE = {
  files: {
    'index.html': '<canvas></canvas>',
    'style.css': `:root {
  --speed: 1;
  --size: 4;
}

canvas {
  display: block;
  width: 100%;
  height: 160px;
}`,
    'script.js': `const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const gap = 16;

function draw(time) {
  const style = getComputedStyle(document.documentElement);
  const speed = +style.getPropertyValue('--speed');
  const size = +style.getPropertyValue('--size');
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  context.scale(devicePixelRatio, devicePixelRatio);
  context.fillStyle = style.color;
  for (let x = gap / 2; x < width; x += gap) {
    const y = height / 2 + Math.sin(x / 40 + (time / 1000) * speed) * 40;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);`,
  },
  controls: {
    '--speed': { min: 0, max: 4, step: 0.1 },
    '--size': { min: 1, max: 8 },
    gap: { min: 8, max: 40 },
  },
};

const form = document.querySelector<HTMLFormElement>('#input')!;
const iframe = document.querySelector<HTMLIFrameElement>('#view')!;
const field = (name: string) =>
  form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement;

field('source').value = SOURCE;
field('code').value = CODE;
field('file').value = 'Counter.tsx';

let theme: McpUiTheme = matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
document.body.classList.toggle('dark', theme === 'dark');

const bridge = new AppBridge(
  null,
  { name: 'Test host', version: '0.0.0' },
  { updateModelContext: { text: {} }, logging: {} },
  { hostContext: { theme } },
);

// What the model would read with the next message, as a host would hold it.
const context = document.querySelector<HTMLPreElement>('#context')!;
bridge.onupdatemodelcontext = async ({ content }) => {
  context.textContent =
    content
      ?.map((block) => (block.type === 'text' ? block.text : `[${block.type}]`))
      .join('\n\n') || '(none)';
  return {};
};
bridge.onloggingmessage = ({ level, logger, data }) =>
  console.info(`[${level}] ${logger ?? ''}`, data);

const send = () =>
  bridge.sendToolInput({
    arguments: {
      source: field('source').value,
      code: field('code').value,
      file: field('file').value || undefined,
    },
  });

bridge.oninitialized = send;
bridge.onsizechange = ({ height }) => {
  if (height !== undefined) iframe.style.height = `${height}px`;
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void send();
});

document
  .querySelector('#page')!
  .addEventListener(
    'click',
    () => void bridge.sendToolInput({ arguments: PAGE }),
  );

document.querySelector('#theme')!.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('dark', theme === 'dark');
  bridge.setHostContext({ theme });
});

iframe.srcdoc = preview.replace(
  '<head>',
  `<head><meta http-equiv="Content-Security-Policy" content="${CSP}">`,
);
await bridge.connect(
  new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
);
