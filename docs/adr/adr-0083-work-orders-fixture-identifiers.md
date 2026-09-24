---
title: "ADR-0083: Work Orders Fixture Identifiers"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "work-orders", "compiler", "verification"]
supersedes: ""
superseded_by: ""
---

# ADR-0083: Work Orders Fixture Identifiers

## Status and recommendation

**Proposed. Recommendation: keep** the accepted ADR-0080 local synthetic Work
Orders profile and correct its shared fixture-coordinate handoff with fixed,
family-owned identifiers. Choose the exact six canonical strings below; do not
derive them from Graph role keys. Authorization roles remain Graph-bound.

This proposal grants no implementation authority. A separate qualified reviewer
may assess it under the September 1 standing authorization in
`docs/tech-governance.md`. Only PM may record the exact ADR hash, reviewer identity,
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 `0/0`, supporting evidence and
standing founder authorization before implementation. Otherwise obtain the
founder's explicit decision. The proposing Tech Lead cannot accept this ADR.

## Context and current accepted profile

- **CTX-001**: ADR-0080 is accepted at SHA-256
  `e35fa837394b66909af0063ab29714a0f9bcd800d06ad677a1d78bc761e093b6`, as recorded
  in the active consumer ledger and Work Orders plan. Its SEC-001 requires one
  dispatcher and two distinct technician principals sharing the technician role.
  Task 2 and Task 3 subsequently froze fixture IDs derived by prefixing the
  actual Graph role and appending technician slot `-a` or `-b`.
- **CTX-002**: Root's non-listening reproduction at
  `generated/.work-orders-task3-worker/long-role-repro.ts` admits a valid
  64-character technician role but rejects 16 of 21 derived journeys. Its session
  ID is 82 characters: the 16-character `fixture-session-` prefix, 64-character
  role and two-character suffix exceed the existing 64-character limit. Graph
  role identifiers permit 1 through 128 characters matching
  `^[a-z][a-z0-9-]*$`. The compiler, presentation and verifier all currently
  reconstruct this role-derived coordinate. The accepted Graph is valid; the
  fixture derivation is defective.
- **CTX-003**: PM stopped runtime and presentation writers before altering their
  shared handoff. Earlier canonical-case reviews remain evidence for those cases;
  bounded worker source acceptance is reopened. No Work Orders consumer product
  has been delivered. This correction cannot promote delivery counts or substitute
  for pending actual PostgreSQL, browser and consumer acceptance.
- **CUR-001**: Keep the current Golden table, governed by root and package
  manifests and `pnpm-lock.yaml`: Node `>=22.11.0 <23`, pnpm `9.0.0`, resolved
  TypeScript `5.9.3`, Next `15.5.22`, React/DOM `19.2.8`, Nest `10.4.22`,
  Prisma/client `6.19.3`, BullMQ `5.81.2`, ioredis `5.11.1`, Puck `0.22.3`,
  XYFlow `12.11.2`; floating images remain `node:22-alpine`, `postgres:16-alpine`
  and `redis:7-alpine`. Change no manifest, dependency, lockfile or topology.
- **CUR-002**: Retain `factory.application-graph/v1`, family
  `service-work-orders/v1`, compiler profile `service-work-orders@1.0.0`,
  presentation `service-work-orders-presentation@1.0.0`, parameter policy
  `none/v1`, and the accepted V1 Work Orders mutation, receipt and history
  serialization identifiers. Keep the readonly `ServiceWorkOrdersProfile` shape,
  exact selector, six physical capability locks and their digests unchanged.
  Draft -> Publish -> immutable Compilation remains mandatory; production
  compilation still consumes digest-verified Published Graphs only.

## Decision: fixed family slots with Graph-bound roles

The following table is the complete shared coordinate contract. The slot name
identifies a synthetic fixture person, never an authorization role literal.

| Fixture slot | Principal ID                     | Session ID                     | Resolved role              |
| ------------ | -------------------------------- | ------------------------------ | -------------------------- |
| Dispatcher   | `fixture-principal-dispatcher`   | `fixture-session-dispatcher`   | `profile.roles.dispatcher` |
| Technician A | `fixture-principal-technician-a` | `fixture-session-technician-a` | `profile.roles.technician` |
| Technician B | `fixture-principal-technician-b` | `fixture-session-technician-b` | `profile.roles.technician` |

- **DEC-001**: IDs are ASCII and independent of Graph role names, lengths and
  ordering. Principal lengths are 28/30/30; session lengths are 26/28/28. Every
  value matches `^[a-zA-Z0-9._-]{1,64}$`. Preserve these exact canonical current
  strings, including the A/B distinction. Do not introduce hashes, truncation,
  aliases, alternate accepted IDs or a role-name fallback.
- **DEC-002**: The compiler fixture producer in `packages/compiler/src/index.ts`
  uses fixed suffixes `dispatcher`, `technician-a`, `technician-b` only inside
  the exact Work Orders branch. Each emitted session still has exactly one role
  obtained from the corresponding selector field. The generic other-family
  branch remains byte-for-byte behaviorally unchanged. Existing locked fixture
  tenant `tenant-local`, expiry `2099-01-01T00:00:00.000Z`, resolver clock
  `2026-01-01T00:00:00.000Z`, package resolver and authorizer remain unchanged.
- **DEC-003**: The private presentation emitter in
  `packages/compiler/src/service-work-orders-presentation.ts` uses the same
  fixed principal/session table and retains actual `profile.roles` in its
  existing configuration. Principal switching, frozen uncertain-command ownership
  and assignment values use principal IDs. UI role checks use profile role
  bindings. Synthetic labels and the persistent demo indicator remain unchanged.
- **DEC-004**: The worker builder in
  `apps/compiler-worker/src/verifier/service-work-orders-verification.ts` uses
  the same fixed sessions for dispatcher/A/B and the fixed A/B principal IDs in
  assignment payloads. Select through the existing exact compiler selector.
  Preserve all 21 scenarios and their intended status assertions, eight-step
  maximum, existing journey/probe/evidence schemas and idempotency semantics.
- **DEC-005**: Keep this small table in the three existing private implementation
  locations and prove their agreement through emitted-output/interaction tests.
  Add no compiler-root export, public API, profile field, Graph field, schema,
  dependency or general identity abstraction. Runtime consumes the corrected
  emitted fixture records through its existing interface; it must not infer
  roles by parsing any ID. Required history `actorRole` remains the actual
  resolved Graph role, and actor principal attribution remains the fixed person.
- **DEC-006**: Preserve all existing transport validation, including 64-character
  session/header values, 512-character verifier bodies, 200-character fixture
  scalars and bounded chains. Do not narrow Graph admission to fit the old
  derivation, widen transport bounds or relax malformed-input rejection.

## Alternatives considered

- **ALT-001**: **Fixed family-owned slot IDs — selected.** Exactly three known
  synthetic people need identifiers. Fixed slots are collision-free within that
  roster, keep canonical bytes and remain bounded for every admitted role name.
  Application/tenant scoping continues to be enforced separately.
- **ALT-002**: **Hash-derived role IDs — rejected.** A digest plus slot could fit
  the transport limit but would change canonical identifiers, add encoding and
  collision policy, and still unnecessarily couple a synthetic person's ID to a
  Graph role coordinate. Canonical special cases would add compatibility logic.
- **ALT-003**: **Reject or shorten admitted roles — rejected.** New role-length
  restrictions would reject valid Graphs and violate the accepted structural
  family contract. Silent truncation introduces ambiguity and collision risk.
  Widening verifier limits would alter an unrelated shared transport boundary.

## Effects and consequences

- **POS-001**: Valid renamed, swapped and maximum-length role coordinates retain
  the same three fixture people and bounded verifier transport. Canonical Work
  Orders fixture ID bytes and every older family's fixture generation remain
  unchanged.
- **POS-002**: API routes, request/response shapes, Graph/data schemas, adapters,
  definition catalogues, registry descriptors and capability assets stay fixed.
  No provider, package, copied source, license or supply-chain change occurs;
  retain existing first-party provenance and third-party notices.
- **SEC-001**: Fixed IDs remain predictable synthetic fixtures, not credentials
  or private accounts. Keep server-side session resolution, deny-by-default
  authorization, assignment-before-read/replay, application/tenant receipt scope,
  expiry checks, forged context rejection and no session IDs in audit evidence.
  Reusing these strings across isolated generated applications confers no
  cross-application authority. No identity, tenant or data boundary is expanded.
- **NEG-001**: Three private consumers carry the same small mapping. Mandatory
  parity tests protect against drift; a new fixture slot or consumer needs a
  separately frozen shared handoff. This bounded correction does not generalize
  to staff-account management or production authentication.
- **NEG-002**: Newly generated renamed-role Work Orders output changes from the
  defective derivation. Earlier immutable Published inputs, generated artifacts
  and Compilations are never rewritten. Existing experimental renamed-role data
  is not converted; cross-revision upgrades remain outside ADR-0080's scope.

## Ownership, stop/resume and backout

- **IMP-001**: Keep both parallel writers stopped until the decision is accepted
  and PM records one serialized integration owner. That owner alone corrects the
  three DEC-002/003/004 production files plus existing focused compiler
  contract/runtime/presentation and worker verification tests. The existing
  runtime test fixture may change only for these role-coordinate cases. PM must
  enumerate the exact assigned paths and their fresh hashes before writes; no
  simultaneous worker retains write ownership of a transferred file.
- **IMP-002**: Preserve all current writers' unrelated edits. Graph witnesses,
  selector/profile, capability assets, shared styles, generic verifier validators,
  role-journey/probes and public exports stay frozen. PM owns the ledger and
  corrected briefs. Root owns ignored evidence, original-baseline comparison,
  any later process fixtures and controller delivery; the Tech Lead writes this
  proposal only.
- **IMP-003**: Start with focused failing role-coordinate tests. After the
  serialized correction, freeze all three consumer hashes and record the exact
  table, actor/authentication semantics, unchanged errors and compatibility rule
  in the PM handoff. Complete the applicable shared-contract review, independent
  QA and release judgment under delivery policy, reusing unaffected evidence.
  PM may then resume runtime/presentation work on explicitly disjoint paths.
  Any subsequent shared-contract change stops that wave again.
- **IMP-004**: There is no database migration or irreversible step. For backout,
  the controller restores only this correction's owned hunks from the recorded
  baseline and leaves Work Orders verification/admission acceptance blocked.
  Preserve local artifacts and data for inspection; do not rewrite immutable
  compilations, regenerate old expectations or delete stores. A return to broken
  derivation is a blocked experiment, not an accepted repair.
- **ABT-001**: Stop for changed older-family bytes, fixed role literals in
  authorization, collapsed technician identity, transport/admission relaxation,
  canonical ID drift, a new public contract/dependency, data conversion, unclear
  ownership or any security-boundary change. Return to PM/Tech Lead rather than
  widening this proposal. No service startup, network/provider call, cleanup,
  deployment, Product Publish, release or Git action is authorized here.

## Verification and evidence

- **VER-001**: Use the canonical fixture and valid full-Graph renamings with
  recomputed Graph checksum/composition lock. Cover each role independently and
  both together at exactly 64 and 128 characters, ordinary renamed roles, and
  simultaneously swapped canonical coordinates. Rename all references rather
  than mutating a detached profile. Exact selector admission must remain valid;
  existing invalid, extra-role and near-match rejection must remain unchanged.
- **VER-002**: Through emitted runtime and presentation behavior, assert the exact
  table, three unique principals and three unique sessions, two technicians with
  the same actual role, unchanged tenant/expiry, correct roster and outgoing
  headers. Prove dispatcher create/assign, A start, reassign B, former-A denial
  and B resolve. Assert history `actorPrincipalId` and `actorRole` separately:
  swapped role names must never swap fixture people or authorization semantics.
  Unknown/expired sessions and forged role/principal/tenant contexts still fail.
- **VER-003**: Derive and validate every one of the 21 journeys for every role
  variant through `validateRoleJourney` and existing injected environment
  transport tests. Require zero rejected journeys, exact assignment principals,
  correct per-step sessions and unchanged outcomes/bounds. Retain negative
  boundary checks that reject an arbitrary over-64 session/header before fetch.
  The original long-role reproduction must change from 16/21 rejects to 0/21.
- **VER-004**: Prove unchanged canonical fixture ID strings, emitted runtime
  fixture data and role behavior. The unreleased Work Orders presentation source
  may change when concatenations become fixed IDs; do not require byte equality
  of that in-flight emitter or introduce a compatibility branch for it. Compare
  older-family fresh derivation
  and immutable Published-input output against the untouched eleven-row baseline
  at `generated/.work-orders-task1-completion/before.json` (ten logical accepted
  definitions). Root preserves the earlier evidence and records a new comparison
  artifact; never regenerate protected expectations to obtain equality.
- **VER-005**: Run these existing focused commands from the repository root
  after correction; add the cases above to the named suites. These commands are
  requirements, not a claim that this proposal executed or passed them.

```text
pnpm --filter @factory/compiler exec vitest run test/service-work-orders-contract.test.ts test/service-work-orders-runtime.test.ts test/service-work-orders-presentation.test.ts test/definition-data-compatibility.test.ts test/task-compatibility.test.ts
pnpm --filter @factory/compiler-worker exec vitest run test/service-work-orders-verification.test.ts test/verification-graph-plan.test.ts test/verification-environment.test.ts test/verification-probes.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler-worker typecheck
```

- **VER-006**: Record exact source/ADR/baseline hashes, RED/GREEN commands and
  counts, cross-consumer agreement, historical equality and independent verdicts
  in `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md` and
  `docs/acceptance/evidence/service-work-orders/task-3-worker-source.md`, linking
  new ignored evidence beneath `generated/.work-orders-task3-worker/`. Record
  emitted-runtime and presentation coverage in their existing task evidence.
  Non-listening doubles do not prove PostgreSQL races, stored reports or an
  actual generated product; those existing acceptance requirements remain open.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md` and
  `docs/delivery-policy.md` (read in full for this proposal).
- **REF-002**: Accepted `docs/adr/adr-0080-service-work-orders-family.md` and
  `docs/superpowers/plans/2026-09-24-service-work-orders.md`.
- **REF-003**: `generated/.work-orders-task2-preparation/brief.md`,
  `generated/.work-orders-task3-worker/brief.md` and
  `generated/.work-orders-task3-ui/brief.md`; their old role-derived handoff
  remains on hold pending this proposal's acceptance and PM replacement.
- **REF-004**: Current consumer ledger, worker source evidence, Graph identifier
  schema in `packages/graph/src/model.ts` and unchanged verifier boundaries in
  `apps/compiler-worker/src/verifier/{role-journey,verification-environment}.ts`.
