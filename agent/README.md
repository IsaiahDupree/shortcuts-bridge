# shortcuts-agent

The Mac-side half of **ShortcutsBridge** — it lets ChatGPT and Claude list and run your
**Apple Shortcuts**. This tiny agent runs on your Mac, connects to the ShortcutsBridge relay,
and does the actual talking to the Shortcuts app (via the built-in macOS `shortcuts` CLI).
Your shortcuts never leave your machine except for the specific request you make.

- No account, no password, no cloud copy of your shortcuts.
- One command to pair, one command to keep it running forever.
- No dependencies — just Node 18+.

---

## Quick start

You need [Node.js 18 or newer](https://nodejs.org). Then:

```sh
# 1. On the ShortcutsBridge site, click "Connect my Mac" to get a pairing code.
# 2. Pair this Mac (replace ABCD-1234 with your code):
npx shortcuts-agent pair ABCD-1234

# 3. Keep it running in the background — starts on login, restarts if it crashes:
npx shortcuts-agent install
```

That's it. You can close the terminal — the agent keeps running.

> **First run permission prompt:** the first time a given shortcut is **run**, macOS may
> show a one-time prompt asking to allow it — and the shortcut itself may ask for its own
> permissions (Calendar, Photos, network, etc.). Approve it once and future runs are silent.
> There's no Automation/Apple Events grant to configure up front; permission is granted
> per shortcut, the first time each one runs.

### Want it permanent? Install globally

`npx` runs from a cache that npm can prune, which would break the background agent.
For an always-on setup, install it globally so the path is stable:

```sh
npm install -g shortcuts-agent
shortcuts-agent pair ABCD-1234
shortcuts-agent install
```

---

## Commands

| Command | What it does |
|---|---|
| `shortcuts-agent pair <CODE>` | Claim a pairing code and save the agent token to `~/.shortcutsbridge-agent.json` (mode 600). |
| `shortcuts-agent install` | Install a macOS LaunchAgent so the agent auto-starts on login and restarts on crash. |
| `shortcuts-agent run` | Run the agent in the foreground (Ctrl-C to stop). `install` does this for you in the background. |
| `shortcuts-agent status` | Check that you're paired, the server is reachable, and whether auto-start is installed. |
| `shortcuts-agent logs` | Show the last ~50 lines of the background agent log. |
| `shortcuts-agent uninstall` | Stop and remove the background agent (LaunchAgent). |
| `shortcuts-agent --version` | Print the version. |
| `shortcuts-agent --help` | Show usage. |

All commands accept `--server <URL>` to point at a different relay
(default: `https://shortcutsbridge.vercel.app`).

---

## How it works

```
ChatGPT / Claude  ──MCP──▶  ShortcutsBridge relay  ◀──poll──  shortcuts-agent (your Mac)
                                                              │
                                                              ▼
                                                     macOS `shortcuts` CLI ──▶  your Shortcuts
```

The agent long-polls the relay for jobs and executes each one by shelling out to the
built-in macOS `shortcuts` command — using `execFile` (no shell, so nothing is
interpreted by `/bin/sh`). It enumerates your shortcuts with `shortcuts list` (plus
`--folders` and `--folder-name` for folder-aware listing) and runs one with
`shortcuts run <name>`, optionally piping input in with `--input-path` and capturing the
shortcut's output with `--output-path`. There is **no** `osascript`/JXA and no Apple
Events automation of any app — just the first-party CLI. All of this lives in
`agent/shortcuts-cli.mjs`. When there's nothing to do it just idles.

It serves four tools:

| Tool | What it does |
|---|---|
| `list_shortcuts` | List every shortcut on this Mac (name, and folder when known). |
| `search_shortcuts` | List shortcuts whose name matches a query string. |
| `list_folders` | List your Shortcuts **folders**. |
| `run_shortcut` | Run one shortcut by name, optionally passing input, and return its output. |

Because `run_shortcut` executes real automation you authored, ChatGPT/Claude confirms
with you before running one, and only shortcuts that already exist on your Mac can be run.

### Why it must run in your login session

The macOS `shortcuts` CLI only sees the shortcuts belonging to the **logged-in user's
session** — so the agent has to run there too. A LaunchAgent (which this installs)
runs in your GUI login session, which is exactly what's needed; it is **not** a system
daemon. If you run the agent over SSH or from a session that isn't your desktop login,
`shortcuts list` may come back empty.

### Example tool usage

```jsonc
// List everything, then run a shortcut:
list_shortcuts()                          // → ["Morning Briefing", "Log Water", ...]
run_shortcut({ name: "Morning Briefing" })  // → the shortcut's text output

// Run a shortcut and feed it input:
run_shortcut({ name: "Log Water", input: "16 oz" })
```

- Config/token: `~/.shortcutsbridge-agent.json` (permissions `600`).
- Background logs: `~/Library/Logs/shortcutsbridge-agent.log` and `shortcutsbridge-agent.err.log`.
- LaunchAgent: `~/Library/LaunchAgents/com.shortcutsbridge.shortcuts-agent.plist`.

---

## Troubleshooting

**"Not paired" / it stopped working after a while.**
Your pairing token may have been revoked. Re-pair and reinstall:

```sh
shortcuts-agent pair <NEW-CODE>
shortcuts-agent install
```

If the background agent hit a `401`, it writes `~/.shortcutsbridge-agent.unauthorized`
and keeps the reason in the error log — check `shortcuts-agent logs`.

**`list_shortcuts` comes back empty, or a shortcut won't run.**
The agent has to run in your desktop login session for the `shortcuts` CLI to see your
shortcuts — make sure it was installed as a LaunchAgent (not launched over SSH), then
`shortcuts-agent uninstall` and `install` again. The first time a specific shortcut
runs, approve any one-time macOS prompt (and any permission the shortcut itself asks for).

**Check what's happening.**

```sh
shortcuts-agent status   # paired? reachable? auto-start installed?
shortcuts-agent logs     # recent activity + errors
```

**Uninstall completely.**

```sh
shortcuts-agent uninstall
rm ~/.shortcutsbridge-agent.json   # also forget the pairing token
```

**Non-macOS.** `install`/`uninstall`/`logs` are macOS-only (they use LaunchAgents).
`pair`, `run`, and `status` work anywhere Node runs, but the `shortcuts` CLI itself
requires macOS.

---

## Privacy

The agent only contacts the relay server you paired with. It sends the result of the
specific shortcut operation you (via ChatGPT/Claude) requested — nothing else. Your
shortcuts are not uploaded or indexed anywhere.

## License

MIT © Isaiah Dupree
