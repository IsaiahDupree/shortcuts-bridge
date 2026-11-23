// On-demand stdio for trusted local MCP clients; no hosted relay or poller.
// The invoking user can run shortcuts that may have external side effects.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './lib/mcpTools.js';
import { runTool } from '../agent/shortcuts-cli.mjs';

const server = buildServer('local', { execute: runTool });
await server.connect(new StdioServerTransport());
