import assert from 'node:assert/strict';
import { test } from 'node:test';

import { connect } from '@fabiocv/mcp-ui-tools-core/testing';

test('lists the tool and serves the game', async () => {
  const { send, close } = await connect();
  try {
    const { result: tools } = await send('tools/list');
    assert.equal(tools.tools.length, 1);
    const [tool] = tools.tools;
    assert.equal(tool.name, 'play_while_you_wait');
    assert.equal(tool.title, 'Play while you wait');

    const uri = tool._meta.ui.resourceUri;
    const { result: resource } = await send('resources/read', { uri });
    const [content] = resource.contents;
    assert.equal(content.mimeType, 'text/html;profile=mcp-app');
    assert.match(content.text, /^<!doctype html>/i);
    assert.match(content.text, /<canvas>/);

    const { result: call } = await send('tools/call', {
      name: tool.name,
      arguments: {},
    });
    assert.equal(
      call.content[0].text,
      'The reader has a game to play. Carry on with the task.',
    );
  } finally {
    close();
  }
});
