import assert from 'node:assert/strict';
import { test } from 'node:test';

import { connect } from '@fabiocv/mcp-ui-tools-core/testing';

test('lists every tool, each with its own view', async () => {
  const { send, close } = await connect();
  try {
    const { result: tools } = await send('tools/list');
    assert.deepEqual(
      tools.tools.map((tool) => tool.name),
      [
        'show_in_component_code',
        'show_html_in_component_code',
        'play_while_you_wait',
      ],
    );

    const { result: resources } = await send('resources/list');
    assert.deepEqual(
      resources.resources.map((resource) => resource.uri),
      ['ui://mcp-ui-tools/component-code.html', 'ui://mcp-ui-tools/orbit.html'],
    );
  } finally {
    close();
  }
});
