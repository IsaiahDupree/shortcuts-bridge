// demoStore.js — a server-side FICTIONAL Shortcuts library for the reviewer/demo
// account. Lets app reviewers exercise every tool 24/7 with no Mac agent.
// Result shapes mirror the real shortcuts-cli agent exactly, so ChatGPT sees the
// same formats whether a call was served here or by a paired Mac. The library is
// read-only, and run_shortcut returns realistic canned output (nothing on a real
// device is touched), so no per-user state is needed.

export const DEMO_EMAIL = (process.env.DEMO_EMAIL || 'reviewer@shortcutsbridge.demo').toLowerCase();

// A small, believable Shortcuts library across a few folders.
const LIBRARY = [
  { name: 'Morning Briefing', folder: 'Daily',  run: () => '☀️ Good morning! Cupertino: 68°F now, sunny, high of 79°F. Calendar: 3 events — Standup 9:30, Design review 1:00, Dentist 4:15. Top reminder: Ship connector review.' },
  { name: 'Directions Home',  folder: 'Daily',  run: () => '🚗 Home is 18 min away via I-280 N — light traffic. Leave now and you arrive around 6:42 PM.' },
  { name: 'Set a Timer',      folder: 'Daily',  run: (i) => { const n = parseInt(i, 10); return `⏱️ Timer set for ${Number.isFinite(n) ? n : 10} minute${n === 1 ? '' : 's'}.`; } },
  { name: 'Start Focus',      folder: 'Work',   run: () => '🎯 Work focus on for 50 minutes. Notifications silenced, Slack set to Away, Do Not Disturb enabled.' },
  { name: 'Daily Standup',    folder: 'Work',   run: (i) => `✅ Posted to #team-standup: "${(i && String(i).trim()) || 'Yesterday: shipped the connector. Today: OpenAI submission. No blockers.'}"` },
  { name: 'Movie Night',      folder: 'Home',   run: () => '🍿 Movie Night set: living-room lights dimmed to 15%, TV switched to Apple TV, Do Not Disturb on.' },
  { name: 'Log Water',        folder: 'Health', run: (i) => { const ml = parseInt(i, 10) || 250; return `💧 Logged ${ml} ml. Today: ${1000 + ml} ml of your 2,000 ml goal.`; } },
];

const norm = (s) => String(s || '').trim().toLowerCase();

// eslint-disable-next-line no-unused-vars — userId kept for signature parity
export async function demoExec(userId, tool, args = {}) {
  switch (tool) {
    case 'list_shortcuts': {
      let items = LIBRARY;
      if (args.folder) {
        const f = norm(args.folder);
        items = items.filter((s) => norm(s.folder) === f);
        if (!items.length) throw new Error(`Folder not found: ${args.folder}`);
      }
      let names = items.map((s) => s.name);
      if (args.query) { const q = norm(args.query); names = names.filter((n) => n.toLowerCase().includes(q)); }
      names = names.sort((a, b) => a.localeCompare(b));
      return { shortcuts: names, count: names.length, folder: args.folder || null };
    }
    case 'search_shortcuts': {
      const q = norm(args.query);
      const names = LIBRARY.map((s) => s.name).filter((n) => n.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b));
      return { query: args.query || '', shortcuts: names, count: names.length };
    }
    case 'list_folders': {
      const folders = [...new Set(LIBRARY.map((s) => s.folder))].sort((a, b) => a.localeCompare(b));
      return { folders, count: folders.length };
    }
    case 'run_shortcut': {
      const name = String(args.name || '').trim();
      const sc = LIBRARY.find((s) => norm(s.name) === norm(name)) || LIBRARY.find((s) => norm(s.name).includes(norm(name)) && name);
      if (!sc) throw new Error(`Shortcut not found: ${name || ''}`);
      return { shortcut: sc.name, ran: true, output: sc.run(args.input) };
    }
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}
