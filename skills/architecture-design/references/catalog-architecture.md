# Architecture catalog

Use this to choose, not to decorate. For every option you propose, be able to say which driver it serves and what it costs. Verify current versions and support status of any named product before recommending it.

## Contents
1. Architecture styles
2. Communication
3. Data storage
4. Front end
5. Technology stack
6. Choosing and scoring

## 1. Architecture styles

| Style | Fits when | Avoid when | Operating cost |
|---|---|---|---|
| **N-layer** (presentation / business / data) | Simple CRUD-centric apps, small teams, stable scope | Complex domain logic, many integrations | Low |
| **Clean / hexagonal** (ports and adapters) | Rich domain logic, many external dependencies to isolate, long lifetime, high testability needs | Thin apps where the abstraction is pure overhead | Low (it is a code structure, not a deployment model) |
| **Modular monolith** | One team or a few teams, need strong module boundaries, want an option to extract services later | Components with very different scaling, availability or release cadence | Low–medium |
| **Microservices** | Several autonomous teams, independent scaling and release per capability, mature platform and DevOps | Small team, unclear domain boundaries, no platform team, strong cross-service consistency needs | High: distributed tracing, service discovery, contract testing, per-service pipelines |
| **Event-driven** (pub/sub) | Real-time propagation, decoupled producers and consumers, fan-out, streaming data (prices, positions, events) | Request/response semantics with strict ordering across everything, teams new to async debugging | Medium–high: broker operations, idempotency, schema evolution, replay |
| **Event sourcing** | Full audit history is a requirement, temporal queries, rebuildable projections | Simple state, teams without experience, heavy schema churn | High |
| **CQRS** | Read and write loads or models differ strongly | Simple domains; often combined with event sourcing but does not require it | Medium |
| **Serverless / functions** | Spiky or low, event-triggered workloads, cloud-native estates | Low-latency hot paths, long-running processes, on-prem-only estates | Low ops, higher vendor coupling |
| **Space-based / in-memory data grid** | Very high throughput and low latency with shared state (for example pricing caches) | Moderate loads where a cache plus database suffices | High |
| **Micro-frontends** | Several teams owning parts of a large UI | One team, one UI | Medium |
| **Batch / pipeline** | Scheduled bulk processing, ETL, end-of-day | Real-time needs | Low–medium |

Hybrids are normal: for example a modular monolith with an event-driven integration layer, or a few services around a core monolith. Say explicitly which parts use which style.

## 2. Communication

| Mechanism | Fits | Watch out for |
|---|---|---|
| **REST/HTTP** | Public and internal APIs, broad tooling | Chattiness, versioning discipline |
| **gRPC** | Low-latency service-to-service, streaming, strong contracts | Browser support needs a proxy; debugging tools |
| **GraphQL** | Client-driven aggregation across many sources | Caching, query cost control |
| **WebSockets / SignalR / server-sent events** | Pushing updates to UIs | Connection scaling, back-pressure |
| **Kafka** | High-throughput durable streams, replay, event sourcing | Operational weight, partition design, ordering per key only |
| **RabbitMQ** | Work queues, routing, request/reply over messaging | Not a replayable log |
| **Solace** | Enterprise low-latency messaging, hybrid protocols, common in capital markets | Licensing, vendor coupling |
| **NATS / NATS JetStream** | Lightweight, very fast pub/sub, optional persistence | Smaller ecosystem |
| **Aeron** | Ultra-low-latency, high-throughput messaging | Specialist skills |
| **TIBCO Rendezvous/EMS** | Existing estates | Usually a replacement candidate in rebuilds; plan coexistence |
| **Azure Service Bus / AWS SQS-SNS** | Cloud-managed queues and topics | Cloud-only |

Always state: sync versus async per interaction, delivery guarantee (at-most/at-least/effectively-once), ordering needs, idempotency approach, schema and versioning strategy.

## 3. Data storage

| Type | Examples | Fits | Watch out for |
|---|---|---|---|
| **Relational** | SQL Server, PostgreSQL, Oracle | Transactions, integrity, reporting | Scaling writes, schema migrations |
| **Document** | MongoDB, Cosmos DB, Couchbase | Flexible aggregates, per-aggregate access | Cross-document consistency |
| **Key-value / cache** | Redis, Memcached, NCache | Low-latency lookups, sessions, caching | Persistence semantics, cache invalidation |
| **In-memory data grid** | Hazelcast, Apache Ignite, Coherence | Shared low-latency state, compute near data | Operational complexity |
| **Time-series** | kdb+, InfluxDB, TimescaleDB, QuestDB | Ticks, prices, metrics over time | Licensing (kdb+), query language skills |
| **Search** | Elasticsearch, OpenSearch | Full-text search, log analytics | Not a system of record |
| **Graph** | Neo4j | Relationship-heavy queries | Niche skills |
| **Columnar / analytics** | ClickHouse, Snowflake, a data warehouse | Aggregations over large volumes | Not for OLTP |
| **Object storage** | S3-compatible, Azure Blob | Files, archives, data lake | Latency, consistency model |

Patterns to consider: polyglot persistence (one store per need, justified), read replicas, sharding/partitioning, outbox pattern for reliable events, change data capture, caching layers, data retention and archival tiers.

For each store state: owner, source of truth or derived, consistency, backup and restore approach, retention.

## 4. Front end

| Option | Fits | Watch out for |
|---|---|---|
| **Web SPA** (React, Angular, Vue) | Rich web UIs, large ecosystem, static hosting | Separate skill set, token handling in the browser |
| **Blazor Server** | .NET teams, internal apps, live updates over its built-in connection | Server memory per user, latency to the server, connection scaling |
| **Blazor WebAssembly** | .NET teams wanting client-side apps | Download size, same browser token concerns as SPAs |
| **Server-rendered pages** (Razor Pages, MVC) | Simple forms and reports | Limited interactivity |
| **Desktop** (WPF, WinForms) | Existing trader desktops, heavy local interaction | Deployment and update to desktops; often a rebuild candidate |
| **Excel add-in** | Users who live in Excel (pricing, analytics) | Versioning, calculation performance, support |
| **Micro-frontends** | Several teams owning parts of a large UI | Overhead for one team |

Patterns to consider:
- **Backend-for-frontend (BFF):** a thin server per UI that aggregates APIs and keeps tokens out of the browser.
- **Real-time push:** SignalR, WebSockets or server-sent events for streaming prices and blotters; plan throttling, conflation (send only the latest price) and back-pressure.
- **Gateway:** a single entry point for routing, authentication and rate limiting.
- **State and caching:** client-side state management, server-side caching of reference data.

For each UI state: users, technology, hosting, how it authenticates, how it receives real-time data, and how it is deployed.

## 5. Technology stack

Choose per component, but prefer one main stack: every extra language adds build pipelines, libraries, skills and support cost.

### Languages and runtimes

| Option | Fits | Watch out for |
|---|---|---|
| **C# / .NET** | Enterprise back ends, APIs, worker and Windows services, Blazor UIs; strong in capital markets | Stay on a supported (preferably LTS) release; GC tuning for latency-sensitive paths |
| **Java / Kotlin (JVM)** | Large enterprise ecosystems, Kafka-heavy estates | Same GC considerations; heavier startup unless tuned |
| **C++** | Ultra-low-latency engines, existing quant libraries | Memory safety, longer delivery, scarcer skills |
| **Rust** | Low-latency or safety-critical components | Smaller talent pool and ecosystem in finance |
| **Go** | Infrastructure tools, simple high-concurrency services | Fewer finance and enterprise libraries |
| **Python** | Analytics, quant research, scripting, ML | Throughput and latency on hot paths; packaging |
| **TypeScript / JavaScript** | Web front ends, BFFs | Type discipline, dependency hygiene |

### Selection criteria
1. **Approved list and platform support** — hard constraint.
2. **Team skills** — who will build and run it for years.
3. **Library availability** — client libraries for the broker, market data providers, databases and identity provider in that language.
4. **Performance needs** — measured targets, not assumptions; managed runtimes meet most latency targets when code avoids allocations on hot paths.
5. **Support lifecycle** — prefer long-term-support runtime releases and plan the next upgrade.
6. **Interop with what stays** — shared libraries, legacy components, existing contracts.

### What the stack decision must state
Per component: language, runtime and version, application framework, key libraries (messaging, serialization, data access, resilience, logging and tracing), test tools, and build output. Record it in the technology stack ADR. In a rebuild, list what changes from the legacy stack and why; outdated runtimes found during ingestion must be addressed.

## 6. Choosing and scoring

1. Remove options that violate a hard constraint (approved technologies, hosting, regulation). If an excluded option is clearly better, mention it once as "out of bounds because…".
2. Score remaining options 1–5 against each ranked driver; weight by rank. Show the matrix.
3. Add non-functional costs: technology stack changes, team skills gap, operating burden, platform needs, licensing, migration or launch risk, security surface.
4. Recommend the simplest option that meets the top drivers. State what the user gives up.
5. Record the decision and the rejected options in an ADR.

Options must be genuinely different (for example modular monolith versus event-driven services), not variations of one design with different product names.
