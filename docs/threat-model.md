# Archeform Threat Model

## Authority and scope

This document is the current authority for Archeform assets, trust boundaries,
attacker capabilities, abuse cases, required controls, and residual-risk
ownership. It covers the Workbench, Control Plane, compiler worker, Application
Graph lifecycle, generated source, adapters, local Compose runtime, and
provider boundaries. Design or plan prose cannot silently supersede it.

## Assets

- mutable Draft revisions and immutable Published revisions, Graph hashes, and
  composition locks;
- immutable Compilation results, generated-source manifests, audit evidence,
  and verification digests;
- workspace, tenant, identity, role, policy, business, and transaction data;
- capability packages, UI registry source, compiler targets, generated
  templates, dependency locks, and provenance records;
- local environment credentials, internal worker tokens, model-provider keys,
  and demo bootstrap inputs;
- developer workspaces, Git history, local Docker socket access, databases,
  queues, artifact volumes, and preview resources.

## Trust boundaries

1. The browser is untrusted. It receives no provider credential or internal
   worker token and cannot assert tenant, role, Published state, or Compilation
   identity without server verification.
2. Requirement and model-provider input is untrusted. The model may propose
   bounded business and experience semantics only; it cannot choose packages,
   versions, paths, routes, providers, executable code, or runtime targets.
3. Draft editing is mutable but append-only by revision. Publish creates a
   separate immutable Published revision; a compiler accepts only that
   digest-verified Published Graph and never a mutable Draft.
4. Control Plane to compiler worker crosses an authenticated queue boundary.
   Requests are identity- and digest-bound; the worker does not trust
   caller-supplied commands, paths, results, or environment material.
5. Compiler output crosses into generated source and an isolated preview
   runtime. Only allowlisted templates and contained paths may execute; local
   preview resources are not deployment authority.
6. Copied UI and skill source crosses a supply-chain boundary. It requires
   exact provenance, retained license notices, content hashes, and reviewed
   registry admission.
7. Every workspace and application request crosses a tenant and authorization
   boundary. Identifiers alone never grant access.

## Attacker capabilities

Assume an attacker can submit hostile requirements and model-shaped data,
tamper with browser requests, replay stale IDs, race mutable operations, craft
malformed Graph or archive content, attempt cross-tenant object access, inject
HTML or source text, exhaust generation/queue/preview resources, and influence
an upstream package or copied-source candidate. A local developer or compromised
worker may have filesystem or Docker access beyond an ordinary user.

Do not assume an attacker can break standard cryptography or read a correctly
scoped environment secret without another control failure. Local Docker-socket
access is privileged and remains explicitly outside a production-safe boundary.

## Abuse cases

| Abuse case                                                                                           | Required outcome                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt injection requests code, commands, credentials, package selection, or network actions         | Schema validation rejects or bounds the output; no tool or execution channel is exposed to the model.                                 |
| Raw prompts or provider responses enter persistence, logs, evidence, screenshots, source, or exports | The boundary stores only validated local semantics, safe summaries, and digests; raw model material is excluded.                      |
| A caller compiles a mutable Draft or promotes a preview snapshot                                     | Publish and Compilation fail closed unless the exact immutable Published revision and hash are verified.                              |
| A caller alters or reuses a Published V1 revision under V2 semantics                                 | Historic V1 bytes and hashes remain immutable and inspection-only; conversion creates a new Draft and later a new Published revision. |
| Path traversal, symlink, absolute path, archive entry, or overlay escapes its root                   | Canonical containment and allowlisted writable slots reject the operation before a write or execution.                                |
| Cross-tenant IDs or forged roles expose another workspace                                            | Server-side tenant scoping and policy checks reject the request and record safe audit evidence.                                       |
| Queue replay or worker impersonation starts duplicate work                                           | Authenticated worker identity, idempotency keys, immutable input digests, and state transitions reject stale or duplicate work.       |
| A generated app or preview receives platform/model credentials                                       | Secret allowlists and environment separation reject the launch; generated artifacts and browser bundles contain no credentials.       |
| Malicious UI/package/source enters the registry                                                      | Pin, license, provenance, hash, semantic review, and focused tests fail closed before admission.                                      |
| Preview exhaustion or abandoned Compose resources persist                                            | Loopback binding, quotas, timeout, deterministic teardown, and cleanup verification bound the exposure.                               |

## Required controls

### Graph and lifecycle

- Parse all boundary input through versioned schemas; reject unknown or
  unsupported identifiers without compatibility guessing.
- Append a new Draft revision for every edit. Publish produces a distinct,
  immutable Published revision with stable content hash and capability lock.
- Pre-Publish preview consumes only an immutable, digest-bound
  `DraftPreviewSnapshotV1`. It is ephemeral, non-deployable, non-exportable,
  and cannot create or become a Compilation.
- Production compilers consume only immutable Published Graphs. Historic
  Published V1 content, serialization, and hashes never change.

### Identity, tenants, and authorization

- Authenticate actors at the server boundary; authorize every workspace,
  Graph, revision, Compilation, artifact, and action with explicit tenant and
  policy context.
- Use deny-by-default role and capability checks. Record safe append-only audit
  evidence for security-sensitive transitions without storing request bodies
  or secrets.
- Bind state-changing requests to idempotency and optimistic-concurrency or
  immutable-revision checks.

### Secrets and model providers

- Keep credentials only in local environment files or approved secret stores.
  Never log, persist, screenshot, export, or report credentials, raw prompts,
  raw responses, hidden reasoning, or sensitive request bodies.
- Expose the model only through a bounded server-side adapter with no shell,
  filesystem, package, Docker, deployment, credential, or arbitrary-network
  tool channel.
- Treat provider output as untrusted data and validate it before planning or
  Graph mutation. Provider failure must fail closed; fixture mode is explicit
  development behavior, never an acceptance fallback.

### Compiler, source, and runtime

- Use fixed compiler targets and reviewed generated templates. Generated files
  are read-only; writable overlays are contained to declared extension slots
  and digest-bound to a baseline.
- Reject path traversal, absolute paths, symlinks, unsafe archive entries,
  package-file writes, stale overlays, and removed slots.
- Authenticate and minimize queue messages. Workers verify Published identity,
  input hashes, target allowlists, and output containment before work.
- Bind local previews to loopback, use isolated names/ports/volumes, apply
  quotas and expiry, and prove teardown. Docker-socket access is local
  privileged infrastructure and is not approved for production.

### Supply chain and evidence

- Use published package versions recorded by manifests and lockfiles. Copied
  source requires repository, commit or tag, exact source path, license and
  retained notice, content hash, divergence classification, and review.
- Evidence contains bounded summaries and digests only. Verification must scan
  persistence, artifacts, exports, screenshots, and logs for prohibited secret
  or raw-model material without printing that material.

## Residual-risk ownership

| Residual risk                                                                                                                  | Owner                          | Required decision or follow-up                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Local compiler worker mounts the Docker socket                                                                                 | Platform/Tech Lead             | Keep local-only; propose a sandboxed remote runner through a separate accepted ADR before production.                |
| Full production identity, tenant isolation, key management, audit retention, rate limits, and incident response are incomplete | PM and Security owner          | Block external multi-tenant production use until threat-model verification and founder-approved scope exist.         |
| Third-party source or dependency compromise after pinning                                                                      | Source owner                   | Monitor advisories, re-verify hashes/licenses, and revoke affected registry entries.                                 |
| Model-provider retention or policy outside Archeform control                                                                   | Provider owner                 | Document provider terms and data boundary before production input; keep sensitive inputs out of the model.           |
| Generated application business/security completeness varies by recipe                                                          | Capability and compiler owners | Require recipe-specific authorization, adversarial, migration, accessibility, and runtime acceptance before release. |

The owner named above accepts no risk by silence. A residual risk that expands
scope, changes a trust boundary, or affects production requires a proposed ADR,
explicit founder decision when governance triggers apply, and PM-recorded work.
