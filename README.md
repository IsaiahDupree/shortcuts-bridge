<div align="center">

# ⚡ ShortcutsBridge

**Run your Apple Shortcuts from ChatGPT — on your own Mac.**

[![License: MIT](https://img.shields.io/badge/License-MIT-f5b942.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/shortcuts-agent.svg?color=4ade80&label=shortcuts-agent)](https://www.npmjs.com/package/shortcuts-agent)

</div>

ShortcutsBridge is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) connector that lets ChatGPT list, search, and **run** your **Apple Shortcuts**. It never uploads your shortcuts to a third party — every action runs on **your own Mac** through a tiny local agent. The cloud piece is only a stateless relay that shuttles requests between ChatGPT and your Mac.

```
  ChatGPT  ──OAuth──►  ShortcutsBridge relay  ──job queue──►  shortcuts-agent  ──►  Shortcuts.app
 (connector)          (Vercel, stateless)      (your Mac, polls & executes)     (via the shortcuts CLI)
```

Your Mac is the only place your shortcuts are ever listed or run. The relay stores only short-lived job payloads and your account record; it never sees a shortcut unless a job is in flight, and jobs expire in seconds.

Because a Shortcut can do almost anything on a Mac or iPhone — control HomeKit, drive apps, run scripts, call web APIs — `run_shortcut` turns ChatGPT into a trigger for any automation you've already built.

---

## For users — 3 steps

**1. Create your account** at **[shortcutsbridge.vercel.app](https://shortcutsbridge.vercel.app)** and generate a pairing code.

**2. Install the Mac agent** (needs [Node 18+](https://nodejs.org)):

```bash
npx shortcuts-agent pair <YOUR-CODE>   # link this Mac to your account
npx shortcuts-agent install            # keep it running on every restart
```

The first time a given shortcut runs, macOS may ask you to allow it — click **OK** (once per shortcut). It's per-shortcut consent, not a blanket automation grant.

**3. Connect ChatGPT:** Settings → **Plugins** → turn on **Developer mode** (Security & login) → **Create** a custom plugin → paste the MCP Server URL **`https://shortcutsbridge.vercel.app/mcp`** → Authentication **OAuth** → sign in & **Allow**.

That's it. In a new chat: *"Search my Apple Shortcuts for anything about focus"* or *"Run my Morning Briefing shortcut."*

> Your Mac must be awake with the agent running. `npx shortcuts-agent install` makes it start automatically at login and restart if it ever crashes.

### Managing the agent

```bash
npx shortcuts-agent status      # is it paired & reachable?
npx shortcuts-agent logs        # recent activity
npx shortcuts-agent uninstall   # stop auto-start
```

---

## What ChatGPT can do

| Tool | Action |
|------|--------|
| `list_shortcuts` | List every shortcut on your Mac (read-only) |
| `search_shortcuts` | Find shortcuts by keyword (read-only) |
| `list_folders` | List your Shortcuts folders (read-only) |
| `run_shortcut` | Run a shortcut by name, with optional text input, and return its output |

The first three are read-only catalogue lookups. `run_shortcut` is the only tool that *does* something — it's open-world (the shortcut can take real-world actions), so ChatGPT confirms with you before running one, and only shortcuts you've already built can run.

---

## Self-hosting

You can run your own relay so nothing depends on the hosted instance.

**Prereqs:** a [Vercel](https://vercel.com) account and a [Supabase](https://supabase.com) project (free tiers are fine).

1. **Storage** — in your Supabase project's SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates a tiny Redis-shaped KV + queue surface (`nb_*` functions) with RLS on.
2. **Deploy** the `server/` directory to Vercel.
3. **Set env vars** (see [`server/.env.example`](./server/.env.example)):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — your project + service-role key
   - `JWT_SECRET` — `openssl rand -hex 32`
4. **Verify:** `curl https://YOUR-APP.vercel.app/api/health` → `redisConfigured`, `redisOk`, `jwtSecretSet` all `true`.
5. Point the agent at it: `npx shortcuts-agent pair <CODE> --server https://YOUR-APP.vercel.app`.

---

## How it works

- **Auth** — OAuth 2.1 with PKCE and Dynamic Client Registration (RFC 7591). ChatGPT registers itself, the user signs in on the ShortcutsBridge consent page, and ChatGPT gets a scoped MCP access token. JWTs are HMAC-signed; three kinds (`session`, `agent`, `mcp`) with distinct privileges. Optional email verification via Resend (`RESEND_API_KEY`); off unless configured, and enforcement is opt-in (`REQUIRE_EMAIL_VERIFICATION`).
- **Relay** — MCP tool call → job pushed to `jobs:<user>` (TTL ≤ the caller's wait window, so an abandoned job can't run late) → the Mac agent (holding a hanging long-poll) is handed the job within ~200ms, executes it, pushes the result → the MCP handler returns it. The long-poll means jobs are delivered on arrival rather than on a fixed interval, so relay overhead is ~300ms instead of ~1s. The agent is considered "online" only while it's actively connected.
- **Agent** — a dependency-free Node CLI. Tools shell out to the macOS `shortcuts` command-line tool (`shortcuts list`, `shortcuts run`); arguments are passed as argv (never shell-interpolated). A macOS LaunchAgent keeps it alive across logins and crashes.

## Repository layout

```
server/    Vercel functions: OAuth + MCP endpoint + relay        (deploy this)
agent/     shortcuts-agent — the npm-published Mac CLI          (users npx this)
kit/       Browser automations: register the dev-mode connector AND
           fill the OpenAI directory submission (see kit/README.md)
supabase/  schema.sql for self-hosting the storage
test/      end-to-end OAuth + MCP integration test
```

## Development

```bash
# server
cd server && cp .env.example .env.local   # fill in, then: vercel dev
# end-to-end test against a live deployment (reads ../.env.local)
node test/e2e-oauth.mjs
# agent unit tests
node --test agent/test-agent-unit.mjs
```

## Security & privacy

- Shortcuts are listed and run **only on your Mac**. The relay never persists shortcut content — job payloads live in Redis-shaped storage with a short TTL and are deleted on delivery.
- The agent token is stored at `~/.shortcutsbridge-agent.json` (mode `600`).
- No secrets are committed; see [`.gitignore`](./.gitignore) and the `.env.example` files.
- `run_shortcut` is marked open-world — a shortcut can take real-world actions — so ChatGPT asks before running one. Only shortcuts you've already built can run.

## License

[MIT](./LICENSE) © Isaiah Dupree
