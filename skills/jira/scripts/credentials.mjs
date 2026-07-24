import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const ENV_VAR_NAMES = [
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "JIRA_PROJECT_KEY",
  "JIRA_DEPLOYMENT_TYPE",
  "JIRA_ALLOW_INSECURE_TLS",
];
export const CREDENTIALS_FILENAME = ".jira-credentials.json";

function fromEnv() {
  return {
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
    deploymentType: process.env.JIRA_DEPLOYMENT_TYPE,
    allowInsecureTls: process.env.JIRA_ALLOW_INSECURE_TLS,
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
  return {
    ...creds,
    deploymentType: creds.deploymentType === "server" ? "server" : "cloud",
    allowInsecureTls: creds.allowInsecureTls === true || creds.allowInsecureTls === "true",
  };
}

/**
 * Resolves Jira credentials: environment variables first, falling back to
 * ~/.jira-credentials.json. projectKey is optional in both sources — it's
 * only a default; actions can override it per-call. deploymentType is
 * "cloud" (default) or "server" — server mode doesn't require email.
 * allowInsecureTls (optional, default false) disables TLS certificate
 * verification for this skill's requests — for a self-signed/internal-CA
 * Jira instance, prefer setting the standard NODE_EXTRA_CA_CERTS env var
 * instead, which verifies properly rather than skipping verification.
 */
export function resolveCredentials(homeDir = homedir()) {
  const envCreds = fromEnv();
  if (isComplete(envCreds)) return normalize(envCreds);

  const fileCreds = fromFile(homeDir);
  if (isComplete(fileCreds)) return normalize(fileCreds);

  throw new Error(
    `Jira credentials not found. Set ${ENV_VAR_NAMES.join(", ")} as environment variables, ` +
      `or create ~/${CREDENTIALS_FILENAME} with { "baseUrl", "email", "apiToken", "projectKey"?, "deploymentType"?, "allowInsecureTls"? }.`
  );
}
