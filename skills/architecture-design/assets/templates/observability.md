# Observability

<header>

## Signals per component
| Component | Logs | Metrics | Traces | Health | Collection (agent/sidecar/collector) |
|---|---|---|---|---|---|

## Standards
<Instrumentation (OpenTelemetry), log format and fields, correlation, masking, label rules.>

## Pipeline
```mermaid
flowchart LR
  %% sources -> collectors/agents -> back ends -> dashboards/alerts
```

## Dashboards
## SLOs
| Service | SLI | Target | Window | Error budget policy |
|---|---|---|---|---|

## Alerts
| Alert | Condition | Severity | Route | Owner | Runbook |
|---|---|---|---|---|---|

## Operating model
### Coverage and roles
| Role | Who | Hours | Watches |
|---|---|---|---|

### Severity levels
| Severity | Definition | Acknowledge | Mitigate | Notified |
|---|---|---|---|---|

### Escalation and incident handling
<Escalation chain with times; link to the major-incident process; communication to users and business; regulatory reporting owner and deadlines if applicable.>

### Runbooks, reviews and drills
| Activity | Cadence | Owner | Output |
|---|---|---|---|
| SLO and error-budget review | | | |
| Alert-noise review | | | |
| Post-incident review | Per major incident | | |
| Failover and escalation drills | | | |

## Audit and security events
| Event | Source | Destination | Retention | Tamper evidence |
|---|---|---|---|---|

## Retention and cost
