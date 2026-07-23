# Action reference

Every action is invoked as `node scripts/jira.mjs <action>` with a JSON payload piped via
stdin. All examples below assume you're in `C:\Solutions\skills\jira`.

## create-issue

Payload: `{ project?, issueType, summary, description?, parentKey?, labels?, assignee? }`

- `project` -- project key; falls back to `JIRA_PROJECT_KEY` / the config file's `projectKey` if
  omitted. If the user works across multiple projects on this Jira site, supply this explicitly
  (ask the user which project rather than relying on the fallback -- see `SKILL.md`'s "Choosing
  a project for create-issue").
- `issueType` -- e.g. `"Epic"`, `"Story"`, `"Bug"` (use `list-issue-types` to check what's available).
- `description` -- markdown (see `SKILL.md`'s "Known limitations" for the supported subset).
- `parentKey` -- an Epic's key, to create this issue as a Story nested under it.
- `labels` -- array of strings.
- `assignee` -- a Jira `accountId` (use `whoami` or `set-assignee` with an email to resolve one).

```bash
echo '{"issueType":"Bug","summary":"Login button unresponsive","description":"Happens on **Safari** only."}' \
  | node scripts/jira.mjs create-issue
```

Response: `{ "key": "PROJ-123", "url": "https://yourcompany.atlassian.net/browse/PROJ-123" }`

## get-issue

Payload: `{ key, fields? }` -- `fields` optionally limits which fields are fetched.

```bash
echo '{"key":"PROJ-123"}' | node scripts/jira.mjs get-issue
```

Response: `{ key, summary, description, issueType, parentKey, status, labels, assignee }`

## update-issue

Payload: `{ key, fields: { summary?, description?, labels?, ... } }` -- partial update, only
the given fields change.

```bash
echo '{"key":"PROJ-123","fields":{"summary":"Login button unresponsive on Safari"}}' \
  | node scripts/jira.mjs update-issue
```

## search-issues

Payload: `{ jql, fields?, maxResults? }` -- arbitrary JQL.

```bash
echo '{"jql":"project = PROJ AND status = \"To Do\""}' | node scripts/jira.mjs search-issues
```

Response: `Array<{ key, summary, issueType, status }>`

## list-transitions

Payload: `{ key }`. Response: `Array<{ id, name }>` -- the statuses this issue can move to right now.

## transition-issue

Payload: `{ key, transition }` -- `transition` is a status name (case-insensitive) or transition id.

```bash
echo '{"key":"PROJ-123","transition":"Done"}' | node scripts/jira.mjs transition-issue
```

## add-comment / list-comments

Payload: `{ key, body }` (add) or `{ key }` (list). `body` is markdown.

## set-assignee

Payload: `{ key, accountId }` (Cloud), `{ key, username }` (Server/Data Center), or
`{ key, email }` (both) -- if `email` is given, it's resolved to an `accountId` (Cloud) or
`username` (Server/DC) via Jira's user search first.

## attach-file

Payload: `{ key, filePath }` -- `filePath` is a path on disk, readable by the process running
`jira.mjs`. Uploads the file as a real Jira attachment (multipart upload), not a description or
comment.

```bash
echo '{"key":"PROJ-123","filePath":"C:/path/to/notes.md"}' | node scripts/jira.mjs attach-file
```

Response: `{ id, filename, size }`.

## list-projects / list-issue-types / list-fields / whoami

No required payload (`list-issue-types` optionally takes `{ projectKey }` to scope the list to
one project). Useful for exploring an unfamiliar Jira instance or verifying credentials.

```bash
echo '{}' | node scripts/jira.mjs whoami
```
