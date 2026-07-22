# Integration & real-time surfaces

Most systems expose or consume three kinds of surface that ordinary flow-tracing
tends to under-document: **request/response APIs**, **real-time channels**, and
the **service topology** that connects components. Treat these as first-class:
go looking for them deliberately, and render each with its own output shape.

This is category-level guidance — it names surface *kinds*, never specific
vendors, protocols, or platforms. Whatever the stack, map the concrete thing you
find onto the nearest category below.

## Table of contents
- A. API surface (request/response)
- B. Real-time & streaming channels
- C. Service topology (discovery & routing)
- Grounding rules for all three

## A. API surface (request/response)

Any interface where a caller sends a request and gets a response: HTTP/REST,
GraphQL, RPC, gRPC unary, message-driven request/reply, CLI commands, or a
library's public API. Enumerate it — don't just mention it in passing.

**Find it by:** route/controller registrations, decorator/annotation-based
handlers, a schema/IDL (OpenAPI, GraphQL SDL, proto), API-client wrappers on the
consumer side, or a gateway/router config.

**Render it as an endpoint inventory:**

```markdown
| Surface | Operation | Purpose (domain terms) | Consumed by | Defined in (cited) |
|---------|-----------|------------------------|-------------|--------------------|
| <group> | <verb/path or method> | <what it does> | <caller/page/service> | <file:symbol> |
```

For frontend or multi-screen apps, also produce a **surface-per-view map** —
which screen/page/route calls which operations. This answers "what does this page
depend on?" and is one of the most requested onboarding artifacts:

```markdown
| View / route | Operations it calls | Notes |
|--------------|---------------------|-------|
```

Capture per operation where grounded: inputs/outputs, auth requirement, and error
semantics. If a schema/IDL exists, treat it as the spec but verify the handler
actually implements it.

## B. Real-time & streaming channels

Any surface that pushes data over time rather than answering once: WebSockets,
server-sent events, long-poll, publish/subscribe topics, message queues, event
streams, hub/group broadcast mechanisms, gRPC streaming, change feeds. These
reorder execution and carry backpressure concerns, so document them distinctly
from request/response APIs.

**Find it by:** connection/subscription setup code, topic/channel/hub
declarations, event handler or callback registrations, producer/consumer loops,
and reconnection/heartbeat logic.

**Render it as a channel inventory + a subscription lifecycle note:**

```markdown
| Channel | Direction | Payload (domain terms) | Producer | Consumer(s) | Defined in (cited) |
|---------|-----------|------------------------|----------|-------------|--------------------|
| <name/topic/hub> | push / bidi / consume | <what flows> | <src> | <dst> | <file:symbol> |
```

For each significant channel, describe the **lifecycle** in plain terms:
- How a consumer subscribes/joins and unsubscribes/leaves.
- Grouping/fan-out (broadcast to all, to a group, to one client).
- Delivery/ordering guarantees the code actually provides (not what it "should").
- Backpressure / buffering / drop or conflate behavior, if any.
- Reconnection and missed-message handling.

Add a sequence diagram for the main streaming flow — mark async/pushed hops so the
ordering is honest (see technical-docs.md sequence pattern).

## C. Service topology (discovery & routing)

How components locate and reach one another: static config/URLs, DNS, a service
registry/discovery mechanism, a gateway/reverse proxy, a load balancer, or a
message broker acting as the connective tissue. This is the "how are the boxes
wired" layer above individual APIs.

**Find it by:** service registration/deregistration calls, discovery-client
lookups, gateway/proxy route tables, connection strings and endpoint config,
health-check registration, and infra/deploy manifests.

**Render it as a topology view:**
- A Mermaid diagram of services + how each finds/reaches the others (direct,
  via registry, via gateway, via broker).
- A short table: for each dependency edge — mechanism (static / discovery /
  gateway / broker), and where it's configured (cited).
- Note routing concerns that are actually present: load balancing, retries,
  timeouts, circuit breaking, rate limiting, auth at the edge.

```markdown
| From | To | Mechanism | Configured in (cited) |
|------|----|-----------|-----------------------|
```

## Grounding rules for all three

- A surface is only real if the code **constructs and uses** it. A dependency in
  a manifest, a commented-out route, or a declared-but-unwired handler is *not* a
  live surface — note it as latent/dead, don't list it as active.
- Prefer the schema/IDL/route table as the enumeration source, but confirm the
  implementation matches it; where they diverge, the code wins and the divergence
  is an open question.
- Describe payloads and channels in domain terms in the functional doc, and in
  transport/technical terms in the technical doc — same surface, two lenses.
- If you cannot fully enumerate a surface (e.g. dynamically registered routes),
  say so and list what you confirmed rather than implying completeness.
