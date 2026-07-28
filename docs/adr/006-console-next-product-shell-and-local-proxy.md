---
title: "ADR-006: Console Next Product Shell and Server-Side Local Proxy"
status: "Accepted"
date: "2026-07-27"
authors: "Tech Lead; Founder-delegated Controller"
tags: ["architecture", "console", "security", "ux"]
supersedes: ""
superseded_by: ""
---

# ADR-006: Console Next Product Shell and Server-Side Local Proxy

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The founder accepted this direction on 2026-07-27. Acceptance authorizes the
bounded Console Next remediation and its tests; it does not change generated
application packages, the Registry, Composer, Executor topology, or cloud
deployment scope.

## Context

- **CTX-001**: Console Next is an accepted local preview under ADR-005, but
  its copied primitives use utility-class source without a utility CSS build.
  The result is browser-default controls and an unusable responsive layout.
- **CTX-002**: The current client asks the founder to paste a control-plane
  capability into a visible `Local connection` sheet. A browser UI must not
  own an API credential when the local Next server can hold it in its process
  environment.
- **CTX-003**: The product is a requirement-to-product control center, not a
  marketing landing page or a rigid one-shot wizard. The primary experience
  must make projects, versions, approvals, plans, runs, and evidence legible.
- **CTX-004**: The existing Factory API remains bound to loopback and retains
  its exact HTTP routes, Origin check, capability validation, and actor
  derivation. The frozen generated-product and component contracts remain
  outside this change.

## Decision

- **DEC-001**: Retain Next.js `15.5.21`, React `19.2.7`, TypeScript `5.9.3`,
  and the exact existing Console Next lockfile. Do not introduce Tailwind,
  another UI framework, or a network dependency. A repository-owned static
  stylesheet styles the already approved local primitive source through stable
  `data-slot`, `data-variant`, and product-shell classes.
- **DEC-002**: Replace the hero and visible connection boundary with a dense,
  responsive Factory Control Center: project rail, product header, workflow
  navigation, contextual approval/run state, and evidence-oriented detail
  panes. The primary path remains Brief -> Definition -> Plan -> Build, while
  saved project/version navigation is always available.
- **DEC-003**: Browser code may call only relative `/api/factory/...` routes.
  A Next Route Handler validates a bounded API path and request body, reads
  `FACTORY_CONSOLE_API_BASE` and `FACTORY_CONSOLE_API_TOKEN` only from the
  server process environment, adds the existing capability header upstream,
  and forwards only loopback API traffic. No token appears in browser state,
  URL state, generated output, screenshots, logs, or test reports.
- **DEC-004**: The Route Handler default API base is
  `http://127.0.0.1:8080/api`; both base and token must be present and valid
  before an upstream request. `FACTORY_CONSOLE_API_BASE` must be an exact
  loopback `/api` URL. The browser receives a bounded unavailable response
  rather than a server configuration value.
- **DEC-005**: The existing API contract is frozen as
  `docs/contracts/console-local-proxy-v1.md`. The proxy is an internal
  transport boundary only: it does not add API operations, accept actor
  identity, alter response bodies, or relax the Factory API's authorization.

## Consequences

### Positive

- **POS-001**: Console Next renders as a product workspace using the existing
  audited dependency closure rather than browser-default controls.
- **POS-002**: Local capability material is no longer handled by browser
  code, reducing accidental exposure and removing a confusing user step.
- **POS-003**: Fixture tests can exercise the same browser-to-proxy boundary
  used by real local control-plane operation.

### Negative

- **NEG-001**: Product CSS is an owned compatibility layer for approved
  primitive markup and must be maintained if that markup changes.
- **NEG-002**: Starting the Console requires its local server environment to
  contain the control-plane token; a missing value fails closed.
- **NEG-003**: Browser E2E fixture setup must configure a server-side proxy
  environment instead of injecting a browser base or capability.

## Alternatives Considered

### Add Tailwind and compile the copied utility classes

- **ALT-001**: Add Tailwind and its build configuration to Console Next.
- **ALT-002**: **Rejection Reason**: It expands the locked dependency and
  supply-chain profile for a presentation repair that static owned CSS can
  solve without changing the Golden runtime profile.

### Keep the browser capability sheet

- **ALT-003**: Keep the current memory-only browser token input.
- **ALT-004**: **Rejection Reason**: It remains a user-visible secret-handling
  step and contradicts the control-center product boundary.

### Make the Factory API unauthenticated on loopback

- **ALT-005**: Remove the existing API capability requirement for Console.
- **ALT-006**: **Rejection Reason**: It weakens an accepted control-plane
  security boundary rather than moving its use to the local server.

## Migration and Rollback

- **MIG-001**: Freeze `console-local-proxy/v1`, then update the Console
  adapter, route handler, styles, and tests as one integration-owned slice.
- **MIG-002**: Retain `apps/web` as the rollback console. No existing project,
  version, plan, run, component lock, or generated application is migrated.
- **RBK-001**: If proxy behavior or product-shell verification fails, stop
  Console Next, revert this bounded slice, and start `apps/web`; no persisted
  Factory state requires restoration.
- **ABT-001**: Abort release on a token in browser-visible output, a non-
  loopback upstream target, a path/body escape, a changed Factory API route
  contract, or an unresolved P0/P1 finding.

## Verification Gate

- **VRF-001**: Unit tests prove the proxy rejects missing credentials,
  non-loopback bases, unsupported methods, path escapes, and oversized or
  non-JSON write bodies without contacting an upstream server.
- **VRF-002**: Browser E2E proves create -> edit -> approve -> plan -> run ->
  artifact -> stop through the proxy without a capability field or header in
  browser code.
- **VRF-003**: Accessibility tests prove visible focus, labels, responsive
  navigation, live status, and the absence of `Local connection` text.
- **VRF-004**: A real OpenAI call produces a locally valid application
  definition after the schema-regression repair; its raw prompt, response,
  credential, and project brief are excluded from retained evidence.

## References

- **REF-001**: `docs/adr/005-quarantined-third-party-source-intake-and-shadcn-ui-v2.md`
- **REF-002**: `docs/tech-governance.md`
- **REF-003**: `docs/contracts/console-local-proxy-v1.md`
