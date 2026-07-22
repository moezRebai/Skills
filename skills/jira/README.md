# jira

An agent skill for taking actions against a Jira Cloud instance — create, read, update, and
search issues; transition status; comment; manage assignees; attach files; and discover
projects/issue types/fields. A bundled, dependency-free Node.js script does the actual work;
`SKILL.md` tells an agent when and how to use it.

## Requirements

- Node.js 18+ (for native `fetch`).
- A Jira Cloud account with an API token.

## Setup

Credentials resolve from environment variables first, then a config file:

| Env var | Config file key | Example |
|---|---|---|
| `JIRA_BASE_URL` | `baseUrl` | `https://yourcompany.atlassian.net` |
| `JIRA_EMAIL` | `email` | your Atlassian account email |
| `JIRA_API_TOKEN` | `apiToken` | from https://id.atlassian.com/manage-profile/security/api-tokens |
| `JIRA_PROJECT_KEY` | `projectKey` | optional default project (e.g. `PROJ`) |

Config file lives at `~/.jira-credentials.json`:

```json
{ "baseUrl": "https://yourcompany.atlassian.net", "email": "you@example.com", "apiToken": "...", "projectKey": "PROJ" }
```

If credentials aren't set up yet, running any action fails fast with a clear
`"Jira credentials not found"` error — the script itself never prompts interactively. An
agent using this skill is expected to notice that error, ask you for the three required
values, and write the config file for you.

Verify setup:

```bash
echo '{}' | node scripts/jira.mjs whoami
```

## How to invoke it

```bash
node scripts/jira.mjs <action>
```

The JSON payload is piped via **stdin**, not passed as an argument (avoids shell-quoting
problems with multi-line markdown):

```bash
echo '{"issueType":"Bug","summary":"Login button unresponsive"}' | node scripts/jira.mjs create-issue
```

Success prints a JSON result to stdout and exits 0. Failure prints `{"error": "..."}` to
stderr and exits 1.

## Actions at a glance

| Action | What it does |
|---|---|
| `create-issue` | create an issue (optionally nested under an Epic via `parentKey`) |
| `get-issue` | read one issue's fields |
| `update-issue` | partially update an issue's fields |
| `search-issues` | run arbitrary JQL |
| `list-transitions` | list an issue's available status transitions |
| `transition-issue` | move an issue to a new status |
| `add-comment` / `list-comments` | comment on an issue / read its comments |
| `set-assignee` | assign an issue by `accountId` or `email` |
| `attach-file` | upload a real file as a Jira attachment |
| `list-projects` / `list-issue-types` / `list-fields` | discover what exists in the instance |
| `whoami` | verify credentials, get your own `accountId` |

Full payload/response shapes and examples: `references/actions.md`.

## Safety

`create-issue`, `update-issue`, `transition-issue`, `add-comment`, `set-assignee`, and
`attach-file` all write to a real Jira instance. `SKILL.md` instructs the calling agent to
always show you exactly what will change and get your explicit confirmation before calling
any of them. Everything else (`get-issue`, `search-issues`, `list-*`, `whoami`) is read-only.

## Known limitations

- No `delete-issue` action — delete issues manually in the Jira UI.
- Markdown support for descriptions/comments covers headings, paragraphs, flat single-line
  bullet/numbered lists, bold/italic, inline code, fenced code blocks, and links. Tables,
  panels, mentions, emoji, and nested/multi-line list items aren't supported and degrade to
  best-effort plain text.
- One-shot actions only — not a continuous or bidirectional sync.

## More detail

- `docs/DESIGN.md` — architecture, credential resolution order, safety policy rationale, testing approach.
- `references/actions.md` — every action's exact payload/response shape with examples.
