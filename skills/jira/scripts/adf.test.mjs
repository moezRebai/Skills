import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownToAdf, adfToMarkdown } from "./adf.mjs";

test("converts a plain paragraph", () => {
  const doc = markdownToAdf("Hello world");
  assert.deepEqual(doc, {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }],
  });
  assert.equal(adfToMarkdown(doc), "Hello world");
});

test("round-trips a heading", () => {
  const doc = markdownToAdf("## Section Title");
  assert.equal(doc.content[0].type, "heading");
  assert.equal(doc.content[0].attrs.level, 2);
  assert.equal(adfToMarkdown(doc), "## Section Title");
});

test("round-trips a bullet list", () => {
  const markdown = "- first\n- second";
  const doc = markdownToAdf(markdown);
  assert.equal(doc.content[0].type, "bulletList");
  assert.equal(doc.content[0].content.length, 2);
  assert.equal(adfToMarkdown(doc), "- first\n- second");
});

test("round-trips a numbered list", () => {
  const doc = markdownToAdf("1. first\n2. second");
  assert.equal(doc.content[0].type, "orderedList");
  assert.equal(adfToMarkdown(doc), "1. first\n2. second");
});

test("round-trips bold, italic, code, and a link", () => {
  const markdown = "This has **bold**, *italic*, `code`, and a [link](https://example.com).";
  const doc = markdownToAdf(markdown);
  assert.equal(adfToMarkdown(doc), markdown);
});

test("round-trips a fenced code block", () => {
  const markdown = "```js\nconst x = 1;\n```";
  const doc = markdownToAdf(markdown);
  assert.equal(doc.content[0].type, "codeBlock");
  assert.equal(adfToMarkdown(doc), markdown);
});

test("adfToMarkdown falls back to plain text extraction for unknown node types", () => {
  const doc = { type: "doc", version: 1, content: [{ type: "panel", content: [{ type: "text", text: "note" }] }] };
  assert.equal(adfToMarkdown(doc), "note");
});

test("round-trips a fenced code block containing a blank line", () => {
  const markdown = "```js\nfunction foo() {\n\n  return 1;\n}\n```";
  const doc = markdownToAdf(markdown);
  assert.equal(doc.content.length, 1);
  assert.equal(doc.content[0].type, "codeBlock");
  assert.equal(adfToMarkdown(doc), markdown);
});

test("round-trips a fenced code block with a hyphenated language tag", () => {
  const markdown = '```objective-c\nNSLog(@"hi");\n```';
  const doc = markdownToAdf(markdown);
  assert.equal(doc.content[0].type, "codeBlock");
  assert.equal(doc.content[0].attrs.language, "objective-c");
  assert.equal(adfToMarkdown(doc), markdown);
});

test("splits a heading from an immediately following paragraph with no blank line", () => {
  const doc = markdownToAdf("## Overview\nThis is the body text.");
  assert.equal(doc.content.length, 2);
  assert.equal(doc.content[0].type, "heading");
  assert.equal(doc.content[1].type, "paragraph");
  assert.equal(adfToMarkdown(doc), "## Overview\n\nThis is the body text.");
});

test("splits a heading from an immediately following ordered list with no blank line", () => {
  const doc = markdownToAdf("## Steps\n1. first\n2. second");
  assert.equal(doc.content.length, 2);
  assert.equal(doc.content[0].type, "heading");
  assert.equal(doc.content[1].type, "orderedList");
});

test("splits a heading from an immediately following fenced code block with no blank line", () => {
  const doc = markdownToAdf('## Example\n```js\nconst x = 1;\n```');
  assert.equal(doc.content.length, 2);
  assert.equal(doc.content[0].type, "heading");
  assert.equal(doc.content[1].type, "codeBlock");
});

test("folds a wrapped list item continuation line into that item", () => {
  const markdown = "- Then the response includes bid and ask computed from the current mid and\n  that fixed spread, alongside the existing mid and asOf\n- Second item";
  const doc = markdownToAdf(markdown);
  assert.equal(doc.content[0].type, "bulletList");
  assert.equal(doc.content[0].content.length, 2);
  const firstItemText = doc.content[0].content[0].content[0].content.map((n) => n.text).join("");
  assert.equal(
    firstItemText,
    "Then the response includes bid and ask computed from the current mid and that fixed spread, alongside the existing mid and asOf"
  );
  const secondItemText = doc.content[0].content[1].content[0].content.map((n) => n.text).join("");
  assert.equal(secondItemText, "Second item");
});

test("splits a bold lead-in paragraph from an immediately following list with no blank line", () => {
  const doc = markdownToAdf("**US-1: Title**\n- Given a thing\n- When something happens\n- Then a result follows");
  assert.equal(doc.content.length, 2);
  assert.equal(doc.content[0].type, "paragraph");
  assert.equal(doc.content[1].type, "bulletList");
  assert.equal(doc.content[1].content.length, 3);
});

test("adfToMarkdown fallback separates multiple text-bearing children with a space", () => {
  const doc = {
    type: "doc",
    version: 1,
    content: [
      {
        type: "blockquote",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Line one" }] },
          { type: "paragraph", content: [{ type: "text", text: "Line two" }] },
        ],
      },
    ],
  };
  assert.equal(adfToMarkdown(doc), "Line one Line two");
});
