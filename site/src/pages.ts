import type { ComponentType } from 'react';

import { ComponentCodeLogo, HomeLogo, OrbitLogo } from './logos';

export const SITE = 'https://mcp-ui-tools.fabio.cv';
export const GITHUB = 'https://github.com/naso/component-code';

export type PageId = 'home' | 'component-code' | 'orbit';

export type Page = {
  id: PageId;
  name: string;
  /** Where the page is, from the site's root. */
  path: string;
  /** One line, for the home page's list, the menu and the page's meta. */
  summary: string;
  Logo: ComponentType<{ size?: number }>;
  /** The favicon, in `public`. */
  icon: string;
  /** The `CHANGELOG.md` sections the page shows. All of them when left out. */
  packages?: string[];
};

export const HOME: Page = {
  id: 'home',
  name: 'mcp-ui-tools',
  path: '/',
  summary:
    'MCP Apps that show UI in your chat. Install the ones you want, or all of them.',
  Logo: HomeLogo,
  icon: '/favicon.svg',
};

/** The tools, in the order the home page and the menu list them. */
export const TOOLS: Page[] = [
  {
    id: 'component-code',
    name: 'Component Code',
    path: '/component-code/',
    summary:
      'A React component or a page beside its code, with every value a control.',
    Logo: ComponentCodeLogo,
    icon: '/component-code.svg',
    packages: ['@fabiocv/component-code', '@fabiocv/component-code-mcp'],
  },
  {
    id: 'orbit',
    name: 'Orbit',
    path: '/orbit/',
    summary: 'A one-button game to play while your agent works.',
    Logo: OrbitLogo,
    icon: '/orbit.svg',
    packages: ['@fabiocv/orbit-mcp'],
  },
];

export const PAGES = [HOME, ...TOOLS];

/** The page at a path, or home. */
export const pageAt = (path: string) =>
  TOOLS.find((page) => path.startsWith(page.path.slice(0, -1))) ?? HOME;

type Server = {
  /** The server's name in the agent's config. */
  name: string;
  /** The npm package that runs it. */
  pkg: string;
  /** Its URL, for remote connectors. */
  remote: string;
};

/** A prompt that has a coding agent add the server itself. */
export const installPrompt = ({ name, pkg }: Server) =>
  `Add the ${name} MCP server to this agent. It runs with the command npx -y ${pkg}. Add it the way this agent adds MCP servers, then tell me if I need to restart for its tools to load.`;

/** Cursor's mark, in one colour, from Simple Icons (CC0). */
const CURSOR = {
  viewBox: '0 0 24 24',
  d: 'M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23',
};

/** Links that open an app and add the server there, with the app's mark. */
export function installLinks({ name, pkg }: Server) {
  const config = { command: 'npx', args: ['-y', pkg] };
  return [
    {
      name: 'Add to Cursor',
      icon: CURSOR,
      href: `cursor://anysphere.cursor-deeplink/mcp/install?name=${name}&config=${btoa(JSON.stringify(config))}`,
    },
  ];
}

/** The command or config for each kind of client. */
export function clients({ name, pkg }: Server) {
  return [
    {
      name: 'Claude Code',
      code: `claude mcp add ${name} -- npx -y ${pkg}`,
    },
    {
      name: 'claude_desktop_config.json',
      code: `{
  "mcpServers": {
    "${name}": {
      "command": "npx",
      "args": ["-y", "${pkg}"]
    }
  }
}`,
    },
    {
      name: 'VS Code',
      code: `code --add-mcp '{"name":"${name}","command":"npx","args":["-y","${pkg}"]}'`,
    },
  ];
}
