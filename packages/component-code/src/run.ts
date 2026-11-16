import { createElement, Fragment } from 'react';
import type { ElementType, ReactNode } from 'react';

import { CodeError, decode } from './parse';
import type { Child, Element, Value } from './parse';

/** What the code can name: components and values. */
export type Scope = Readonly<Record<string, unknown>>;

/**
 * JSX text as React shows it: lines trimmed where they meet, empty lines
 * dropped and the rest joined by a space.
 */
export function text(raw: string) {
  const lines = raw.split('\n');
  return decode(
    lines
      .map((line, index) => {
        const start = index > 0 ? line.trimStart() : line;
        return index < lines.length - 1 ? start.trimEnd() : start;
      })
      .filter(Boolean)
      .join(' '),
  );
}

function lookup(path: string[], scope: Scope) {
  const [first, ...members] = path;
  if (!Object.hasOwn(scope, first)) {
    throw new CodeError(`\`${first}\` is not in \`scope\`.`);
  }
  let found = scope[first];
  for (const member of members) {
    found = (found as Record<string, unknown> | undefined)?.[member];
  }
  if (found === undefined) {
    throw new CodeError(`\`${path.join('.')}\` is not in \`scope\`.`);
  }
  return found;
}

function evaluate(node: Value, scope: Scope): unknown {
  switch (node.type) {
    case 'element':
      return render(node, scope);
    case 'name':
      return lookup(node.path, scope);
    case 'array':
      return node.items.map((item) => evaluate(item, scope));
    case 'object':
      return Object.fromEntries(
        node.entries.map(([key, entry]) => [key, evaluate(entry, scope)]),
      );
    case 'null':
      return null;
    case 'undefined':
      return undefined;
    default:
      return node.value;
  }
}

function child(node: Child, scope: Scope): ReactNode {
  return node.type === 'text'
    ? text(node.raw) || null
    : (evaluate(node, scope) as ReactNode);
}

/** An element, rendered with what `scope` names. A lowercase tag is the browser's own. */
export function render(node: Element, scope: Scope): ReactNode {
  const type = !node.name
    ? Fragment
    : /^[a-z][^.]*$/.test(node.name)
      ? node.name
      : (lookup(node.name.split('.'), scope) as ElementType);
  const props: Record<string, unknown> = {};
  for (const attribute of node.attributes) {
    if (attribute.spread) {
      Object.assign(props, evaluate(attribute.value!, scope));
    } else {
      props[attribute.name] = attribute.value
        ? evaluate(attribute.value, scope)
        : true;
    }
  }
  return createElement(
    type,
    props,
    ...node.children.map((node) => child(node, scope)),
  );
}
