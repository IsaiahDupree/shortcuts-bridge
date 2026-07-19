// mcpTools.js — the MCP server exposed to ChatGPT. Every tool forwards to the
// paired Mac agent through the relay; the agent runs the actual `shortcuts` CLI.
// (Tool names match the agent's shortcuts-cli executor keys 1:1.)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { enqueueJob } from './relay.js';
import { demoExec } from './demoStore.js';

const asText = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });
const asError = (err) => ({
  isError: true,
  content: [{ type: 'text', text: `Error: ${err.message || String(err)}` }],
});

// Reading the shortcut/folder catalogue is a safe, local, repeatable lookup.
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export function buildServer(userId, { demo = false } = {}) {
  const server = new McpServer({ name: 'shortcuts-relay', version: '1.0.0' });

  // Demo accounts run against a server-side sample library of shortcuts (no Mac
  // agent needed); real accounts relay to the user's paired Mac.
  const exec = demo ? (tool, args) => demoExec(userId, tool, args) : (tool, args) => enqueueJob(userId, tool, args);
  const forward = (tool) => async (args) => {
    try {
      return asText(await exec(tool, args ?? {}));
    } catch (e) {
      return asError(e);
    }
  };

  server.registerTool(
    'list_shortcuts',
    {
      title: 'List shortcuts',
      description: "List the user's Apple Shortcuts by name. Optionally filter to one folder, or to names containing a query. Use run_shortcut to run one.",
      inputSchema: {
        folder: z.string().optional(),
        query: z.string().optional(),
      },
      annotations: RO,
    },
    forward('list_shortcuts')
  );

  server.registerTool(
    'search_shortcuts',
    {
      title: 'Search shortcuts',
      description: 'Find the user\'s shortcuts whose name contains a keyword (e.g. "focus", "home", "log"). Returns matching shortcut names.',
      inputSchema: { query: z.string() },
      annotations: RO,
    },
    forward('search_shortcuts')
  );

  server.registerTool(
    'list_folders',
    {
      title: 'List shortcut folders',
      description: 'List the folders the user organizes their Shortcuts into. Pass a folder name to list_shortcuts to see what is inside.',
      inputSchema: {},
      annotations: RO,
    },
    forward('list_folders')
  );

  server.registerTool(
    'run_shortcut',
    {
      title: 'Run a shortcut',
      description:
        "Run one of the user's Apple Shortcuts by name and return its text output. Optionally pass `input` (text) to a shortcut that accepts input. A shortcut can take real-world actions (send a message, control HomeKit, call a web API, run scripts), so ALWAYS confirm with the user before running one, and use the exact name from list_shortcuts / search_shortcuts.",
      inputSchema: {
        name: z.string(),
        input: z.string().optional(),
      },
      // Not read-only, and open-world: a shortcut can reach outside the app and
      // cause side effects that aren't idempotent. ChatGPT surfaces a
      // confirmation before the write happens.
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    forward('run_shortcut')
  );

  return server;
}
