import * as React from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import { transform } from 'sucrase';
import type { Scope } from 'component-code';

const modules: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': JsxRuntime,
};

type Loader = {
  require: (name: string) => unknown;
  module: { exports: Record<string, unknown> };
  ran: boolean;
  error?: unknown;
};

declare global {
  interface Window {
    __componentCode?: Loader;
  }
}

function require(name: string) {
  if (name in modules) return modules[name];
  throw new Error(`'${name}' cannot be imported here. Only 'react' can.`);
}

/**
 * Runs a TSX module and returns its exports as a scope, with a named default
 * export under its name. Hosts allow inline scripts but not `eval`, so the
 * module runs as a script element.
 */
export function load(source: string): Scope {
  const { code } = transform(source, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'automatic',
    production: true,
  });

  const loader: Loader = { require, module: { exports: {} }, ran: false };
  window.__componentCode = loader;

  const script = document.createElement('script');
  script.textContent = `(function (require, module, exports) {
try {
${code}
} catch (error) { __componentCode.error = error; }
__componentCode.ran = true;
})(__componentCode.require, __componentCode.module, __componentCode.module.exports);`;
  document.head.append(script);
  script.remove();
  delete window.__componentCode;

  if (loader.error) throw loader.error;
  if (!loader.ran) throw new Error('The host did not let the component run.');

  const { default: main, ...named } = loader.module.exports;
  return typeof main === 'function' && main.name && main.name !== 'default'
    ? { [main.name]: main, ...named }
    : named;
}
