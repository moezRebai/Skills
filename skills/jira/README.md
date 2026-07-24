# jira

An agent skill for taking actions against a Jira Cloud or Server/Data Center instance —
create, read, update, and search issues; transition status; comment; manage assignees;
attach files; and discover projects/issue types/fields. A bundled, dependency-free Node.js
script does the actual work; `SKILL.md` tells an agent when and how to use it.

## Prerequisites

- Node.js 18+ (for native `fetch`).
- Jira credentials, depending on deployment type:
  - **Cloud** — an Atlassian account email and an API token from
    https://id.atlassian.com/manage-profile/security/api-tokens.
  - **Server/Data Center** — a Personal Access Token generated from your Jira profile's
    Personal Access Tokens page (not id.atlassian.com — that's Cloud-only). No email needed.
- **Server/Data Center only, if the instance uses a self-signed or internal CA certificate**:
  either the internal CA's certificate file (to set `NODE_EXTRA_CA_CERTS`, the proper fix) or
  willingness to accept disabled TLS verification (`allowInsecureTls`, a last resort). See
  "Self-signed or internal CA certificates" below.

## Setup

Credentials resolve from environment variables first, then a config file. Two deployment
types are supported, selected by `deploymentType`/`JIRA_DEPLOYMENT_TYPE` (defaults to
`"cloud"`):

| Env var | Config file key | Example |
|---|---|---|
| `JIRA_BASE_URL` | `baseUrl` | `https://yourcompany.atlassian.net` (Cloud) or `https://jira.yourcompany.com` (Server/DC) |
| `JIRA_EMAIL` | `email` | your Atlassian account email (Cloud only) |
| `JIRA_API_TOKEN` | `apiToken` | Cloud API token, or Server/DC Personal Access Token |
| `JIRA_PROJECT_KEY` | `projectKey` | optional default project (e.g. `PROJ`) |
| `JIRA_DEPLOYMENT_TYPE` | `deploymentType` | `"cloud"` (default) or `"server"` |
| `JIRA_ALLOW_INSECURE_TLS` | `allowInsecureTls` | optional, `true` to skip TLS verification (insecure, last resort) |

Config file lives at `~/.jira-credentials.json`, e.g. for Cloud:

```json
{ "baseUrl": "https://yourcompany.atlassian.net", "email": "you@example.com", "apiToken": "...", "projectKey": "PROJ" }
```

or for Server/Data Center:

```json
{ "baseUrl": "https://jira.yourcompany.com", "apiToken": "...", "deploymentType": "server", "projectKey": "PROJ" }
```

If credentials aren't set up yet, running any action fails fast with a clear
`"Jira credentials not found"` error — the script itself never prompts interactively. An
agent using this skill is expected to notice that error, ask you for the required values,
and write the config file for you.

Verify setup:

```bash
echo '{}' | node scripts/jira.mjs whoami
```

### Self-signed or internal CA certificates

If `whoami` (or any action) fails with a TLS/certificate error against a Server/Data Center
instance on an internal domain, its certificate is likely signed by an internal or
self-signed CA that Node doesn't trust by default. Two options, in order of preference:

- **Set `NODE_EXTRA_CA_CERTS`** to the internal CA's certificate file. This is a standard
  Node.js environment variable, not specific to this skill, and Node only reads it once at
  process startup — setting it in `~/.jira-credentials.json` would have no effect, since the
  credentials file is read *after* the process has already started. It must exist as a real
  environment variable *before* the skill's `node` process launches, which in practice means
  setting it persistently at the OS level (a one-time setup step, not something to redo per
  session):
  - **Windows**: `setx NODE_EXTRA_CA_CERTS "C:\path\to\internal-ca.pem"`, then restart any
    terminal/app (including Claude Code) that should pick it up — `setx` only affects new
    processes started after it runs, not the current session.
  - **macOS/Linux**: add `export NODE_EXTRA_CA_CERTS=/path/to/internal-ca.pem` to your shell
    profile (`~/.zshrc`, `~/.bashrc`, etc.), then restart your terminal/app.
  This properly verifies the certificate chain, unlike the option below.
- **Set `allowInsecureTls`** (`JIRA_ALLOW_INSECURE_TLS=true`, or `"allowInsecureTls": true`
  in `~/.jira-credentials.json`) only if you can't obtain the CA certificate. This disables
  TLS certificate verification for this skill's requests — insecure, last resort.

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
