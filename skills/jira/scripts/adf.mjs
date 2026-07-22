const INLINE_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;

function parseInline(text) {
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

function parseBlock(block) {
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

  const isBulletList = lines.every((l) => /^[-*]\s+/.test(l));
  const isOrderedList = !isBulletList && lines.every((l) => /^\d+\.\s+/.test(l));
  if (isBulletList || isOrderedList) {
    const itemRe = isBulletList ? /^[-*]\s+(.*)$/ : /^\d+\.\s+(.*)$/;
    const items = lines.map((l) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: parseInline(l.match(itemRe)[1]) }],
    }));
    return [{ type: isBulletList ? "bulletList" : "orderedList", content: items }];
  }

  return [{ type: "paragraph", content: parseInline(lines.join(" ")) }];
}

function splitIntoBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      current.push(line);
      if (!inFence) {
        blocks.push(current.join("\n"));
        current = [];
      }
      continue;
    }
    if (!inFence && line.trim() === "") {
      if (current.length) {
        blocks.push(current.join("\n"));
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks.map((b) => b.trim()).filter((b) => b.length > 0);
}

export function markdownToAdf(markdown) {
  const blocks = splitIntoBlocks(markdown);
  const content = blocks.flatMap(parseBlock);
  return {
    type: "doc",
    version: 1,
    content: content.length ? content : [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
  };
}

function collectText(node) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) return node.content.map(collectText).join(" ");
  return "";
}

function textNodeToMarkdown(node) {
  if (node.type !== "text") return collectText(node);
  let text = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "code") text = `\`${text}\``;
    else if (mark.type === "strong") text = `**${text}**`;
    else if (mark.type === "em") text = `*${text}*`;
    else if (mark.type === "link") text = `[${text}](${mark.attrs?.href ?? ""})`;
  }
  return text;
}

function inlineToMarkdown(content) {
  return (content ?? []).map(textNodeToMarkdown).join("");
}

function itemToMarkdown(listItem) {
  return (listItem.content ?? []).map(nodeToMarkdown).join(" ");
}

function nodeToMarkdown(node) {
  switch (node.type) {
    case "heading":
      return "#".repeat(node.attrs?.level ?? 1) + " " + inlineToMarkdown(node.content);
    case "paragraph":
      return inlineToMarkdown(node.content);
    case "codeBlock": {
      const lang = node.attrs?.language ?? "";
      const text = (node.content ?? []).map((n) => n.text ?? "").join("");
      return "```" + lang + "\n" + text + "\n```";
    }
    case "bulletList":
      return (node.content ?? []).map((item) => "- " + itemToMarkdown(item)).join("\n");
    case "orderedList":
      return (node.content ?? []).map((item, i) => `${i + 1}. ` + itemToMarkdown(item)).join("\n");
    default:
      return collectText(node);
  }
}

export function adfToMarkdown(doc) {
  if (!doc?.content) return "";
  return doc.content.map(nodeToMarkdown).join("\n\n");
}
