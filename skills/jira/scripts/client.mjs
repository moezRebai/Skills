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
