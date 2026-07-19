// Unit tests for the pure functions in shortcuts-cli.mjs — no `shortcuts` CLI,
// no Shortcuts app. Run: node --test test-agent-unit.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArgs, cleanError, runTool } from './shortcuts-cli.mjs';
import { buildPlist, xmlEscape } from './cli.mjs';

// Shortcut args need no transformation — buildArgs is an identity passthrough
// (the executor forwards them straight to the `shortcuts` CLI as an argv array).
test('buildArgs passes read args through untouched', () => {
  const list = { folder: 'Work', query: 'focus' };
  assert.deepEqual(buildArgs('list_shortcuts', list), list);
  assert.deepEqual(buildArgs('list_folders', {}), {});
  assert.deepEqual(buildArgs('search_shortcuts', { query: 'home' }), { query: 'home' });
});

test('buildArgs passes run args through untouched', () => {
  const run = { name: 'Log Water', input: '500' };
  assert.deepEqual(buildArgs('run_shortcut', run), run);
});

test('built args survive the JSON round-trip used for the argv handoff', () => {
  const out = buildArgs('run_shortcut', { name: `quote " tick ' back \\ slash`, input: 'x\ny' });
  assert.deepEqual(JSON.parse(JSON.stringify(out)), out);
});

test('cleanError strips the "Error:" prefix and falls back to a generic message', () => {
  assert.equal(cleanError('Error: The shortcut "X" could not be found.'), 'The shortcut "X" could not be found.');
  assert.equal(cleanError('plain failure'), 'plain failure');
  assert.equal(cleanError(''), 'shortcuts command failed');
});

test('runTool rejects unknown tools without spawning the shortcuts CLI', async () => {
  await assert.rejects(() => runTool('nope', {}), /Unknown tool: nope/);
});

test('run_shortcut requires a name (no CLI invoked when name is missing)', async () => {
  await assert.rejects(() => runTool('run_shortcut', {}), /name is required/);
});

test('xmlEscape escapes &, <, > for plist text nodes', () => {
  assert.equal(xmlEscape('a & b < c > d'), 'a &amp; b &lt; c &gt; d');
  assert.equal(xmlEscape('/Users/me/App & Co'), '/Users/me/App &amp; Co');
  assert.equal(xmlEscape('plain/path'), 'plain/path');
});

test('buildPlist emits the ShortcutsBridge label, ProgramArguments and KeepAlive', () => {
  const xml = buildPlist({
    label: 'com.shortcutsbridge.shortcuts-agent',
    nodePath: '/usr/local/bin/node',
    cliPath: '/Users/me/agent/cli.mjs',
    workingDir: '/Users/me',
    outLog: '/Users/me/Library/Logs/shortcutsbridge-agent.log',
    errLog: '/Users/me/Library/Logs/shortcutsbridge-agent.err.log',
  });
  assert.match(xml, /<key>Label<\/key>\s*<string>com\.shortcutsbridge\.shortcuts-agent<\/string>/);
  assert.match(
    xml,
    /<string>\/usr\/local\/bin\/node<\/string>\s*<string>\/Users\/me\/agent\/cli\.mjs<\/string>\s*<string>run<\/string>/,
  );
  assert.match(xml, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(xml, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(xml, /<key>StandardOutPath<\/key>\s*<string>\/Users\/me\/Library\/Logs\/shortcutsbridge-agent\.log<\/string>/);
});

test('buildPlist starts with the standard plist XML/DOCTYPE header', () => {
  const xml = buildPlist({ label: 'x', nodePath: 'n', cliPath: 'c', workingDir: 'w', outLog: 'o', errLog: 'e' });
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<!DOCTYPE plist PUBLIC "-\/\/Apple\/\/DTD PLIST 1\.0\/\/EN"/);
});

test('buildPlist xml-escapes paths that contain special characters', () => {
  const xml = buildPlist({
    label: 'l', nodePath: 'n', cliPath: '/Users/me & co/cli.mjs', workingDir: 'w', outLog: 'o', errLog: 'e',
  });
  assert.match(xml, /<string>\/Users\/me &amp; co\/cli\.mjs<\/string>/);
  assert.ok(!xml.includes('me & co'));
});
