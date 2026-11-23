// Real local MCP/Shortcuts checks; shortcut names are not printed or saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function withClient(fn) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./local-mcp.mjs', import.meta.url))],
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'shortcuts-local-check', version: '1.0.0' });
  try {
    await client.connect(transport);
    await fn(client);
  } finally {
    await client.close();
  }
}

test('local MCP exposes and validates existing Shortcuts tools', { timeout: 15_000 }, async () => {
  await withClient(async (client) => {
    const { tools } = await client.listTools();
    for (const name of ['list_shortcuts', 'search_shortcuts', 'list_folders', 'run_shortcut']) {
      assert.ok(tools.some((tool) => tool.name === name), `missing ${name}`);
    }
    const run = tools.find((tool) => tool.name === 'run_shortcut');
    assert.equal(run.annotations.openWorldHint, true);
    assert.equal(run.annotations.readOnlyHint, false);
    const invalid = await client.callTool({ name: 'run_shortcut', arguments: {} });
    assert.equal(invalid.isError, true);
  });
});

test('local MCP reads the real Shortcuts folder catalogue', { timeout: 55_000 }, async () => {
  await withClient(async (client) => {
    const result = await client.callTool({ name: 'list_folders', arguments: {} }, undefined, { timeout: 45_000 });
    assert.notEqual(result.isError, true, 'Shortcuts catalogue access failed');
    const payload = JSON.parse(result.content.find((part) => part.type === 'text').text);
    assert.ok(Array.isArray(payload.folders));
  });
});
