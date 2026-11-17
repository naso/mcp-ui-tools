import type { ComponentType } from 'react';

import { ComponentCodeLogo, HomeLogo, OrbitLogo } from './logos';

export const SITE = 'https://mcp-ui-tools.fabio.cv';
export const GITHUB = 'https://github.com/naso/mcp-ui-tools';

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
      'Code with live parameters that you can change and see the component update.',
    Logo: ComponentCodeLogo,
    icon: '/component-code.svg',
    packages: ['@fabiocv/component-code', '@fabiocv/component-code-mcp'],
  },
  {
    id: 'orbit',
    name: 'Orbit',
    path: '/orbit/',
    summary:
      'A one-button game to play while your agent works. Switch rings to miss the arcs ahead.',
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
