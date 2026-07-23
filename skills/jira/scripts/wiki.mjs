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
    /\{\{([^}]+)\}\}|\*([^*]+)\*|(?<!\w)_([^_]+)_(?!\w)|\[([^\]|]+)\|([^\]]+)\]/g,
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
