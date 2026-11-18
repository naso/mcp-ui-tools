import type { ComponentType } from 'react';

import { ComponentCodeLogo, HomeLogo, OrbitLogo } from './logos';

export const SITE = 'https://mcp-ui-tools.fabio.cv';
export const GITHUB = 'https://github.com/naso/mcp-ui-tools';

export type PageId =
  'home' | 'component-code' | 'orbit' | 'brand' | 'wall' | 'wall-embed';

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
  /** A page that plays inside a post on X, as a player card, and its size. */
  player?: { path: string; width: number; height: number };
  /** Kept out of search and the sitemap. */
  hidden?: boolean;
  /** The page whose share image and icons it uses, when not its own. */
  images?: PageId;
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

/** The brand, to paint with. It has the home page's logo, and no menu lists it. */
export const BRAND: Page = {
  id: 'brand',
  name: 'Brand',
  path: '/brand/',
  summary:
    'The stencils and the spray paint the site is drawn with, to paint with yourself.',
  Logo: HomeLogo,
  icon: '/favicon.svg',
  // Shared on X, it plays the compact wall inside the post.
  player: { path: '/brand/wall/embed/', width: 600, height: 600 },
};

/** The wall, sized to play inside a post on X, with its tools at its sides. */
export const WALL: Page = {
  id: 'wall',
  name: 'Wall',
  path: '/brand/wall/',
  summary: 'A wall to spray and smudge, right inside a post on X.',
  Logo: HomeLogo,
  icon: '/favicon.svg',
  images: 'brand',
};

/** The wall alone, filling its frame, for X to play inside a post. */
export const WALL_EMBED: Page = {
  id: 'wall-embed',
  name: 'Wall',
  path: '/brand/wall/embed/',
  summary: WALL.summary,
  Logo: HomeLogo,
  icon: '/favicon.svg',
  hidden: true,
};

/** The pages the menu lists: the home page and each tool. */
export const MENU = [HOME, ...TOOLS];

// The longer paths first, so `pageAt` finds them before the ones they're in.
export const PAGES = [...MENU, WALL_EMBED, WALL, BRAND];

/** The page at a path, or home. */
export const pageAt = (path: string) =>
  PAGES.slice(1).find((page) => path.startsWith(page.path.slice(0, -1))) ??
  HOME;

type Server = {
  /** The server's name in the agent's config. */
  name: string;
  /** The npm package that runs it. */
  pkg: string;
  /** Its URL, for remote connectors. */
  remote: string;
};

/** A prompt that has a coding agent add the server itself. */
export const installPrompt = ({ name, pkg, remote }: Server) =>
  `Add the ${name} MCP server to this agent. If this agent takes a remote MCP server by URL, add ${remote}. If not, it runs with the command npx -y ${pkg}. Apps often start servers without the shell's PATH, so use the full path that \`which npx\` prints as the command, and set the server's PATH to include the folder that \`which node\` prints. Add it the way this agent adds MCP servers, then tell me if I need to restart for its tools to load.`;

/** The command or config for each kind of client. */
export function clients({ name, pkg, remote }: Server) {
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
    {
      name: 'Codex',
      code: `codex mcp add ${name} --url ${remote}`,
      // A command, so the TSX colours would read `https:` as a key.
      plain: true,
    },
  ];
}
