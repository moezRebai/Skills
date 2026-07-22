# Verification loop

The failure mode of AI-generated codebase docs is confident fiction: plausible
architecture that the source does not actually contain. This loop exists to
catch that before anything reaches the user. Run it in Phase 4, and keep its
mindset throughout.

## The rule

**No claim ships without a source anchor.** For every substantive statement in
either document, one of these must be true:
1. It is anchored to a real file/symbol you have actually read, OR
2. It is explicitly labeled as inferred/uncertain and moved toward the
   open-questions section.

If neither holds, delete the claim or downgrade it to a question.

## Loop: propose → check → correct

For each drafted section:

1. **Propose** — write the claim/diagram/rule.
2. **Check** — go back to the cited source and confirm it says what you claimed.
   Actually re-open the file; do not rely on memory of a file read many steps
   ago. For dependency and layering claims, confirm the import edge exists in
   both directions you assert.
3. **Correct** — if the source disagrees, fix the claim to match the code. The
   code wins over naming, over the README, and over your prior expectation.

## High-risk claims to double-check

These are where hallucination concentrates — verify them explicitly:

- **Layering & dependency direction.** "A depends on B" must be shown by a real
  import/reference. Watch for claims of clean layering that the imports violate.
- **Design patterns.** Don't label something a "repository", "CQRS handler",
  "saga", or "event-sourced" unless the code actually implements that shape.
- **Data flow & ordering.** Sequence diagrams must match the real call order,
  including async/queued hops (which reorder execution).
- **Business rules & constants.** Quote the actual threshold/rule from source,
  not a rounded or assumed value.
- **"The system does X."** Confirm X is reachable code, not dead code, a stub,
  or a feature-flagged-off path.
- **External integrations.** Verify the integration is real (client
  constructed + called), not just a dependency present in the manifest.

## Naming-lies check

Explicitly look for places where the identifier promises one thing and the body
does another (a `validate()` that mutates, a `Cache` that never evicts, a
`ReadOnly` type with writes). These are the highest-value findings in the whole
exercise — surface them prominently in the technical doc.

## Confidence labeling

Attach a confidence level to inferred material:
- **High** — directly evidenced by code you read.
- **Medium** — strongly implied by multiple signals but not stated.
- **Low** — plausible guess; belongs in open questions.

Every document ends with a **Confidence & open questions** section that
collects all Medium/Low items and anything you could not access. A short honest
gap list is more valuable to the reader than a polished but unreliable narrative.

## Cross-document consistency

Before emitting, reconcile the two documents: a capability in the functional doc
should map to a component/flow in the technical doc, and vice versa. A mismatch
usually means one side is guessing — investigate rather than paper over it.
