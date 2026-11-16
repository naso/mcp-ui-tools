import type { ReactNode } from 'react';

import changelog from '../../CHANGELOG.md?raw';

type Release = {
  version: string;
  date: string;
  parts: { name: string; items: string[] }[];
};

/** `CHANGELOG.md`: a `##` per release, a `###` per package and a bullet per change. */
function read(markdown: string): Release[] {
  const releases: Release[] = [];
  for (const line of markdown.split('\n')) {
    const release = line.match(/^## (\S+)(?: [–-] (.+))?/);
    if (release) {
      releases.push({ version: release[1], date: release[2] ?? '', parts: [] });
      continue;
    }
    const current = releases.at(-1);
    const part = line.match(/^### (.+)/);
    if (current && part) current.parts.push({ name: part[1], items: [] });
    else if (current && line.startsWith('- ')) {
      current.parts.at(-1)?.items.push(line.slice(2));
    } else if (current && /^\s+\S/.test(line)) {
      const items = current.parts.at(-1)?.items;
      if (items?.length) items[items.length - 1] += ` ${line.trim()}`;
    }
  }
  return releases;
}

/** Text with its `code` in code. */
const inline = (text: string): ReactNode[] =>
  text
    .split(/`([^`]+)`/)
    .map((piece, index) =>
      index % 2 ? <code key={index}>{piece}</code> : piece,
    );

export function Changelog() {
  return read(changelog).map(({ version, date, parts }) => (
    <div className="release" key={version}>
      <h3>
        {version}
        <span>{date}</span>
      </h3>
      {parts.map(({ name, items }) => (
        <div key={name}>
          <h4>{name}</h4>
          <ul>
            {items.map((item) => (
              <li key={item}>{inline(item)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  ));
}
