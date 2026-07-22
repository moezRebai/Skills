import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFakeJiraServer } from "./fake-jira-server.mjs";
import { JiraClient } from "./client.mjs";

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

test("createIssue creates an issue and returns its key and url", async () => {
  await withServer(async (client) => {
    const result = await client.createIssue({ issueType: "Bug", summary: "Something broke" });
    assert.match(result.key, /^TEST-\d+$/);
    assert.equal(result.url, `${client.credentials.baseUrl}/browse/${result.key}`);
  });
});

test("getIssue reads back what createIssue wrote, including markdown description", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({
      issueType: "Story",
      summary: "A story",
      description: "Some **bold** text",
    });
    const issue = await client.getIssue({ key: created.key });
    assert.equal(issue.summary, "A story");
    assert.equal(issue.description, "Some **bold** text");
    assert.equal(issue.issueType, "Story");
  });
});

test("updateIssue changes fields on an existing issue", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Old summary" });
    await client.updateIssue({ key: created.key, fields: { summary: "New summary" } });
    const issue = await client.getIssue({ key: created.key });
    assert.equal(issue.summary, "New summary");
  });
});

test("getIssue throws a descriptive error for a missing issue", async () => {
  await withServer(async (client) => {
    await assert.rejects(() => client.getIssue({ key: "TEST-999" }), /404/);
  });
});

test("searchIssues returns children matching a parent JQL filter", async () => {
  await withServer(async (client) => {
    const epic = await client.createIssue({ issueType: "Epic", summary: "Epic parent" });
    await client.createIssue({ issueType: "Story", summary: "Child 1", parentKey: epic.key });
    await client.createIssue({ issueType: "Story", summary: "Child 2", parentKey: epic.key });
    await client.createIssue({ issueType: "Story", summary: "Unrelated" });
    const results = await client.searchIssues({ jql: `parent = ${epic.key}` });
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((r) => r.summary).sort(), ["Child 1", "Child 2"]);
  });
});

test("listTransitions returns the fake server's available transitions", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    const transitions = await client.listTransitions({ key: created.key });
    assert.ok(transitions.some((t) => t.name === "In Progress"));
  });
});

test("transitionIssue moves an issue to the named status", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    const result = await client.transitionIssue({ key: created.key, transition: "In Progress" });
    assert.equal(result.transitionedTo, "In Progress");
    const issue = await client.getIssue({ key: created.key });
    assert.equal(issue.status, "In Progress");
  });
});

test("transitionIssue throws a descriptive error for an unknown transition name", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    await assert.rejects(
      () => client.transitionIssue({ key: created.key, transition: "Not A Real Status" }),
      /No transition "Not A Real Status"/
    );
  });
});

test("addComment then listComments round-trips a markdown comment body", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    await client.addComment({ key: created.key, body: "This is *important*" });
    const comments = await client.listComments({ key: created.key });
    assert.equal(comments.length, 1);
    assert.equal(comments[0].body, "This is *important*");
    assert.equal(comments[0].author, "Fake User");
  });
});

test("whoami returns the fake server's current user", async () => {
  await withServer(async (client) => {
    const me = await client.whoami();
    assert.equal(me.accountId, "acc-me");
    assert.equal(me.displayName, "Fake User");
  });
});

test("setAssignee with an accountId sets it directly", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    await client.setAssignee({ key: created.key, accountId: "acc-123" });
    const issue = await client.getIssue({ key: created.key });
    assert.equal(issue.assignee.accountId, "acc-123");
  });
});

test("setAssignee with an email resolves it to an accountId first", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs work" });
    const result = await client.setAssignee({ key: created.key, email: "someone@example.com" });
    assert.equal(result.accountId, "acc-someone@example.com");
  });
});

test("listProjects returns the fake server's project list", async () => {
  await withServer(async (client) => {
    const projects = await client.listProjects();
    assert.deepEqual(projects, [{ key: "TEST", name: "Test Project" }]);
  });
});

test("listIssueTypes without a project returns the global list", async () => {
  await withServer(async (client) => {
    const types = await client.listIssueTypes();
    assert.ok(types.some((t) => t.name === "Epic"));
    assert.ok(!types.some((t) => t.name === "Subtask"));
  });
});

test("listIssueTypes scoped to a project uses the createmeta endpoint", async () => {
  await withServer(async (client) => {
    const types = await client.listIssueTypes({ projectKey: "TEST" });
    assert.ok(types.some((t) => t.name === "Story"));
    assert.ok(types.some((t) => t.name === "Subtask"));
  });
});

test("listFields returns the fake server's field list", async () => {
  await withServer(async (client) => {
    const fields = await client.listFields();
    assert.ok(fields.some((f) => f.id === "summary"));
  });
});

test("attachFile uploads a real file and the fake server parses filename and content correctly", async () => {
  await withServer(async (client) => {
    const created = await client.createIssue({ issueType: "Bug", summary: "Needs an attachment" });
    const dir = mkdtempSync(join(tmpdir(), "jira-attach-"));
    const filePath = join(dir, "notes.md");
    const content = "# Notes\n\nSome **details** about the bug.";
    writeFileSync(filePath, content, "utf8");
    try {
      const result = await client.attachFile({ key: created.key, filePath });
      assert.equal(result.filename, "notes.md");
      assert.equal(result.size, Buffer.byteLength(content, "utf8"));
      assert.ok(result.id);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test("attachFile throws a descriptive error for a missing issue", async () => {
  await withServer(async (client) => {
    const dir = mkdtempSync(join(tmpdir(), "jira-attach-"));
    const filePath = join(dir, "notes.md");
    writeFileSync(filePath, "content", "utf8");
    try {
      await assert.rejects(() => client.attachFile({ key: "TEST-999", filePath }), /404/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
