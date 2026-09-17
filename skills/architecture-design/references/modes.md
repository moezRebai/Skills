# Modes

Three starting situations. The mode is chosen by the user in phase 0 and recorded in `_session.md` and in every document header, so later sessions (for example a feature session) can build on earlier ones.

## Greenfield

A brand-new system with nothing to replace.

- **Inputs:** functional specs, business requirements, integration docs, any existing enterprise standards. May be "none".
- **No codebase.**
- **Interview weight:** highest (about 15–22 questions). With little to cite, more answers become assumptions, so the review checks assumptions more strictly and lists which must be validated before build.
- **Challenge focus:** scope, expected load and growth, team size and skills, build versus buy for each major component.
- **Integrations still matter:** a greenfield app inside a company rarely lives alone (identity provider, shared data, monitoring platform, release tooling). Design integration contracts even though nothing is migrated.
- **Phases:** 0 setup → 1 ingest → 2 interview → 3 options → 4 architecture → 5 security → 6 infrastructure → 7 observability → 8 launch plan → 9 review → 10 demo pack.

## Legacy rebuild

A new system replacing an existing one.

- **Inputs:** legacy docs, specs, runbooks, previous discovery output, and the legacy codebase.
- **Code shows what the system does; docs show intent.** Record every conflict and ask which is right.
- **Interview weight:** about 12–20 questions, grounded in legacy facts ("The docs mention a nightly batch window; does the new system need 24/7 availability?").
- **Challenge focus:** which legacy behaviours are real requirements versus accidents of implementation; drivers and trade-offs.
- **Phases:** 0 → 1 → 2 → 3 options → 4 architecture → 5 security → 6 infrastructure → 7 observability → 8 migration plan → 9 review → 10 demo pack.

## Feature

A new feature inside an existing application. The existing architecture is a fixed constraint, not something to replace.

- **Inputs:** existing architecture docs (preferably `docs/architecture/` from an earlier session, which then becomes the main source), feature specs, and the current codebase. Scan only the code the feature touches.
- **Inherit first:** extract NFRs, platform, front end, security model, configuration and discovery, logging, deployment approach and conventions from the sources and show them as a numbered list. Ask (single choice): **All correct (Recommended)** or **Some need correcting**. If corrections are needed, ask which items (multiple choice, up to four at a time), then ask for each correction.
- **Then ask only about gaps** (3–6 questions): goal and users, NFRs that differ from the system's, new data or sensitivity, new integrations, release constraints (deadline, feature flag, backward compatibility). Add questions only when the impact analysis uncovers a real risk.
- **Challenge focus:** impact, compatibility and rollout risk rather than long interviewing.
- **Options only when there is a real choice.** If the architecture leaves one sensible design, say so.
- **Escalation:** if the feature cannot fit the architecture, stop and propose an architecture-level ADR.
- **Outputs:** `docs/architecture/features/<feature-name>/`; ADRs go in the shared `docs/architecture/adr/`.
- **Phases:** 0 → 1 ingest → 2 inherit-and-confirm + gap questions → 3 impact analysis → 4 options (conditional) → 5 design → 6 cross-cutting deltas → 7 rollout plan → 8 review → 9 demo pack (delta view).

## Comparison

| | Greenfield | Legacy rebuild | Feature |
|---|---|---|---|
| Starting point | Specs, little else | Legacy docs + code | Current architecture + code |
| Questions | ~15–22, broad | ~12–20, grounded | 3–6, gap-only |
| Defaults | Suggested per question | Suggested from legacy facts | Inherited, confirmed in one step |
| Options | Always 2–3 | Always 2–3 | Only if a real choice exists |
| Detail level | Full | Full | Delta only |
| Transition | Launch plan | Migration plan | Rollout plan |

## File names per mode

| Phase | Greenfield / rebuild | Feature |
|---|---|---|
| State | `_session.md` | `features/<name>/_session.md` |
| Context | `01-context-brief.md` | `01-context.md` |
| Requirements | `02-requirements.md` | `02-requirements.md` |
| Options / impact | `03-options.md` | `03-impact.md` |
| Architecture / options | `04-architecture.md` | `04-options.md` (only if needed) |
| Security / design | `05-security.md` | `05-design.md` |
| Infrastructure / deltas | `06-infrastructure.md` | `06-cross-cutting.md` |
| Observability / rollout | `07-observability.md` | `07-rollout.md` |
| Transition / review | `08-launch-plan.md` or `08-migration-plan.md` | `08-review.md` |
| Review | `09-review.md` | — |
| Demo pack | `architecture-overview.html` | `overview.html` (after `08-review.md`) |
