# Security architecture

Design the controls; do not invent regulatory applicability. The user names the regulations; you map them to controls.

Threat modeling is out of scope for this version. Keep the "Threat model" section in the template as a reserved placeholder so it can be added later without restructuring.

## Areas to cover

### Identity and access
- User authentication: the organization's identity provider, protocol (OIDC, SAML, Kerberos/Windows integrated for on-prem Windows services), MFA needs.
- Authorization model: roles (RBAC), attributes (ABAC), or entitlements from an existing entitlement system; where decisions are enforced.
- Service-to-service trust: mTLS, OAuth2 client credentials, workload identity (OpenShift service accounts), Windows service accounts or group managed service accounts (gMSA). Least privilege for every identity.
- Front end: OIDC authorization code flow with PKCE; prefer a backend-for-frontend so tokens stay out of the browser; content security policy and secure cookies.
- Access to configuration: who may change business parameters and flags, with approval where required.
- Privileged and break-glass access; access reviews.

### Data protection
- Classification of each data domain (from the interview).
- Encryption in transit (TLS versions and termination points) and at rest (database, disks, backups, object storage).
- Key management: who owns keys, where they live (HSM, Vault, cloud KMS), rotation.
- Retention, deletion and archival; personal data handling if applicable.
- Data masking in non-production environments.

### Network
- Zones and segmentation; what may talk to what.
- Ingress: gateways, OpenShift Routes/Ingress, load balancers, WAF if relevant.
- Egress control: allowed outbound destinations, proxies.
- OpenShift NetworkPolicies; Windows firewall rules for service hosts.

### Secrets
- A vault (HashiCorp Vault, CyberArk, Azure Key Vault, or the approved equivalent) as the single source.
- Delivery per target: OpenShift secrets synced from the vault (external secrets operator or injector); XL Deploy encrypted dictionaries or vault lookups for Windows services.
- Rotation approach and ownership. No secrets in code, config files, images, packages or logs.

### Supply chain
- Dependency scanning (SCA) and static analysis (SAST) in CI.
- Container image scanning, trusted base images, signed images and packages.
- SBOM generation per release; artifact repository as the only deployment source.

### Platform hardening
- OpenShift: restricted security context constraints, non-root containers, read-only filesystems where possible, resource limits.
- Windows services: dedicated low-privilege accounts, patched hosts, restricted install folders.

### Audit and security logging
- Which security events are logged (authentication, authorization failures, privileged actions, config changes).
- Tamper evidence, retention and routing to the SIEM (details in the observability phase).

### Compliance mapping
A table: regulation or internal policy → requirement → control in this design → evidence. Only rows the user confirmed apply.

## Review points
- Every security requirement from the interview maps to at least one control.
- Every identity has a defined owner and least-privilege scope.
- No component handles secrets outside the vault flow.
