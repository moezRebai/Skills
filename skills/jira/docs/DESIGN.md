# Jira Actions Skill — Design

## Purpose

A generic, project-agnostic agent skill for taking actions against Jira Cloud:
create/read/update issues, search via JQL, transition status, comment, manage assignee,
attach files, and discover project/issue-type/field metadata. Usable from any project.

## Location

`C:\Solutions\skills\jira\` — its own local git repository (no remote configured), separate
from any other skill in `C:\Solutions\skills\`, following a standard skill folder convention
(`SKILL.md` + `scripts/` + `references/`).

## Non-goals

- No `delete-issue` action. Jira issue deletion has no undo via the API; if you need to
  delete an issue, do it manually in the Jira UI, which has its own confirmation dialog.
- Not a bidirectional/continuous sync of any kind — every action is a single one-shot
  REST call the agent makes when asked.
- No full ADF fidelity (tables, panels, mentions, emojis, nested/multi-line list items) —
  see "Text conversion" below.

## Architecture

```
jira/
  SKILL.md                    — trigger description + workflow/safety guidance
  docs/DESIGN.md               — this document
  scripts/
    jira.mjs                   — CLI entry point: reads action name from argv, JSON payload from stdin
    client.mjs                 — JiraClient class (fetch-based, no SDK dependency)
    credentials.mjs            — credential resolution (env vars -> config file)
    adf.mjs                    — markdown <-> ADF conversion (basic subset)
    fake-jira-server.mjs       — local node:http fake Jira server, used only by tests
    *.test.mjs                 — one test file per module (Node's built-in test runner)
  references/
    actions.md                 — per-action JSON payload/response schema + examples
```

Plain Node.js ES modules, native `fetch`, zero npm dependencies, no build step — self-contained
and dependency-free by design. Requires only a Node.js runtime (18+, for native `fetch`) on the
machine invoking the skill.

## Interface

Single script, JSON in / JSON out:

```
node scripts/jira.mjs <action>
```

The JSON payload is piped via **stdin**, not passed as a CLI argument — this sidesteps
PowerShell's quoting problems with multi-line markdown descriptions containing quotes,
backticks, or newlines. On success the script prints a JSON result to stdout and exits 0. On
failure it prints `{"error": "<message>"}` to stderr and exits 1.

`SKILL.md` documents the exact invocation and payload shape for each action; `references/actions.md`
holds the full schema reference and examples so `SKILL.md` itself stays short.

## Actions

Full CRUD except delete, plus discovery and file attachments:

| Action | Payload | Notes |
|---|---|---|
| `create-issue` | `{ project?, issueType, summary, description?, parentKey?, labels?, assignee? }` | `project` falls back to the configured default project key if omitted |
| `get-issue` | `{ key, fields? }` | `fields` optional list to limit response; defaults to a sensible standard set |
| `update-issue` | `{ key, fields: { summary?, description?, labels?, ... } }` | generic partial update |
| `search-issues` | `{ jql, fields?, maxResults? }` | arbitrary JQL; uses Jira's current `POST /rest/api/3/search/jql` endpoint (the older `GET /rest/api/3/search` is deprecated/removed) |
| `list-transitions` | `{ key }` | lists available transitions with id + name |
| `transition-issue` | `{ key, transition }` | `transition` may be a name (case-insensitive) or an id |
| `add-comment` | `{ key, body }` | `body` is markdown, converted to ADF |
| `list-comments` | `{ key }` | returns comments with ADF converted back to markdown |
| `set-assignee` | `{ key, accountId }` or `{ key, email }` | if `email` given, resolves to `accountId` via `/rest/api/3/user/search` first |
| `attach-file` | `{ key, filePath }` | uploads a real file as a Jira attachment via multipart upload |
| `list-projects` | `{}` | `GET /rest/api/3/project/search` |
| `list-issue-types` | `{ projectKey? }` | global list, or scoped to a project if given |
| `list-fields` | `{}` | `GET /rest/api/3/field` |
| `whoami` | `{}` | `GET /rest/api/3/myself` — verifies credentials and returns the caller's `accountId` (useful for "assign to me") |

## Text conversion (ADF)

Jira stores descriptions and comment bodies as Atlassian Document Format (ADF), not plain
text or markdown, so a naive "send the raw string" approach only round-trips a single plain
paragraph — too limited for general use.

This skill converts a **basic markdown subset** both directions:
- Headings (`#`–`######`)
- Paragraphs
- Flat bullet and numbered lists (single-line items only)
- Bold / italic
- Inline code and fenced code blocks
- Links

Not supported (documented as known gaps in `references/actions.md` and `SKILL.md`): tables,
panels, mentions, emojis, and nested or multi-line list items (a list item that wraps onto a
continuation line, or has its own sub-bullets, currently falls through to plain-paragraph
parsing and loses its list structure). `get-issue`/`list-comments` fall back to best-effort
plain text extraction for anything outside the subset.

## Credentials

Single active profile, resolved in this order:

1. Environment variables: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`.
2. Fallback config file: `~/.jira-credentials.json` (home-directory scoped, not repo-scoped,
   since this skill is meant to be used across arbitrary projects/repos).

`JIRA_PROJECT_KEY` / the config file's `projectKey` is only a **default** — any action that
takes a `project`/`projectKey` field can override it per-call. Auth is HTTP Basic
(`base64(email:apiToken)`). `whoami` is the recommended way to verify credentials are resolved
correctly before doing anything else.

## Safety policy

`SKILL.md` instructs the calling agent to always show the user what a mutating action will do
(issue key/summary and the change being made) and get explicit confirmation before calling
`create-issue`, `update-issue`, `transition-issue`, `add-comment`, `set-assignee`, or
`attach-file` — all of these hit a real Jira instance and aren't easily reversible from here.
Read-only actions (`get-issue`, `search-issues`, `list-*`, `whoami`) run without confirmation.

## Error handling

`client.mjs` throws on any non-2xx response, including the response body. `jira.mjs`'s
top-level dispatch catches any thrown error, prints `{"error": "<message>"}` to stderr, and
exits with code 1 — giving the calling agent a structured, parseable failure instead of a raw
stack trace.

## Testing

`scripts/fake-jira-server.mjs` spins up a local `node:http` server that mimics the relevant
Jira REST endpoints (issue CRUD, search, transitions, comments, assignee, attachments,
discovery) — including a real multipart parser for attachment uploads, so tests are genuine
round trips rather than mocked. Each module has its own `*.test.mjs` file, run via Node's
built-in test runner:

```
node --test scripts/*.test.mjs
```

(the glob is required — `node --test scripts/` alone doesn't discover files on the Node
version this was built against).

## How this was built

Specced, planned, and implemented through a spec → plan → TDD-implementation → code-review
workflow: a fresh implementer pass per task, a spec-compliance-and-quality review after each
(with fix/re-review loops where issues surfaced), and a final whole-codebase review at the
end. That final review caught and fixed one real production issue (the deprecated search
endpoint) before the skill was ever exercised against a live Jira instance. `attach-file` was
added afterward, under the same TDD discipline, in response to a real usage need. Since then
it has been smoke-tested against a real Jira Cloud instance (`whoami`, `list-issue-types`,
`search-issues`, `create-issue`, `attach-file`, `add-comment`, `update-issue`, `set-assignee`)
— all working as designed, with the two ADF known-limitations (tables, nested lists) surfacing
exactly as documented rather than as surprises.
