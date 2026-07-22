# discover-and-document

A Claude skill that explores an existing codebase and generates grounded
**functional** and **technical** documentation for it — for *any* project,
regardless of language, framework, platform, or build system. It detects the
stack first, then adapts. It is stack-agnostic by design: no reference file names
a specific vendor, protocol, or product.

## What it produces

Two Markdown documents (with embedded Mermaid diagrams), saved to the outputs
directory:

- `<project>-technical-docs.md` — for engineers. C4 diagrams (context /
  container / component), component reference, data model, sequence diagrams for
  key flows, inferred ADRs, cross-cutting concerns, and build/run notes.
- `<project>-functional-docs.md` — for product owners, analysts, QA, and new
  joiners. Capability inventory, use cases / user journeys, business rules,
  domain glossary, and scope/assumptions.

Both open with a short summary and close with a **Confidence & open questions**
section. If you need a Word/PPTX/PDF instead, it generates the Markdown first,
then hands off to the docx/pptx/pdf skills.

## How it works — five phases

1. **Inventory** — cheap, breadth-first: file tree, stack detection, entry
   points, existing docs (treated as claims to verify), repo size → strategy.
2. **Map** — module/component graph, dependency edges, data model, and a
   deliberate pass over the three surface kinds below.
3. **Deep-dive** — trace 2–4 critical flows end to end across module boundaries,
   extracting business rules and spotting where names lie about behavior.
4. **Synthesize** — reconcile map vs. reality, reverse-engineer ADRs, run the
   verification loop.
5. **Emit** — write the two documents from the templates.

## Design principles

- **Ground everything.** Every non-trivial claim cites a real file/symbol.
  Anything unverifiable is labeled and moved to open questions, never asserted.
- **Progressive disclosure.** Inventory cheaply, deep-dive selectively — large
  repos don't get read whole.
- **Detect, don't assume.** No presumed language, framework, or layering.
- **Verify before emitting.** A propose → check → correct loop keeps the docs
  describing the code as it *is*, not as its naming suggests it should be.

## First-class, vendor-neutral surfaces

Beyond ordinary flow-tracing, the skill deliberately enumerates three surface
*kinds* that documentation usually misses — each described by what it does, not
by any product:

- **API surface** (request/response) → endpoint inventory + surface-per-view map.
- **Real-time / streaming channels** → channel inventory + subscription lifecycle.
- **Service topology** (discovery & routing) → topology diagram + edge table.

## Contents

```
discover-and-document/
├── SKILL.md                          # orchestrator: principles + five phases
├── README.md                         # this file
└── references/
    ├── stack-detection.md            # cross-ecosystem language/framework signals
    ├── integration-surfaces.md       # APIs, streaming channels, service topology
    ├── technical-docs.md             # technical document template + C4/Mermaid
    ├── functional-docs.md            # functional document template
    └── verification.md               # grounding + anti-hallucination loop
```

## When it triggers

Requests like "document this repo", "help me understand this project", "generate
architecture docs", "onboard me onto this codebase", "reverse-engineer the
design", or "write functional/technical docs for this code". Not intended for
documenting a single small file you already understand, or pure docstring-based
API reference.

## Limitations

- Docs are only as good as the source it can read; partial access → the
  open-questions section carries the weight.
- Inferred ADRs and rationale are explicitly marked as inferred — the skill
  won't present a guess as a recorded decision.
- The highest-variance step is critical-flow selection during deep-dive; on a
  large or unfamiliar repo it helps to tell it which flows matter most.
