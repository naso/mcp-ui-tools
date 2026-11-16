import { useState } from 'react';
import type { ReactNode } from 'react';

import { highlight } from '../../packages/component-code/src/highlight';

const COPY = 'M8 7.5h7.5v8H8zM12 4.5H4.5v8';
const CHECK = 'M5 10.5l3 3 7-7';

function Copy({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy">
      <button
        type="button"
        aria-label={copied ? 'Copied' : `Copy ${label}`}
        onClick={() =>
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d={copied ? CHECK : COPY} />
        </svg>
      </button>
    </div>
  );
}

/** Code with its colours, or `plain`, named in its tab, to copy. */
export function Code({
  name,
  code,
  plain,
}: {
  name: string;
  code: string;
  plain?: boolean;
}) {
  const nodes: ReactNode[] = [];
  let at = 0;
  for (const { ink, start, end } of plain ? [] : highlight(code)) {
    nodes.push(code.slice(at, start));
    nodes.push(
      <span key={start} className={`code-${ink}`}>
        {code.slice(start, end)}
      </span>,
    );
    at = end;
  }
  nodes.push(code.slice(at));
  return (
    <div className="block">
      <div className="tab">{name}</div>
      <Copy text={code} label={name} />
      <pre>
        <code>{nodes}</code>
      </pre>
    </div>
  );
}

/** A prompt to paste into an agent. */
export function Prompt({ children }: { children: string }) {
  return (
    <div className="block">
      <div className="tab">Prompt</div>
      <Copy text={children} label="prompt" />
      <p className="prompt">{children}</p>
    </div>
  );
}
