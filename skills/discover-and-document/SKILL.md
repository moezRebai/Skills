---
name: discover-and-document
description: >-
  Explore an unfamiliar or existing codebase and generate grounded functional
  and technical documentation for it. Works on ANY project regardless of
  language, framework, or build system — it detects the stack first, then
  adapts. Use this WHENEVER the user wants to understand, map, onboard onto,
  reverse-engineer, or document a codebase or repository they didn't just write
  from scratch — including requests like "document this repo", "help me
  understand this project", "generate architecture docs", "write technical/
  functional documentation for this code", "onboard me onto this codebase",
  "what does this project do and how", "reverse-engineer the design", or "create
  a system overview / C4 diagrams / ADRs from the source". Trigger even when the
  request is vague ("explain this codebase") or names only one half ("just the
  functional docs"). Do NOT trigger for documenting a single small file the user
  already understands, or for API-reference generation from docstrings alone.
---

# Discover & Document

Turn an existing codebase into trustworthy functional and technical
documentation. The hard part is not writing prose — it is understanding a system
you did not build without inventing an architecture that isn't there. This skill
enforces a discipline: **inventory before you read, read before you claim, and
verify every claim against real source.**

## Core principles

1. **Ground everything.** Every non-trivial claim in the output must trace to a
   real file/symbol. Cite paths (e.g. `src/pricing/engine.py:PricingEngine`).
   If you can't point to source, don't assert it — mark it as an open question.
2. **Progressive disclosure.** Never try to read a whole repo into context.
   Inventory cheaply, then deep-dive selectively on the parts that matter.
   Large repos are handled by breadth-first mapping, then depth on hot paths.
3. **Detect, don't assume.** Do not presume a language, framework, or layering.
   Let the repo tell you what it is (see `references/stack-detection.md`).
4. **Verify before emitting.** Run the verification loop
   (`references/verification.md`) so the docs describe the code as it *is*, not
   as its naming suggests it *should* be.
5. **Two audiences, two documents.** Technical docs answer "how is it built?"
   for engineers. Functional docs answer "what does it do and why?" for
   product/analysts/new joiners. Keep them separate but cross-linked.

## The five phases

Work through these in order. Announce the phase you're in. It's fine to loop back
when a deep-dive contradicts the map.

### Phase 1 — Inventory (cheap, breadth-first)

Goal: a map of *what exists* without reading logic yet.

- Get the tree, ignoring vendored/generated dirs (`.git`, `node_modules`,
  `target`, `bin`, `obj`, `dist`, `build`, `vendor`, `__pycache__`, lockfiles).
- Detect the stack: languages, package managers, frameworks, build/test tooling,
  runtime, containerization. Follow `references/stack-detection.md`.
- Identify entry points (mains, servers, CLI, jobs, serverless handlers) and
  configuration/secrets surfaces.
- Read the existing docs (`README`, `docs/`, `ADR`s, wikis, comments at module
  headers) — treat them as *claims to verify*, not ground truth.
- Size the repo (file counts per language, LOC ballpark) to pick a strategy:
  small (<~50 files) → read most of it; large → map modules, sample deeply.

Produce a short **Inventory note** (stack, entry points, module list, size,
existing-docs summary) and confirm direction with the user before deep-diving —
especially which parts they care about most.

### Phase 2 — Map (structure & dependencies)

Goal: the module/component graph and the boundaries between parts.

- Derive module boundaries from directory structure + import/dependency edges.
- Build a dependency graph between modules; note layering (or absence of it),
  cyclic dependencies, and the direction of coupling.
- Locate cross-cutting seams: external integrations, datastores, messaging,
  auth, config, observability, feature flags.
- Deliberately enumerate the three surface kinds most flow-tracing under-covers
  — request/response APIs, real-time/streaming channels, and service topology.
  Follow `references/integration-surfaces.md`; each has its own output shape
  (endpoint inventory, channel inventory, topology view) and stays vendor-neutral.
- Map the data model: schemas, entities, migrations, DTOs, serialization.

Capture this as a component list + a dependency sketch (Mermaid). Don't explain
behavior yet — just wire up the skeleton.

### Phase 3 — Deep-dive (trace real behavior)

Goal: understand *how it actually works* by following execution, not by reading
files alphabetically.

- Pick 2–4 **critical flows** (the ones that define the system — e.g. "handle a
  request end to end", "process a job", "price an instrument"). Ask the user
  which flows matter if unclear.
- Trace each flow across module boundaries: entry → orchestration → domain
  logic → I/O → response. Record the call path with file/symbol citations.
- Extract business rules and invariants encountered along the way (validation,
  branching, edge-case handling, error semantics, concurrency/async model).
- Note where naming lies — where the code does something different from what the
  folder/class name implies. These are the highest-value findings.

### Phase 4 — Synthesize (turn traces into understanding)

Goal: consolidate raw findings into the artifacts the docs will need.

- Reconcile the map (Phase 2) with reality (Phase 3); fix the graph where the
  deep-dive contradicted it.
- Reverse-engineer key **ADRs**: for each significant structural choice, state
  the decision, the forces, and the (inferred) rationale — clearly flagged as
  inferred where you're guessing.
- Assemble the capability inventory (features ↔ code regions) for functional
  docs, and the component/data/sequence material for technical docs.
- Run the **verification loop** now (`references/verification.md`). Every claim
  gets checked against source before it reaches the document.

### Phase 5 — Emit (write the two documents)

Generate the deliverables. Follow the templates:

- **Technical docs** → `references/technical-docs.md`
  (C4 context/container/component, component reference, data model, sequence
  diagrams for hot paths, ADRs, ops/runtime notes, open questions).
- **Functional docs** → `references/functional-docs.md`
  (capability inventory, use cases / user journeys, business rules, domain
  glossary, out-of-scope & assumptions).

Default output is Markdown with embedded Mermaid diagrams (portable, diffable,
renders in most repos and wikis). If the user asks for a Word/PPTX/PDF
deliverable, generate the Markdown first, then use the corresponding document
skill (docx/pptx/pdf) to produce it. Save outputs to `/mnt/user-data/outputs/`
and present them.

## Output format defaults

Unless the user says otherwise, produce two files:

```
<project>-technical-docs.md
<project>-functional-docs.md
```

Each opens with a 3-sentence "what this is" summary, a generated-on date, and a
**Confidence & open questions** section listing everything you could not verify.
Never hide uncertainty — a flagged gap is worth more than a confident guess.

## Adapting to repo size & access

- **No repo on disk yet?** If only a Git URL is given and cloning is allowed,
  clone into the working dir (shallow) then proceed. If you can't clone, ask the
  user to upload an archive or point at the mounted path.
- **Very large monorepo?** Scope to the subtree the user names, document it, and
  list the unexplored siblings as out-of-scope rather than guessing about them.
- **Partial access / snippets only?** Document what's grounded, and make the
  open-questions section carry the weight. Do not extrapolate a whole
  architecture from a fragment.

## Reference files

Read these as you reach the relevant phase — don't load them all upfront:

- `references/stack-detection.md` — signals for identifying languages,
  frameworks, build systems, and runtimes across ecosystems (Phase 1).
- `references/integration-surfaces.md` — first-class, vendor-neutral treatment
  of API surfaces, real-time/streaming channels, and service topology (Phase 2).
- `references/technical-docs.md` — structure + templates for the technical
  document, including C4 levels and Mermaid patterns (Phase 5).
- `references/functional-docs.md` — structure + templates for the functional
  document (Phase 5).
- `references/verification.md` — the grounding + verification loop that keeps
  the docs honest (Phase 4, and continuously).
