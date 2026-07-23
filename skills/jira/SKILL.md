---
name: jira
description: >
  Take actions against a Jira Cloud instance -- create, read, update, and search issues;
  transition status; add comments; manage assignees; attach files; and discover projects/issue
  types/fields. Use this WHENEVER the user wants to create a Jira ticket/issue/epic/story/bug,
  look up or search Jira issues, move a ticket to a new status, comment on a Jira issue,
  assign a ticket, attach a file to a Jira issue, or find out what projects/issue types/fields
  exist in a Jira instance. Trigger on requests like "create a Jira ticket for X", "what's the
  status of PROJ-123", "search Jira for open bugs assigned to me", "move PROJ-123 to Done",
  "comment on PROJ-123", "assign PROJ-123 to me", or "attach this file to PROJ-123". A
  general-purpose Jira tool, not tied to any one project's workflow.
---

# jira

Talk to Jira Cloud directly via a bundled Node.js script -- no SDK, no build step.

## Quick start

1. Make sure Node.js 18+ is available (`node --version`).
2. Configure credentials -- see "Setup" below.
3. Run `echo '{}' | node scripts/jira.mjs whoami` to confirm the credentials resolve and the
   Jira instance is reachable. If it fails with a "credentials not found" error, the script
   is not interactive -- it won't prompt for input. Ask the user for their Jira base URL,
   account email, and an API token (generated at
   https://id.atlassian.com/manage-profile/security/api-tokens), then write
   `~/.jira-credentials.json` yourself (see "Setup" below for the exact shape) and retry.
4. Run whatever action you need (see "Running an action" below for the shape, and
   `references/actions.md` for every action's exact payload).
5. For anything that changes Jira (create/update/transition/comment/assign/attach), follow
   "Safety -- always confirm before mutating" below before calling it.

## Setup

Credentials resolve from environment variables first, then `~/.jira-credentials.json`:

- `JIRA_BASE_URL` -- e.g. `https://yourcompany.atlassian.net`
- `JIRA_EMAIL` -- the Atlassian account email
- `JIRA_API_TOKEN` -- an API token from https://id.atlassian.com/manage-profile/security/api-tokens
- `JIRA_PROJECT_KEY` -- optional default project (any action can override with its own `project`/`projectKey` field)

Or create `~/.jira-credentials.json`:

```json
{ "baseUrl": "https://yourcompany.atlassian.net", "email": "you@example.com", "apiToken": "...", "projectKey": "PROJ" }
```

Verify setup by running the `whoami` action (see below) before doing anything else.

## Running an action

```
node scripts/jira.mjs <action>
```

The JSON payload is piped via **stdin**, not passed as an argument -- this avoids shell-quoting
problems with multi-line markdown. Example:

```bash
echo '{"issueType":"Bug","summary":"Login button unresponsive"}' | node scripts/jira.mjs create-issue
```

On success the script prints a JSON result to stdout and exits 0. On failure it prints
`{"error": "..."}` to stderr and exits 1.

See `references/actions.md` for every action's full payload/response shape and examples.

## Choosing a project for create-issue

`create-issue`'s `project` field is optional and falls back to the configured default
(`JIRA_PROJECT_KEY` / `projectKey`) when omitted -- but if the user works across more than one
project on this Jira site, don't rely on that silently. Before calling `create-issue`, if the
target project isn't already clear from the request or the conversation so far (e.g. they gave
an explicit key, or the conversation has been scoped to one project throughout), ask which
project to create the issue in. If you're not sure what projects exist, offer to run
`list-projects` first so the user can pick from real options instead of guessing a key. This
applies to every issue type -- Epic, Story, Bug, Task, etc. -- not just some of them, since a
silently-wrong project is the risk regardless of issue type.

## Safety -- always confirm before mutating

Before calling any of `create-issue`, `update-issue`, `transition-issue`, `add-comment`,
`set-assignee`, or `attach-file`, show the user exactly what will change (issue key/summary and
the specific change) and get explicit confirmation. These calls hit a real Jira instance and are
not easily reversible from here.

Read-only actions -- `get-issue`, `search-issues`, `list-transitions`, `list-comments`,
`list-projects`, `list-issue-types`, `list-fields`, `whoami` -- can run without confirmation.

## Known limitations

- No `delete-issue` action -- delete issues manually in the Jira UI.
- Description/comment markdown supports headings, paragraphs, bullet/numbered lists,
  bold/italic, inline code, fenced code blocks, and links. Tables, panels, mentions, and emoji
  are not supported -- content in those forms round-trips as best-effort plain text.
  Headings and fenced code blocks are recognized even when glued directly to adjacent text
  (no blank line needed). Bullet/numbered lists still need a blank line separating them from
  surrounding paragraphs, and nested lists are not supported -- flatten them into a single list
  or separate top-level lists instead.
- One-shot actions only -- this is not a continuous or bidirectional sync of any kind.
