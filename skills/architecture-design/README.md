# architecture-design

Architect-led, interview-driven design sessions for greenfield systems, legacy rebuilds, and features in existing applications. Outputs are written to `docs/architecture/` in the target project.

## Install

The skill follows the open Agent Skills standard. Keep one copy and link it where each agent looks.

| Agent | Project location | Personal location |
|---|---|---|
| Kilo Code | `.agents/skills/architecture-design/` (loaded by default) or `.kilo/skills/architecture-design/` | `~/.kilo/skills/architecture-design/` |
| Claude Code | `.claude/skills/architecture-design/` (a symlink to the copy above works) | `~/.claude/skills/architecture-design/` |
| OpenAI Codex | See the Codex documentation for its skills folder | See the Codex documentation |

The folder name must stay `architecture-design` (Kilo requires it to match the `name` field).

For team-wide distribution in Kilo, serve the skill from an internal URL with an `index.json` manifest and add it to `skills.urls` in `kilo.jsonc`; bump the version on every change.

## Use

Ask naturally, for example "act as an architect and design the target system from docs/legacy", or invoke it explicitly: "use the architecture-design skill". In Kilo Code, Architect mode is the natural place to run it.

Questions come with selectable answers (a picker in Claude Code, suggested answers in Kilo Code, or a numbered list elsewhere); you can always type your own answer instead. Each phase ends with a choice: Approve, Revise, or Back to an earlier phase. You can also type `status`, `decisions`, `assumptions` or `pause` at any time.

## Demo pack

The last phase writes `docs/architecture/architecture-overview.html`: one self-contained page (no external scripts, fonts or network calls) with clickable diagrams, decisions, quality targets, operations, roadmap and risks. Open it directly from disk for demos; it carries the same classification as the documents.

## Recommended model

Claude Opus 5 or higher, high effort, selected for the whole session (for example with `/model` in Claude Code). Older or smaller models work too; the skill writes every document in small edits so no single request runs long. The skill does not set a model because a skill-level model override does not persist across a multi-turn interview and non-standard frontmatter breaks portability.

For deeper reasoning at the options and review phases, type `ultrathink` in your own message at those points (Claude Code). It is not in the skill text, because there it would apply to every phase and slow down simple ones.

## Timeouts and output limits

If requests time out or stop with an output-limit error, especially behind a corporate proxy or gateway:
- make sure you have the latest version of this skill (it writes in small edits);
- in Claude Code, `CLAUDE_CODE_MAX_OUTPUT_TOKENS` raises the per-response output limit and `API_TIMEOUT_MS` the client request timeout;
- a gateway's own timeout can only be changed by its owners; small edits keep each request well under it.

## Permissions

The skill needs to read the paths you give it and write inside `docs/architecture/`. It has no scripts and makes no network calls. Keep each agent's permission settings strict: allow reads, and approve writes.

## Data handling

Document and code content is sent to the model provider used by your agent. Confirm that this is acceptable for the material under your organization's agreements before using the skill on confidential sources. Outputs are marked "Internal – Confidential" by default and should not be committed to public or broadly shared repositories.

## Maintenance

The catalogs in `references/` reflect what was known when the skill was written. Update them as your approved technology list changes; they are plain Markdown.
