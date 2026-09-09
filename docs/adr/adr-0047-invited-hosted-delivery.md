---
title: "ADR-0047: Invite-Only Hosted Delivery Experiment"
status: "Proposed"
date: "2026-09-09"
authors: "Archeform Tech Lead"
tags: ["architecture", "hosting", "identity", "security", "operability"]
supersedes: ""
superseded_by: ""
---

# ADR-0047: Invite-Only Hosted Delivery Experiment

## Status and founder gate

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **experiment** with one invite-only generated Restaurant app
on one dedicated, single-tenant Docker host. Expose no origin port. Route the
app through Cloudflare Tunnel `2026.8.3` and Cloudflare Access email one-time
PIN, validate every Access JWT at the generated Node origin with `jose` `6.2.12`,
and retain business state in one host-encrypted persistent volume owned by one
Node process.

This proposal is not accepted and does not change the accepted Golden profile.
It grants no provider call, account creation, domain or DNS change, purchase,
credential mutation, cloud resource, deployment, Product Publish, repository
release, or deletion. Because activation necessarily chooses an external data
path and may incur spend, the standing independent-review authorization cannot
approve activation. The founder must explicitly accept or reject this ADR and,
separately or in the same explicit response, identify and authorize the exact
Cloudflare account and zone, host and region, hostname, invite identities,
spend cap, trial window, and deployment action. PM then records the decision
and assigns implementation.

## Context

- **CTX-001**: H1 requires an invited ordinary user to open a generated app
  from another device, complete an intended task, retain state through a
  supported restart, and observe denial for an unauthorized identity. A URL
  and HTTP 200 are insufficient.
- **CTX-002**: The current generated Restaurant product is local-only. Its
  customer and merchant services trust a role selected at process startup and
  share a schema-version-1 JSON file through separate in-process queues. That
  is a test/demo role boundary and is not deployable authentication or safe
  multi-process write serialization.
- **CTX-003**: The compiler-worker preview mounts the Docker socket and binds
  generated services to loopback. The threat model classifies that socket as
  privileged local infrastructure and requires a separate decision before
  remote use. Publishing the current preview through a tunnel would therefore
  violate the security authority.
- **CTX-004**: Existing `RuntimeProviderV1` implementations for Appwrite,
  OpenFGA, Medusa, and `fixture-native` are conformance fixtures. They neither
  provision nor authenticate a hosted app and cannot be promoted into H1
  providers by configuration.
- **CTX-005**: The smallest safe pilot must keep the Factory control plane,
  Workbench, compiler worker, Docker socket, model credentials, Drafts, and raw
  model material off the hosted machine. Only a digest-verified immutable
  Compilation may become a hosted bundle.

## Current accepted Golden profile

The following remains the sole accepted Golden profile throughout this
proposal. Manifest ranges, lockfile resolutions, and floating image tags retain
their distinct meanings.

| Coordinate      | Accepted value                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Node / pnpm     | `>=22.11.0 <23`; `pnpm@9.0.0`; tracked images `node:22-alpine`                                                                   |
| TypeScript      | manifest `^5.7.2`; lock `5.9.3`                                                                                                  |
| Workbench       | Next `^15.1.0` / `15.5.22`; React and React DOM `^19.0.0` / `19.2.8`; Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` / `12.11.2`    |
| Control Plane   | NestJS `^10.4.15` / `10.4.22`; Prisma `^6.1.0` / `6.19.3`; BullMQ `^5.34.10` / `5.81.2`                                          |
| Compiler worker | BullMQ `^5.34.10` / `5.81.2`; ioredis `^5.4.2` / `5.11.1`                                                                        |
| Services        | `postgres:16-alpine`; `redis:7-alpine`; Docker Compose local topology                                                            |
| Contracts       | mutable Draft -> immutable Published Graph -> immutable Compilation; implemented serialized Graph `factory.application-graph/v1` |

The tracked manifests, `pnpm-lock.yaml`, Dockerfiles, and
`infra/docker-compose.yml` remain authoritative. Accepted ADR-0009's additive
Graph V2 decision does not make V2 implemented or change the current Golden
profile.

## Proposed H1 experiment profile

This is an isolated candidate profile, not a proposed replacement Golden
profile. A later `migrate` ADR would be required before making hosted operation
generally supported.

- **PRO-001 — Immutable input**: Add a hosted target identified as
  `factory.generated-hosted-restaurant/v1`. It consumes only one verified
  immutable Compilation and emits a separate hosted bundle. Existing local
  `factory.restaurant-product-bundle/v1` bytes and prior Compilations remain
  immutable.
- **PRO-002 — Runtime**: Keep Node 22 and build the experiment image from
  `node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32`
  (multi-platform index observed 2026-09-09; Linux amd64 manifest
  `sha256:76789712cd1ae89a1225eac9077010d68987a423588042dac30446f502f1858c`).
  The hosted process serves every permitted role through one state-store queue;
  the two-process shared-file topology is forbidden.
- **PRO-003 — Identity**: Cloudflare Tunnel connector image is exactly
  `cloudflare/cloudflared:2026.8.3@sha256:51c9cefcb4569df44e1ad403ab1d3d8065aa8e84339bcfc6aee75502e1140339`
  (Linux amd64 manifest
  `sha256:9be48e4b4e996da851bf78f7782bfab150dd4d8889e469d004802e7d7afb63b1`).
  Cloudflare Access email OTP is the sole interactive identity provider for the
  experiment. The provider-managed Access service has no customer-pinnable
  software version; incompatible service behavior is an abort condition.
- **PRO-004 — JWT verification**: The generated origin pins `jose` exactly
  `6.2.12`, npm integrity
  `sha512-9NiFmJEex0sy2Dk58j2UGBSHgUs2ypF9eZSu4L6vjOX3Dp96Sw1F3uL+H+D1sx02jZZdzUT0HgvCy59CuvXcWw==`,
  MIT license. The generated lockfile and retained license notice govern this
  new supply-chain input.
- **PRO-005 — Storage**: Use versioned state identifier
  `factory.restaurant-hosted-state/v1` in one persistent volume on a
  host-encrypted disk. This is a fresh hosted state, not an in-place conversion
  of local schema version 1. The contract retains current Restaurant business
  records and adds bounded pseudonymous actor references and quota counters.
- **PRO-006 — Topology**: The hosted Compose topology contains exactly one app
  service, one `cloudflared` connector, one private network, and one app-state
  volume. It contains no PostgreSQL, Redis, Factory control plane, Workbench,
  compiler worker, Docker-socket mount, public host port, or model credential.
- **PRO-007 — Trial boundary**: One app, one dedicated host, one tenant, one
  owner, at most eight invited identities, synthetic or non-sensitive pilot
  data only, simulated payments only, and at most 30 days before a founder/PM
  continuation decision. This is not external multi-tenant production.

## Identity, access, and tenant boundary

- **IAM-001**: Cloudflare Access holds the invited email allowlist and performs
  OTP authentication. Cloudflare therefore processes invite email addresses,
  request metadata, and proxied HTTPS traffic. Founder acceptance must include
  this provider data path and the selected account/region policy.
- **IAM-002**: Every origin request requires the
  `Cf-Access-Jwt-Assertion` header. The app verifies RS256 signature through the
  exact configured team JWKS URL, issuer, audience, expiry, not-before, and
  subject/email claims. Missing, invalid, stale, wrong-issuer, or wrong-audience
  tokens fail closed. JWKS unavailability returns a bounded unavailable result;
  cached keys may be used only within their validated cache lifetime.
- **IAM-003**: A server-only deployment map converts
  `HMAC-SHA-256(per-app identity key, normalized email)` to one Graph-declared
  role. Exactly one identity is the app owner. An unmapped identity, duplicate
  owner, unknown role, or role absent from the immutable Compilation is denied.
  Raw emails, JWTs, OTPs, and role-map keys never enter generated artifacts,
  state, logs, screenshots, or evidence.
- **IAM-004**: The authenticated role is derived per request and drives the
  existing Graph permission and transition checks. Browser headers, paths,
  query parameters, IDs, and startup arguments cannot select or elevate role.
  Customer, merchant, kitchen, and cashier pages and APIs deny a verified actor
  whose mapped role lacks the exact Graph permission.
- **IAM-005**: Audit records store only the role, an app-scoped HMAC actor
  reference, action, subject identifier, Compilation identity, and timestamp.
  They contain no request body, email, token, or Cloudflare credential.
- **IAM-006**: The app listens only on the private Compose network.
  `cloudflared` creates the outbound tunnel; the host firewall has no inbound
  application rule. Origin JWT validation remains required even though the
  tunnel removes direct ingress.

## Durable state, quotas, backup, deletion, and rollback

- **DAT-001**: One Node process is the only writer. Each accepted mutation
  remains idempotent, optimistic-version checked, serialized, written to a
  temporary file, and atomically renamed in the persistent volume. A second
  app replica or writer is forbidden.
- **DAT-002**: Supported durability covers process restart, container restart,
  container recreation with the same volume, and host reboot with the same
  encrypted disk reattached. Host or disk loss recovers only to the latest
  verified snapshot; no zero-data-loss claim is made.
- **DAT-003**: Before invites, the selected host must provide encrypted volume
  snapshots and restoration to a replacement host. Take one snapshot at least
  every 24 hours, retain seven daily snapshots, target RPO 24 hours and RTO two
  hours, and pass one controlled restore drill before H1 acceptance. Take a
  snapshot before every bundle change.
- **QTA-001**: Enforce one app, eight identities, one running app process, one
  CPU, 512 MiB app memory, a 1 GiB state-volume ceiling, 16 concurrent requests,
  60 requests per authenticated actor per minute, 250 orders, 2,000 retained
  idempotency receipts, and 10,000 append-only audit records. A reached limit
  rejects new writes with a typed bounded error while health, export, and
  retirement remain available.
- **DEL-001**: Retirement first revokes Access policy and tunnel routing, then
  stops the exact deployment. Deleting the volume and its snapshots is a
  separate irreversible action requiring an explicit target and retention
  decision. This ADR authorizes neither retirement nor deletion.
- **ROL-001**: Retain the previous two verified hosted bundle digests. Rollback
  stops the current app, verifies the pre-change snapshot, starts the previous
  bundle against the same state only when its state identifier is exactly
  `factory.restaurant-hosted-state/v1`, and reruns health and role-denial
  checks. A state-contract change requires a new ADR and blocks rollback-by-image.

## Versioned deployment contract and compatibility

- **CON-001**: The Platform Runtime owner owns
  `factory.hosted-deployment/v1`, implemented at
  `packages/adapters/src/hosted-deployment-contract.ts`. A request contains only
  the API version, server-issued deployment ID, Compilation ID, Published
  revision ID, Graph hash, artifact-manifest hash, target key, and idempotency
  key. Hostname, account IDs, role maps, secrets, and credentials are
  server-side environment or approved-secret-store inputs.
- **CON-002**: A safe result contains the same immutable identities, hosted
  bundle digest, state identifier, one of `prepared`, `ready`, `failed`,
  `rolled-back`, or `retired`, the ready HTTPS URL only after verification, a
  timestamp, and at most one typed failure code. No provider response body,
  token, email, host credential, or raw log is returned or persisted.
- **CON-003**: Typed failures are
  `hosted.configuration_missing`, `hosted.identity_unavailable`,
  `hosted.bundle_invalid`, `hosted.start_failed`, `hosted.health_failed`,
  `hosted.quota_exceeded`, `hosted.rollback_failed`, and
  `hosted.retire_failed`. Unknown provider failures map to a bounded code and
  fail closed.
- **CON-004**: Existing Graph bytes and hashes, Published and Compilation
  records, Restaurant business routes and bodies, capability/recipe keys, and
  local preview contracts remain compatible and unchanged. Hosted requests add
  authentication failure behavior and the separate hosted state/deployment
  identifiers; they do not retrofit old bundles.
- **CON-005**: This contract is precise enough for one serialized integration
  owner after acceptance. It is not frozen for disjoint frontend/backend work:
  H1 proposes no Workbench UI, and the provider adapter, generated template,
  hosted Compose topology, state contract, backup/rollback tooling, and end-to-
  end smoke path form one serialized integration boundary. Any later frontend
  consumer requires the Platform Runtime owner to freeze this artifact first.

## API, adapter, catalog, supply-chain, security, and operability effects

- **API-001**: Business API success shapes remain unchanged. The hosted target
  adds origin authentication, role-derived authorization, quota errors, and a
  private health surface. Unauthenticated health is not exposed publicly.
- **ADP-001**: Add one hosted deployment adapter behind
  `factory.hosted-deployment/v1`. Do not extend the existing Published-Graph
  `RuntimeProviderV1`; deployment authority must be Compilation- and digest-
  bound.
- **CAT-001**: Add only the compiler target key
  `factory.generated-hosted-restaurant/v1`. Capability, product/profile recipe,
  UI registry, source-study, and market catalogs have zero entries changed.
- **SUP-001**: The only new package is `jose` `6.2.12`; the only new runtime
  image is `cloudflare/cloudflared` `2026.8.3`. Both require exact locks,
  integrity/digest verification, retained MIT/Apache-2.0 notices, and advisory
  review. Cloudflare service terms and privacy terms remain an external
  acceptance prerequisite.
- **SEC-001**: This narrows the pilot to one tenant and one host, validates
  identity at both Access and origin, removes public origin ingress, keeps all
  Factory/model credentials off-host, and forbids Docker-socket exposure.
- **SEC-002**: Residual risks are provider outage or policy drift, compromised
  invite email, host compromise, single-volume loss after the latest snapshot,
  SaaS inspection of proxied traffic, and denial of service within fixed
  quotas. PM and the Security owner retain these risks; silence is not acceptance.
- **OPS-001**: Record safe health, restart count, CPU, memory, state bytes,
  quota rejections, 4xx/5xx counts, tunnel readiness, last snapshot, and last
  restore result. Logs exclude headers, bodies, query strings, emails, JWTs,
  credentials, raw prompts, and raw provider responses.
- **OPS-002**: Alert the operator on five consecutive health failures, disk at
  80%, snapshot age over 26 hours, repeated invalid-token responses, or any
  restart loop. The operator may revoke Access and stop the exact app; automated
  replacement, scaling, failover, and self-repair are outside this experiment.

## Portable implementation and external activation

- **PRT-001**: Portable repository work is limited to the versioned deployment
  contract, digest-bound hosted compiler target, single-process identity/state
  boundary, deterministic hosted Compose bundle, safe preflight/status/rollback
  commands, provider fixture, and provider-free tests. It creates no account,
  host, DNS record, tunnel, Access policy, secret, snapshot, or deployment.
- **EXT-001**: Activation requires a founder-authorized Cloudflare account with
  Zero Trust Access, an active DNS zone and hostname, email OTP enabled, a named
  Tunnel, exact Access audience/team-domain values, the tunnel credential in an
  approved secret store, and no wildcard/bypass policy.
- **EXT-002**: Activation also requires one dedicated Linux amd64 Docker host
  with outbound tunnel connectivity, no inbound application port, an encrypted
  persistent disk of at least 10 GiB, snapshot/restore support, monitored disk
  and process health, and enough capacity for the declared limits. No existing
  infrastructure is assumed.
- **EXT-003**: The founder supplies the one owner and at most seven other invite
  identities and their Graph roles, selects the host provider and region/data
  residency, accepts Cloudflare's data path and terms, sets a monetary cap and
  30-day-or-shorter window, and authorizes the exact deployment. Credentials and
  raw identity values are never placed in the ADR or ledger.

## Alternatives considered

### Keep the local preview and add a tunnel

- **ALT-001**: Publish the current preview URL through a generic tunnel.
- **ALT-002**: **Rejected.** Startup role selection is not authentication, two
  processes can race the shared JSON file, and the compiler worker's Docker
  socket is explicitly local privileged infrastructure.

### Full multi-tenant hosted platform with managed database and identity

- **ALT-003**: Host Workbench, Control Plane, worker, PostgreSQL, Redis, generated
  apps, tenant identity, and fleet operations as one production platform.
- **ALT-004**: **Rejected for H1.** It expands every incomplete production
  boundary in the threat model before one invited app proves value and creates
  migration, incident-response, key-management, and cost commitments.

### Self-managed passwords or magic links in each generated app

- **ALT-005**: Add password storage, reset, mail delivery, sessions, and role
  administration to the generated runtime.
- **ALT-006**: **Rejected.** It adds credential recovery and email-provider
  responsibilities larger than the pilot. Access OTP gives an ordinary browser
  journey while keeping credential verification at a reviewed edge boundary.

### Appwrite or another backend-as-a-service

- **ALT-007**: Replace identity, storage, and hosting with a backend platform.
- **ALT-008**: **Rejected.** Existing Appwrite support is fixture-only, and the
  provider would introduce a competing application/data model rather than reuse
  the current Graph and generated runtime.

## Consequences

### Positive

- **POS-001**: An invited user gets a normal HTTPS/OTP browser journey from a
  second device without installing a client or learning technical setup.
- **POS-002**: A dedicated one-app host, single writer, persistent volume,
  snapshots, quotas, and origin JWT verification form a measurable H1 boundary
  without pretending to be a multi-tenant production platform.
- **POS-003**: The Graph, business APIs, recipes, local runtime, and accepted
  Golden profile stay intact; prior Compilations remain immutable.
- **POS-004**: The hosted bundle and lifecycle contract remain reproducible and
  provider-adapter shaped even though Cloudflare is the explicit first edge.

### Negative

- **NEG-001**: The app is single-node and single-process. Host failure can lose
  up to 24 hours of state and requires operator restore within the two-hour
  target.
- **NEG-002**: Cloudflare becomes an identity and traffic trust dependency, and
  its service cannot be version-pinned like repository software.
- **NEG-003**: `jose`, a hosted compiler target, a state identifier, a provider
  adapter, and hosted Compose topology add integration and supply-chain surface.
- **NEG-004**: Access policy, invites, backups, rollback, alerts, and deletion
  remain operator responsibilities during the experiment.

## Migration, rollback, abort conditions, and irreversible steps

- **MIG-001**: After explicit founder acceptance and PM authorization, the
  serialized owner starts with provider fixtures and failing identity, quota,
  state, rollback, and containment tests; then emits the separate hosted bundle
  from a fixed immutable Compilation. Local bundle bytes must remain unchanged.
- **MIG-002**: Provider-free tests precede any external activation. Founder
  approval of the exact external prerequisites is the final activation gate.
  PM records the selected resources without credentials before one controlled
  deployment and invite.
- **MIG-003**: Start with fresh hosted state, complete the cross-device customer
  and merchant journey on controlled data, restart/recreate against the same
  volume, restore a snapshot to the same or replacement host, and then decide
  whether to continue, revise, or retire the experiment.
- **ABT-001**: Abort if any public origin path, Docker-socket mount, multi-app or
  multi-tenant co-location, second state writer, unknown role, wildcard/bypass
  Access policy, unencrypted state, missing snapshot, or provider credential in
  artifacts/logs/evidence is required or observed.
- **ABT-002**: Abort on unauthorized access, lost acknowledged writes in a
  supported restart, failed exact-volume cleanup, snapshot restore failure,
  quota bypass, incompatible Cloudflare assertion behavior, unacceptable
  provider terms/data residency, or forecast spend above the founder cap.
- **ABT-003**: Abort and return to Tech Lead if a Graph, business API, state
  identifier, image/package version, provider, identity semantics, topology, or
  compatibility rule must change from this proposal.
- **IRR-001**: No irreversible step is authorized. Domain transfer, resource
  purchase, provider creation, real-user invite, deployment, state deletion,
  snapshot deletion, Product Publish, release, and main integration remain
  separately controlled actions.

## Measurable verification plan and ledger evidence

- **VER-001**: Validate this proposal with
  `pnpm exec prettier --check docs/adr/adr-0047-invited-hosted-delivery.md`, a
  whitespace check limited to the ADR, and an exact SHA-256 recorded before
  independent/founder review.
- **VER-002**: Freeze and test `factory.hosted-deployment/v1` parsing: reject
  unknown keys, caller-supplied provider/credential/hostname material, mutable
  Draft input, mismatched Compilation/artifact digests, replayed idempotency,
  unknown result states, and raw provider bodies.
- **VER-003**: With local signing keys and a fixture JWKS server, prove valid
  issuer/audience/RS256/expiry/not-before handling; missing, forged, stale,
  wrong-audience, unmapped, and role-escalated assertions deny. Static scans
  prove no email, JWT, OTP, key, header, body, raw model material, or credential
  enters bundle/state/log/evidence fixtures.
- **VER-004**: Prove one-process serialization under concurrent customer and
  merchant mutations, idempotent replay, optimistic conflicts, atomic writes,
  restart/recreation persistence, exact state version, each quota boundary,
  read availability after write exhaustion, and fail-closed corruption handling.
- **VER-005**: Inspect the rendered hosted bundle twice for byte equality;
  verify the exact Node, `cloudflared`, and `jose` digests/integrity and license
  notices; assert one app service, one connector, one private network, one
  volume, no published port, no Docker socket, no Factory/model secret, and no
  change to local bundle digests or catalogs.
- **VER-006**: Provider-free lifecycle tests cover prepare, duplicate deploy,
  health failure, timeout, cancellation, status recovery, snapshot precondition,
  compatible rollback, incompatible-state refusal, retirement, and exact owned-
  resource cleanup. Generated templates, shared contracts, Compose topology,
  and end-to-end smoke remain serialized.
- **VER-007**: After direct activation authority, one external run must show an
  invited user completing the customer task from a second device, the owner or
  invited staff completing fulfilment, an uninvited email and forged JWT denied,
  state retained after process/container recreation and host reboot, one
  snapshot restored with exact records, and rollback to the previous bundle.
- **VER-008**: Record prepared and cold elapsed times separately, first-result
  success, user questions, developer rescue, invite/denial counts, restart and
  restore results, RPO/RTO, quota results, resource use, safe failure codes,
  spend, exact cleanup counts, and zero prohibited material in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **VER-009**: Run the affected package tests/typechecks/lint/build, accepted
  provider-free product regression, formatting, third-party notice, source-
  study, and frozen-path checks. Any main/release gate remains separate from H1.

## Ownership and authority

- **OWN-001**: The Tech Lead owns only this proposal and stops here. The Tech
  Lead does not accept it, edit product code, provision resources, or deploy.
- **OWN-002**: The Platform Runtime owner is contract and serialized integration
  owner. Security/QA owns independent identity, containment, restore, and
  cross-device evidence. PM owns decision recording, exact path assignment,
  external prerequisite reconciliation, sequencing, and ledger state.
- **OWN-003**: No frontend/backend parallel wave is authorized. A later
  Workbench status UI may begin only after the Platform Runtime owner freezes
  the accepted `factory.hosted-deployment/v1` artifact, actor semantics, errors,
  and compatibility rule; shared contract/template/Compose/E2E work stays serial.
- **OWN-004**: The founder explicitly accepts or rejects this proposed ADR.
  Only the controller performs repository delivery actions under
  `docs/delivery-policy.md`, and only separately authorized operators perform
  provider or deployment actions.

## References

- **REF-001**: `AGENTS.md`
- **REF-002**: `docs/tech-governance.md`
- **REF-003**: `docs/threat-model.md`
- **REF-004**: `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`
- **REF-005**: `docs/superpowers/plans/2026-09-07-consumer-generation-delivery.md`
- **REF-006**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`
- **REF-007**: `docs/adr/adr-0032-local-acceptance-role-surfaces-and-preview-lease.md`
- **REF-008**: `docs/adr/adr-0046-stable-local-preview-ports.md`
- **REF-009**: `packages/adapters/src/provider-contract.ts`
- **REF-010**: `packages/compiler/src/targets/restaurant-v3/runtime-state.ts`
- **REF-011**: `packages/compiler/src/targets/restaurant-v3/product-target.ts`
- **REF-012**: Cloudflare Tunnel documentation,
  `https://developers.cloudflare.com/tunnel/`
- **REF-013**: Cloudflare Access one-time PIN documentation,
  `https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/`
- **REF-014**: Cloudflare Access JWT validation documentation,
  `https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/`
- **REF-015**: `cloudflared` release `2026.8.3`,
  `https://github.com/cloudflare/cloudflared/releases/tag/2026.8.3`
- **REF-016**: `jose` package and MIT license,
  `https://github.com/panva/jose`
