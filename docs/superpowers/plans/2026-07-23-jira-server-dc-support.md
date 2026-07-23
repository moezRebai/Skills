# Jira Server/Data Center Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `jira` skill (`skills/jira/`) work against Jira Server/Data Center (Bearer PAT auth, API v2, plain-string wiki-markup bodies, username-based assignees) alongside its existing Jira Cloud support, selected by an explicit `deploymentType` config field.

**Architecture:** One `JiraClient` class stays as-is for everything that's identical between deployments (issue CRUD shape, transitions, comments listing, discovery endpoints, attachments). Four behaviors that differ — auth header, API path prefix, description/comment body format, assignee payload shape — become small per-instance helpers chosen once from `credentials.deploymentType` at construction. A new `wiki.mjs` module converts markdown to/from Jira wiki markup for Server/DC, reusing the same markdown block/inline parser that `adf.mjs` already uses (extracted into a shared `markdown-blocks.mjs`), so formatting fidelity matches between the two deployments.

**Tech Stack:** Plain Node.js ES modules, native `fetch`, Node's built-in test runner (`node --test`), zero npm dependencies — matches the rest of the skill.

## Global Constraints

- Node.js 18+ (native `fetch`), zero npm dependencies — do not add any.
- Full backward compatibility: existing Cloud credentials (no `deploymentType` field) and existing Cloud behavior must be byte-for-byte unchanged. `deploymentType` defaults to `"cloud"` whenever absent or any value other than `"server"`.
- All work happens in `C:/Solutions/Skills/skills/jira/` (the repo copy — this session's confirmed source of truth, not the separately-installed `~/.claude/skills/jira`).
- Tests run via `node --test scripts/<file>.test.mjs` (or `scripts/*.test.mjs` for the whole suite) from `C:/Solutions/Skills/skills/jira`.
- No `delete-issue` action, no auto-detection/probing of deployment type — both remain explicit non-goals per the approved spec (`docs/superpowers/specs/2026-07-23-jira-server-dc-support-design.md`).

---

### Task 1: Extract shared markdown block/inline parser

**Files:**
- Create: `skills/jira/scripts/markdown-blocks.mjs`
- Modify: `skills/jira/scripts/adf.mjs`
- Test: `skills/jira/scripts/adf.test.mjs` (unchanged — existing suite is the regression check)

**Interfaces:**
- Produces: `parseInline(text): Node[]`, `parseBlock(block: string): Node[]`, `splitIntoBlocks(markdown: string): string[]` — a `Node` is `{ type: "heading"|"paragraph"|"codeBlock"|"bulletList"|"orderedList"|"listItem"|"text", ... }`, exactly the shapes `adf.mjs` builds today. Task 2 (`wiki.mjs`) consumes these two exports.

This is a pure move, not a rewrite — the code is copied verbatim out of `adf.mjs` into the new file, and `adf.mjs` imports it back. Behavior must not change; the existing `adf.test.mjs` suite (17 tests) is the safety net.

- [ ] **Step 1: Create `markdown-blocks.mjs` with the extracted parser**

```js
const INLINE_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;

export function parseInline(text) {
  const nodes = [];
  let lastIndex = 0;
  let match;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      nodes.push({ type: "text", text: match[1], marks: [{ type: "code" }] });
    } else if (match[2] !== undefined) {
      nodes.push({ type: "text", text: match[2], marks: [{ type: "strong" }] });
    } else if (match[3] !== undefined) {
      nodes.push({ type: "text", text: match[3], marks: [{ type: "em" }] });
    } else if (match[4] !== undefined) {
      nodes.push({ type: "text", text: match[4], marks: [{ type: "link", attrs: { href: match[5] } }] });
    }
    lastIndex = INLINE_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) });
  }
  if (nodes.length === 0) nodes.push({ type: "text", text: "" });
  return nodes;
}

export function parseBlock(block) {
  const lines = block.split("\n");

  const headingMatch = lines.length === 1 ? block.match(/^(#{1,6})\s+(.*)$/s) : null;
  if (headingMatch) {
    return [{ type: "heading", attrs: { level: headingMatch[1].length }, content: parseInline(headingMatch[2]) }];
  }

  if (/^```\S*$/.test(lines[0].trim())) {
    const lang = lines[0].trim().slice(3).trim();
    const closesWithFence = lines[lines.length - 1].trim() === "```";
    const codeLines = lines.slice(1, closesWithFence ? -1 : undefined);
    const node = { type: "codeBlock", content: [{ type: "text", text: codeLines.join("\n") }] };
    if (lang) node.attrs = { language: lang };
    return [node];
  }

  const isBulletList = /^[-*]\s+/.test(lines[0]);
  const isOrderedList = !isBulletList && /^\d+\.\s+/.test(lines[0]);
  if (isBulletList || isOrderedList) {
    const itemRe = isBulletList ? /^[-*]\s+(.*)$/ : /^\d+\.\s+(.*)$/;
    const itemTexts = [];
    for (const l of lines) {
      const m = l.match(itemRe);
      if (m) {
        itemTexts.push(m[1]);
      } else if (itemTexts.length) {
        itemTexts[itemTexts.length - 1] += " " + l.trim();
      }
    }
    const items = itemTexts.map((text) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: parseInline(text) }],
    }));
    return [{ type: isBulletList ? "bulletList" : "orderedList", content: items }];
  }

  return [{ type: "paragraph", content: parseInline(lines.join(" ")) }];
}

export function splitIntoBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;

  const flush = () => {
    if (current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (!inFence) flush();
      inFence = !inFence;
      current.push(line);
      if (!inFence) flush();
      continue;
    }
    if (inFence) {
      current.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      flush();
      blocks.push(line);
      continue;
    }
    if (/^(?:[-*]\s+|\d+\.\s+)/.test(line) && current.length && !/^(?:[-*]\s+|\d+\.\s+)/.test(current[0])) {
      flush();
    }
    current.push(line);
  }
  flush();
  return blocks.map((b) => b.trim()).filter((b) => b.length > 0);
}
```

- [ ] **Step 2: Update `adf.mjs` to import the extracted parser instead of defining it**

Replace lines 1–119 of `adf.mjs` (everything from the top through the end of `splitIntoBlocks`, i.e. up to but not including `export function markdownToAdf`) with:

```js
import { parseBlock, splitIntoBlocks } from "./markdown-blocks.mjs";
```

Everything from `export function markdownToAdf(markdown) {` (currently line 121) to the end of the file (`adfToMarkdown` and its helpers) stays exactly as-is, unchanged.

- [ ] **Step 3: Run the existing ADF suite to confirm no regression**

Run: `node --test scripts/adf.test.mjs` (from `skills/jira/`)
Expected: PASS — all 17 existing tests, unchanged.

- [ ] **Step 4: Commit**

```bash
git add skills/jira/scripts/markdown-blocks.mjs skills/jira/scripts/adf.mjs
git commit -m "refactor: extract shared markdown block/inline parser from adf.mjs"
```

---

### Task 2: Add `wiki.mjs` — markdown ↔ Jira wiki markup conversion

**Files:**
- Create: `skills/jira/scripts/wiki.mjs`
- Create: `skills/jira/scripts/wiki.test.mjs`

**Interfaces:**
- Consumes: `parseBlock`, `splitIntoBlocks` from `./markdown-blocks.mjs` (Task 1).
- Produces: `markdownToWiki(markdown: string): string`, `wikiToMarkdown(wiki: string): string` — consumed by `client.mjs` in Task 5 as the Server/DC equivalent of `markdownToAdf`/`adfToMarkdown`.

`wikiToMarkdown` only needs to correctly parse wiki markup that `markdownToWiki` itself produces (a round-trip contract) — same scope boundary `adfToMarkdown` already has for ADF (arbitrary hand-authored content outside the supported subset is best-effort, not a bug).

- [ ] **Step 1: Write the failing tests**

Create `skills/jira/scripts/wiki.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownToWiki, wikiToMarkdown } from "./wiki.mjs";

test("converts a plain paragraph", () => {
  const wiki = markdownToWiki("Hello world");
  assert.equal(wiki, "Hello world");
  assert.equal(wikiToMarkdown(wiki), "Hello world");
});

test("round-trips a heading", () => {
  const wiki = markdownToWiki("## Section Title");
  assert.equal(wiki, "h2. Section Title");
  assert.equal(wikiToMarkdown(wiki), "## Section Title");
});

test("round-trips a bullet list", () => {
  const wiki = markdownToWiki("- first\n- second");
  assert.equal(wiki, "* first\n* second");
  assert.equal(wikiToMarkdown(wiki), "- first\n- second");
});

test("round-trips a numbered list", () => {
  const wiki = markdownToWiki("1. first\n2. second");
  assert.equal(wiki, "# first\n# second");
  assert.equal(wikiToMarkdown(wiki), "1. first\n2. second");
});

test("round-trips bold, italic, code, and a link", () => {
  const markdown = "This has **bold**, *italic*, `code`, and a [link](https://example.com).";
  const wiki = markdownToWiki(markdown);
  assert.equal(wiki, "This has *bold*, _italic_, {{code}}, and a [link|https://example.com].");
  assert.equal(wikiToMarkdown(wiki), markdown);
});

test("round-trips a fenced code block", () => {
  const markdown = "```js\nconst x = 1;\n```";
  const wiki = markdownToWiki(markdown);
  assert.equal(wiki, "{code:js}\nconst x = 1;\n{code}");
  assert.equal(wikiToMarkdown(wiki), markdown);
});

test("round-trips a fenced code block containing a blank line", () => {
  const markdown = "```js\nfunction foo() {\n\n  return 1;\n}\n```";
  const wiki = markdownToWiki(markdown);
  assert.equal(wikiToMarkdown(wiki), markdown);
});

test("round-trips a fenced code block with a hyphenated language tag", () => {
  const markdown = '```objective-c\nNSLog(@"hi");\n```';
  const wiki = markdownToWiki(markdown);
  assert.equal(wiki, '{code:objective-c}\nNSLog(@"hi");\n{code}');
  assert.equal(wikiToMarkdown(wiki), markdown);
});

test("wikiToMarkdown returns an empty string for empty input", () => {
  assert.equal(wikiToMarkdown(""), "");
  assert.equal(wikiToMarkdown(undefined), "");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/wiki.test.mjs`
Expected: FAIL — `Cannot find module './wiki.mjs'` (the file doesn't exist yet).

- [ ] **Step 3: Implement `wiki.mjs`**

```js
import { parseBlock, splitIntoBlocks } from "./markdown-blocks.mjs";

function collectText(node) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) return node.content.map(collectText).join(" ");
  return "";
}

function textNodeToWiki(node) {
  if (node.type !== "text") return collectText(node);
  let text = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "code") text = `{{${text}}}`;
    else if (mark.type === "strong") text = `*${text}*`;
    else if (mark.type === "em") text = `_${text}_`;
    else if (mark.type === "link") text = `[${text}|${mark.attrs?.href ?? ""}]`;
  }
  return text;
}

function inlineToWiki(content) {
  return (content ?? []).map(textNodeToWiki).join("");
}

function itemToWiki(listItem) {
  return (listItem.content ?? []).map(nodeToWiki).join(" ");
}

function nodeToWiki(node) {
  switch (node.type) {
    case "heading":
      return `h${node.attrs?.level ?? 1}. ` + inlineToWiki(node.content);
    case "paragraph":
      return inlineToWiki(node.content);
    case "codeBlock": {
      const lang = node.attrs?.language;
      const text = (node.content ?? []).map((n) => n.text ?? "").join("");
      return (lang ? `{code:${lang}}` : "{code}") + "\n" + text + "\n{code}";
    }
    case "bulletList":
      return (node.content ?? []).map((item) => "* " + itemToWiki(item)).join("\n");
    case "orderedList":
      return (node.content ?? []).map((item) => "# " + itemToWiki(item)).join("\n");
    default:
      return collectText(node);
  }
}

export function markdownToWiki(markdown) {
  const blocks = splitIntoBlocks(markdown);
  const nodes = blocks.flatMap(parseBlock);
  return nodes.map(nodeToWiki).join("\n\n");
}

function splitWikiBlocks(wiki) {
  const lines = wiki.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;

  const flush = () => {
    if (current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of lines) {
    if (/^\{code(?::\S+)?\}$/.test(line.trim())) {
      if (!inFence) flush();
      inFence = !inFence;
      current.push(line);
      if (!inFence) flush();
      continue;
    }
    if (inFence) {
      current.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (/^h[1-6]\.\s+/.test(line)) {
      flush();
      blocks.push(line);
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks.map((b) => b.trim()).filter((b) => b.length > 0);
}

function inlineWikiToMarkdown(text) {
  return text.replace(
    /\{\{([^}]+)\}\}|\*([^*]+)\*|_([^_]+)_|\[([^\]|]+)\|([^\]]+)\]/g,
    (match, code, bold, italic, linkText, href) => {
      if (code !== undefined) return `\`${code}\``;
      if (bold !== undefined) return `**${bold}**`;
      if (italic !== undefined) return `*${italic}*`;
      if (linkText !== undefined) return `[${linkText}](${href})`;
      return match;
    }
  );
}

function wikiBlockToMarkdown(block) {
  const lines = block.split("\n");

  const headingMatch = lines.length === 1 ? block.match(/^h([1-6])\.\s+(.*)$/s) : null;
  if (headingMatch) {
    return "#".repeat(Number(headingMatch[1])) + " " + inlineWikiToMarkdown(headingMatch[2]);
  }

  const codeMatch = lines[0].match(/^\{code(?::(\S+))?\}$/);
  if (codeMatch) {
    const lang = codeMatch[1] ?? "";
    const closesWithFence = lines[lines.length - 1].trim() === "{code}";
    const codeLines = lines.slice(1, closesWithFence ? -1 : undefined);
    return "```" + lang + "\n" + codeLines.join("\n") + "\n```";
  }

  const isBulletList = /^\*\s+/.test(lines[0]);
  const isOrderedList = !isBulletList && /^#\s+/.test(lines[0]);
  if (isBulletList || isOrderedList) {
    const itemRe = isBulletList ? /^\*\s+(.*)$/ : /^#\s+(.*)$/;
    let n = 0;
    return lines
      .map((l) => {
        const m = l.match(itemRe);
        if (!m) return null;
        n += 1;
        return (isBulletList ? "- " : `${n}. `) + inlineWikiToMarkdown(m[1]);
      })
      .filter((l) => l !== null)
      .join("\n");
  }

  return inlineWikiToMarkdown(lines.join(" "));
}

export function wikiToMarkdown(wiki) {
  if (!wiki) return "";
  return splitWikiBlocks(wiki).map(wikiBlockToMarkdown).join("\n\n");
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/wiki.test.mjs`
Expected: PASS — all 9 tests.

- [ ] **Step 5: Commit**

```bash
git add skills/jira/scripts/wiki.mjs skills/jira/scripts/wiki.test.mjs
git commit -m "feat: add markdown to Jira wiki markup conversion for Server/DC"
```

---

### Task 3: Add `deploymentType` to credential resolution

**Files:**
- Modify: `skills/jira/scripts/credentials.mjs`
- Test: `skills/jira/scripts/credentials.test.mjs`

**Interfaces:**
- Produces: `resolveCredentials(homeDir?)` now always returns an object with `deploymentType: "cloud" | "server"` set (defaulted, never left `undefined`). Consumed by `JiraClient`'s constructor in Task 5.

- [ ] **Step 1: Write the failing tests**

Add to the end of `skills/jira/scripts/credentials.test.mjs`:

```js
test("resolveCredentials defaults deploymentType to cloud when not specified", () => {
  process.env.JIRA_BASE_URL = "https://example.atlassian.net";
  process.env.JIRA_EMAIL = "me@example.com";
  process.env.JIRA_API_TOKEN = "token123";
  try {
    const creds = resolveCredentials("/nonexistent-home");
    assert.equal(creds.deploymentType, "cloud");
  } finally {
    for (const name of ENV_VAR_NAMES) delete process.env[name];
  }
});

test("resolveCredentials accepts server deploymentType from env vars without requiring email", () => {
  process.env.JIRA_BASE_URL = "https://jira.company.com";
  process.env.JIRA_API_TOKEN = "pat-token-123";
  process.env.JIRA_DEPLOYMENT_TYPE = "server";
  try {
    const creds = resolveCredentials("/nonexistent-home");
    assert.equal(creds.deploymentType, "server");
    assert.equal(creds.baseUrl, "https://jira.company.com");
    assert.equal(creds.apiToken, "pat-token-123");
  } finally {
    for (const name of ENV_VAR_NAMES) delete process.env[name];
  }
});

test("resolveCredentials accepts server deploymentType from the config file without requiring email", () => {
  const dir = mkdtempSync(join(tmpdir(), "jira-creds-"));
  writeFileSync(
    join(dir, ".jira-credentials.json"),
    JSON.stringify({ baseUrl: "https://jira.company.com", apiToken: "pat-token-123", deploymentType: "server" })
  );
  try {
    const creds = resolveCredentials(dir);
    assert.equal(creds.deploymentType, "server");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveCredentials with deploymentType=server still requires baseUrl and apiToken", () => {
  process.env.JIRA_DEPLOYMENT_TYPE = "server";
  process.env.JIRA_BASE_URL = "https://jira.company.com";
  try {
    assert.throws(() => resolveCredentials("/nonexistent-home-dir-xyz"), /Jira credentials not found/);
  } finally {
    for (const name of ENV_VAR_NAMES) delete process.env[name];
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/credentials.test.mjs`
Expected: FAIL — `JIRA_DEPLOYMENT_TYPE` isn't read yet, `deploymentType` is `undefined` instead of `"cloud"`/`"server"`, and server-mode credentials without `email` are rejected as incomplete.

- [ ] **Step 3: Implement the `deploymentType` support**

Replace the full contents of `skills/jira/scripts/credentials.mjs` with:

```js
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const ENV_VAR_NAMES = ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY", "JIRA_DEPLOYMENT_TYPE"];
export const CREDENTIALS_FILENAME = ".jira-credentials.json";

function fromEnv() {
  return {
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
    deploymentType: process.env.JIRA_DEPLOYMENT_TYPE,
  };
}

function fromFile(homeDir) {
  const path = join(homeDir, CREDENTIALS_FILENAME);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

function isComplete(creds) {
  if (creds.deploymentType === "server") {
    return Boolean(creds.baseUrl && creds.apiToken);
  }
  return Boolean(creds.baseUrl && creds.email && creds.apiToken);
}

function normalize(creds) {
  return { ...creds, deploymentType: creds.deploymentType === "server" ? "server" : "cloud" };
}

/**
 * Resolves Jira credentials: environment variables first, falling back to
 * ~/.jira-credentials.json. projectKey is optional in both sources — it's
 * only a default; actions can override it per-call. deploymentType is
 * "cloud" (default) or "server" — server mode doesn't require email.
 */
export function resolveCredentials(homeDir = homedir()) {
  const envCreds = fromEnv();
  if (isComplete(envCreds)) return normalize(envCreds);

  const fileCreds = fromFile(homeDir);
  if (isComplete(fileCreds)) return normalize(fileCreds);

  throw new Error(
    `Jira credentials not found. Set ${ENV_VAR_NAMES.join(", ")} as environment variables, ` +
      `or create ~/${CREDENTIALS_FILENAME} with { "baseUrl", "email", "apiToken", "projectKey"?, "deploymentType"? }.`
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/credentials.test.mjs`
Expected: PASS — all 7 tests (3 existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add skills/jira/scripts/credentials.mjs skills/jira/scripts/credentials.test.mjs
git commit -m "feat: add deploymentType (cloud/server) to credential resolution"
```

---

### Task 4: Extend the fake Jira server to emulate Server/DC requests

**Files:**
- Modify: `skills/jira/scripts/fake-jira-server.mjs`

**Interfaces:**
- Produces: the object returned by `createFakeJiraServer()` gains `getLastAuthHeader(): string | null`. Every existing path handler now also matches the equivalent `/rest/api/2/...` path. Consumed by Task 5's new server-mode tests in `client.test.mjs`.

This is test infrastructure, not production code — there's no new behavior of its own to TDD against. The check is that the existing client test suite still passes unchanged against the modified fake server (nothing about Cloud/`/rest/api/3` behavior may change).

- [ ] **Step 1: Replace the full contents of `fake-jira-server.mjs`**

```js
import { createServer } from "node:http";

export function createFakeJiraServer() {
  const issues = new Map();
  const comments = new Map();
  let nextId = 1;
  let lastAuthHeader = null;
  const PROJECT_KEY = "TEST";
  const TRANSITIONS = [
    { id: "11", name: "To Do" },
    { id: "21", name: "In Progress" },
    { id: "31", name: "Done" },
  ];

  function nextKey() {
    return `${PROJECT_KEY}-${nextId++}`;
  }

  function readBody(req) {
    return new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data ? JSON.parse(data) : {}));
    });
  }

  function sendJson(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  function parseMultipartFile(buffer, boundary) {
    const text = buffer.toString("binary");
    const marker = `--${boundary}`;
    const partStart = text.indexOf(marker) + marker.length;
    const headerEnd = text.indexOf("\r\n\r\n", partStart);
    const headers = text.slice(partStart, headerEnd);
    const filenameMatch = headers.match(/filename="([^"]*)"/);
    const contentStart = headerEnd + 4;
    const contentEnd = text.indexOf(`\r\n${marker}`, contentStart);
    const contentBinary = text.slice(contentStart, contentEnd);
    return {
      filename: filenameMatch ? filenameMatch[1] : "unknown",
      content: Buffer.from(contentBinary, "binary"),
    };
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    lastAuthHeader = req.headers.authorization ?? null;
    try {
      if (req.method === "POST" && (path === "/rest/api/3/issue" || path === "/rest/api/2/issue")) {
        const body = await readBody(req);
        const key = nextKey();
        issues.set(key, { key, fields: body.fields });
        comments.set(key, []);
        return sendJson(res, 201, { key });
      }

      const issueMatch = path.match(/^\/rest\/api\/[23]\/issue\/([\w-]+)$/);
      if (req.method === "GET" && issueMatch) {
        const issue = issues.get(issueMatch[1]);
        if (!issue) return sendJson(res, 404, { errorMessages: ["Issue not found"] });
        return sendJson(res, 200, { key: issue.key, fields: issue.fields });
      }
      if (req.method === "PUT" && issueMatch) {
        const issue = issues.get(issueMatch[1]);
        if (!issue) return sendJson(res, 404, { errorMessages: ["Issue not found"] });
        const body = await readBody(req);
        Object.assign(issue.fields, body.fields);
        res.writeHead(204);
        return res.end();
      }

      if (req.method === "POST" && (path === "/rest/api/3/search/jql" || path === "/rest/api/2/search")) {
        const body = await readBody(req);
        const jql = body.jql ?? "";
        const parentMatch = jql.match(/parent\s*=\s*([\w-]+)/);
        let results = [...issues.values()];
        if (parentMatch) results = results.filter((i) => i.fields.parent?.key === parentMatch[1]);
        return sendJson(res, 200, { issues: results.map((i) => ({ key: i.key, fields: i.fields })) });
      }

      const transMatch = path.match(/^\/rest\/api\/[23]\/issue\/([\w-]+)\/transitions$/);
      if (transMatch) {
        const issue = issues.get(transMatch[1]);
        if (!issue) return sendJson(res, 404, { errorMessages: ["Issue not found"] });
        if (req.method === "GET") return sendJson(res, 200, { transitions: TRANSITIONS });
        if (req.method === "POST") {
          const body = await readBody(req);
          const match = TRANSITIONS.find((t) => t.id === body.transition.id);
          issue.fields.status = { name: match ? match.name : "Unknown" };
          res.writeHead(204);
          return res.end();
        }
      }

      const commentMatch = path.match(/^\/rest\/api\/[23]\/issue\/([\w-]+)\/comment$/);
      if (commentMatch) {
        const key = commentMatch[1];
        if (!issues.has(key)) return sendJson(res, 404, { errorMessages: ["Issue not found"] });
        if (req.method === "POST") {
          const body = await readBody(req);
          const id = String(comments.get(key).length + 1);
          const comment = { id, author: { displayName: "Fake User" }, body: body.body };
          comments.get(key).push(comment);
          return sendJson(res, 201, comment);
        }
        if (req.method === "GET") return sendJson(res, 200, { comments: comments.get(key) });
      }

      const assigneeMatch = path.match(/^\/rest\/api\/[23]\/issue\/([\w-]+)\/assignee$/);
      if (req.method === "PUT" && assigneeMatch) {
        const issue = issues.get(assigneeMatch[1]);
        if (!issue) return sendJson(res, 404, { errorMessages: ["Issue not found"] });
        const body = await readBody(req);
        issue.fields.assignee = body.accountId ? { accountId: body.accountId } : { name: body.name };
        res.writeHead(204);
        return res.end();
      }

      if (req.method === "GET" && (path === "/rest/api/3/user/search" || path === "/rest/api/2/user/search")) {
        const q = url.searchParams.get("query") ?? url.searchParams.get("username") ?? "";
        return sendJson(res, 200, [{ accountId: `acc-${q}`, name: q, displayName: q }]);
      }

      if (req.method === "GET" && (path === "/rest/api/3/myself" || path === "/rest/api/2/myself")) {
        return sendJson(res, 200, {
          accountId: "acc-me",
          name: "fakeuser",
          displayName: "Fake User",
          emailAddress: "me@example.com",
        });
      }

      if (req.method === "GET" && (path === "/rest/api/3/project/search" || path === "/rest/api/2/project/search")) {
        return sendJson(res, 200, { values: [{ key: PROJECT_KEY, name: "Test Project" }] });
      }

      if (req.method === "GET" && (path === "/rest/api/3/issuetype" || path === "/rest/api/2/issuetype")) {
        return sendJson(res, 200, [
          { id: "1", name: "Epic" },
          { id: "2", name: "Story" },
          { id: "3", name: "Bug" },
        ]);
      }
      const createMetaMatch = path.match(/^\/rest\/api\/[23]\/issue\/createmeta\/([\w-]+)\/issuetypes$/);
      if (req.method === "GET" && createMetaMatch) {
        return sendJson(res, 200, {
          issueTypes: [
            { id: "1", name: "Epic" },
            { id: "2", name: "Story" },
            { id: "3", name: "Bug" },
            { id: "4", name: "Subtask" },
          ],
        });
      }

      const attachmentsMatch = path.match(/^\/rest\/api\/[23]\/issue\/([\w-]+)\/attachments$/);
      if (req.method === "POST" && attachmentsMatch) {
        const issue = issues.get(attachmentsMatch[1]);
        if (!issue) return sendJson(res, 404, { errorMessages: ["Issue not found"] });
        const boundaryMatch = (req.headers["content-type"] || "").match(/boundary=(.+)$/);
        if (!boundaryMatch) return sendJson(res, 400, { errorMessages: ["Missing multipart boundary"] });
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const { filename, content } = parseMultipartFile(Buffer.concat(chunks), boundaryMatch[1]);
        const id = String(nextId++);
        return sendJson(res, 200, [{ id, filename, size: content.length }]);
      }

      if (req.method === "GET" && (path === "/rest/api/3/field" || path === "/rest/api/2/field")) {
        return sendJson(res, 200, [
          { id: "summary", name: "Summary" },
          { id: "description", name: "Description" },
        ]);
      }

      sendJson(res, 404, { errorMessages: ["Not found"] });
    } catch (err) {
      sendJson(res, 500, { errorMessages: [String(err)] });
    }
  });

  return {
    listen(port = 0) {
      return new Promise((resolve) => {
        server.listen(port, "127.0.0.1", () => resolve(server.address().port));
      });
    },
    close() {
      return new Promise((resolve) => server.close(resolve));
    },
    getLastAuthHeader() {
      return lastAuthHeader;
    },
  };
}
```

- [ ] **Step 2: Run the existing client suite to confirm no regression**

Run: `node --test scripts/client.test.mjs` (from `skills/jira/`)
Expected: PASS — all existing tests (still exercising only `/rest/api/3` paths via the unmodified cloud-mode `JiraClient`), unchanged.

- [ ] **Step 3: Commit**

```bash
git add skills/jira/scripts/fake-jira-server.mjs
git commit -m "test: extend fake Jira server to emulate Server/DC (api/2) requests"
```

---

### Task 5: Add deployment-specific behavior to `JiraClient`

**Files:**
- Modify: `skills/jira/scripts/client.mjs`
- Test: `skills/jira/scripts/client.test.mjs`

**Interfaces:**
- Consumes: `markdownToWiki`/`wikiToMarkdown` (Task 2), `credentials.deploymentType` (Task 3), `getLastAuthHeader()` (Task 4).
- Produces: `JiraClient` behaves identically to today when `deploymentType` is `"cloud"` (default); when `"server"`, uses Bearer auth, `/rest/api/2`, wiki-markup bodies, and `{ name: username }` assignee payloads. `setAssignee` gains a `username` parameter.

- [ ] **Step 1: Write the failing tests**

Add to the end of `skills/jira/scripts/client.test.mjs`, and change the existing `withServer` helper (near the top of the file) to also pass `fake` to the callback (existing tests destructure only `client` from the callback args, so this is non-breaking):

Replace:
```js
async function withServer(fn) {
  const fake = createFakeJiraServer();
  const port = await fake.listen();
  const client = new JiraClient({
    baseUrl: `http://127.0.0.1:${port}`,
    email: "me@example.com",
    apiToken: "token",
    projectKey: "TEST",
  });
  try {
    await fn(client);
  } finally {
    await fake.close();
  }
}
```
with:
```js
async function withServer(fn) {
  const fake = createFakeJiraServer();
  const port = await fake.listen();
  const client = new JiraClient({
    baseUrl: `http://127.0.0.1:${port}`,
    email: "me@example.com",
    apiToken: "token",
    projectKey: "TEST",
  });
  try {
    await fn(client, fake);
  } finally {
    await fake.close();
  }
}

async function withServerModeClient(fn) {
  const fake = createFakeJiraServer();
  const port = await fake.listen();
  const client = new JiraClient({
    baseUrl: `http://127.0.0.1:${port}`,
    apiToken: "pat-token-123",
    deploymentType: "server",
    projectKey: "TEST",
  });
  try {
    await fn(client, fake);
  } finally {
    await fake.close();
  }
}
```

Then append these new tests to the end of the file:

```js
test("cloud mode sends Basic auth (regression check)", async () => {
  await withServer(async (client, fake) => {
    await client.whoami();
    assert.match(fake.getLastAuthHeader(), /^Basic /);
  });
});

test("server mode sends Bearer auth instead of Basic", async () => {
  await withServerModeClient(async (client, fake) => {
    await client.whoami();
    assert.equal(fake.getLastAuthHeader(), "Bearer pat-token-123");
  });
});

test("server mode createIssue/getIssue round-trips a markdown description through wiki markup", async () => {
  await withServerModeClient(async (client) => {
    const created = await client.createIssue({
      issueType: "Story",
      summary: "A story",
      description: "Some **bold** text",
    });
    const issue = await client.getIssue({ key: created.key });
    assert.equal(issue.description, "Some **bold** text");
  });
});

test("server mode searchIssues uses the classic /search endpoint, not /search/jql", async () => {
  await withServerModeClient(async (client) => {
    const epic = await client.createIssue({ issueType: "Epic", summary: "Epic parent" });
    await client.createIssue({ issueType: "Story", summary: "Child 1", parentKey: epic.key });
    await client.createIssue({ issueType: "Story", summary: "Unrelated" });
    const results = await client.searchIssues({ jql: `parent = ${epic.key}` });
    assert.equal(results.length, 1);
    assert.equal(results[0].summary, "Child 1");
  });
});

test("server mode setAssignee with a username sets it directly", async () => {
  await withServerModeClient(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    await client.setAssignee({ key: created.key, username: "jdoe" });
    const issue = await client.getIssue({ key: created.key });
    assert.equal(issue.assignee.name, "jdoe");
  });
});

test("server mode setAssignee with an email resolves it to a username first", async () => {
  await withServerModeClient(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    const result = await client.setAssignee({ key: created.key, email: "someone@example.com" });
    assert.equal(result.username, "someone@example.com");
  });
});

test("server mode addComment/listComments round-trips a markdown comment through wiki markup", async () => {
  await withServerModeClient(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    await client.addComment({ key: created.key, body: "This is *important*" });
    const comments = await client.listComments({ key: created.key });
    assert.equal(comments.length, 1);
    assert.equal(comments[0].body, "This is *important*");
  });
});

test("server mode listProjects/listIssueTypes/listFields use /rest/api/2", async () => {
  await withServerModeClient(async (client) => {
    const projects = await client.listProjects();
    assert.deepEqual(projects, [{ key: "TEST", name: "Test Project" }]);
    const types = await client.listIssueTypes();
    assert.ok(types.some((t) => t.name === "Epic"));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/client.test.mjs`
Expected: FAIL — `JiraClient` still hardcodes Basic auth and `/rest/api/3`, so every server-mode test either 401s (fake server doesn't check auth, so it won't reject, but `getLastAuthHeader()` will show `Basic ...` instead of `Bearer pat-token-123`) or hits the wrong endpoint shape. Confirm the Bearer-auth test and the wiki-markup round-trip tests specifically fail.

- [ ] **Step 3: Implement deployment-specific behavior in `client.mjs`**

Replace the full contents of `skills/jira/scripts/client.mjs` with:

```js
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { markdownToAdf, adfToMarkdown } from "./adf.mjs";
import { markdownToWiki, wikiToMarkdown } from "./wiki.mjs";

const API_BASE = { cloud: "/rest/api/3", server: "/rest/api/2" };

export class JiraClient {
  constructor(credentials) {
    this.credentials = credentials;
    this.isServer = credentials.deploymentType === "server";
    this.apiBase = API_BASE[this.isServer ? "server" : "cloud"];
  }

  authHeader() {
    if (this.isServer) return `Bearer ${this.credentials.apiToken}`;
    const token = Buffer.from(`${this.credentials.email}:${this.credentials.apiToken}`).toString("base64");
    return `Basic ${token}`;
  }

  formatBody(markdown) {
    return this.isServer ? markdownToWiki(markdown) : markdownToAdf(markdown);
  }

  parseBody(raw) {
    if (!raw) return "";
    return this.isServer ? wikiToMarkdown(raw) : adfToMarkdown(raw);
  }

  async request(path, init = {}) {
    const response = await fetch(`${this.credentials.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Jira API error ${response.status}: ${body}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async createIssue({ project, issueType, summary, description, parentKey, labels, assignee }) {
    const projectKey = project ?? this.credentials.projectKey;
    if (!projectKey) throw new Error("No project key provided and no default configured");
    const fields = {
      project: { key: projectKey },
      summary,
      issuetype: { name: issueType },
    };
    if (description) fields.description = this.formatBody(description);
    if (parentKey) fields.parent = { key: parentKey };
    if (labels) fields.labels = labels;
    if (assignee) fields.assignee = this.isServer ? { name: assignee } : { accountId: assignee };
    const data = await this.request(`${this.apiBase}/issue`, { method: "POST", body: JSON.stringify({ fields }) });
    return { key: data.key, url: `${this.credentials.baseUrl}/browse/${data.key}` };
  }

  async getIssue({ key, fields }) {
    const fieldsParam = fields?.length
      ? fields.join(",")
      : "summary,description,issuetype,parent,status,labels,assignee";
    const data = await this.request(`${this.apiBase}/issue/${key}?fields=${fieldsParam}`);
    return {
      key: data.key,
      summary: data.fields.summary,
      description: data.fields.description ? this.parseBody(data.fields.description) : "",
      issueType: data.fields.issuetype?.name,
      parentKey: data.fields.parent?.key,
      status: data.fields.status?.name,
      labels: data.fields.labels ?? [],
      assignee: data.fields.assignee
        ? {
            accountId: data.fields.assignee.accountId,
            name: data.fields.assignee.name,
            displayName: data.fields.assignee.displayName,
          }
        : null,
    };
  }

  async updateIssue({ key, fields }) {
    const outFields = { ...fields };
    if (typeof outFields.description === "string") {
      outFields.description = this.formatBody(outFields.description);
    }
    await this.request(`${this.apiBase}/issue/${key}`, { method: "PUT", body: JSON.stringify({ fields: outFields }) });
    return { key };
  }

  async searchIssues({ jql, fields, maxResults }) {
    const body = { jql, fields: fields?.length ? fields : ["summary", "issuetype", "status"] };
    if (maxResults) body.maxResults = maxResults;
    const path = this.isServer ? `${this.apiBase}/search` : `${this.apiBase}/search/jql`;
    const data = await this.request(path, { method: "POST", body: JSON.stringify(body) });
    return data.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      issueType: issue.fields.issuetype?.name,
      status: issue.fields.status?.name,
    }));
  }

  async listTransitions({ key }) {
    const data = await this.request(`${this.apiBase}/issue/${key}/transitions`);
    return data.transitions.map((t) => ({ id: t.id, name: t.name }));
  }

  async transitionIssue({ key, transition }) {
    const { transitions } = await this.request(`${this.apiBase}/issue/${key}/transitions`);
    const match = transitions.find(
      (t) => t.id === String(transition) || t.name.toLowerCase() === String(transition).toLowerCase()
    );
    if (!match) {
      throw new Error(
        `No transition "${transition}" available for ${key} (available: ${transitions.map((t) => t.name).join(", ")})`
      );
    }
    await this.request(`${this.apiBase}/issue/${key}/transitions`, {
      method: "POST",
      body: JSON.stringify({ transition: { id: match.id } }),
    });
    return { key, transitionedTo: match.name };
  }

  async addComment({ key, body }) {
    const data = await this.request(`${this.apiBase}/issue/${key}/comment`, {
      method: "POST",
      body: JSON.stringify({ body: this.formatBody(body) }),
    });
    return { id: data.id };
  }

  async listComments({ key }) {
    const data = await this.request(`${this.apiBase}/issue/${key}/comment`);
    return data.comments.map((c) => ({ id: c.id, author: c.author?.displayName, body: this.parseBody(c.body) }));
  }

  async setAssignee({ key, accountId, email, username }) {
    let resolvedAccountId = accountId;
    let resolvedUsername = username;
    if (!resolvedAccountId && !resolvedUsername && email) {
      const searchParam = this.isServer
        ? `username=${encodeURIComponent(email)}`
        : `query=${encodeURIComponent(email)}`;
      const users = await this.request(`${this.apiBase}/user/search?${searchParam}`);
      if (!users.length) throw new Error(`No Jira user found for email "${email}"`);
      if (this.isServer) resolvedUsername = users[0].name;
      else resolvedAccountId = users[0].accountId;
    }
    if (this.isServer) {
      if (!resolvedUsername) throw new Error("setAssignee requires username or email");
      await this.request(`${this.apiBase}/issue/${key}/assignee`, {
        method: "PUT",
        body: JSON.stringify({ name: resolvedUsername }),
      });
      return { key, username: resolvedUsername };
    }
    if (!resolvedAccountId) throw new Error("setAssignee requires accountId or email");
    await this.request(`${this.apiBase}/issue/${key}/assignee`, {
      method: "PUT",
      body: JSON.stringify({ accountId: resolvedAccountId }),
    });
    return { key, accountId: resolvedAccountId };
  }

  async whoami() {
    const data = await this.request(`${this.apiBase}/myself`);
    return { accountId: data.accountId, name: data.name, displayName: data.displayName, email: data.emailAddress };
  }

  async listProjects() {
    const data = await this.request(`${this.apiBase}/project/search`);
    return data.values.map((p) => ({ key: p.key, name: p.name }));
  }

  async listIssueTypes({ projectKey } = {}) {
    if (projectKey) {
      const data = await this.request(`${this.apiBase}/issue/createmeta/${projectKey}/issuetypes`);
      return data.issueTypes.map((t) => ({ id: t.id, name: t.name }));
    }
    const data = await this.request(`${this.apiBase}/issuetype`);
    return data.map((t) => ({ id: t.id, name: t.name }));
  }

  async listFields() {
    const data = await this.request(`${this.apiBase}/field`);
    return data.map((f) => ({ id: f.id, name: f.name }));
  }

  /** Uploads a real file as an attachment. Bypasses request() because multipart
   * needs fetch to set its own Content-Type boundary, not the shared JSON one. */
  async attachFile({ key, filePath }) {
    const buffer = await readFile(filePath);
    const form = new FormData();
    form.append("file", new Blob([buffer]), basename(filePath));
    const response = await fetch(`${this.credentials.baseUrl}${this.apiBase}/issue/${key}/attachments`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "X-Atlassian-Token": "no-check",
        Accept: "application/json",
      },
      body: form,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Jira API error ${response.status}: ${body}`);
    }
    const [attachment] = await response.json();
    return { id: attachment.id, filename: attachment.filename, size: attachment.size };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/client.test.mjs`
Expected: PASS — all existing tests plus the 8 new server-mode tests.

- [ ] **Step 5: Run the full suite**

Run: `node --test scripts/*.test.mjs`
Expected: PASS — every test file, no regressions anywhere.

- [ ] **Step 6: Commit**

```bash
git add skills/jira/scripts/client.mjs skills/jira/scripts/client.test.mjs
git commit -m "feat: support Jira Server/Data Center (Bearer auth, API v2, wiki markup, username assignees)"
```

---

### Task 6: Update documentation

**Files:**
- Modify: `skills/jira/SKILL.md`
- Modify: `skills/jira/references/actions.md`
- Modify: `skills/jira/docs/DESIGN.md`

No tests — this is documentation only. The check is a read-through for accuracy against the implemented behavior from Tasks 1–5.

- [ ] **Step 1: Update `SKILL.md`'s frontmatter description and intro line**

Replace:
```
description: >
  Take actions against a Jira Cloud instance -- create, read, update, and search issues;
```
with:
```
description: >
  Take actions against a Jira Cloud or Server/Data Center instance -- create, read, update, and search issues;
```

Replace:
```
Talk to Jira Cloud directly via a bundled Node.js script -- no SDK, no build step.
```
with:
```
Talk to Jira Cloud or Server/Data Center directly via a bundled Node.js script -- no SDK, no build step.
```

- [ ] **Step 2: Update the Quick start credential-gathering instruction**

Replace:
```
   is not interactive -- it won't prompt for input. Ask the user for their Jira base URL,
   account email, and an API token (generated at
   https://id.atlassian.com/manage-profile/security/api-tokens), then write
   `~/.jira-credentials.json` yourself (see "Setup" below for the exact shape) and retry.
```
with:
```
   is not interactive -- it won't prompt for input. Ask the user whether their Jira is Cloud
   or Server/Data Center, then for their base URL and either a Cloud API token (with account
   email, generated at https://id.atlassian.com/manage-profile/security/api-tokens) or a
   Server/DC Personal Access Token (generated from their Jira profile's Personal Access Tokens
   page, no email needed). Write `~/.jira-credentials.json` yourself (see "Setup" below for the
   exact shape) and retry.
```

- [ ] **Step 3: Update the Setup section**

Replace:
```
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
```
with:
```
## Setup

Credentials resolve from environment variables first, then `~/.jira-credentials.json`. Two
deployment types are supported, selected by `deploymentType` (`JIRA_DEPLOYMENT_TYPE` in env
vars) -- it defaults to `"cloud"` when omitted:

**Cloud** (`deploymentType: "cloud"`, the default):
- `JIRA_BASE_URL` -- e.g. `https://yourcompany.atlassian.net`
- `JIRA_EMAIL` -- the Atlassian account email
- `JIRA_API_TOKEN` -- an API token from https://id.atlassian.com/manage-profile/security/api-tokens
- `JIRA_PROJECT_KEY` -- optional default project (any action can override with its own `project`/`projectKey` field)

**Server/Data Center** (`deploymentType: "server"`):
- `JIRA_BASE_URL` -- your company's Jira URL, e.g. `https://jira.yourcompany.com`
- `JIRA_API_TOKEN` -- a Personal Access Token, generated from your Jira profile's Personal
  Access Tokens page (not id.atlassian.com -- that's Cloud-only). No email needed.
- `JIRA_PROJECT_KEY` -- optional default project, same as Cloud

These are different token types tied to different Jira deployments -- a Cloud API token and a
Server/DC Personal Access Token are not interchangeable, and using the wrong `deploymentType`
for a given token will fail auth (401/403).

Or create `~/.jira-credentials.json`, e.g. for Cloud:

```json
{ "baseUrl": "https://yourcompany.atlassian.net", "email": "you@example.com", "apiToken": "...", "projectKey": "PROJ" }
```

or for Server/Data Center:

```json
{ "baseUrl": "https://jira.yourcompany.com", "apiToken": "...", "deploymentType": "server", "projectKey": "PROJ" }
```

Verify setup by running the `whoami` action (see below) before doing anything else.
```

- [ ] **Step 4: Update Known limitations**

Replace:
```
- Description/comment markdown supports headings, paragraphs, bullet/numbered lists,
  bold/italic, inline code, fenced code blocks, and links. Tables, panels, mentions, and emoji
  are not supported -- content in those forms round-trips as best-effort plain text.
  Headings and fenced code blocks are recognized even when glued directly to adjacent text
  (no blank line needed). Bullet/numbered lists still need a blank line separating them from
  surrounding paragraphs, and nested lists are not supported -- flatten them into a single list
  or separate top-level lists instead.
```
with:
```
- Description/comment markdown supports headings, paragraphs, bullet/numbered lists,
  bold/italic, inline code, fenced code blocks, and links -- converted to Atlassian Document
  Format on Cloud, Jira wiki markup on Server/Data Center. Tables, panels, mentions, and emoji
  are not supported -- content in those forms round-trips as best-effort plain text.
  Headings and fenced code blocks are recognized even when glued directly to adjacent text
  (no blank line needed). Bullet/numbered lists still need a blank line separating them from
  surrounding paragraphs, and nested lists are not supported -- flatten them into a single list
  or separate top-level lists instead. On Server/Data Center, the wiki-markup conversion round-trips
  content this skill itself wrote reliably; wiki markup a person hand-authored directly in Jira's
  web editor may not match this subset and falls back to best-effort plain text.
```

- [ ] **Step 5: Update `references/actions.md`'s `set-assignee` section**

Replace:
```
## set-assignee

Payload: `{ key, accountId }` or `{ key, email }` -- if `email` is given, it's resolved to an
`accountId` via Jira's user search first.
```
with:
```
## set-assignee

Payload: `{ key, accountId }` (Cloud), `{ key, username }` (Server/Data Center), or
`{ key, email }` (both) -- if `email` is given, it's resolved to an `accountId` (Cloud) or
`username` (Server/DC) via Jira's user search first.
```

- [ ] **Step 6: Update `docs/DESIGN.md`**

Replace:
```
## Purpose

A generic, project-agnostic agent skill for taking actions against Jira Cloud:
create/read/update issues, search via JQL, transition status, comment, manage assignee,
attach files, and discover project/issue-type/field metadata. Usable from any project.
```
with:
```
## Purpose

A generic, project-agnostic agent skill for taking actions against Jira Cloud or Server/Data
Center: create/read/update issues, search via JQL, transition status, comment, manage assignee,
attach files, and discover project/issue-type/field metadata. Usable from any project.
```

Replace the `## Architecture` file listing:
```
    adf.mjs                    — markdown <-> ADF conversion (basic subset)
    fake-jira-server.mjs       — local node:http fake Jira server, used only by tests
```
with:
```
    markdown-blocks.mjs        — shared markdown block/inline parser (used by adf.mjs and wiki.mjs)
    adf.mjs                    — markdown <-> ADF conversion (Cloud, basic subset)
    wiki.mjs                   — markdown <-> Jira wiki markup conversion (Server/DC, same subset)
    fake-jira-server.mjs       — local node:http fake Jira server, used only by tests
```

Replace the `## Credentials` section:
```
## Credentials

Single active profile, resolved in this order:

1. Environment variables: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`.
2. Fallback config file: `~/.jira-credentials.json` (home-directory scoped, not repo-scoped,
   since this skill is meant to be used across arbitrary projects/repos).

`JIRA_PROJECT_KEY` / the config file's `projectKey` is only a **default** — any action that
takes a `project`/`projectKey` field can override it per-call. Auth is HTTP Basic
(`base64(email:apiToken)`). `whoami` is the recommended way to verify credentials are resolved
correctly before doing anything else.
```
with:
```
## Credentials

Single active profile, resolved in this order:

1. Environment variables: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`,
   `JIRA_DEPLOYMENT_TYPE`.
2. Fallback config file: `~/.jira-credentials.json` (home-directory scoped, not repo-scoped,
   since this skill is meant to be used across arbitrary projects/repos).

`JIRA_PROJECT_KEY` / the config file's `projectKey` is only a **default** — any action that
takes a `project`/`projectKey` field can override it per-call. `whoami` is the recommended way
to verify credentials are resolved correctly before doing anything else.

`deploymentType` (`JIRA_DEPLOYMENT_TYPE` in env vars) selects between the two supported Jira
deployments, defaulting to `"cloud"` when absent:

- **cloud**: auth is HTTP Basic (`base64(email:apiToken)`) against `/rest/api/3`; `apiToken` is
  a Cloud API token; `email` is required.
- **server**: auth is HTTP Bearer (`apiToken`) against `/rest/api/2`; `apiToken` is a
  Server/Data Center Personal Access Token; `email` is not required. Descriptions/comments
  convert to/from Jira wiki markup instead of ADF, and assignees are identified by `name`
  (username) instead of `accountId`.
```

- [ ] **Step 7: Commit**

```bash
git add skills/jira/SKILL.md skills/jira/references/actions.md skills/jira/docs/DESIGN.md
git commit -m "docs: document Jira Server/Data Center support"
```
