import assert from 'node:assert/strict';
import { test } from 'node:test';

import { connect } from '@fabiocv/mcp-ui-tools-core/testing';

test('lists the tools and serves their preview', async () => {
  const { send, close } = await connect();
  try {
    const { result: tools } = await send('tools/list');
    const [tool, page] = tools.tools;
    assert.equal(tools.tools.length, 2);
    assert.equal(tool.name, 'show_in_component_code');
    assert.equal(tool.title, 'Show in Component Code');
    assert.deepEqual(tool.inputSchema.required, ['source', 'code']);
    const uri = tool._meta.ui.resourceUri;
    assert.equal(page.name, 'show_html_in_component_code');
    assert.equal(page.title, 'Show HTML in Component Code');
    assert.deepEqual(page.inputSchema.required, ['files']);
    assert.equal(page._meta.ui.resourceUri, uri);

    const { result: resource } = await send('resources/read', { uri });
    const [content] = resource.contents;
    assert.equal(content.mimeType, 'text/html;profile=mcp-app');
    assert.match(content.text, /^<!doctype html>/i);
    assert.deepEqual(content._meta.ui.csp.resourceDomains, [
      'https://cdn.jsdelivr.net',
    ]);

    const { result: call } = await send('tools/call', {
      name: tool.name,
      arguments: {
        source: 'export const A = () => null',
        code: '<A />',
        file: 'A.tsx',
      },
    });
    assert.equal(
      call.content[0].text,
      'Showing A.tsx in Component Code:\n\n<A />',
    );

    const { result: shown } = await send('tools/call', {
      name: page.name,
      arguments: {
        files: { 'index.html': '<canvas></canvas>', 'script.js': '' },
        controls: { '--speed': true },
      },
    });
    assert.equal(
      shown.content[0].text,
      'Showing index.html, script.js in Component Code.',
    );
  } finally {
    close();
  }
});
