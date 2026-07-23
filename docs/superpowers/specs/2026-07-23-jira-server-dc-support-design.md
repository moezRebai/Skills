# Jira Skill: Server/Data Center Support — Design

## Problem

The `jira` skill (`skills/jira/`) only works against Jira **Cloud**: it uses HTTP Basic auth
(`base64(email:apiToken)`), hardcodes `/rest/api/3/...` paths, sends descriptions/comments as
Atlassian Document Format (ADF), and uses Cloud's `accountId` concept for assignees. None of
that is compatible with Jira **Server/Data Center**, which uses Bearer-token auth (Personal
Access Tokens), only exposes API v2 (v3 doesn't exist there), takes plain-string bodies for
description/comment fields, and identifies users by `name` (username), not `accountId`.

A user with a company Jira Server/DC instance confirmed: they generated a Personal Access
Token from their Jira profile (not `id.atlassian.com`), pointed the skill at their company's
custom domain, and every call fails with 401/403 — consistent with Basic auth being rejected
by a server expecting Bearer auth.

## Goals

- Support both Jira Cloud and Jira Server/Data Center from the same skill, selected by explicit
  configuration (no auto-detection/probing).
- Preserve full backward compatibility: existing Cloud users' credentials and behavior are
  unchanged (Cloud remains the default deployment type).
- Preserve markdown formatting fidelity (headings, lists, bold/italic, code, links) for
  descriptions and comments on Server/DC, not just plain-text fallback.

## Non-goals

- Auto-detecting deployment type by probing the server. Explicit config only.
- Any change to the skill's safety policy (confirm-before-mutating rules are unaffected).
- Supporting Jira Server/DC's older Basic auth (username+password) — PAT/Bearer only, since
  that's the current supported auth method for Server/DC and matches what the user has.

## Credentials & configuration

New optional field, `deploymentType`, in both env vars and the credentials file:

- Env var: `JIRA_DEPLOYMENT_TYPE` — `"cloud"` (default) or `"server"`.
- File field: `deploymentType` in `~/.jira-credentials.json`.

`apiToken` is reused for both: a Cloud API token for `deploymentType: "cloud"`, a Personal
Access Token for `deploymentType: "server"`. `email` remains required for cloud, becomes
optional/unused for server (Bearer auth doesn't need it).

`credentials.mjs`'s `isComplete()` branches on `deploymentType`:
- cloud (default): requires `baseUrl`, `email`, `apiToken`.
- server: requires `baseUrl`, `apiToken`.

## Client architecture

`JiraClient` stays a single class. At construction, based on `credentials.deploymentType`, it
selects four deployment-specific behaviors — everything else (issue CRUD shape, transitions,
list-comments, list-projects/issue-types/fields, attach-file) is identical between deployments
and untouched:

1. **`authHeader()`** — `Basic base64(email:apiToken)` for cloud; `Bearer <apiToken>` for
   server.
2. **`apiBase`** — `/rest/api/3` for cloud; `/rest/api/2` for server. Replaces every hardcoded
   `/rest/api/3/...` path in `client.mjs`.
3. **Body formatting for `description`/comment `body`** — `markdownToAdf`/`adfToMarkdown` (ADF
   object) for cloud; new `markdownToWiki`/`wikiToMarkdown` (plain string, Jira wiki markup)
   for server.
4. **Assignee shape** — `{ accountId }` for cloud; `{ name: username }` for server.
   `setAssignee` gains a `username` parameter (alongside existing `accountId`/`email`) so
   server callers can assign directly by username. Email-based lookup still works on both:
   Cloud searches `/rest/api/3/user/search?query=`, server searches
   `/rest/api/2/user/search?username=`.

**`search-issues`** posts to `${apiBase}/search/jql` on cloud (current behavior, the
non-deprecated endpoint) vs `${apiBase}/search` on server (the classic endpoint — Server/DC has
no `/search/jql`). This is the one path that doesn't simply follow the `apiBase` swap
mechanically.

## New module: `wiki.mjs`

Converts markdown to/from Jira wiki markup, covering the same subset `adf.mjs` supports
(headings, paragraphs, flat bullet/numbered lists, bold/italic, inline code, fenced code
blocks, links) so formatting fidelity matches between Cloud and Server/DC:

- Headings → `h1.`–`h6.`
- Bold → `*text*`, italic → `_text_`
- Inline code → `{{text}}`, fenced code blocks → `{code:lang}...{code}`
- Bullet lists → `* item` per line, numbered → `# item` per line
- Links → `[text|url]`

The block/inline **parsing** logic (splitting markdown into blocks, tokenizing inline spans) is
shared with `adf.mjs` rather than duplicated — extracted into a small shared internal module
both `adf.mjs` and `wiki.mjs` import, each supplying its own serializer for the parsed
structure.

## Error handling

No new error paths. `request()`'s existing behavior (throw `Jira API error <status>: <body>`
on any non-2xx response) is unchanged — the deployment-specific helpers only change what gets
sent (auth header, path, body shape), not how failures are surfaced. A misconfigured
`deploymentType` (e.g. server URL with `deploymentType: "cloud"`) surfaces as a normal
401/403/404 from the mismatched request, same as today.

## Testing

- `fake-jira-server.mjs` gains an optional server-mode: emulates `/rest/api/2` paths, checks
  for `Bearer` auth instead of `Basic`, accepts/returns plain-string bodies instead of ADF, and
  exposes `/rest/api/2/search` instead of `/rest/api/3/search/jql`.
- New `wiki.test.mjs`, mirroring `adf.test.mjs`'s cases (headings, lists, bold/italic, code,
  links, round-trip conversion).
- `client.test.mjs` gains server-mode cases for every method touching the four
  deployment-specific behaviors: `createIssue`/`getIssue`/`updateIssue` (body format),
  `searchIssues` (endpoint), `setAssignee` (payload shape + username param), `whoami` (auth
  header), and one path-prefix check (`apiBase`) covering the remaining untouched methods.
- `credentials.test.mjs` gains cases for `deploymentType` resolution and the server-mode
  `isComplete()` branch (no `email` required).

## Docs

- `SKILL.md`: document `deploymentType`/`JIRA_DEPLOYMENT_TYPE` in Setup, and clarify that Cloud
  API tokens (from `id.atlassian.com`) and Server/DC Personal Access Tokens (from the Jira
  profile page) are different things tied to different `deploymentType` values.
- `references/actions.md`: document the new `username` field on `set-assignee`.
- `docs/DESIGN.md`: update the Architecture/Credentials/Actions sections to describe both
  deployment types.
