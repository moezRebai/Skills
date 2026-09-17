# Transition plans

One of three, depending on the mode.

## Launch plan (greenfield)

- **Environment bootstrap:** order of provisioning, platform onboarding (namespaces, service accounts, registry, XL Deploy environments, XL Release templates), access requests and their lead times.
- **Walking skeleton:** the thinnest end-to-end slice deployed through the real pipeline early, to prove the path to production.
- **Initial data load:** sources, volumes, validation, reconciliation.
- **Readiness checklist:** security sign-off, performance test results against NFRs, dashboards and alerts live, runbooks written, support model agreed, DR tested.
- **Go-live:** cut-over steps, communication, hypercare period, success criteria.
- **Early scaling:** what to watch in the first weeks and the thresholds that trigger action.

## Migration plan (legacy rebuild)

- **Strategy:** strangler fig by default — route capabilities one at a time from legacy to new behind a facade, router or message bridge. Big-bang only if the user accepts the risk and parallel running is impossible; record that in an ADR.
- **Phases:** each with scope (capabilities, consumers, data), entry and exit criteria, and duration estimate as an assumption.
- **Coexistence:** how old and new communicate during transition (bridges between messaging systems, dual writes via outbox, synchronization jobs), and who is the source of truth for each data domain at each phase.
- **Behaviour equivalence:** parallel run or shadow traffic, comparison of outputs, tolerance rules, and the list of legacy behaviours intentionally not reproduced.
- **Data migration:** mapping, cleansing, volumes, dry runs, reconciliation, acceptable downtime.
- **Security during transition:** access control across both systems, protection of data in flight.
- **Cut-over and rollback:** per phase, with the point of no return stated explicitly.
- **Decommissioning:** consumers to migrate, contracts and licences to end, data archiving, infrastructure removal.
- **Hosting moves:** for example from Windows services to OpenShift — run both, compare, switch, then remove the old deployment from the release templates.

## Rollout plan (feature)

- **Release approach:** feature flag, dark launch, canary, or direct.
- **Backward compatibility:** API versioning, tolerant readers, expand-and-contract for schema changes (expand, migrate, switch, contract).
- **Ordering:** which components and database changes deploy first; coordinated release steps in the release orchestrator.
- **Data migration:** if any, with validation.
- **Rollback:** per step, including data; when the flag is turned off, what state remains.
- **Verification:** metrics and alerts that confirm success; the flag cleanup date.

## Common rules

- Every plan names owners, dependencies and risks with mitigations.
- Every irreversible step is highlighted.
- Estimates are assumptions and go in the assumptions log.
