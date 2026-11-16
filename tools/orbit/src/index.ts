import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { addView } from '@fabiocv/mcp-ui-tools-core';
import type { Register } from '@fabiocv/mcp-ui-tools-core';

import html from '../dist/orbit.html';

const URI = 'ui://mcp-ui-tools/orbit.html';

/** Adds Orbit's tool, and the game it shows, to a server. */
export const register: Register = (server) => {
  registerAppTool(
    server,
    'play_while_you_wait',
    {
      title: 'Play while you wait',
      description:
        'Shows Orbit, a small one-button game, in the chat for the reader to play while you work. It returns at once and the game keeps running, so call it first and carry on with the task. Use it only when someone asks for a game, or for something to do while they wait.',
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: URI } },
    },
    () => ({
      content: [
        {
          type: 'text',
          text: 'The reader has a game to play. Carry on with the task.',
        },
      ],
    }),
  );

  addView(server, {
    uri: URI,
    name: 'Orbit',
    description: 'A one-button game to play while the agent works.',
    html,
  });
};
