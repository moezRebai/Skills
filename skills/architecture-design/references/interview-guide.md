# Interview guide

## How to ask

Follow "Asking questions" in `SKILL.md`: one question at a time, 2–4 selectable choices, recommended first. Example with a question tool (Claude Code `AskUserQuestion`):

```
header:   "Availability"
question: "Q4/14 — What availability does the new pricer need? Today pricing is degraded during the nightly batch (runbook.md §2); this decides active-active vs active-passive."
multiSelect: false
options:
  - "99.9%, trading hours (Recommended)" — 24/5, no degradation during batches; active-active nodes
  - "99.95%+, 24/7"                       — continuous service; multi-site, higher cost
  - "99.5%, windows allowed"              — maintenance windows kept; simpler active-passive
```

The same question without a question tool:

> **Q4/14 — Availability.** Today pricing is degraded during the nightly batch (`runbook.md §2`). What availability does the new pricer need? *This decides active-active versus active-passive.*
> 1. **99.9%, trading hours (Recommended)** — 24/5, no degradation during batches
> 2. **99.95%+, 24/7** — continuous service, multi-site, higher cost
> 3. **99.5%, windows allowed** — keep maintenance windows, simpler setup
>
> Reply with a number, or type your own answer.

Rules:
- Number questions against the mode's budget so the user sees progress.
- Skip questions the sources already answer; instead offer the sourced answer as the recommended choice, or gather such confirmations into one inherit-and-confirm list.
- Include an **"Unknown — use recommended"** choice when the user may genuinely not know (numbers, targets). Record it as an assumption with a risk level (low / medium / high).
- For numbers, offer realistic tiers as choices (latency, throughput, RTO/RPO, volumes) rather than asking for a free number.
- If an answer conflicts with a source or an earlier answer, say so and ask which holds (single choice: the source, the new answer).
- Stop when the budget is reached; ask more only for high-risk gaps and say why.

## Coverage list

Every topic ends as **answered**, **confirmed from sources** (cite them), or **not applicable** (only after asking). Track the status in `_session.md` and show the list before closing the interview.

1. Business drivers and ranking
2. Scope, users and load
3. Quality attributes (availability, latency, RTO/RPO, consistency)
4. Data (domains, ownership, sensitivity, retention)
5. Integrations and consumers
6. **Technology stack** — languages, runtime versions, frameworks, key libraries, testing tools
7. **Front end** — is there a UI, who uses it, what kind, real-time needs
8. **Configuration management** — what is configured, where, who changes it, how often, reload and audit
9. **Service discovery** — how components find each other and their dependencies
10. **Monitoring and incident process** — who watches, alert routing, on-call and escalation, incident handling and reporting, SLO reviews
11. Existing estate (technologies, hosting, release tooling, secrets, identity, monitoring tools)
12. Security and compliance
13. Team and operations
14. Mode-specific topics (legacy rebuild or feature)

Feature mode: the same topics, but most are inherited; ask only where the feature changes them.

## Choice sets for common questions

Adapt labels to the context; keep the most likely choice first.

| Question | Type | Typical choices |
|---|---|---|
| Top drivers | Multiple (pick up to 3, ask ranking next) | Time to market · Performance/latency · Reliability · Cost |
| Availability | Single | 99.9% trading hours · 99.95%+ 24/7 · 99.5% with windows · Unknown |
| Latency (p99) | Single | < 10 ms · < 100 ms · < 1 s · Unknown |
| RTO / RPO | Single | Minutes / zero loss · < 1 h / < 5 min · Next business day · Unknown |
| Consistency | Single | Strong everywhere · Strong for core, eventual elsewhere · Eventual is fine |
| Data sensitivity | Multiple | Personal data · Client confidential · Licensed market data · Internal only |
| Hosting targets available | Multiple | OpenShift/Kubernetes · Windows servers (services/IIS) · Linux VMs · Public cloud |
| Release and deployment tooling | Multiple | XL Release + XL Deploy · Azure DevOps · GitLab/Jenkins · Argo CD/GitOps |
| Keep the current language? (rebuild) | Single | Keep it, move to the current LTS runtime · Change language · Mix per component |
| Back-end language | Single | C#/.NET · Java/Kotlin (JVM) · C++ · Go |
| Runtime version policy | Single | Current LTS only · Latest release allowed · Fixed by the platform team |
| Low-latency hot path | Single | Managed runtime with tuning (GC, allocation-free code) · Native (C++/Rust) for the hot path only · Not latency-critical |
| API framework (.NET) | Single | ASP.NET Core minimal APIs · ASP.NET Core controllers · gRPC services |
| Testing stack | Multiple | Unit tests · Integration tests with containers · Contract tests · Performance/latency tests |
| Who watches production | Single | Ops/NOC 24/7 · Ops during business hours + dev on-call · Dev team only |
| Alert notification | Multiple | Paging tool (PagerDuty, Opsgenie) · ITSM tickets (ServiceNow) · Chat (Teams) · Email |
| On-call model | Single | Dedicated rota with paging · Best-effort phone escalation · No on-call |
| Incident process | Single | Existing ITSM major-incident process · Team-level process · None yet |
| Regulatory incident reporting | Single | Yes, classification and reporting required (for example DORA) · No · Unknown |
| Post-incident reviews | Single | Blameless review for every major incident · Only when asked · None |
| SLO and alert review cadence | Single | Monthly · Quarterly · Ad hoc |
| Business-facing monitoring | Multiple | Desk sees price health in the UI · Business dashboard · Daily report · None |
| Synthetic checks | Single | Internal and external canaries · Internal only · None |
| Is there a UI? | Single | Yes, new UI in scope · Yes, existing UI kept · No, API/streaming only |
| UI type | Single | Web SPA (React/Angular) · Blazor · Desktop (WPF/WinForms) · Excel add-in |
| UI real-time needs | Single | Live streaming prices · Periodic refresh · Request/response only |
| UI users | Multiple | Traders/sales · Clients · Ops/support · Admins |
| Configuration kinds | Multiple | Technical settings · Business parameters (spreads, margins, limits) · Feature flags · Connection/endpoints |
| Config change frequency | Single | Only at deployment · A few times a day · Intraday by business users |
| Config reload | Single | Hot reload without restart · Restart acceptable · Unknown |
| Config source | Multiple | Files + XL Deploy dictionaries · Central config service (Consul, etc.) · Database + admin UI · Kubernetes ConfigMaps |
| Config audit | Single | Full audit trail and approval · Audit trail only · Not required |
| Service discovery | Single | Static DNS + load balancer · OpenShift/Kubernetes service DNS · Consul · Service mesh |
| Secrets store | Single | Vault · CyberArk · XL Deploy encrypted dictionaries · Kubernetes Secrets |
| Monitoring platform | Multiple | Grafana stack (Prometheus/Loki/Tempo) · ELK/OpenSearch · Splunk · Datadog/Dynatrace |
| Identity | Single | Corporate OIDC/OAuth2 IdP · Windows/Kerberos · Client identity service · Unknown |
| Regulations | Multiple | DORA · GDPR · MiFID II · None I know of |
| Team size | Single | 1–3 · 4–8 · 9–15 · More |
| Who runs production | Single | Dev team (you build it, you run it) · Separate ops team · Platform team + dev team |
| Parallel run possible (rebuild) | Single | Yes, full parallel run · Partially (shadow traffic) · No, big-bang only |
| Release approach (feature) | Single | Feature flag · Canary · Direct release |
| Gate | Single | Approve · Revise · Back to an earlier phase |

## Question bank

Pick and order by relevance. Greenfield draws from all groups; legacy rebuild emphasizes what changes versus legacy; feature mode uses the inherit-and-confirm list plus the feature group.

### Business drivers
- What problem does the system solve, for whom, and what does success look like?
- Rank the drivers: time to market, cost, performance, reliability, scalability, security/compliance, maintainability, team autonomy.
- Deadlines, budget envelope, expected lifetime.

### Scope and load
- Users and consumers (people, systems), peak and growth.
- Throughput and latency targets (with percentiles), message rates, data volumes and retention.
- Batch versus real-time needs; time zones and trading or business hours.

### Quality attributes
- Availability target and allowed maintenance windows.
- RTO and RPO; disaster recovery expectations; multi-site needs.
- Consistency needs (strong versus eventual) per data area.

### Data
- Main data domains, ownership, sources of truth.
- Sensitivity and classification (personal data, confidential, market data licensing).
- Reporting and analytics needs; audit and retention rules.

### Integrations
- Upstream and downstream systems, protocols, contracts, ownership.
- Market data or external providers; licensing constraints.

### Technology stack
- Rebuild: keep the current language and move to a supported runtime, or change language? For which components?
- Which languages, runtimes and versions are approved? Is there a version policy (for example long-term-support releases only)?
- Team skills: which languages and frameworks can the team build and support today?
- Performance: is any component latency-critical enough to need special runtime tuning or a native language?
- Main frameworks and libraries: API framework, messaging clients (are client libraries available for the chosen broker and market data providers in that language?), serialization, data access, resilience, logging and tracing libraries.
- Internal shared libraries or frameworks that must be reused.
- Testing and quality tools: unit, integration, contract and performance testing; static analysis.
- Build tooling and artifact formats (for example NuGet packages, container images).

### Front end and consumers
- Is there a user interface in scope, an existing one kept, or only API/streaming consumers?
- Who uses it, how many, from where (internal network, clients over the internet)?
- UI technology constraints or standards (web framework, Blazor, desktop, Excel add-in).
- Real-time needs: streaming prices or blotters, refresh rates, number of concurrent subscriptions.
- Does the UI talk to the back end directly or through a backend-for-frontend or gateway?
- Accessibility, localization, browser or desktop support requirements.

### Monitoring and incident process
Tools are covered under the existing estate; these questions cover how monitoring is run.
- Who watches production and when (NOC or ops team, business hours only, dev team)?
- How are people alerted: paging tool, ITSM tickets, chat, email? Is there an on-call rota, and who is on it?
- Escalation path and response targets per severity (acknowledge, mitigate, resolve).
- Incident process: existing major-incident process in the ITSM tool? Who is incident commander? How are users and the business informed?
- Regulatory incident obligations: must incidents be classified and reported within set deadlines (for example under DORA if it applies)? Who owns that?
- Post-incident reviews: when, who, and how actions are tracked.
- Runbooks: where they live, who writes and tests them, how alerts link to them.
- Dashboards: who uses which (ops, developers, business, management)? Does the business need its own view of system health?
- SLO and alert reviews: how often, who attends, what happens when the error budget is spent (freeze changes, prioritize reliability work)?
- Synthetic monitoring: are canaries or external probes needed?
- Maintenance and changes: how are alerts silenced during change windows, and are deployments shown on dashboards?
- Capacity and trend reviews: who looks at growth, and how often?

### Configuration and service discovery
- What is configured: technical settings, business parameters (spreads, margins, limits), feature flags, endpoints?
- Who changes each kind (developers at deployment, ops, business users intraday), and how often?
- Must changes apply without restart (hot reload)? Do they need approval, audit trail, versioning or rollback?
- Where does configuration live today, and where should it live (files with XL Deploy dictionaries, central config service, database with an admin UI, ConfigMaps)?
- How do components find each other and their dependencies today (hard-coded hosts, DNS, load balancers, Consul, Kubernetes service names)? Does this need to change?
- How are configuration differences between environments managed, and how is drift detected?

### Existing estate (always ask)
- Approved technology list or architecture standards.
- Hosting targets available (OpenShift/Kubernetes, Windows servers and services, IIS, Linux VMs, cloud).
- Release and deployment tooling (for example XL Deploy and XL Release), CI system, artifact repositories.
- Configuration, service discovery and secrets tooling (for example Consul, Vault).
- Identity provider and authorization approach.
- Monitoring, logging and alerting platforms already in use.
- Change management: approval gates, change windows, segregation of duties.

### Security and compliance
- Regulations that apply (the user names them; do not assume).
- Authentication for users and services; authorization model.
- Network zones and restrictions; encryption requirements; audit needs.

### Team and operations
- Team size and skills; who runs it in production (dev team, ops team, platform team).
- Support hours and on-call; operational maturity.
- Build versus buy preferences.

### Legacy rebuild specifics
- Which legacy behaviours must be preserved exactly? Which are known defects?
- Can old and new run in parallel? Is a big-bang cut-over acceptable?
- Data migration scope and acceptable downtime.
- Decommissioning constraints (contracts, dependent consumers).

### Feature specifics
- Feature goal, users and success measure.
- NFRs that differ from the system's.
- New data or new sensitivity; new integrations.
- Release constraints: deadline, feature flag, backward compatibility, coordinated releases.

## Requirements document

Write `02-requirements.md` from `assets/templates/requirements.md`: ranked drivers, NFR table with measurable targets and sources, constraints (including the existing estate), integrations, and the assumptions log.
