import { Accordion } from '@base-ui/react/accordion';
import type { ReactNode } from 'react';

import changelog from '../../CHANGELOG.md?raw';
import { Chevron } from './shell';

type Release = {
  version: string;
  date: string;
  gist: string;
  parts: { name: string; items: string[] }[];
};

/**
 * `CHANGELOG.md`: a `##` per release, a line on what it brings, then a `###`
 * per package and a bullet per change.
 */
function read(markdown: string): Release[] {
  const releases: Release[] = [];
  for (const line of markdown.split('\n')) {
    const release = line.match(/^## (\S+)(?: [–-] (.+))?/);
    if (release) {
      releases.push({
        version: release[1],
        date: release[2] ?? '',
        gist: '',
        parts: [],
      });
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
    } else if (current && !current.parts.length && line.trim()) {
      current.gist += `${current.gist ? ' ' : ''}${line.trim()}`;
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

/**
 * The releases, each a row with its version, date and gist that opens on what
 * changed. Only the sections for `packages` are shown when it is given, and a
 * release with none of them is left out.
 */
export function Changelog({ packages }: { packages?: string[] }) {
  return (
    <Accordion.Root className="releases" multiple>
      {read(changelog).map(({ version, date, gist, parts }) => {
        const shown = parts.filter(
          ({ name }) => !packages || packages.includes(name),
        );
        if (!shown.length) return null;
        return (
          <Accordion.Item className="release" key={version} value={version}>
            <Accordion.Header className="release-header">
              <Accordion.Trigger className="release-trigger">
                <span className="release-version">{version}</span>
                <span className="release-date">{date}</span>
                <span className="release-gist">{inline(gist)}</span>
                <Chevron />
              </Accordion.Trigger>
            </Accordion.Header>
            {/* Find in page opens it to show a match. */}
            <Accordion.Panel className="release-panel" hiddenUntilFound>
              {shown.map(({ name, items }) => (
                <div key={name}>
                  <h4>{name}</h4>
                  <ul>
                    {items.map((item) => (
                      <li key={item}>{inline(item)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}
