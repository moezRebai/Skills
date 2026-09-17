# Observability

Design for every hosting target in the architecture, including Windows services and OpenShift workloads, and align with the monitoring platforms the organization already runs.

## What to produce

1. **Signals per component:** logs, metrics, traces, health.
2. **Instrumentation standard:** OpenTelemetry by default for traces and metrics (vendor-neutral), with structured logging correlated by trace ID.
3. **Collection and routing** per target (agents, sidecars, collectors) to the chosen back ends.
4. **Dashboards:** one per service plus an end-to-end business flow view.
5. **Alerting:** symptom-based alerts tied to SLOs, with severity, routing and runbook links.
6. **SLOs:** SLIs, targets and error budgets derived from the NFRs.
7. **Audit and security events:** what is logged, tamper evidence, retention, routing to the SIEM.
8. **Retention and cost:** retention per signal, sampling, cardinality limits.
9. **Operating model:** who monitors when, alert routing, on-call and escalation, incident handling and reporting, post-incident reviews, runbooks, and review cadences.

## Methods

- **Golden signals** for services: latency, traffic, errors, saturation.
- **RED** (rate, errors, duration) for request-driven services.
- **USE** (utilization, saturation, errors) for resources and hosts.
- **Business metrics** where they reveal health better than technical ones (for example prices published per second, quote rejection rate, message lag).

## Logging

- Structured (JSON) logs with timestamp (UTC), level, service, version, environment, trace and span IDs, correlation ID, and a message.
- No secrets or unnecessary personal data in logs; define masking.
- Levels and sampling rules; avoid logging per message on hot paths — use metrics instead.
- Windows services: file logs plus Windows Event Log for lifecycle events; shipped by an agent (for example Filebeat, Fluent Bit, the OpenTelemetry Collector, Splunk forwarder).
- OpenShift: log to stdout/stderr; the cluster logging stack or a collector forwards logs.

## Metrics

- Prometheus-style metrics exposed by each service (or pushed via OpenTelemetry).
- Windows hosts: `windows_exporter` or the OpenTelemetry Collector for host and performance counters.
- OpenShift: the platform monitoring stack or user-workload monitoring; ServiceMonitors for scraping.
- Label discipline to control cardinality (no user IDs or instrument IDs as labels unless bounded).

## Tracing

- OpenTelemetry SDKs; context propagation across HTTP, gRPC and messaging headers.
- Sampling strategy (head, tail, or rate-based) with full sampling for errors if affordable.
- Back ends: Jaeger, Grafana Tempo, Elastic APM, or the commercial platform in use.

## Front end

- Real user monitoring: page load, errors, and real-time feed health as seen by users (for example OpenTelemetry for the browser or Grafana Faro, or the commercial suite's RUM).
- Correlate UI requests with back-end traces.

## Configuration changes

- Log every configuration and flag change (who, what, when, old and new value) and show changes as annotations on dashboards; many incidents start with a change.

## Alerting

- Alert on symptoms users feel (SLO burn rate, error rate, latency, message lag), not on every cause.
- Each alert: owner, severity, notification route, runbook link, and a test.
- Avoid alert floods: grouping, inhibition, and maintenance windows aligned with change windows.

## Operating model

Monitoring only works if people act on it. Design the process with the same care as the tooling:

- **Coverage hours:** who watches which signals, and when; what happens outside those hours.
- **Severity levels:** a small table (for example SEV1–SEV3) with a definition, response and resolution targets, and who is notified for each.
- **Routing:** every alert goes to a named team through a named channel (paging, ITSM ticket, chat, email). Critical alerts need a channel that wakes someone up, or an explicitly accepted risk.
- **Escalation:** the chain from first responder to on-call engineer, to team lead, to incident manager, with times.
- **Incident handling:** link to the organization's major-incident process; state who leads, who communicates, and how the business is informed.
- **Regulatory reporting:** if the user says incident classification and reporting obligations apply, record who classifies incidents, the deadlines, and which data the monitoring must provide as evidence.
- **Runbooks:** one per alert, stored in a known place, owned, and tested in drills.
- **Post-incident reviews:** trigger, format, and how actions are tracked.
- **Reviews:** SLO and error-budget review cadence and attendees; alert-noise review (remove or tune alerts nobody acts on); capacity and trend review.
- **Change awareness:** deployments and configuration changes appear as dashboard annotations; alerts are silenced during planned changes and automatically restored.
- **Drills:** failover, escalation and runbook drills with a schedule.

## SLOs

Table: service → SLI → target → window → error budget policy. Targets come from the NFRs; do not invent them — propose and let the user confirm.

## Catalog (verify current versions and support)

| Area | Options |
|---|---|
| Instrumentation | OpenTelemetry (SDKs, Collector) |
| Metrics | Prometheus, Thanos/Mimir for long-term storage, OpenShift monitoring |
| Dashboards | Grafana, Kibana/OpenSearch Dashboards |
| Logs | ELK (Elasticsearch, Logstash, Kibana), OpenSearch, Grafana Loki, Splunk |
| Traces | Jaeger, Grafana Tempo, Elastic APM |
| Alerting | Alertmanager, Grafana Alerting, PagerDuty, Opsgenie |
| Commercial suites | Datadog, Dynatrace, New Relic, Splunk Observability, Azure Monitor / Application Insights |
| Shippers and agents | OpenTelemetry Collector, Fluent Bit, Fluentd, Filebeat, Splunk Universal Forwarder, windows_exporter |
| Health and discovery | Consul health checks, Kubernetes probes |
