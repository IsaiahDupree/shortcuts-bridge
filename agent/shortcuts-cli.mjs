// shortcuts-cli.mjs — runs ShortcutsBridge tools against the real macOS
// `shortcuts` command-line tool (Apple Shortcuts).
//
// Every tool shells out to `/usr/bin/shortcuts` via execFile (no shell — args
// are passed as an argv array, never interpolated into a command string) and
// returns a plain JSON-serializable object. `run_shortcut` passes input and
// collects output through temp files, the interface the CLI actually supports.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, readFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const exec = promisify(execFile);

const JOB_TIMEOUT_MS = 40_000; // relay's MCP side gives up at 50s; leave headroom
const OUTPUT_CAP = 20_000;     // trim a runaway shortcut output before it hits the relay

// Kept for parity with the other Mac Bridge agents (the CLI imports runTool only);
// shortcut args need no transformation, so this is an identity passthrough.
export function buildArgs(tool, args = {}) {
  return args;
}

// `shortcuts` prints errors like "Error: The shortcut "X" could not be found."
export function cleanError(msg) {
  const s = String(msg || '').trim();
  return s.replace(/^Error:\s*/i, '').trim() || 'shortcuts command failed';
}

async function sh(args) {
  const { stdout } = await exec('shortcuts', args, {
    timeout: JOB_TIMEOUT_MS,
    killSignal: 'SIGKILL',
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

const lines = (s) => String(s).split('\n').map((x) => x.trim()).filter(Boolean);
const rmSafe = (d) => { try { rmSync(d, { recursive: true, force: true }); } catch {} };

export async function runTool(tool, args = {}) {
  switch (tool) {
    case 'list_shortcuts': {
      const a = ['list'];
      if (args.folder) a.push('--folder-name', String(args.folder));
      let out;
      try { out = await sh(a); } catch (e) { throw new Error(cleanError(e.stderr || e.message)); }
      let names = lines(out);
      if (args.query) {
        const q = String(args.query).toLowerCase();
        names = names.filter((n) => n.toLowerCase().includes(q));
      }
      names.sort((a, b) => a.localeCompare(b));
      return { shortcuts: names, count: names.length, folder: args.folder || null };
    }

    case 'search_shortcuts': {
      const q = String(args.query || '').toLowerCase();
      let out;
      try { out = await sh(['list']); } catch (e) { throw new Error(cleanError(e.stderr || e.message)); }
      const names = lines(out).filter((n) => n.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b));
      return { query: args.query || '', shortcuts: names, count: names.length };
    }

    case 'list_folders': {
      let out;
      try { out = await sh(['list', '--folders']); } catch (e) { throw new Error(cleanError(e.stderr || e.message)); }
      const folders = lines(out).sort((a, b) => a.localeCompare(b));
      return { folders, count: folders.length };
    }

    case 'run_shortcut': {
      const name = String(args.name || '').trim();
      if (!name) throw new Error('name is required');
      const dir = mkdtempSync(join(tmpdir(), 'sb-run-'));
      const outPath = join(dir, 'output');
      const a = ['run', name, '--output-path', outPath];
      if (args.input != null && String(args.input) !== '') {
        const inPath = join(dir, 'input.txt');
        writeFileSync(inPath, String(args.input));
        a.push('--input-path', inPath);
      }
      let stdout = '';
      try {
        stdout = await sh(a);
      } catch (e) {
        rmSafe(dir);
        if (e.killed || e.signal) throw new Error('shortcut timed out on the Mac');
        throw new Error(cleanError(e.stderr || e.message));
      }
      let output = '';
      try { if (existsSync(outPath)) output = readFileSync(outPath, 'utf8'); } catch {}
      if (!output && stdout) output = String(stdout);
      rmSafe(dir);
      return { shortcut: name, ran: true, output: output.slice(0, OUTPUT_CAP) };
    }

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}
