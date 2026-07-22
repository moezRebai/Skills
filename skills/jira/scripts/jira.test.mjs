import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createFakeJiraServer } from "./fake-jira-server.mjs";
import { run } from "./jira.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("run() dispatches create-issue against a live fake server", async () => {
  const fake = createFakeJiraServer();
  const port = await fake.listen();
  try {
    const credentials = {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "me@example.com",
      apiToken: "t",
      projectKey: "TEST",
    };
    const result = await run("create-issue", { issueType: "Bug", summary: "CLI test" }, credentials);
    assert.match(result.key, /^TEST-\d+$/);
  } finally {
    await fake.close();
  }
});

test("run() dispatches attach-file against a live fake server", async () => {
  const fake = createFakeJiraServer();
  const port = await fake.listen();
  const dir = mkdtempSync(join(tmpdir(), "jira-attach-"));
  try {
    const credentials = {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "me@example.com",
      apiToken: "t",
      projectKey: "TEST",
    };
    const created = await run("create-issue", { issueType: "Bug", summary: "Needs an attachment" }, credentials);
    const filePath = join(dir, "notes.md");
    writeFileSync(filePath, "# Notes", "utf8");
    const result = await run("attach-file", { key: created.key, filePath }, credentials);
    assert.equal(result.filename, "notes.md");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await fake.close();
  }
});

test("run() throws a descriptive error for an unknown action", async () => {
  await assert.rejects(
    () => run("delete-issue", {}, { baseUrl: "http://x", email: "e", apiToken: "t" }),
    /Unknown action "delete-issue"/
  );
});

test("CLI subprocess prints an error JSON to stderr and exits 1 for an unknown action", () => {
  const scriptPath = join(__dirname, "jira.mjs");
  const result = spawnSync(process.execPath, [scriptPath, "delete-issue"], {
    input: "{}",
    encoding: "utf8",
    env: { ...process.env, JIRA_BASE_URL: "http://127.0.0.1:1", JIRA_EMAIL: "e", JIRA_API_TOKEN: "t" },
  });
  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.stderr.trim());
  assert.match(parsed.error, /Unknown action/);
});

test("CLI subprocess creates an issue against a live fake server end to end", async () => {
  const fake = createFakeJiraServer();
  const port = await fake.listen();
  try {
    const scriptPath = join(__dirname, "jira.mjs");
    // NOTE: spawnSync here would deadlock — it blocks this process's event
    // loop synchronously while waiting for the child to exit, but the fake
    // Jira server (listening in *this* process) needs that same event loop
    // free to accept and respond to the child's HTTP request. Using async
    // spawn keeps the event loop free so the server can respond while we
    // await the child's completion. Verified independent of platform.
    const child = spawn(process.execPath, [scriptPath, "create-issue"], {
      env: {
        ...process.env,
        JIRA_BASE_URL: `http://127.0.0.1:${port}`,
        JIRA_EMAIL: "me@example.com",
        JIRA_API_TOKEN: "t",
        JIRA_PROJECT_KEY: "TEST",
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.stdin.end(JSON.stringify({ issueType: "Bug", summary: "End to end" }));
    const status = await new Promise((resolve) => child.on("close", resolve));
    assert.equal(status, 0, `expected exit 0, got ${status}; stderr: ${stderr}`);
    const parsed = JSON.parse(stdout.trim());
    assert.match(parsed.key, /^TEST-\d+$/);
  } finally {
    await fake.close();
  }
});
