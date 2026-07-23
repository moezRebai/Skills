import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveCredentials, ENV_VAR_NAMES } from "./credentials.mjs";

test("resolveCredentials reads from environment variables", () => {
  process.env.JIRA_BASE_URL = "https://example.atlassian.net";
  process.env.JIRA_EMAIL = "me@example.com";
  process.env.JIRA_API_TOKEN = "token123";
  process.env.JIRA_PROJECT_KEY = "TEST";
  try {
    const creds = resolveCredentials("/nonexistent-home");
    assert.equal(creds.baseUrl, "https://example.atlassian.net");
    assert.equal(creds.email, "me@example.com");
    assert.equal(creds.apiToken, "token123");
    assert.equal(creds.projectKey, "TEST");
  } finally {
    for (const name of ENV_VAR_NAMES) delete process.env[name];
  }
});

test("resolveCredentials falls back to config file when env vars are absent", () => {
  const dir = mkdtempSync(join(tmpdir(), "jira-creds-"));
  writeFileSync(
    join(dir, ".jira-credentials.json"),
    JSON.stringify({ baseUrl: "https://file.atlassian.net", email: "file@example.com", apiToken: "filetoken" })
  );
  try {
    const creds = resolveCredentials(dir);
    assert.equal(creds.baseUrl, "https://file.atlassian.net");
    assert.equal(creds.projectKey, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveCredentials throws a descriptive error when nothing is configured", () => {
  assert.throws(() => resolveCredentials("/nonexistent-home-dir-xyz"), /Jira credentials not found/);
});

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
