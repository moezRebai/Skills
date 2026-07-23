import { parseBlock, splitIntoBlocks } from "./markdown-blocks.mjs";

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
