# ShortcutsBridge — paste-ready submission answers

Fill the OpenAI plugin submission form (platform.openai.com/plugins → **Create
plugin** → **With MCP**) with the values below. Fields verified against the live
portal on 2026-07-17. Requires developer identity verification first (see
SUBMISSION.md).

---

## Connection

| Field | Value |
|---|---|
| MCP Server URL | `https://shortcutsbridge.vercel.app/mcp` |
| Authentication | OAuth |
| OAuth — the portal auto-discovers these from the URL's `/.well-known` metadata | authorization: `https://shortcutsbridge.vercel.app/oauth/authorize` · token: `https://shortcutsbridge.vercel.app/api/oauth/token` · registration (DCR): `https://shortcutsbridge.vercel.app/api/oauth/register` · PKCE S256 · scope `shortcuts` |

After entering the URL, click **Scan Tools** — it should discover all 4 tools.

## Listing (App Info section — exact fields on the live form)

| Field | Value |
|---|---|
| **Name** | ShortcutsBridge |
| **Subtitle** ⚠️ ≤30 chars | `Run your Apple Shortcuts` |
| **Category** | Productivity |
| **Developer Identity** | Business — Dupree Ops LLC *(the verified identity; requires ID verification first)* |
| **Plugin Author** | Isaiah Dupree |
| **Website URL** | `https://shortcutsbridge.vercel.app` |
| **Customer support URL** | `https://shortcutsbridge.vercel.app/support` |
| **Privacy policy URL** | `https://shortcutsbridge.vercel.app/privacy` |
| **Terms of Service URL** | `https://shortcutsbridge.vercel.app/terms` |
| **Demo Recording URL** ⚠️ required | *(a hosted screen-recording of the plugin working — you must record this)* |
| **Directory icon / composer icon** | `assets/icon-512.png` (512×512 PNG) |
| **Commerce & Purchasing** | leave unchecked — ShortcutsBridge is free (no purchases, no subscription) |

**Description:**
> ShortcutsBridge connects ChatGPT to the Apple Shortcuts on your Mac. List and search every shortcut you've built, browse your folders, and run any shortcut by name — with optional text input — straight from a chat, and get its output back. Because a Shortcut can do almost anything (control HomeKit, drive apps, run scripts, call web APIs), this turns ChatGPT into a trigger for the automations you already trust. Your shortcuts never live on our servers: every action runs on your own Mac by a small open-source agent you install with one command (`npx shortcuts-agent`), and the relay only carries each request for the seconds it's in flight. Running a shortcut is always confirmed by you in ChatGPT first, and only shortcuts you've already built can run. Free and open source (MIT), self-hostable.

*These values are also encoded in [`kit/submission.config.json`](./kit/submission.config.json), which `kit/submit-plugin.mjs` fills automatically.*

## Demo / reviewer account (no MFA)

> This connector normally relays to the user's own Mac. For review, sign in with
> the account below — it runs every tool against a built-in sample Shortcuts
> library, so all 4 tools work 24/7 with no desktop app or pairing required.

- Email: `reviewer@shortcutsbridge.demo`
- Password: *(the `DEMO_PASSWORD` value in `.env.local` — paste it here at submission)*

The reviewer library is fictional and self-contained: shortcuts **Morning
Briefing, Directions Home, Set a Timer, Start Focus, Daily Standup, Movie Night,
Log Water** in folders **Daily, Work, Home, Health**. `run_shortcut` returns
realistic canned output, so a reviewer can list, search, and run everything with
no Mac.

## Test prompts & expected responses

Sign in as the reviewer account, add the connector via OAuth, then run these in
order against the demo library:

1. **"List my Apple Shortcuts"** → `list_shortcuts` →
   `{ "shortcuts": ["Morning Briefing", "Directions Home", "Set a Timer", "Start Focus", "Daily Standup", "Movie Night", "Log Water"] }`
2. **"What Shortcuts folders do I have?"** → `list_folders` →
   `{ "folders": ["Daily", "Work", "Home", "Health"] }`
3. **"Search my shortcuts for focus"** → `search_shortcuts` (query `focus`) →
   `{ "results": ["Start Focus"] }`
4. **"Run my Morning Briefing shortcut"** → `run_shortcut` (name `Morning Briefing`) →
   `{ "output": "Good morning! 72°F and sunny. 3 events today; first up is Daily Standup at 9:30am." }` (ChatGPT confirms before running)
5. **"Run Log Water with input '16oz'"** → `run_shortcut` (name `Log Water`, input `16oz`) →
   `{ "output": "Logged 16oz. You're at 48oz of your 64oz goal today." }` (ChatGPT confirms before running)

## Negative test cases (exactly 3 — prompts where ShortcutsBridge should NOT trigger)

1. **General productivity advice** — *"What's a good way to build a solid morning
   routine?"* — abstract question, no action on the user's own Apple Shortcuts.
2. **A different automation surface** — *"Set up a Zapier zap for this."* —
   ShortcutsBridge only runs Apple Shortcuts, not Zapier/IFTTT/Make.
3. **Authoring a shortcut** — *"Build me a new shortcut that texts my mom."* —
   ShortcutsBridge only lists, searches, and runs shortcuts you've already made;
   it can't create or edit them.

## Release notes (first release)

> Initial release. ShortcutsBridge connects ChatGPT to your Apple Shortcuts through
> a small open-source agent that runs on your own Mac — list and search your
> shortcuts, browse your folders, and run any shortcut by name with optional text
> input, getting its output back. Running a shortcut is always confirmed by you
> first, and only shortcuts you've already built can run. Your shortcuts never live
> on our servers; the cloud piece is only a stateless relay. Free and open source
> (MIT), self-hostable.

## Tools declared (4)

`list_shortcuts`, `search_shortcuts`, `list_folders` (read-only catalogue
lookups), and `run_shortcut` — the only non-read-only tool, annotated open-world
because a shortcut can take real-world actions, so ChatGPT confirms before running
one and only pre-existing shortcuts can run.
