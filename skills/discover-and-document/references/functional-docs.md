# Functional documentation

Audience: product owners, analysts, QA, and new joiners who need to know what the
system *does* and why — without reading code. Still grounded in source, but
expressed in domain language, not implementation detail.

The discipline is the same as technical docs: every capability and rule must
trace to real code. The difference is framing — behavior and intent, not classes
and call stacks.

## Document template

```markdown
# <Project> — Functional Documentation
_Generated <date>._

## 1. Purpose & scope
What problem the system solves, who uses it, and what it is explicitly NOT for.

## 2. Capability inventory
The features/capabilities the system provides, each mapped to the code region
that implements it. This is the backbone — build it from Phase 3 flows.

## 3. Use cases / user journeys
For each primary actor, the end-to-end journeys they can perform, with
preconditions, main flow, alternate/error paths, and outcomes.

## 4. Business rules & invariants
The rules the system enforces — validation, eligibility, calculations,
state transitions, limits — stated in domain terms, each cited to source.

## 5. Domain glossary
Every domain term, entity, and acronym with a plain-language definition. This is
often the single most useful artifact for onboarding.

## 6. Data & integrations (functional view)
What information the system stores/consumes/produces and which external parties
it exchanges data with — described by meaning, not schema.

## 7. Assumptions & open questions
Behaviors that are ambiguous, undocumented, or unverifiable from code.
```

## Capability inventory format

Use a table so features map cleanly to code and to open questions:

```markdown
| Capability | What it does (domain terms) | Implemented in (cited) | Notes / gaps |
|-----------|------------------------------|------------------------|--------------|
| Place order | Validates and persists a customer order | `orders/service.*:place` | 24h expiry rule |
```

## Use case template

```markdown
### UC-<n>: <name>
- **Actor:** who initiates it
- **Trigger:** what starts it
- **Preconditions:** what must be true first
- **Main flow:** numbered steps in domain language
- **Alternate / error flows:** what can go wrong and how the system responds
- **Outcome:** the resulting state / output
- **Source:** cited files/symbols that implement this
```

## Business rule format

State each rule so a non-engineer can read it, but keep the citation so it stays
verifiable:

```markdown
- **Rule:** An order older than 24 hours is automatically expired.
  **Source:** `orders/store.*` (TTL config) — confidence: High.
```

## Extraction tips
- Business rules hide in validation code, guard clauses, config constants, enum
  transitions, and error branches — mine those spots deliberately.
- Tests are an excellent source of intended functional behavior; read the test
  names and assertions as a specification.
- Translate jargon: convert type/method names into the domain concept they
  represent. If you can't name the domain concept, that's an open question, not
  a thing to invent.
- Keep implementation nouns (repository, DTO, channel) out of this document
  except where they *are* the domain language.
