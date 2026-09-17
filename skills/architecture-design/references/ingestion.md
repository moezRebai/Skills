# Ingestion

Goal: understand what exists and what is intended, with every fact traceable to a source.

## Reading documents

1. Read in this order: previous architecture outputs (`docs/architecture/`), then specs and business rules, then technical docs and runbooks, then everything else. Newer and more authoritative sources first.
2. For each document note: purpose, date or version if stated, and the facts it contributes.
3. Record facts with a citation: `(docs/legacy/pricing-spec.docx §3.2)`.
4. If a file cannot be read (binary, scanned image without text, unsupported format), list it as skipped and ask the user whether it matters.
5. Large sets: skim headings and summaries first, then read in depth only what bears on architecture (flows, data, integrations, NFRs, operations, incidents).

## Reading code (lightweight, read-only)

This is a structural scan, not a full discovery. If the user has output from a dedicated discovery tool, use it as a document source instead.

Look for:
- **Documentation inside the codebase:** README files, `docs/` folders, ADRs, changelogs and other Markdown or text documents. They are included by default (unless the user removed them at inventory). Read them as documents, with the same citation rules, and treat them as intent like any other document: when they disagree with the code, record the conflict.
- **Structure:** solution/project files, modules, layering, entry points (services, APIs, jobs, UIs).
- **Dependencies:** package manifests; frameworks and their versions; unsupported or end-of-life versions are a finding.
- **Data stores:** connection configuration, ORM mappings, migrations, schemas.
- **Integrations:** HTTP clients, message producers and consumers, file drops, scheduled jobs, third-party SDKs.
- **Runtime and hosting:** Dockerfiles, OpenShift/Kubernetes manifests, Helm charts, Windows service installers or hosting code, IIS config, deployment packages (for example XL Deploy manifests), CI pipeline files.
- **Configuration:** config files per environment, feature flags, secrets handling.
- **Operations:** logging setup, metrics, health checks, tracing.

Cite code facts by file path. Never copy secrets; replace them with placeholders and report their location.

## Conflicts between docs and code

When they disagree (for example, a document describes a synchronous call and the code uses a queue):
- record both, with citations, in the conflicts table of the context brief;
- ask the user which reflects intent — the answer may be a requirement ("it must be asynchronous") or a defect.

## Context brief contents

Use `assets/templates/context-brief.md`:
- system purpose and users
- current landscape (components, data, integrations, hosting, deployment) — rebuild and feature modes
- functional scope from specs
- pain points and known incidents
- constraints already visible (technology, platform, regulatory, organizational)
- conflicts between sources
- gaps: what the sources do not answer, which becomes interview material
- skipped files and secrets found (locations only)
