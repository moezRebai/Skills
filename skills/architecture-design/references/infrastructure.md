# Infrastructure and deployment

The skill designs deployment; it never runs one. Design on the user's actual tooling. Existing release tools and hosting targets are constraints; changing them requires an ADR.

## Contents
1. What to produce
2. Hosting targets
3. Release and deployment tooling
4. Configuration, discovery and secrets
5. Infrastructure as code
6. Rollout and rollback strategies
7. Environments
8. Catalog

## 1. What to produce

1. **Environments** and promotion path (for example DEV → UAT → PROD), with what differs between them.
2. **Deployment topology:** each component mapped to its hosting target, with a Mermaid diagram.
3. **Pipeline:** build → test → scan → package → deploy → release, naming the real tools and the approval gates.
4. **Configuration** per target and per environment.
5. **Secrets** flow per target.
6. **Rollout and rollback** per target.
7. **Operational settings** per target (resources, health checks, scaling, service accounts, recovery).
8. **IaC** scope: what is code, in which tool, stored where.
9. **Capacity and resilience:** sizing assumptions, redundancy, DR approach tied to RTO/RPO.

## 2. Hosting targets

### OpenShift / Kubernetes
- Workloads as `Deployment` (DeploymentConfig is deprecated in recent OpenShift versions), `StatefulSet` for stateful parts, `CronJob` for schedules.
- Exposure through Services and Routes (or Ingress).
- Readiness, liveness and startup probes; resource requests and limits; HorizontalPodAutoscaler where load varies.
- Security context constraints: run as non-root with the arbitrary UID OpenShift assigns.
- Packaging: container images plus manifests (Helm charts, Kustomize, or OpenShift templates). Images come only from the approved registry.
- Delivery options: OpenShift GitOps (Argo CD), OpenShift Pipelines (Tekton), or XL Deploy's Kubernetes/OpenShift plugins if that is the estate standard.
- Low-latency components: consider node affinity, dedicated nodes, CPU pinning, and whether a container is the right host at all.

### Windows services
- .NET worker services hosted with the Windows service host integration (for .NET: `UseWindowsService`), or legacy service hosts.
- Service account: dedicated low-privilege domain account or gMSA.
- Recovery options (restart on failure, reset period) configured as part of deployment.
- Side-by-side install in versioned folders (`D:\apps\<service>\<version>\`); switching versions updates the service binary path, which makes rollback a path switch.
- Health: an HTTP health endpoint or a heartbeat metric; startup and graceful shutdown timeouts.
- Multiple nodes: drain one node behind the load balancer (or pause its message consumption) before upgrading it.
- Logs to a known folder and/or Windows Event Log, shipped by an agent.

### Front end
- Static SPA files: served by a web server or container (for example an nginx image on OpenShift), IIS, or a CDN; cache-busting and per-environment configuration loaded at runtime rather than baked into the build.
- Blazor Server or server-rendered UIs: hosted like any web app; plan sticky sessions or connection affinity where needed.
- Desktop apps: distribution and update mechanism (software center, ClickOnce, MSIX).

### IIS
- Application pools per app, identity, recycling settings; deployment by folder switch or Web Deploy; warm-up.

### Linux VMs / systemd
- Unit files, restart policies, users, log handling; packages (RPM/DEB) or artifacts from the repository.

### Cloud PaaS and serverless
- Only if the estate allows it; state data residency and network connectivity constraints.

## 3. Release and deployment tooling

### XL Deploy (Digital.ai Deploy)
- **Deployment packages (DAR)** with a manifest listing deployables; one package per deployable unit and version, produced by CI and imported into XL Deploy.
- **Infrastructure and environments** modeled as configuration items (hosts, servers, containers, clusters).
- **Dictionaries** hold per-environment values that fill placeholders in packaged config files; use encrypted dictionaries or vault integration for secrets.
- **Deployment plans** are generated from package + environment; orchestrators control ordering (serial, parallel, by host, by container).
- Plugin types differ per installation and version. Ask which plugin types the user's instance supports (Windows service, IIS, OpenShift/Kubernetes, generic scripts) instead of assuming.
- Rollback: XL Deploy can roll back to the previously deployed package; design package contents so rollback is safe (for example no destructive database steps inside the same package).

### XL Release (Digital.ai Release)
- **Templates** define the release flow as phases and tasks; releases are instances of a template.
- Typical phases: build verification → deploy to test (XL Deploy task) → automated tests → approval gate → change ticket → deploy to production → post-deployment checks.
- **Gates** carry approvals and conditions; use them for segregation of duties and change windows.
- **Variables** pass versions and parameters between tasks; folders and teams control permissions.
- Model cross-team dependencies explicitly when several components release together.

### Other tools (when they are the estate standard)
Azure DevOps, GitLab CI, Jenkins, GitHub Actions, TeamCity for CI; Octopus Deploy, Argo CD, Flux, Spinnaker for deployment.

### Pipeline design rules
- Build once, promote the same artifact through every environment.
- Versioned, immutable artifacts from the approved repository only.
- Automated checks before any manual gate; manual gates only where policy requires them.
- Database changes as versioned migrations, deployed as their own step with a rollback or roll-forward plan.

## 4. Configuration, discovery and secrets

### Configuration design
- **Principle:** no environment-specific values or secrets inside packages or images. Same artifact, different configuration.
- **Classify configuration** and design each kind separately:

| Kind | Typical owner | Changes | Good home |
|---|---|---|---|
| Technical settings (timeouts, pool sizes, log levels) | Dev / ops | At deployment | Files + XL Deploy dictionaries, ConfigMaps |
| Endpoints and connections | Ops | Per environment | Dictionaries, ConfigMaps, discovery |
| Business parameters (spreads, margins, limits) | Business users | Intraday | Database with an admin UI, audit trail and approval; or a central config service with access control |
| Feature flags | Product / dev | Anytime | Flag service or central config |
| Secrets | Security / ops | Rotation | Vault (see `security.md`) |

- **Reload:** state which settings apply without restart (for .NET, options monitoring or change notifications from the config provider) and which need a restart; hot-reloaded values must be validated before use.
- **Audit and rollback:** business parameters and flags need who/when/what history and a way to return to a previous value.
- **Validation:** validate configuration at startup and on reload; fail fast with a clear error.
- **Drift:** keep per-environment values in version control or in the release tool, and compare environments regularly.
- **Windows services:** XL Deploy dictionaries → placeholders in config files; or a central configuration service read at startup.
- **OpenShift:** ConfigMaps for configuration, Secrets fed from the vault; mount as files or environment variables.
- **Central configuration:** Consul key/value, etcd, Spring Cloud Config, Azure App Configuration. Note: Consul is a discovery and configuration tool, not a monitoring tool.

### Service discovery
State how every component finds its dependencies, and what happens when an instance fails.

| Approach | Fits | Watch out for |
|---|---|---|
| Static DNS names + load balancer | Few, stable services; Windows hosts | Manual changes, slower failover |
| OpenShift/Kubernetes service DNS | Everything inside the cluster | Components outside the cluster need Routes, ingress or other exposure |
| Consul (catalog + health checks, DNS or API) | Mixed estates (Windows services and containers), dynamic instances | Running and securing Consul agents and servers |
| Service mesh (OpenShift Service Mesh, Consul Connect) | Many services needing mTLS, traffic shifting, retries | Operational weight |
| Messaging broker as the meeting point | Event-driven designs where producers and consumers only know topics | Still need discovery for the broker itself |

Also state: client-side or server-side discovery, health check used, how Windows services register (Consul agent, DNS entry, load balancer pool), and how the front end finds the back end (gateway or BFF URL per environment).
- **Feature flags:** an approved flag service or configuration-based flags; define ownership and cleanup.
- **Secrets:** see `security.md`.
- Document every configuration key's owner, default and per-environment source.

## 5. Infrastructure as code

- Terraform or Pulumi for provisioning (VMs, networks, cloud resources), Ansible or PowerShell DSC for host configuration, Helm/Kustomize for Kubernetes manifests.
- Store IaC in version control, review it like code, apply it through a pipeline.
- State which parts remain manual or ticket-based (common for on-prem Windows hosts) and who owns them.

## 6. Rollout and rollback strategies

| Strategy | OpenShift | Windows service | Notes |
|---|---|---|---|
| Rolling | Native | Node by node behind a load balancer | Default for stateless |
| Blue/green | Two Deployments, switch the Route | Two versioned folders or host sets, switch binary path or LB pool | Fast rollback; double capacity |
| Canary | Weighted Routes or service mesh | A subset of nodes or instruments/clients | Needs good metrics |
| Recreate | Native | Stop, replace, start | Only when downtime is acceptable |
| Feature flags | Any | Any | Decouples deploy from release |

For each component state: strategy, health check that gates progress, rollback trigger, rollback steps, and the data implications of rolling back.

## 7. Environments

- List each environment, its purpose, data (synthetic, masked, production), sizing relative to production, and access rules.
- Parity: state what differs from production and the risk that creates.

## 8. Catalog (verify current versions and support)

- **Release orchestration:** XL Release, Azure DevOps, GitLab, Jenkins, Octopus Deploy, Argo CD / OpenShift GitOps.
- **Deployment:** XL Deploy, Octopus Deploy, Helm, Argo CD, Flux, Ansible, Web Deploy.
- **Hosting:** OpenShift, Kubernetes (AKS, EKS, GKE, Rancher), Windows services, IIS, Linux systemd, VMs, serverless.
- **IaC:** Terraform, Pulumi, Ansible, PowerShell DSC, Bicep/ARM, CloudFormation.
- **Config and discovery:** Consul, etcd, Spring Cloud Config, Azure App Configuration, Kubernetes ConfigMaps.
- **Secrets:** HashiCorp Vault, CyberArk, Azure Key Vault, AWS Secrets Manager, External Secrets Operator.
- **Artifact repositories:** Artifactory, Nexus, container registries (Quay, Harbor, the OpenShift internal registry).
