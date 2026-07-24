#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { resolveCredentials } from "./credentials.mjs";
import { JiraClient } from "./client.mjs";

const ACTIONS = {
  "create-issue": (client, payload) => client.createIssue(payload),
  "get-issue": (client, payload) => client.getIssue(payload),
  "update-issue": (client, payload) => client.updateIssue(payload),
  "search-issues": (client, payload) => client.searchIssues(payload),
  "list-transitions": (client, payload) => client.listTransitions(payload),
  "transition-issue": (client, payload) => client.transitionIssue(payload),
  "add-comment": (client, payload) => client.addComment(payload),
  "list-comments": (client, payload) => client.listComments(payload),
  "set-assignee": (client, payload) => client.setAssignee(payload),
  "attach-file": (client, payload) => client.attachFile(payload),
  "list-projects": (client) => client.listProjects(),
  "list-issue-types": (client, payload) => client.listIssueTypes(payload ?? {}),
  "list-fields": (client) => client.listFields(),
  whoami: (client) => client.whoami(),
};

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

const TLS_ERROR_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);

export function describeError(err) {
  const code = err.cause?.code;
  if (code && TLS_ERROR_CODES.has(code)) {
    return (
      `${err.message} (TLS certificate error: ${code}). If this Jira instance uses a self-signed ` +
      `or internal CA certificate, either set NODE_EXTRA_CA_CERTS to that CA's certificate file before ` +
      `running this skill (proper verification), or set allowInsecureTls (JIRA_ALLOW_INSECURE_TLS=true) ` +
      `in your Jira credentials to skip verification (insecure, last resort). See SKILL.md's Setup section.`
    );
  }
  return err.message;
}

export async function run(action, payload, credentials = resolveCredentials()) {
  const handler = ACTIONS[action];
  if (!handler) {
    throw new Error(`Unknown action "${action}". Valid actions: ${Object.keys(ACTIONS).join(", ")}`);
  }
  const client = new JiraClient(credentials);
  return handler(client, payload);
}

async function main() {
  const action = process.argv[2];
  if (!action) {
    process.stderr.write(JSON.stringify({ error: "Usage: node jira.mjs <action> (JSON payload via stdin)" }) + "\n");
    process.exit(1);
  }
  try {
    const payload = await readStdin();
    const result = await run(action, payload);
    process.stdout.write(JSON.stringify(result ?? null) + "\n");
  } catch (err) {
    process.stderr.write(JSON.stringify({ error: describeError(err) }) + "\n");
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
