# ADR-0063 Independent Standing-Acceptance Review

- Reviewer: `/root/task_mutation_decision_review`, independent nonauthor and nonimplementation writer.
- Date: 2026-09-13.
- Reviewed artifact: `docs/adr/adr-0063-task-mutation-safety-and-retry-contract.md`.
- Exact SHA-256: `50a1aceb28bb7ec8700f6701340d80214a6f26a1ec8e60aa6a1c0d9371ba81d2` (verified before and after review).
- Baseline: `d28f1fedf4fa0aaefe3e81492cabd857db69d8cb`.
- APPROVED_FOR_STANDING_ACCEPTANCE: no
- P0/P1/P2: 0/1/1.

## Findings

### P1: Define the persisted idempotency-key representation

API-002 expressly forbids raw keys in receipts, while API-005 declares `idempotencyKey String` as part of the unique receipt key without defining its stored representation. The current approval implementation saves the validated wire key directly in that field. REU-001 therefore leaves the Task adapter choosing between reproducing the existing raw-key persistence and inventing an undocumented transformation for a frozen serialized storage contract. Define an exact Task key digest algorithm/encoding, state that receipt lookup and uniqueness use that digest, and preserve existing approval bytes explicitly. Add a focused assertion that a synthetic wire key is absent from the Task receipt while same-key replay and changed-body conflict still work. This is a bounded contract clarification; it requires no new product behavior or dependency.

### P2: Locate the authorization brand without contradicting approval byte preservation

REU-001 says the port has a branded authorized runtime input that only the business adapter constructs after policy enforcement. REU-003 simultaneously requires byte-identical approval runtime output. The current emitted approval command has ordinary role/actor parameters and local enforcement followed by receipt logic, with no branded runtime context. Clarify whether the brand belongs to compiler-side emission composition or to newly emitted Task runtime code, and how the existing authorization-first approval emission satisfies the port precondition without changing its bytes. A new authorization API in approval output would violate the mandatory baseline; no such change is needed for the bounded extraction.

## Reviewed boundaries and evidence

Read `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`, delivery policy, frozen ADR-0057 and its ledger acceptance, the live Task hold, current approval mutation runtime/API/Prisma/client emission, compiler bundle assembly and database integration, worker verification-plan derivation and stored-success probe, and the permanent non-Task compatibility test/fixture.

- ADR-0057 acceptance is recorded at `8ee8ff2870369bed43d076ab8ff8d63653138d761c9970ace9358dd9d5465017`. The Task scope remains create/start/complete/reopen, shared demo-role visibility, display-only assignee, and no post-create editing or real identity.
- SEL-001 unifies Task mutation/presentation selection. SEL-002 now confines safe compilation rejection to the stated Task field/lock/binding candidate signature and preserves generic arbitrary-event Graphs outside it.
- The proposed authorization-before-replay, strict body/key validation, state/version conditional updates, atomic record/audit/effect/receipt writes, stable replay, and conflict precedence address the identified generic mutation gap. In-memory and Prisma parity and transaction failure injection are required by TST-003.
- UI-001 through UI-003 require explicit same-command retry, pending guards, authoritative refresh after success/conflict, retained list feedback, and scope invalidation. Implementation tests must exercise those actual emitted controls.
- API-004 freezes event HTTP 200. VER-001, TST-005, and MIG-002 include the worker plan and tests, true Published/separate-lock inputs, header/envelope/version/replay changes, and unchanged non-Task plans. Existing probes already support stored-success replay; no probe redesign is required.
- Three canonical definition hashes and ten ordered bundle hashes are permanent compatibility evidence, including Published inputs and legacy bundles. Approval extraction is strictly byte preserving.
- The additional implementation paths are serialized under one owner. Runtime execution, publishing, delivery, and Git remain separately controlled. Rollback preserves retained immutable Task artifacts and does not authorize destructive migration.
- No dependency, supply-chain intake, cloud, external provider, real-identity, or new business scope is authorized. Current manifests/lockfile remain authoritative.

The proposal is bounded and reversible, and its remaining issues can be resolved by a narrow author correction. The exact reviewed digest is not eligible for standing acceptance because its stored-key contract remains ambiguous. No implementation or runtime success is claimed; this is a preimplementation decision review. Only this report was written. Source, ADR, governance documents, and Git were not mutated.

## Final scoped re-review — 2026-09-13

- Reviewed artifact: `docs/adr/adr-0063-task-mutation-safety-and-retry-contract.md`.
- Exact SHA-256: `8d5b2042a798b98f130fe7265f6e1bc1389bd67f618cf1f35a9ce0d8b966ea68` (verified before and after reading the corrected artifact).
- Reviewer: `/root/task_mutation_decision_review`, unchanged independent nonauthor and nonimplementation writer.
- APPROVED_FOR_STANDING_ACCEPTANCE: yes
- P0/P1/P2: 0/0/0.

This verdict applies only to the corrected digest above and supersedes the earlier negative verdict for decision purposes. The earlier review remains historical evidence. The re-review examined REU-001/002/003, API-002/005, TST-003, and their connected authorization, compatibility, mutation, ownership, and rollback clauses; unaffected evidence from the initial review is reused.

The P1 is resolved. Task uses compiler-fixed `sha256-v1`: its stored key is exactly `sha256:` plus the 64 lowercase hexadecimal SHA-256 characters of the validated header's exact UTF-8 bytes, without normalization. Lookup, persistence, and receipt uniqueness use that stored representation. The response request hash remains separate. TST-003 now requires exact digest storage, lookup/replay coverage, and absence of raw Task keys from receipts/logs/errors/evidence. The existing approval adapter explicitly keeps compiler-fixed `legacy-raw` and byte-identical behavior; Graph/provider input cannot choose the storage mode.

The P2 is resolved. The common port exports compile-time source fragment builders. Existing approval authorization-before-receipt anchors, call sites, runtime types, and output remain exact, with no emitted brand. Any branded authorized context belongs only to newly emitted Task runtime code after its policy decision. Both adapters must consume the common security-critical fragments; whole-emitter duplication remains prohibited. This is consistent with the mandatory baseline and does not weaken authorization.

The final proposal satisfies the technology-governance decision requirements and the 2026-09-01 founder standing independent-review conditions: the change is bounded and reversible, remains inside the accepted Task experiment, has no unresolved contract ambiguity or material business choice, preserves immutable lifecycle and non-Task artifacts, and grants no external/provider/paid/cloud/deployment/release/credential/destructive authority. Root/PM must record this exact ADR, reviewer identity, verdict, evidence, and standing authorization before assigning implementation. Normal task review, QA, release review, and controller delivery still apply at their existing boundary. This decision review does not approve an implementation diff or claim executed runtime evidence. Only this owned report was changed.
