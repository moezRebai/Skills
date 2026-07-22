import { createServer } from "node:http";

export function createFakeJiraServer() {
  const issues = new Map();
  const comments = new Map();
  let nextId = 1;
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
    try {
      if (req.method === "POST" && path === "/rest/api/3/issue") {
        const body = await readBody(req);
        const key = nextKey();
        issues.set(key, { key, fields: body.fields });
        comments.set(key, []);
        return sendJson(res, 201, { key });
      }

      const issueMatch = path.match(/^\/rest\/api\/3\/issue\/([\w-]+)$/);
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

      if (req.method === "POST" && path === "/rest/api/3/search/jql") {
        const body = await readBody(req);
        const jql = body.jql ?? "";
        const parentMatch = jql.match(/parent\s*=\s*([\w-]+)/);
        let results = [...issues.values()];
        if (parentMatch) results = results.filter((i) => i.fields.parent?.key === parentMatch[1]);
        return sendJson(res, 200, { issues: results.map((i) => ({ key: i.key, fields: i.fields })) });
      }

      const transMatch = path.match(/^\/rest\/api\/3\/issue\/([\w-]+)\/transitions$/);
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

      const commentMatch = path.match(/^\/rest\/api\/3\/issue\/([\w-]+)\/comment$/);
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

      const assigneeMatch = path.match(/^\/rest\/api\/3\/issue\/([\w-]+)\/assignee$/);
      if (req.method === "PUT" && assigneeMatch) {
        const issue = issues.get(assigneeMatch[1]);
        if (!issue) return sendJson(res, 404, { errorMessages: ["Issue not found"] });
        const body = await readBody(req);
        issue.fields.assignee = { accountId: body.accountId };
        res.writeHead(204);
        return res.end();
      }

      if (req.method === "GET" && path === "/rest/api/3/user/search") {
        const query = url.searchParams.get("query") ?? "";
        return sendJson(res, 200, [{ accountId: `acc-${query}`, displayName: query }]);
      }

      if (req.method === "GET" && path === "/rest/api/3/myself") {
        return sendJson(res, 200, { accountId: "acc-me", displayName: "Fake User", emailAddress: "me@example.com" });
      }

      if (req.method === "GET" && path === "/rest/api/3/project/search") {
        return sendJson(res, 200, { values: [{ key: PROJECT_KEY, name: "Test Project" }] });
      }

      if (req.method === "GET" && path === "/rest/api/3/issuetype") {
        return sendJson(res, 200, [
          { id: "1", name: "Epic" },
          { id: "2", name: "Story" },
          { id: "3", name: "Bug" },
        ]);
      }
      const createMetaMatch = path.match(/^\/rest\/api\/3\/issue\/createmeta\/([\w-]+)\/issuetypes$/);
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

      const attachmentsMatch = path.match(/^\/rest\/api\/3\/issue\/([\w-]+)\/attachments$/);
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

      if (req.method === "GET" && path === "/rest/api/3/field") {
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
  };
}
