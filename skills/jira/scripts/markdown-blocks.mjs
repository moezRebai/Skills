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
    // Lines that don't start a new item are continuation lines (wrapped text)
    // of the item above them, folded in with a space.
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
      if (!inFence) flush(); // a fence always starts its own block, even glued to prior text
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
      // ATX headings are always their own block, per CommonMark, even without
      // a blank line separating them from surrounding text.
      flush();
      blocks.push(line);
      continue;
    }
    if (/^(?:[-*]\s+|\d+\.\s+)/.test(line) && current.length && !/^(?:[-*]\s+|\d+\.\s+)/.test(current[0])) {
      // A list item glued directly under non-list text (no blank line) still
      // starts a new block -- otherwise it gets swallowed into that paragraph.
      // A list item glued under an *already-open* list just continues it, and
      // an indented continuation line of a wrapped item never matches here.
      flush();
    }
    current.push(line);
  }
  flush();
  return blocks.map((b) => b.trim()).filter((b) => b.length > 0);
}
