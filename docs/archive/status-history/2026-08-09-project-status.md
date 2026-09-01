# Factory Pilot delivery status

Updated: 2026-08-09

## Approved implementation target — 2026-08-02

The forward implementation target is a **Graph-first verified application
factory**, not a Graph-to-code generator or a collection of frameworks. The
immutable Published Graph remains the sole compilation input; generated source,
editors, AI, compiler targets, and providers remain adapters. The authoritative
roadmap is [`roadmap.md`](roadmap.md).

P0 is to modularise compilation through `CompilerTargetPluginV1`
(`supports -> plan -> render -> validate`) and migrate docs, policy, and
database targets only after comparison with current compiler output digests. In
parallel, generated applications gain an isolated verification loop covering
boot, migrations, health, APIs, role journeys, authorization denial,
idempotency, cleanup, safe diagnosis, and a new reviewable Draft Diff. Neither
the verifier nor diagnosis may patch generated source; Published Graphs and
Compilations remain immutable.

P1 is now the approved **Governed Composition & Capability Foundry Goal**:
`RequirementSpec -> CompositionPlan -> constrained Draft-only Graph Diff`,
25–35 Foundry-verified capability families, a 100+ representative Profile
recipe catalogue, twelve compiled anchor Profiles, and a guided Workbench flow.
Its authority is the Goal Design, implementation plan, and PM ledger at
`docs/superpowers/{specs,plans,ledgers}/2026-08-07-governed-composition-capability-foundry*`.
P2 is managed deployment, observability, fleet upgrades, and rollbacks; P3 is
additional framework adapters. Prospective Testcontainers for Node, fast-check,
and ts-morph use, and source-study-only references, remain subject to the
existing licence, provenance, notice, and security gates.

## Current iteration — governed composition contracts and planner (Trains A + B)

Plan Task 1 is implemented at commit `f97eafa`
(`feat(graph): define governed composition contracts`) and hardened at
`67cf682`, `7524e6b`, and `e13bef1` (guard repairs and hardening: alias
paths, escaped and case-variant prototype tokens, case-insensitive and
whitespace-tolerant business-text rejections, punctuation-adjacent `www`
hosts, non-draft/checksum boundaries) after independent task review and
behavioral QA findings, all pushed to
`feat/governed-composition-capability-foundry`. The Graph package now owns
exact-key `RequirementSpecV1`, `CompositionPlanV1`,
`CompositionDecisionV1`, `CompositionClarificationV1`, and
`ProfileRecipeCatalogV1` contracts: canonical SHA-256 hashes, checksum binding
of every plan to one Requirement and one mutable Draft revision,
graph-symbol existence checks against the typed Graph index, immutable
capability locks with manifest digests, bounded explainability fields, a
fail-closed unsafe-material boundary (URLs, `www`-prefixed hosts, absolute and
Windows paths even mid-sentence, traversal segments, whitespace-only
payloads, package paths, prototype-key material — matched
case-insensitively, with whitespace-tolerant full-string
`constructor`/`prototype` rejections), and Draft-only application of an
approved decision whose plan and Diff checksums both match with operations
exactly equal to the declared plan. Guards also reject whole-subtree
`/integration` rewrites (including `/integration/`, `/integration/.`,
`/integration/..` aliases), `~1`-escaped prototype-key paths and decoded
prototype tokens (checked after pointer decoding), and nested unknown keys in
requirement items; recipes require binding requirements per locked capability
and reason codes iff unsupported; anchors require at least one acceptance
journey.

Plan Task 2 is implemented at commit `3c1848c`
(`feat(capabilities): add governed composition planner`): `planComposition`
deterministically resolves a requirement against the approved current
capability assets — recipe scoring over acceptance journeys with stable
catalog-order ties, golden-lifecycle locks with immutable digests, typed
Graph-symbol bindings resolved structurally against the Draft
(requirement-named keys preferred), prefix-mapped output slots filtered to
recipe surfaces, fixture-fragment Graph operations, and dependency closure
through the deterministic resolver. Unresolvable candidates return bounded
`CompositionClarificationV1` questions (no provider, missing binding, no
output slots, non-golden lifecycle, unknown version, no Graph change) and
non-Draft bases throw. `evaluateFoundryAdmission` buckets capability
evidence into `eligible/partial/quarantined/rejected` with sorted reason
codes, backed by `expectedFoundryLockDigest` over a pure-JS FIPS 180-4
SHA-256 verified against a node:crypto known-answer vector.

Independent task review and behavioral QA at `3c1848c` found two P1
implementation defects (fixture `JSON.parse` outside the guarded read so a
malformed fixture threw instead of clarifying; multi-provider dependency
edges lost by a last-write-wins map), each reported under two IDs
(TRB-1/TRB-2 and F1/F2). Repair commit `64e954b1`
(`fix(capabilities): close planner fail-closed fixture and multi-provider
gaps`) closes all four with regression tests and relaxes the recipe
catalogue to allow an empty staged catalogue (schema-valid clarification,
never a guess). Behavioral QA re-verification at `64e954b1`: 35/35
behavior probes pass, including cross-process byte-identical plan
determinism.

Fresh verification: `@factory/graph` 153/153 tests across 7 files,
`@factory/capabilities` 313/313 across 22 files, typecheck, Prettier lint,
and build all green. Train A is `reviewed` at `e13bef1` (task review, QA,
release review, and PM gate all PASS; the PM holds it at `reviewed` until
every train is accepted). Train B is `ready_for_qa` at `64e954b1`, pending
re-verification task review.

Train B's Control Plane review (Task 3) is implemented at `74e918d`: the
Control Plane persists governed `CompositionReview` cycles (schema +
handwritten migration), plans through the deterministic
`COMPOSITION_PLANNER` seam (empty staged catalogue until the 100+ recipe
portfolio lands), records reviewer decisions bound to the stored plan and
Diff checksums, and applies only the approved constrained Diff through the
existing Draft lifecycle. Control Plane suite 174/174 across 16 files (+23
composition review tests: published-graph refusal, stale-Draft refusal,
unapproved-plan refusal, altered checksum refusal, idempotent decisions,
persisted-key redaction), typecheck, Prettier lint, and build all green.
Migration DDL verified against Prisma-generated schema.

Task 3's gate round completed (task review PASS with two P2s; behavioral QA
FAIL with F-1/F-2). Per the state vocabulary the item returned to
`implementing`; the repair batch is committed at `fbdd4ce` and `507feca`.
F-1 (P1): operation-`value` objects are schema-unknown, so URL/secret
material could ride a plan or Diff into persistence — `parseCompositionPlan`
and `hashCompositionDiff` now deep-scan every string leaf of
`proposedOperations`/`diff.operations` against `unsafeMaterialPattern`, so
the service, apply re-hash, and the future guarded model adapter all fail
closed (the error never echoes the offending material). F-2 (P2):
`plan.requirementChecksum` is now verified at the seam
(`assertPlanAgainstRequirement` plus both hashes computed before the prisma
update, `CompositionError` mapped to a bounded
`ConflictException("Composition plan rejected: …")`). Task-review P2s:
`apply()` maps `GraphDiffError`/`GraphSemanticError` to bounded
`ConflictException("Composition application refused: …")`, and tamper tests
now bind real stored checksums (a rejected decision in the unapproved-apply
fixture, exact guard messages asserted). QA-R1 (stale `packages/capabilities/
dist`) is a gitignored local-rebuild-only note — both packages rebuilt from
committed source before the suite runs. Fresh verification: control-plane
177/177 (16 files; 174 + 3 boundary tests), graph 156/156 (7 files),
capabilities 313/313, typecheck, Prettier lint, and build green. Train B is
`ready_for_qa` at `507feca` (Tasks 2–3 landed), pending re-verification
gates.

Task 3's re-verification round at `38618ad` returned TASK_REVIEW_PASS with
two new P2 scan-boundary gaps and QA_PASS (19/19 probes, no findings; the
QA gate deferred the in-flight boundary edits to their own round). RV-1:
the pattern's `.*` lookahead could not cross line terminators, so
multi-line values/prose with a URL or `__proto__` token after the first
line evaded the scan — the lookahead now uses `[\s\S]*`. RV-2:
`walkUnsafeValue` scanned string leaves only, so `__proto__`/`constructor`/
URL/path material as an object _key_ inside a value passed — the walker now
tests every walked key. Regression tests added (multi-line unsafe leaves,
multi-line unsafe business text, prototype-key/URL object keys, clean
multi-line prose preserved); graph 159/159 (156 + 3), capabilities 313/313,
control-plane 177/177 against the rebuilt dist, typecheck and Prettier lint
green. Train B is `ready_for_qa` at `a8914d0` (Tasks 2–3 landed), pending
re-verification gates on `a8914d0`.

Task 3's re-verification round 2 at `50b0e23` returned TASK_REVIEW_PASS
with one P2 (NEW-1: object-key failures echoed the offending key itself
into the rejection message — the non-echo property held for leaves but
not the RV-2 key surface; no test asserted it). Repaired at `f337174`:
the walker now fails with the container path only, and a regression test
asserts both the `__proto__`-key and URL-key rejections never echo the
token verbatim. graph 160/160 (159 + 1), capabilities 313/313,
control-plane 177/177 against the rebuilt dist, adapters 34/34, Prettier
lint green (formatting follow-up `ed82b17`). Train B is `ready_for_qa` at
`ed82b17` (Tasks 2–3 landed), pending re-verification gates on `ed82b17`.

Task 3's re-verification round 3 at `342b19c` closed both gates with no
findings: task review TASK_REVIEW_PASS (NEW-1/RV-1/RV-2/F-1/F-2/TR-5/TR-6
all verified closed at file:line; guard order intact; Train A additivity
confirmed) and behavioral QA QA_PASS 27/27 (multi-line and object-key
material refused at both the plan and stored-diff surfaces with no
persistence or Draft mutation; rejection messages never echo the material;
all six guards fire by their exact messages; redaction and the safe E2E
path hold). The PM records Train B Task 3 `ready_for_qa -> reviewed` at
`342b19c`; Tasks 2–3 are `reviewed`.

Train B Task 4 (constrained planning adapters) is implemented at
`50b0e23` + `34b81ed`: the deterministic adapter returns only the
deterministic planner's resolution over approved assets (never inventing
selections, versions, bindings, paths, or operations), and the guarded
OpenAI adapter may contribute only parsed safe business text — every
authoritative field must equal the deterministic reference, unknown
versions and unsafe material fail closed with bounded error codes, and
the API key is read from the environment at call time and never
persisted. The Control Plane seam maps bounded provider failures to
`ConflictException("Composition planning failed: …")` with nothing
persisted, and `composition-ai-boundary.test.ts` pins the boundary (safe
projection only, no raw prompt/response/credential material in any
stored key or leaf, idempotent clarifications, unsafe provider plans
refused pre-persistence). Task 4's gate round 1 at `57f68eb`: task review
TASK_REVIEW_PASS (no findings); behavioral QA QA_PASS 28/28 with two P2
seam-hardening notes (QA-1: Diff path strings were never scanned against
the unsafe-material boundary — URL material inside a path persisted; QA-2:
zod strict unrecognized-key/invalid-enum messages and the mutable-root
rejection echoed offending material). Repaired at `52432a6b`:
`unsafeCompositionDiffPathPattern` guards raw paths in
`assertSafeCompositionOperationPath` and `hashCompositionDiff`,
`parseStrict` replaces echo-prone zod details with fixed failure-class
text, and the mutable-root message no longer quotes the path. RED evidence:
graph 5 failed | 33 passed, seam 1 failed | 4 passed. Fresh verification:
graph 167/167, control-plane 182/182, capabilities 313/313, adapters 34/34.
Re-verification QA found one P0 (QA-4-1) at `7ab4c5ed`-fixed in the same
round: `~1`-escaped URL material decodes after the raw scan, so the
decoded segments are now scanned in both path guards (`assertSafeCompositionOperationPath`
and the raw-boundary mirror `assertPermittedDiffPath`, which previously
applied both escaped and unescaped URL paths into record surfaces such as
`experience.theme.tokens`). RED: graph 5 failed | 168 passed, seam 1 failed
| 5 passed. A test-only P2 closure (`1d9865d`) pinned the positive
`~1`/`~0` decode class. Both re-verification gates closed with no findings
at `1d9865d` (task review TASK_REVIEW_PASS; QA_PASS with 24 probes), and
the PM records Train B Task 4 `ready_for_qa -> reviewed` — Train B Tasks
2–4 are `reviewed`. Suites at final HEAD: graph 175/175, control-plane
183/183, capabilities 313/313, adapters 34/34.

Train C Task 5 (Foundry evidence matrix and promotion workflow) is
implemented at `b59f8645`: a declared evidence registry binds each of the
23 current
families to its exact key/version/manifest-digest with the shared
first-party policy fields and empty verifier locks, and `buildFoundryMatrix`
computes one deterministic verdict per current family
(`eligible/partial/quarantined/rejected/missing-evidence/stale-evidence/
duplicate-evidence`), never counting aliases, historical versions, or
retired families. The matrix reports the honest state: zero eligible
families — 9 quarantined for lacking two-Profile verifier evidence
(`fewer-than-two-profiles`) and 14 **rejected because their current
manifests declare no binding contract** (`missing-binding-contract`: core
audit/crud/notification/workflow/identity-context/location-context,
commerce catalog/cart/line-configuration/inventory/inventory-ledger/order/
simulated-payment, restaurant.menu). That manifest-readiness gap is Train
D's (Task 6) batch work. Public evidence: `docs/foundry/capability-matrix.md`
(source-free summary) and `docs/foundry/promotion-policy.md`. TDD RED
evidence: 11 failed | 0 passed before implementation. The gate round
returned task review TASK_REVIEW_PASS (one doc-drift observation aligned
at `5473726`) and behavioral QA QA_FAIL with two P2 runtime-immutability
gaps (QA-1: declared registry record elements were mutable; QA-2: matrix
output rows/counts were mutable) — repaired with the established
`deepFreeze` idiom so no caller can rewrite a verdict at runtime, plus two
`Object.isFrozen`/throw pins. Both re-verification gates closed with no
findings at `0ce7899b` (task review TASK_REVIEW_PASS after the plan
alignment at `5473726`; behavioral QA QA_PASS, 35/35 probes) and the PM
records Train C Task 5 `ready_for_qa -> reviewed`. Suites at final state:
capabilities 329/329 (24 files), graph 175/175, control-plane 183/183,
typecheck, Prettier, and build green.

Train D Task 6 Batch 0 (manifest readiness repair) is implemented at
`36cc7dea` (strict contract declaration) and `cd6baf6` (pairing rules pinned
by mutation-red tests; ledger reconciled), closing the exact gap Task 5
recorded: all 23 current families now declare the strict
`factory.capability-binding/v1` contract.
`composition.ts` gained one generic bounded value-selection input type
(`message.template`) paired only with manifest-declared enum parameters —
the manifest bounds the allowed values, so a caller can never inject an
arbitrary selection; graph-symbol parameters reject that pairing. Every
manifest's parameters and inputSchema agree key-for-key with matching
required flags; `domain.field` inputs declare owning entity and field
types; profile bindings for field parameters carry the owning entity
symbol plus `fieldKey` (compiler output stays byte-identical); and all 23
manifest digests were recomputed and re-pinned across the TS assets,
on-disk `component.json` packages, the `restaurant.menu` adapter.json
parameters slice, and the 14 declared evidence records. Observed results:
capabilities suite repaired from 101 failing to **332/332** (24 files;
three mutation-red pairing-rule tests landed with the gate-round repair);
the five residual failures were honest pin updates, including the
foundry-matrix split now reporting **zero eligible — 23 quarantined
(`fewer-than-two-profiles`), 0 rejected**. Compiler (money-pricing runtime
4/4 incl. the out-of-binding quote rejection), compiler-worker 163/163
(16 files, incl. the four published order-operations compilations),
generated-notification-outbox runtime verification, third-party notices,
and source-study checks all green; 7 test tasks replayed from turbo cache
(inputs unchanged). Two workbench issues are verified pre-existing
(reproduced in a scratch worktree at the accepted Task 5 HEAD `e9a09241`
with zero Batch 0 changes): the Next.js production build's
`UnhandledSchemeError: node:crypto`, and one fetch-mocked Home test
timing out at 5 s under the concurrent suite (Windows tinypool
`kill EPERM` teardown crash); workbench tests pass 73/73 alone. The
repo-wide `format:check` 110-file prettier drift is pre-existing tooling
files with zero overlap on the 47-file Batch 0 change set (which is
prettier-clean). Batch 0's three independent gates closed with PASS: task
review TASK_REVIEW_PASS and behavioral QA QA_PASS (7/7 probes, zero
findings) at `cd6baf6`, and release review RELEASE_PASS at the docs-only
`7120106` (its single P2 doc suite-count drift repaired and verified
closed); both commits are remote-reachable and the worktree is clean. The
PM advances Train D Task 6 to `implementing` at `7120106` — Batch 0
delivered and gate-verified; `reviewed` awaits all batches. Matrix state:
zero eligible, 23 quarantined (`fewer-than-two-profiles`), 0 rejected;
capabilities 332/332 (24 files), graph 175/175, compiler 330/330. Batch 1
adds new capability families toward 25–35; Batch 2 re-runs the isolated
verifier and regenerates the evidence records whose digest pins are stale
by design.

**Task 6 Batch 1 delivered: four new capability families, 27 current.**
`core.files-media`, `core.search`, `core.scheduling`, and `core.approvals`
land one family per commit (8732a69a → 34ea12f1 → 94a12dc → a8a6be5,
pushed), each with the strict `factory.capability-binding/v1` contract
declared from birth, `profiles: []` (no current Factory Profile recipe
selects them yet — Task 7 anchors adopt them), a verified package
(canonical component.json, digest re-pinned, adapter parameters slice,
fixture + contract test), and five pin tests (package verification, valid
binding resolution, three fail-closed rejections). Matrix at final HEAD:
**27 current, zero eligible, 27 quarantined (`fewer-than-two-profiles`),
0 rejected**. Observed results: capabilities **352/352** (28 files), graph
175/175, control-plane 183/183, adapters 34/34, typecheck clean; compiler
330/330 re-run in a scratch worktree (test fixtures are forbidden in the
main tree); `verify:generated-notification-outbox` green with the rebuilt
packages (1 pending drained, 1 delivered). The Batch 1 gate round closed
with all three independent gates PASS: task review TASK_REVIEW_PASS (zero
findings) at `68bea3c5`, and behavioral QA QA_PASS and release review
RELEASE_PASS (zero findings) at `d3e18f5a` — both commits remote-reachable
on the same chain, final HEAD == origin tip == `d3e18f5a`. The one P1 QA
found at `68bea3c5` (the control-plane portfolio test's stale
`golden: 23 / lockedVersions: 50` pin vs the live-derived 27/54, which made
the suite deterministically 182/183) was repaired at the test+docs-only
commit `d3e18f5a` (pin → 27/54) and re-verified. Suites at final HEAD:
control-plane 183/183 (17 files), capabilities 352/352 (28 files), graph
175/175, adapters 34/34, typecheck clean; outbox runtime 1 pending drained /
1 delivered / safeFailure true; secret boundary clean; tree byte-clean.
Task 6 remains `implementing` — `reviewed` awaits all batches (Batch 2
isolated-verifier evidence regeneration and Batch 3 evidence locks).

**Task 6 Batch 2 delivered: isolated-verifier evidence regenerated across
all three profiles.** The Batch 2 re-runs surfaced two verifier fixture
defects through the real Docker-backed runtimes, both repaired
platform-side with TDD (no Published Graph or Compilation touched):
simple-ecommerce's seeded order had no cart line, so `order.submit`, `pay`,
and `fulfil` failed closed `403` vs `201` — closed with a new
`shopper-adds-cart-item` role-journey step that stocks the order through the
commerce line route (pinned by profile tests); restaurant-ordering's preview
never booted because the harness seed dropped the `menu-category` its
`menu-item` referenced (`MenuItem_categoryKey_fkey` P2003) — closed with a
fail-closed compiler validation (every seeded `menu-item.categoryKey` must
resolve to a seeded `menu-category`) plus the missing fixture; and the
restaurant generated journey test then hardcoded the canonical
`notification.send/send` effect while the composed default Restaurant Draft
is notification-free by pinned contract — closed by rendering the generated
journey's expected effect pairs from the composed Graph's own transitions.
Green evidence at the repair commit: ecommerce ten steps, digest
`sha256:2f98d7135e88e216212e946cd2824c3946d108f5a12e910e849a2a8b35679aa1`,
compilation `cmsjn1csh0001w484k7l16ktb`; restaurant thirteen steps, digest
`sha256:2d33f32caea919d4b1c7354b4f9ead86c713362a4f7af5fbfd3211734f46b90f`,
compilation `cmsjpncv60001w414q557eai4`, both with idempotent retry, preview
cleanup, and the generated journey suites passing; expense approval
regenerated alongside (see the three acceptance records under
`docs/acceptance/`). Deterministic checks at the repair commit: compiler
332/332 (19 files) single-fork, worker 183/183 (16 files), control plane
184/184 (18 files), capabilities 352/352 and graph 175/175 unchanged from
Batch 1.

**Task 6 Batch 2 gate round closed at `902962e3` + the P2-repair commit: all
four gates PASS, zero P0/P1 findings.** Independent task review
(`TASK_REVIEW_PASS`: SPEC/QUALITY PASS, zero transcription drift across
commit message, ledger, status, and the three acceptance records), behavioral
QA (`QA_PASS`: focused suites 11/11 and 29/29, fail-closed probes green
against a fresh dist, journey-rendering probe green, docs match the harness
pins exactly, worker full suite 183/183), release review (`RELEASE_PASS`:
12-file diff strictly in scope, immutable Graphs/Compilations untouched,
contracts/provenance/secrets/docs-truth/Git all PASS), and PM gate
(`PM_ACCEPT`: Batch 2 complete and disciplined; Task 6 correctly remains
`implementing` with Batch 3 evidence locks pending). The three task-review
P2-informational notes were repaired with the gate record: the compiler
"single-fork" deterministic check is now pinned in committed vitest config
and re-verified 332/332 (19 files) with the plain scripted command; the
three remaining non-transition command-effect literals in the generated
journey are accepted with rationale (the flow model does not declare
non-transition effects, `renderExpectedEffectPairs` fails closed by design,
and drift is loud — it fails the Docker-backed journey suite); and the
ledger's diff-scope sentence now enumerates the governance records it also
updated.

**Task 6 Batch 3 delivered: profile locks and verification digests declared
in the Foundry evidence registry.** `declaredFoundryFamilyEvidence` now
carries real isolated-verifier profile locks for the 15 families locked by
two or more of the three verified Profile Graphs (expense-approval,
simple-ecommerce, restaurant-ordering), at the exact graph checksums and
immutable lock digests the harness reproduces, plus the reviewed fixture
and contract-test digest literals the current assets record. The matrix
advances from 0 to 11 eligible families (commerce.catalog, inventory,
inventory-ledger, line-configuration, money-pricing, order,
order-operations; core.identity-policy, location-context, notification,
policy-declarations). Four locked families stay honestly partial
(missing-evidence-digests): commerce.cart, core.audit, core.crud,
core.workflow — their current assets record no verification digest
literals, so the registry declares none (a self-check test pins that
evidence digests mirror the current assets exactly, both directions).
Twelve families remain quarantined (fewer-than-two-profiles), zero
rejected. Full capabilities suite 354/354, typecheck clean. Task 6 Batch 4
(families toward the 25–35 verified target) is next. The Batch 3 gate round
closed at commit `7b4a3011` with all four gates PASS: independent task
review (zero P0/P1), independent behavioral QA (18/18 focused, 354/354
full, 183/183 worker, 175/175 graph, typecheck clean), independent release
review (zero P0/P1), and PM accept. The three P2-informational notes were
repaired in the closure commit: exact per-profile graph checksum literals
now sit in the ledger and are pinned in the evidence self-check tests.

**Task 6 Batch 4 delivered: verification digest literals on the remaining
locked assets.** The four families whose assets declared no verification
digest literals — commerce.cart@1.0.1, core.audit@1.0.2, core.crud@1.0.1,
core.workflow@1.0.1 — now record `fixtureDigest` and `contractTestDigest`
literals computed from their on-disk fixture and contract-test packages
(sha256 of `fixtures/default.json` and `tests/contract.json`), with
recomputed manifest digests and re-derived verifier lock digests recorded
in the evidence registry and the physical `component.json` manifests. The
matrix advances to 15 eligible families, zero partial, 12 quarantined
(fewer-than-two-profiles), zero rejected. The three profile graph checksums
are byte-identical to Batch 3 — the manifest edit did not perturb any
composition — so the other 11 families' locks remain valid. Suites:
capabilities 354/354 (28 files), graph 175/175, control-plane 184/184,
typecheck clean. The 12 quarantined families need two-Profile verifier
locks, which requires profile composition changes; Batch 5 scopes that
path.

**Task 6 Batch 4 gate round closed: the QA P2 was repaired in the closure
commit.** All four gates ran against `36d04f2`: independent task review
PASS (zero findings), independent behavioral QA PASS with one P2 (the
admission boundary validated evidence digest _presence_ only — a
wrong-but-present `fixtureDigest`/`contractTestDigest` value passed as
eligible), independent release review PASS (zero findings), and PM accept
(three P2-informational notes). The closure commit adds a
`stale-evidence-digests` value-compare to the PARTIAL bucket of
`evaluateFoundryAdmission` with two fail-closed tests; the committed
registry is unaffected (the mirror self-check already bound all 27 records
to asset literals), so the honest split stays 15/0/12/0. Suites:
capabilities 356/356 (28 files), graph 175/175, control-plane 184/184,
typecheck clean.

**Task 6 Batch 5 delivered: recipe-driven verifier expansion, 16 eligible.**
The three verified Profile recipes were extended deterministically:
`core.approvals` joins expense-approval (typed to expense/manager),
`core.files-media` joins simple-ecommerce (product/imageUrl) and
restaurant-ordering (menu-item/imageUrl), `core.search` joins
simple-ecommerce (product/name), and `restaurant.menu` joins
restaurant-ordering (menu-category/menu-item/menu-item); the `inventory.adjust`
pair `[commerce.inventory-ledger, restaurant.menu]` was allowlisted as the
declared drive-and-record overlap, while the earlier `payment.simulate`
placement was reverted — the cashier IS the restaurant's payment surface,
so no arbitrary allowlist. Only the simple-ecommerce graph checksum moved
(`sha256:eecaf73e…`); expense-approval and restaurant-ordering are
byte-identical to Batch 4 (the restaurant "drift" during scoping was a
stale scratch copy of the acceptance seeds, not a real change).
`core.files-media` recorded its reviewed fixture/contract-test digest
literals and re-derived lock digests, and the evidence registry now
declares files-media with two locks (eligible) and approvals/search/menu
with their first locks (honestly quarantined). Split: 16/0/11/0.
Suites: capabilities 356/356 (28 files), graph 175/175, typecheck clean;
the isolated-verifier Docker acceptances re-ran for all three profiles
and passed end-to-end (evidence digests `sha256:94365800…` /
`sha256:830996eb…` / `sha256:7f7f02a9…` for expense, ecommerce,
restaurant, all `generatedTests: passed`). Task 6 Batch 5 is closed; the
second-lock path for the 11 quarantined families is Task 7's anchor
Profiles.

Retail Counter and Grocery Pickup are independently accepted as local generated
prototypes through the shared `commerce.order-operations@1.1.0` lock, including
Preview stop and cleanup. This is not production readiness and does not alter
the historical evidence below.

The P0 Compiler Target Plugin Kernel Goal is accepted at branch tip `1137e1e`;
its database target migration was accepted at `76933ca`. The P0 Isolated
Verifier is now finalized and accepted on `feat/isolated-verifier` at commit
`924bd5b`: the queued verification failure boundary is closed (`4c70d2c`), the
real Docker acceptance passes (`41fae0f`, first green run), was re-run green
after review hardening (`ee97b97`), and the final acceptance re-run at the
reviewed commit `924bd5b` returned the acceptance evidence digest
`sha256:433b08523a0924033dd4c949ad2b2034e445c23ae1ae7c5c6703fb262819343f`
(compilation `cmsj1uvkz0001w4eo7o1gfkad`, artifact digest byte-identical
across all green runs). The Worker suite gate is reproducible at `924bd5b`
(vitest timeout config plus harness and diagnostics hardening). Fresh
deterministic gates are green (`@factory/compiler-worker` 163/163 across 16
files, `@factory/graph` 103/103, `@factory/control-plane` 150/150,
`@factory/compiler` 330/330 with typecheck/lint/build). Independent task
review, behavioral QA, release review, and PM acceptance all close at the
final commit `924bd5b`. See `docs/acceptance/isolated-verifier-expense.md`
and `docs/acceptance/isolated-verifier-release.md`, with the governing Goal
at `docs/superpowers/specs/2026-08-07-isolated-verifier-finalization-goal-design.md`.

## Durable notification outbox across Expense and Ecommerce — 2026-08-01

New Expense Approval and Simple Ecommerce Drafts now select the same immutable
`core.notification@1.1.1` package and digest. Their validated recipe bindings
remain profile-local: Expense targets `employee` with
`expense.approval-outcome`, while Ecommerce targets `shopper` with
`ecommerce.order-outcome`. Expense approval/rejection and Ecommerce payment
outcomes now write notification intents through the generated transactional
runtime.

Focused generated-runtime evidence materialized both profile bundles, executed
the Expense approval and Ecommerce payment journeys, drained each deterministic
local worker, and observed one delivered entry with the locked profile role and
template. The same suite keeps historical `core.notification@1.1.0` replay at
`template: null`, exercises retry and terminal failure behavior, and rejects a
recipe missing `recipientRole`. Temporary generated source directories are
removed by the test harness. Isolated Compose previews, resource cleanup, full
repository gates, and the guarded real-model check remain the separate final
release-evidence task; no external notification provider is enabled.

## Identity and policy cross-profile foundation — 2026-08-01

`core.identity-policy@1.0.0` is a locked Golden package for Expense Approval
and Simple Ecommerce. Generated local APIs now resolve an opaque local fixture
principal and evaluate the exact declared event action before a protected
mutation changes application state. A browser journey proved employee submit
and manager approval while rejecting employee approval; it also proved shopper
checkout and merchant fulfilment while rejecting shopper fulfilment. Both
isolated generated previews were stopped and their resources cleaned up.

The Workbench portfolio now exposes a source-free readiness projection for the
locked family: package key, version, Golden lifecycle, Profile count,
verification state, and generated-target state. It deliberately omits package
source, policy source, fixture-session identifiers, provider metadata,
credentials, and AI request or response data. This remains local-prototype
identity only; provider-backed identity and fine-grained authorization are
separate delivery slices. See
`docs/acceptance/identity-policy-cross-profile.md` for the exact boundary and
the completed guarded real-model check: one accepted Graph Diff was applied to
an Expense Draft, then published and compiled successfully without retaining
its prompt, response, or credential.

## Current iteration — generated-product evidence and scalable reuse

Factory Pilot remains an Application Graph composition platform, not yet a
production-complete catalogue of one hundred applications. The current
foundation is materially stronger than a label-only template catalogue:

- Five starter Profiles exist: Expense Approval, Restaurant Ordering, Simple
  Ecommerce, Retail Counter, and Grocery Pickup. The checked catalogue contains
  twenty-three capability package keys and fifty physical version directories.
  Counts are inventory, not a claim of full business completeness.
- Before this acceptance slice, isolated Docker browser journeys passed for three generated
  applications: specialised Restaurant Ordering (table session, menu ordering,
  simulated payment, kitchen, cashier, audit, and cleanup), generic Expense
  Approval (publish, compile, role-aware operation, stop, and cleanup), and
  Simple Ecommerce (catalog, session-persisted cart, declared Checkout page,
  submit, pay, merchant fulfilment, and cleanup).
- The current Restaurant compiler output now persists option groups, line
  options, location-scoped inventory idempotency keys, and their migration
  schema. A generic capability-contract regression was also repaired so
  generated non-commerce APIs declare every emitted handler type.
- Retail Counter and Grocery Pickup now have independent isolated
  generated-application acceptance: both followed Draft, Publish, immutable
  Compilation, role operation, Preview stop, and exact cleanup. Retail Counter
  ended at `receipt-issued`; Grocery Pickup progressed through `paid`,
  `picking`, `pickup-ready`, and `handed-off`. The platform still lacks
  production identity, real payments, durable provider delivery,
  observability, fleet upgrades, and managed deployment. See
  `docs/acceptance/retail-grocery-order-operations.md`.

### Candidate Foundry acceleration

The local Intake CLI now supports a bounded all-family GitHub metadata pass.
It executes only Factory-owned fixed queries sequentially, resolves default
branches before a record becomes eligible, and returns a source-free
continuation checkpoint on a GitHub rate limit. It does not download source,
create a Candidate, install a dependency, promote a Golden asset, or modify a
Graph or generated application.

A guarded live metadata pass completed the identity, catalog, and
commerce-transaction families before GitHub requested a pause. It evaluated
sixty metadata records: thirty-four passed the fixed-reference and declared
license preflight for later quarantine study, and twenty-six were blocked by
the license gate. No source content or Candidate was persisted. Fresh
verification for this change: `@factory/intake-cli` 67 tests, typecheck,
Prettier lint, and build all passed.

The compiler's current-profile regression gate is also green after replacing
a stale hard-coded current-asset version assertion with the compiler boundary
it is intended to verify: the selected immutable Graph lock must be emitted
unchanged, while the historical lock remains replayable. Fresh verification:
the focused compilation-plan suite passed 49 tests; `@factory/compiler`
passed 208 tests, typecheck, Prettier lint, and build.

### Compiler target plugin kernel — accepted; isolated verifier next

Typed Capability Binding Task 2 is reconciled against accepted Task 2A and is
`accepted` at Target-Commit `0dbe0cf7959e39306bdd4693bef5402a2a2b1dec` after
independent task review, behavioral QA, release review, and fresh verification
passed with no P0/P1/P2. That compiler-admission dependency is accepted.
Stage 1 of the compiler-target-plugin-kernel Goal — the `CompilerTargetPluginV1`
kernel (`feat(compiler): add target plugin kernel`) — is implemented and its
final independent task review passed at the remote-reachable branch tip
`249fc8590f29152cc09456e8733e7a8a64d58fd9` (TASK_REVIEW_PASS, SPEC PASS,
QUALITY PASS, no P0/P1/P2), after the serializability hardening sequence
(`bc09019` descriptor checks, `8921103`/`ab6186d` dense-array fixes with the
recorded governance deviation of the two pushed-failing intermediate commits,
`d024f74` dense plain-data requirement, `40e941b`
`requireDensePlainDataArray` extraction) and the `249fc85` remediation
record; no history was rewritten. Independent behavioral QA then passed at
`249fc85` (QA_PASS, no P0/P1/P2: focused kernel suites 55/55, full Compiler
suite 292/292 serial, Compiler typecheck/lint/build, compiler-worker 81/81
plus typecheck, compilation-plan facade suite 51/51; adversarial symbol-keyed,
accessor-backed (zero getter invocations), non-enumerable, `toJSON`, sparse-
array, extra-own-key, array-rooted-cycle, bigint, duplicate-path,
nondeterminism, and traversal probes all fail closed; the two informational
edges are closed; the deep-nesting recursion edge remains informational
only). The PM records Stage 1 `ready_for_qa -> reviewed` citing `249fc85`.
Independent release review at `249fc85` then returned RELEASE PASS with no
P0/P1/P2: the kernel is purely additive with the Draft -> Publish ->
immutable Compilation lifecycle, Published Graph immutability, and
capability-lock contracts untouched; the facade preserves all 38 prior
exports plus 12 kernel symbols; no dependency changes; no profile-name
branching; hardening-range provenance matches the ledger deviation record;
no credentials, raw prompts, or URLs; fresh re-runs at byte-identical HEAD
passed focused 55/55, facade compilation-plan 51/51, full compiler serial
292/292, and typecheck and Prettier; `249fc85` is remote-reachable and the
worktree is clean. The PM records Stage 1 `reviewed -> accepted` citing
`249fc85`. Stage 1 acceptance covers the plugin kernel (contract, registry,
generated-file rules, facade re-exports) with the serializability hardening
sequence. Stage 2 (documentation target parity migration) is implemented at
Target-Commit `3fae49480d5e481fd5ed0916f0a44e5ebcc9c9c5` and its iteration
state is `ready_for_qa`: independent task review returned TASK_REVIEW_PASS
(SPEC PASS, QUALITY PASS, no P0/P1/P2), after `3fae494`'s behavior-neutral
split of `buildDocumentationPlan` into
`projectDocumentationEndpoints`/`projectDocumentationEntitySections`/
`projectDocumentationRelationRows` closed the two P2s from the initial
`3f57542` review (60-line guidance; fixture-session profile narrative
corrected to Expense Approval and Simple Ecommerce). Fresh evidence:
documentation parity + validation tests 11/11 (5 profiles x 4 frozen
SHA-256 vectors + determinism + 5 fail-closed cases), full Compiler suite
303/303 serial (17 files), typecheck, Prettier lint, and `git diff --check`
clean. Independent behavioral QA then passed at `3fae494` (QA_PASS, no
P0/P1/P2; read-only QA context, Node `v22.11.0`, product code byte-identical
at HEAD `423ab9e`): parity 11/11 (5 profiles x 4 frozen legacy SHA-256
vectors + determinism + 5 fail-closed validation cases), a byte-level probe
confirmed `generateApplicationBundle` docs output byte-identical to the
registry-run plugin output (8/8 files across simple-ecommerce and
restaurant-ordering, digests equal the frozen vectors), full Compiler suite
303/303 serial (17 files), worker 81/81, compilation-plan facade suite
51/51, identity-policy-runtime 3/3, typecheck/lint/build pass; scope
`git show 3fae494` = 3 files and `git diff 249fc85..3fae494` = 5 files, no
dependency changes, `git diff --check` clean, worktree clean. The PM records
Stage 2 `ready_for_qa -> reviewed` citing `3fae494`. Independent release
review at `3fae494` then returned RELEASE PASS with no P0/P1/P2: lifecycle
untouched (Draft -> validated Published Graph -> immutable Compilation);
facade export surface preserved exactly (only `buildCompilationInput`
added); capability-lock contracts and contribution pipelines remain
facade-owned; no profile-name branching (the target branches only on
capability-key prefixes and composition-derived context); all 20 frozen
SHA-256 vectors reproduce exactly; `target.ts` is 261 lines with every
function under 60; no credentials, raw material, or URLs in the migration
range; no dependency changes; tests recorded across the QA and release
contexts (parity 11/11, full compiler serial 303/303, worker 81/81, facade
suite 51/51, identity-policy-runtime 3/3, typecheck/lint/build clean);
`3fae494` remote-reachable, linear history, worktree clean. The PM records
Stage 2 `reviewed -> accepted` citing `3fae494`. Stage 2 acceptance covers
the documentation target migration (plugin, frozen-digest parity across all
five Profiles, facade delegation, centralized renderers removed). Stage 3
(policy target parity migration) is implemented at Target-Commit
`514081580ffdc172ef40935b73f7c2276739e35d` and its iteration state is
`ready_for_qa`: independent task review returned TASK_REVIEW_PASS (SPEC
PASS, QUALITY PASS, no P0/P1/P2), after repair `5140815` (bounded to
`packages/compiler/test/policy-target-parity.test.ts`, +20/-3) closed the
P2 from the initial `2ccc553` review (two malformed-validation branches
untested — policy.csv trailing newline, policy.ts `newEnforcer` — now a
table-driven malformed test with three cases, each asserting the issue at
its own path). Fresh evidence at `5140815`: policy parity + validation
13/13 (5 profiles x 3 frozen SHA-256 vectors + determinism + 7 fail-closed
cases), full Compiler suite 316/316 serial (18 files), typecheck, Prettier
lint, and `git diff --check` clean. The migration adds
`packages/compiler/src/targets/policy/target.ts` (`PolicyPlanV1`, key
`casbin-policy`, distinct module model with `p.obj == "*"` preserved), the
parity test (15 frozen vectors), facade delegation of the three policy files
via the facade-owned registry with `renderCasbinPolicy`/`renderPolicyModule`
removed, and `runtimeDefinition`/`lockedRuntimeHandlerEntity` restored
byte-identically after a deletion overrun. Independent behavioral QA then
passed at `5140815` (QA_PASS, no P0/P1/P2; read-only QA context, Node
`v22.11.0`, product code byte-identical at HEAD `25ef916`): parity 13/13 (5
profiles x 3 frozen legacy SHA-256 vectors + determinism + 7 fail-closed
cases), byte-level probe confirmed `generateApplicationBundle` policy files
byte-identical to the registry-run plugin output (15/15 bundle == plugin ==
frozen digest MATCH across all five profiles) plus two-render bundle
determinism, full Compiler suite 316/316 serial (18 files), worker 81/81,
compilation-plan facade suite 51/51, restaurant-runtime 20/20 (asserts
`api/policy/policy.csv` content), typecheck/lint/build pass; the three
malformed adversarial cases each assert `malformed.policy-file` at their own
path and missing/undeclared classes pass; `runtimeDefinition` and
`lockedRuntimeHandlerEntity` byte-identical to commit `4b5c6ab`; migration
range `3fae494..5140815` = index.ts + policy target + parity test + two
governance docs, no dependency changes, `git diff --check` clean, worktree
clean. The PM records Stage 3 `ready_for_qa -> reviewed` citing `5140815`.
Independent release review at `5140815` then returned RELEASE PASS with no
P0/P1/P2: lifecycle unchanged; facade public surface 20/20 exports
byte-identical; the three policy files byte-identical (parity); the policy
module's distinct internal model (`p.obj == "*"`) preserved; no profile-name
branching; `runtimeDefinition`/`lockedRuntimeHandlerEntity` byte-identical
to `4b5c6ab`; no credentials, raw material, or URLs in the migration range;
no dependency changes; tests recorded across the QA and release contexts
(policy parity 13/13, full compiler serial 316/316, worker 81/81,
compilation-plan 51/51, restaurant-runtime 20/20, typecheck/lint/build
clean); `5140815` remote-reachable, linear history, no force-push/amend,
worktree clean. The PM records Stage 3 `reviewed -> accepted` citing
`5140815`. Stage 3 acceptance covers the policy target migration (plugin
with key `casbin-policy`, 15 frozen digest vectors across all five Profiles,
facade delegation, centralized renderers removed). Stage 4 (database target
parity migration) is implemented at Target-Commit
`76933ca7b7295a6ce053d1bfdc3dfa605aa8487f` and its iteration state is
`ready_for_qa`: independent task review returned TASK_REVIEW_PASS (SPEC
PASS, QUALITY PASS, no P0/P1/P2) at the clean tree exactly at `76933ca`,
after the `35fa51d` review's one P2 (ledger line-count inaccuracy, 667 vs
actual 707) was corrected at `76933ca` (ledger-only, +5/-1) with the
responsibility-based file-size exception recorded (renderers moved verbatim,
parity gate justifies the cohesive exception). Fresh evidence at `76933ca`:
database parity + validation 13/13, full Compiler suite 329/329 serial (19
files), typecheck, Prettier lint, and `git diff --check` clean; the code
tree is byte-identical to `35fa51d` (reviewed fully). The migration adds
`packages/compiler/src/targets/database/target.ts` (707 lines,
`DatabasePlanV1`, nine legacy renderers moved byte-identically — verified
by diff against `2e2753a` — plus private
`toPascalCase`/`toCamelCase`/`hasCommerceCapabilities` copies and
fail-closed validation), the parity test (20 frozen vectors, 5 profiles x 4
paths), and facade delegation of the four database files via the
facade-owned registry with the nine centralized renderers removed (facade
diff +10/-572); the database package.json/Dockerfile/.dockerignore and
`renderPrismaRecordStore` remain facade-owned. No migration bytes changed
(exact parity), so no migration smoke was required per the design. Independent behavioral QA then passed at
`76933ca` (QA_PASS, no P0/P1/P2; read-only QA context, Node `v22.11.0`,
product code byte-identical at HEAD `b6429a2`): parity 13/13 (5 profiles x 4
frozen legacy SHA-256 vectors + determinism + 7 fail-closed cases), byte-level
spot check confirmed `generateApplicationBundle` database files
byte-identical to registry-run plugin output for restaurant-ordering and
simple-ecommerce (30/30 PASS, triple agreement frozen == plugin == bundle),
bundle deterministic across two renders, full Compiler suite 329/329 serial
(19 files), worker 81/81, compilation-plan 51/51,
order-operations-runtime 9/9, money-pricing-runtime 4/4,
restaurant-runtime 20/20, typecheck/lint/build pass; the three malformed
adversarial cases ("without" matcher) each assert `malformed.database-file`
at their own paths and missing/undeclared/validation-failure classes pass;
`76933ca` ledger-only (+5/-1), migration range `5140815..76933ca` = index.ts
(+10/-572) + database target (+707) + parity test + two governance docs,
nine moved renderers + three private copies byte-identical to `2e2753a`
(12/12 verified), no dependency changes, `git diff --check` clean, worktree
clean. The PM records Stage 4 `ready_for_qa -> reviewed` citing `76933ca`.
Independent release review at `76933ca` then returned RELEASE PASS with no
P0/P1/P2: lifecycle untouched; facade export surface byte-identical (13/13
named exports vs `2e2753a`); `renderPrismaRecordStore` and the database
package.json/Dockerfile/.dockerignore remain facade-owned; the delegation
replaces exactly the four legacy database file entries; no profile-name
branching (zero profile string references in `target.ts`; Restaurant
artifacts and package-owned fragments enter via the explicit plan context);
verbatim-move proof (all 404 unique removed lines appear verbatim in the
target additions); no credentials, URLs, or raw material in the 5-file
migration range; digest vectors are evidence values only; fresh re-runs
passed parity 13/13, full compiler serial 329/329, worker 81/81,
typecheck/lint/`git diff --check` clean; `76933ca` remote-reachable, linear
history, worktree clean, gate records consistent. The PM records Stage 4
`reviewed -> accepted` citing `76933ca`. Stage 4 acceptance covers the
database target migration (plugin with key `prisma-postgres`, 20 frozen
digest vectors across all five Profiles, package-owned contribution
fragments preserved, facade delegation, nine centralized renderers removed);
this completes all three target migrations (documentation, policy,
database). The next gate is Stage 5 final acceptance: full repository gates
(affected Graph/Capabilities/Control Plane/Worker suites, formatting/
secret/provenance checks), roadmap update, and GOAL_COMPLETE. Typed Binding
Graph Tasks 3-7 remain `planned` and blocked, and Commercial Foundation Task
2 remains escalated. `commerce.cart@1.0.1` already has a package-owned
handler and is not the next unimplemented slice.

## Persistent shared order operations — 2026-08-01

`commerce.order-operations@1.1.0` is an immutable Golden package that owns a
versioned payment/idempotency receipt persistence contribution. The historical
`1.0.0` and `1.0.1` identities and digests remain resolvable. New Drafts for
Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup lock
`1.1.0`.

For the generic commerce compiler path, the package now emits an
`OrderOperationReceipt` Prisma model and migration, a Store transaction
boundary, and a Prisma `upsert` implementation that round-trips the package
payment contract. The generated runtime no longer owns a process-local receipt
Map: recreating it around the same Store rejects a duplicate idempotency key.

Restaurant remains a separate specialised runtime. It already persists
`RestaurantCommand`, `PaymentAttempt`, receipt, inventory, audit, and outbox
records in a Prisma transaction; the generic receipt contribution is consumed
by the Ecommerce, Retail Counter, and Grocery Pickup runtime path. All four
paths now have fresh isolated generated-application browser journey evidence:
Restaurant, Ecommerce, Retail Counter, and Grocery Pickup. The latter two are
accepted local generated prototypes through the shared lock; this does not make
the portfolio production-complete. See
`docs/acceptance/retail-grocery-order-operations.md`.

Fresh focused evidence:

- `@factory/capabilities`: 81 package, lock, and composition tests passed;
- `@factory/compiler`: 8 persistent order-operations compiler regressions and
  84 Restaurant, transaction, and composition regressions passed; and
- `@factory/compiler-worker`: 4 published-artifact materialisation regressions
  passed for Restaurant, Ecommerce, Retail Counter, and Grocery Pickup, after
  rebuilding the compiler package consumed by the Worker.

This is not production acceptance. A generated app must still prove the
PostgreSQL migration, runtime transaction, and role journeys in an isolated
Compose project. Existing Factory containers do not constitute generated
application acceptance evidence.

## Candidate Foundry discovery implementation — 2026-08-01

Factory Pilot now has a bounded, quarantine-only discovery path for expanding
capability supply beyond manually authored Profile packages. It does not copy,
execute, install, promote, or activate external code.

- `@factory/external-intake` validates immutable Discovery Records, assigns
  deterministic eligibility gates and scores, caps eligible GitHub source-study
  batches at 1,000 entries, and rejects floating references, invalid
  host/reuse-mode combinations, unknown executable licences, duplicate
  identities, and sensitive fields.
- The local Intake CLI supports fixture discovery and a fixed-query GitHub
  metadata adapter. The adapter accepts no caller URL or query, confines the
  optional environment-only GitHub token to `api.github.com`, resolves each
  default branch to a full commit before it can become Intake-eligible, and
  returns only redacted aggregate counts to its caller.
- Evidence-complete Candidates can produce a deterministic Foundry scaffold:
  manifest, fixture, adapter, and conformance-plan requirements plus an
  optional declarative source-port plan. The scaffold has no source body,
  package path, Graph, compiler, runtime, provider, or Golden authority.
- The Control Plane and Workbench Home expose a source-free Capability Supply
  queue covering thirteen business families and the five initial Profiles.
  It is an operational backlog projection, not proof that a candidate is
  installed, safe, Golden, or executable.

Focused evidence completed before the final workspace regression:

- `@factory/external-intake` Discovery (5 tests), Candidate Foundry scaffold
  (7 tests), and public-summary boundary (1 test), plus package typecheck and
  lint;
- `@factory/intake-cli` discovery and GitHub metadata tests (5 tests), plus
  typecheck and lint;
- `@factory/portfolio-public` summary tests, typecheck, build, and lint;
- `@factory/control-plane` Portfolio summary tests and typecheck; and
- `@factory/workbench` parser, model, and Home tests (29 tests), typecheck,
  and lint.

The first full `pnpm test` execution identified one stale exact-equality
assertion in the External Intake public-summary boundary after the safe supply
projection was added. The boundary assertion was updated to explicitly allow
only the new source-free aggregate. A second full `pnpm test` run is green:
Turbo completed 16 tasks, with the changed External Intake (430 tests) and
Intake CLI (64 tests) tasks executed and unaffected tasks restored from cache.
This is regression evidence for the Candidate Foundry slice, not acceptance of
a generated production-application Profile.

A manual live GitHub metadata check for the `commerce-transaction` family
returned 20 records: 9 eligible for further quarantine intake and 11 blocked
by the declared-license gate. The command emitted aggregate counts only; it
did not persist a Candidate, fetch an archive, copy source, install a package,
or change a Graph, Generated Application, or Golden asset.

## Candidate Foundry source-expansion research — 2026-08-01

Two public-source research records now define a scalable intake path for the
next capability expansion. The recommended shape is a Discovery Index feeding
the existing immutable quarantine pipeline, rather than manually creating one
capability package for every business scenario or copying complete upstream
applications into generated products.

- `docs/research/2026-08-01-oss-capability-intake-mechanisms.md` records the
  batch discovery, fixed-reference, SBOM, licence, vulnerability, provenance,
  AST-inventory, Candidate-artifact, and promotion path. It identifies four
  narrow reuse modes: pinned dependency, template adapter, Provider adapter,
  selective source port, and reference-only.
- `docs/research/2026-08-01-permissive-profile-component-intake.md` records
  fifteen additional direct-dependency or Provider candidates and a ranked
  ten-item Foundry batch spanning money, identity, media, interchange, search,
  inbound communication, barcode/scan, and release-control seams.

No researched source has been installed, copied, activated as a Provider, or
promoted to Golden. The existing `external-intake` package can batch fixed
source requests, preserve quarantine evidence, and emit non-promoting
Candidate proposals. The next product slice is Discovery Index and triage
automation, followed by Factory-owned candidate package scaffolds for
allowlisted, evidence-complete source modules.

Fresh root regression confirmation: `pnpm test` exited successfully for all
sixteen workspace tasks. Turbo replayed prior task results from its local cache,
so this confirms no known regression in the checked worktree but is not a new
generated-application release acceptance.

## Profile readiness and quarantined Candidate port planning — 2026-08-01

Commits `9de4b74`, `80b5a15`, and `a0a015c` make portfolio maturity visible
without widening the execution boundary. Every registered Profile now has an
immutable, source-free readiness record. The Control Plane and Workbench
project only capability keys, four maturity states, and generated-target
counts; unknown states are rejected and source-shaped response fields are not
retained by the client.

External intake can now turn a completed safe Candidate into a deterministic
Candidate port plan. The plan names a reuse mode, one evidence-matching module
identity, and the licence, notice, SBOM, scan, conformance, and removal-test
gates required before a later source-study decision. It cannot copy source,
write a package, promote a Candidate, mutate an Application Graph, activate a
Provider, or expose source content, URLs, prompts, or credentials.

Fresh verification: `@factory/capabilities` passed 239 tests plus typecheck
and lint; `@factory/control-plane` passed 120 tests plus typecheck;
`@factory/workbench` passed 71 tests plus typecheck, lint, and production
build; `@factory/external-intake` passed 418 tests plus typecheck and lint.
This is readiness and supply-chain preparation, not a business-capability
completion claim. The next execution slice remains the shared
`commerce.transaction` generated-runtime kernel across Restaurant, Ecommerce,
Retail Counter, and Grocery Pickup.

## Strict Restaurant package bindings — 2026-08-01

Commit `3163a68` turns the active Restaurant Ordering package selection into
five independently versioned, strict `factory.capability-binding/v1` assets:
table session, ordering, kitchen, cashier, and reporting. Each current
`1.1.0` package now declares typed Graph inputs, a physical immutable package
directory, a digest, a fixture, template contributions, and negative binding
evidence. Historical `1.0.0` locks remain replayable; an invalid binding such
as a PageModel symbol supplied where a DomainModel entity is required fails
closed.

Fresh focused and package verification completed before the commit:

- `@factory/capabilities`: 237 tests, build, typecheck, lint;
- `@factory/compiler`: 200 tests, build, typecheck, lint;
- `@factory/control-plane`: 120 tests and typecheck;
- changed files and immutable package directories passed Prettier and
  `git diff --check`.

The catalogue now has 20 capability families and 43 versioned asset packages.
This is a component-contract milestone, not yet package-owned target runtime:
the next required migration moves Restaurant target contributions out of
compiler Profile switches and then proves common transaction behaviour in both
Restaurant and Ecommerce.

## Portfolio intelligence delivery — 2026-08-01

The current worktree adds a read-only Workspace Portfolio Summary to the
Control Plane and Home. It exposes only safe aggregate state: five Profile
starters, 20 capability families, 43 versioned asset packages, the 43-source /
108 source-to-scenario mapping discovery portfolio, Candidate/Provider counts,
and compilation health. The separate 122-recipe planning taxonomy is broader
than the immutable source portfolio and is not surfaced as installed product
coverage. The summary deliberately does not expose upstream URLs, fixed
references, source paths, raw AI material, or credentials.

Fresh package evidence for this worktree: `@factory/portfolio-public` passed
1 test plus typecheck/build; `@factory/external-intake` passed 411 tests;
`@factory/control-plane` passed 120 tests plus typecheck/build; and
`@factory/workbench` passed 70 tests plus typecheck and a production Next.js
build. This is truthful portfolio visibility, not capability promotion: the
portfolio now derives one deterministic, non-promoting Candidate blueprint for
each of its 19 intake-eligible source records. Source-fragment Candidates
remain blocked until their evidence carries an approved licence decision; zero
Candidates are installed as Golden capabilities and zero external Providers
are active.

## Latest capability and supply-chain audit — 2026-08-01

Factory Pilot has a working composition and compilation foundation, but its
current capability catalogue is not yet a broad production-application
platform.

- `pnpm test` completed successfully for all 14 workspace tasks on this
  worktree. The current task run reused local Turbo test cache entries, so this
  is regression evidence for the checked revisions rather than a new
  end-to-end release acceptance.
- Five Profile starters are available: Expense Approval, Restaurant Ordering,
  Simple Ecommerce, Retail Counter, and Grocery Pickup. The latter three reuse
  shared commerce composition locks, but that does not make their business
  operations complete or independently accepted.
- The catalogue contains 20 capability families and 43 physical, versioned
  package directories. Only a smaller subset clearly owns executable runtime
  behaviour: core CRUD/workflow/audit/notification plus selected cart,
  inventory, and simulated-payment contributions. Generic catalogue and order
  behaviour, and several Restaurant behaviours, still have compiler-owned or
  Profile-specific implementations.
- The Restaurant Profile has accepted local evidence for its bounded
  table-to-order lifecycle, simulated payment, inventory effects, kitchen and
  cashier flows, audit, and generated artifacts. Identity, membership,
  promotion, real payment, settlement, delivery, reservations, realtime,
  offline operation, and production observability remain absent or partial.
- The external-source portfolio records 43 fixed sources and 108 demand
  mappings. It is a discovery and intake input, not an installed capability
  catalogue. The current pipeline creates immutable quarantine evidence and
  source-study projections, deterministically derives a declarative Candidate
  proposal for each of its 19 intake-eligible sources, and isolates batch-item
  failure without promoting any Candidate. It does not create Factory
  capability packages.

### Supply-chain release gate

An earlier independent review reported two P1 isolation gaps in external
intake. Both are already addressed by ancestor commit `aba30f5`: batch parsing
keeps each opaque request inside the item-level validation boundary, and
source-study input is parsed with a strict runtime schema plus sensitive-key
rejection. The focused regression tests are present and the full workspace
test run passes. Automatic Portfolio-to-Candidate creation can therefore begin
from the existing release boundary. The intended scale path remains: fixed
source portfolio -> quarantine -> licence/SBOM/security evidence -> strict
source study -> non-promoting Candidate proposal -> Factory-owned package or
provider adapter. Whole-repository copying remains outside the supported path
because it bypasses licence scope, provenance, compatibility, and Application
Graph authority controls.

## Current product and reuse assessment — 2026-08-01

Factory Pilot is a working Application Graph composition foundation, not yet a
production-complete catalogue of one hundred application types.

- Five Profile starters compile from Published Graphs today: Expense Approval,
  Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup.
  Only Restaurant has a specialised transaction-oriented runtime; the other
  commerce Profiles share a smaller generic runtime.
- The current catalogue has 20 capability families and 43 versioned physical
  asset packages. Package counts do not prove business completeness. Core
  CRUD/workflow/audit/notification plus selected commerce handlers are
  executable; some catalogue/order concerns remain compiler-owned and several
  restaurant behaviours remain Profile-specific.
- The completed inventory slice introduces `commerce.inventory@1.1.0`.
  Simple Ecommerce, Retail Counter, and Grocery Pickup now prove a common
  `cart -> submitted -> paid` lifecycle where submit reserves stock and a
  privileged cancellation compensates it. The generic Prisma path still lacks
  a database transaction, idempotent command receipt, ledger write, and outbox
  spanning the order and inventory changes.
- The broader planning taxonomy contains 122 Profile recipes, while the
  immutable source portfolio contains 43 fixed-source records and 108
  source-to-scenario mappings. Neither is installed product coverage. The
  quarantine pipeline can acquire fixed references, isolate a prohibited batch
  sibling, capture redacted evidence, and create a strict source-study
  projection. It now derives all 19 eligible Portfolio sources into
  quarantined, non-promoting Candidate proposals; it does not create a Golden
  package or activate an external runtime.

### Decision: scale reuse without importing upstream authority

The supported high-throughput reuse routes are:

1. **Pinned dependency:** import a small published technical library with its
   licence notice and update policy.
2. **Provider adapter:** connect a mature external runtime through a typed,
   replaceable Factory contract while Factory retains the Application Graph.
3. **Selective source copy:** copy only an identified, permissively licensed,
   compact source path after an immutable source study, copy ledger, notice,
   fixture, conformance and removal test.
4. **Reference only:** learn domain vocabulary from copyleft,
   source-available, commercial, or architecture-incompatible projects.

Bulk cloning full vertical repositories is not an acceptable fourth route. It
would import unknown transitive licences, assumptions, credentials and data
models into the compiler, while making upstream code the de facto business
source of truth. The high-leverage next sequence is to complete the generic
transaction kernel, repair the intake isolation boundaries, then automate
allowlisted fixed-reference acquisition into non-promoting Candidate proposals.

## Historical execution snapshot — 2026-08-01

The latest capability and supply-chain audit above is authoritative. The
following retained execution notes describe earlier increments and may use
superseded counts or in-progress wording.

Factory Pilot has a credible composition foundation, but it is not yet a
production-complete application platform or a catalogue of one hundred ready
business products.

- The repository currently contains 19 capability families and 33 physical,
  versioned package directories. Five Profile starters are available:
  Expense Approval, Restaurant Ordering, Simple Ecommerce, Retail Counter,
  and Grocery Pickup. Their published Graphs, package locks, generated targets,
  and acceptance depth are not interchangeable claims of production readiness.
- Eight shared packages have executable package contributions today: CRUD,
  workflow, audit, notification, inventory, simulated payment, cart, and line
  configuration. Catalog, order, and several Restaurant flows are still at
  different stages of extraction from compiler-owned behaviour. Several Restaurant flows
  are still Profile-specific compiler behaviour. The library is therefore
  useful but uneven; it is not yet an independently replaceable domain kernel.
- The generic line-configuration slice now has focused green evidence:
  `commerce.line-configuration@1.1.1` is a new immutable Golden successor;
  `1.1.0` remains replayable. The generated runtime resolves options only from
  published records, rejects cross-catalog or unavailable selections, derives
  labels and price deltas server-side, and exposes a bounded
  `catalog-configurator` PageModel block. Full Capabilities and Compiler
  verification passed on 2026-08-01; broader product and generated-application
  acceptance remain release gates for the platform.
- The external-intake lane can bulk acquire fixed public references into
  quarantine and record redacted provenance evidence. It can derive an
  allowlisted quarantined Candidate but cannot promote Golden packages
  automatically. The next supply
  chain milestone is a bounded Candidate-proposal generator with licence,
  SBOM, security, fixture, conformance, and provenance gates.

### Product implication

The shortest path to broad coverage is not one hundred copied vertical
applications. It is a small, executable cross-profile kernel plus Profile
recipes and provider adapters. A bulk intake pipeline should automate
discovery, fixed-SHA acquisition, licence classification, dependency/SBOM
analysis, fixture generation, and Candidate task creation; it must not allow
an upstream repository, schema, credential, or arbitrary source tree to become
an executable Graph or compiler input without Factory-owned contracts and
tests.

## Current Profile and external-reuse refresh — 2026-07-31

Factory Pilot is a working **Application Graph composition foundation**, not a
complete catalogue of production business applications yet.

### Verified current capability evidence

- Five Graph-backed Profile starters are registered: Expense Approval,
  Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup.
  Their shared commerce recipes retain versioned package locks while using
  distinct entities, roles, routes, state machines, seed data, and policies.
- `commerce.line-configuration@1.1.0` is now the current portable commerce
  package. Restaurant, Ecommerce, Retail Counter, and Grocery Pickup all lock
  the same package version and bind it only through declared Graph symbols.
  The package requires a catalog-to-option-group-to-option relation and a
  line-to-immutable-snapshot relation. It exposes selection mode, cardinality,
  ordered options, server-side pricing inputs, and snapshot fields without
  selecting behavior from a Profile name.
- The Compiler now substitutes declared template parameters exclusively from
  the immutable Composition Lock. A generated Restaurant configuration module
  receives `menu-item`; the equivalent Ecommerce module receives `product`.
  It cannot read mutable draft state or arbitrary Graph paths while rendering.
- Fresh verification on this worktree passed: `@factory/capabilities` has
  233 tests plus typecheck/lint/build; `@factory/compiler` has 192 tests plus
  typecheck/lint; `git diff --check` passed.

### Production completeness: truthful position

The Restaurant Profile has meaningful local proof for table session, catalog,
cart, order lifecycle, simulated payment, kitchen/cashier flows, inventory,
audit, generated API/Web/database/test artifacts, and a Merchant console.
It is **not** a full production restaurant suite. The following capability
families are still absent or only represented by a narrow simulation:

- real identity, payment, refund, split settlement, tax, loyalty, promotion,
  membership, receipts/printers, delivery, reservations, waitlists, offline
  conflict handling, realtime provider delivery, and production observability;
- cross-profile packages for party/customer, availability, reservation,
  pricing, fulfilment, shipment, documents, support, reporting, and
  authorization providers;
- a source-to-Candidate pipeline that can turn a checked external source
  study into a Factory-authored package proposal with fixtures, conformance
  tests, and provenance.

The current generated configuration module proves package parameterisation;
the next compiler slice must add the generic request/validation handler and
PageModel blocks that exercise configured-line choices at runtime. Until that
slice has generated-application journey evidence, it must not be described as
an independently complete production feature.

### Scale strategy: many scenarios from a small capability kernel

The 122-scenario map and 43 fixed-reference source records are planning and
intake inputs, not installed applications. Factory should reach 100+ scenarios
by composing a shared capability kernel, rather than cloning 100 vertical
repositories. The scalable delivery lanes are:

1. **Direct dependencies** for bounded technical functions (for example
   editors, charts, QR rendering, cache, or state machines), each pinned with
   its notice and package update policy.
2. **Provider adapters** for mature systems whose runtime should remain
   external (for example a commerce, authorization, print, or realtime
   provider). Factory retains the Application Graph and provider contract.
3. **Fixed-reference source studies** for permissively licensed implementations
   whose small, identified algorithms or domain rules can be re-authored into
   a Factory package. Automated intake fetches a commit SHA into quarantine,
   records licence/SBOM/security/module evidence, derives a candidate task,
   and runs offline fixtures. It never promotes raw repository code into a
   Graph, Compiler, or generated runtime.

Whole-repository copying is not a scalable shortcut: the selected projects use
different runtimes and data models, carry transitive licences, and often embed
assumptions that conflict with Draft → Publish → immutable Compilation. The
fast path is automated discovery and quarantine plus targeted, attributable
adapters or re-authored fragments. This removes one-by-one manual discovery
without allowing an unreviewed upstream repository to become execution
authority.

## Current evidence audit — 2026-08-01

The repository is a credible **composition foundation**, not yet a complete
library of production application profiles. The following facts were checked
against the current worktree:

- The current worktree expands the reusable Order Operations slice from three
  starter Profiles to five: Expense Approval, Restaurant Ordering, Simple
  Ecommerce, Retail Counter, and Grocery Pickup. Retail Counter and Grocery
  Pickup compile from the same current Catalog/Cart/Order capability-lock set
  as Ecommerce, with distinct Graph entities, roles, routes, seed data, and
  fulfilment transitions. This is current-worktree evidence pending its
  dedicated commit; it is not a claim that five production Profiles are
  accepted.
- Fresh targeted verification passed: the Compiler has 192 tests, the
  Compiler Worker has 76 tests, both packages typecheck and lint, both build
  targets required by the slice pass, and `git diff --check` is clean. The
  Worker tests materialise isolated Retail Counter and Grocery Pickup outputs
  and assert that no Restaurant command runtime artifact is emitted.
- `pnpm test` completed successfully with 14 Turbo tasks. The command reused
  verified local cache entries; its package evidence reports 32 Graph, 66
  Workbench, 116 Control Plane, 74 Worker, 182 Compiler, 219 Capabilities,
  402 External Intake, 61 Intake CLI, and 20 Adapter tests.
- `packages/capabilities/assets` contains 19 named capability families across
  30 versioned package directories. Package count is not equivalent to
  executable coverage: `core.crud`, `core.workflow`, `core.audit`,
  `core.notification`, `commerce.inventory`,
  `commerce.simulated-payment`, `commerce.cart@1.0.1`,
  `commerce.catalog@1.2.0`, and `commerce.order@1.2.0` have package-local
  executable contributions. Several Restaurant behaviours intentionally
  remain profile-specific extensions.
- The fixed-reference portfolio contains 43 source records and 108 scenario
  demand mappings: 1 direct dependency, 7 provider candidates, 11 selective
  source-study candidates, 8 architecture-only references, and 16 exclusions.
  These are research and intake inputs, never installed capabilities or
  production readiness evidence.
- A guarded live acquisition attempt for TastyIgniter, its Cart extension, and
  InvenTree was blocked by public GitHub metadata `403` responses. The command
  created only ignored, redacted quarantine receipts and acquired no source
  content, Candidate, Golden package, provider, Graph, or generated runtime.
  A local environment-only GitHub read token is required before retrying live
  metadata acquisition; it must not be inspected, logged, persisted, or
  committed.

The immediate product priority is two coupled tracks: (1) extract
compiler-owned generic catalogue/order behaviour behind physical capability
packages, then prove it across at least Restaurant and Ecommerce; (2) use the
existing intake pipeline to turn a small number of fixed, permissively
licensed source studies into narrow, Factory-authored Candidate proposals with
fixtures and conformance evidence. Factory must not bulk-clone vertical
repositories or treat any external schema/runtime as Application Graph truth.
The detailed 122-recipe portfolio and source classifications are in
[`research/2026-08-01-100-profile-capability-ecosystem.md`](research/2026-08-01-100-profile-capability-ecosystem.md);
the Restaurant gap audit is in
[`audits/restaurant-ordering-requirements-audit.md`](audits/restaurant-ordering-requirements-audit.md).

## Capability ecosystem status correction

Factory Pilot currently proves three independently modeled Profile families:
Expense Approval, Restaurant Ordering, and Simple Ecommerce. A Published
Application Graph can be compiled into a local bundle with generated Web/API,
database, policy, flow, test, and documentation outputs. This is a functional
foundation, not evidence that Factory Pilot already supports one hundred
production-ready application types.

The repository contains 19 current capability families and historical locked
versions. The reusable capability boundary is uneven: `core.crud`,
`core.workflow`, `core.audit`, `core.notification`, `commerce.inventory`,
`commerce.simulated-payment`, and `commerce.cart@1.0.1` have executable,
version-locked package contributions. The cart migration now includes a
manifest-declared runtime handler, template, fixtures, contract tests, and
historical-lock replay evidence. `commerce.catalog`, `commerce.order`, and
several Restaurant behaviors still rely on compiler-owned generic or
profile-specific runtime code; their package records alone are not yet proof
of independently replaceable implementation.

The 122-scenario research taxonomy is a mapping of Profile recipes, shared
capability locks, fixtures, and acceptance journeys. The separately executable
external-source portfolio currently contains 43 source records and 108 demand
signals; the two planning counts must not be conflated. Neither is an installed
component catalogue or a production-readiness claim. The next high-leverage
product milestone is a bulk capability supply chain: curated source portfolio
-> fixed-reference quarantine -> licence/SBOM/security/module evidence ->
source study -> Candidate artifact -> offline conformance -> Factory-authored
Golden package or provider adapter. Until that pipeline is implemented,
external source intake remains deliberately limited to immutable quarantine
evidence and cannot create a Candidate, copy source, alter a Graph, or
influence a compiler/runtime. The local `portfolio acquire` CLI command now
constructs a strict batch from explicitly selected, intake-eligible portfolio
IDs; it adds no authority beyond that quarantine boundary.

The source-acquisition CLI now has an optional local read-token transport for
GitHub metadata. `FACTORY_GITHUB_READ_TOKEN` is consumed only from the process
environment and is scoped to `api.github.com`; archive and all other requests
have authorization removed. Its focused tests prove token host confinement and
non-echoing invalid configuration. Intake CLI verification currently passes
61 tests, typecheck, lint, build, and `git diff --check`. No live external
source has been claimed acquired by this change: materialization, scanning,
Candidate creation, conformance, and Golden promotion remain separate gates.

## Current milestone

### Parallel delivery track: Live External Source Acquisition

Status: `ready_for_qa`. The current worktree now has a CLI-only fixed-source
acquisition lane: a strict batch can resolve an exact public GitHub tag or SHA,
persist immutable quarantine evidence, and project redacted source-study
metadata. It cannot extract or execute downloaded source, run a scanner, create
a Candidate, promote a Golden asset, copy source, mutate the Application Graph,
or become a compiler/runtime input. Deterministic evidence is recorded in
`docs/acceptance/live-external-source-acquisition.md`; the one guarded public
smoke terminally blocked and was cleaned up, so it is not live-source success
evidence. Independent task review and QA remain required.

Typed Capability Binding Validation is the current hardening milestone.
ADRs 0006, 0007, and 0008 are `Accepted` under Factory controller authority;
the amended design, implementation plans, and ledger now govern the work.
ADR-0008 was accepted after independent reproduction showed the repair-round-4
P1 is a shared resolution-input ownership failure rather than a bounded local
parameter defect. Task 1, **pure typed Graph symbol index**, is `accepted` after
bounded repair round 1. Original implementation commit
`86d5a00f26d5f331764de0e8bf7694e657cd2514` passed independent Task 1 review
and behavioral QA with no P0/P1/P2, but release review then found one
load-bearing P1 in duplicate navigation/flow identifier handling. Repair commit
`784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` passed independent re-review and
repair-round behavioral QA with no P0/P1/P2. Final release review returned
RELEASE PASS with no P0/P1/P2, and fresh verification passed.

Task 2, **typed manifest and binding contracts**, is `implementing` in repair
round 4. Its bounded writer is Typed Manifest Contract Integration, its
contract owner is Capability Binding Contract, and its write boundary is the
exact four Capabilities paths recorded below. Independent review of implementation commit
`4458bfc7c8ffcaef29dfebb755d8399e12000198` found two P1s, so Task 2 does not
advance. Repair round 1 commit
`a7331df0ac6a6f54f82bf61a060607777bc06dc0` stays inside the existing path
boundary and passed independent repair re-review with no P0/P1/P2. Task 2 stays
inside its exact four-path boundary. After architecture amendment commit
`36317bf`, the PM records `implementing -> ready_for_qa`. Accepted ADR-0007
assigns owner-aware Draft Graph serialization to new Task 3 without expanding
Task 2. Independent behavioral QA passed 45/45 focused typed contract tests,
188/188 full Capabilities tests, typecheck, lint, build, bounded scope checks,
and strict public probes. The PM previously recorded
`ready_for_qa -> reviewed`. Independent release review then found one P1:
prototype-backed schema or binding data could influence canonical binding-lock
semantics despite the strict own-key contract. The PM records
`reviewed -> implementing`. Repair round 2 commit
`565c64c5e79799261f8dc72c7e0da298fef4742d` changes only
`packages/capabilities/src/composition.ts` and
`packages/capabilities/test/typed-binding-contract.test.ts`, but independent
task re-review returned FAIL: required `ownerBinding`/`fieldTypes`, optional
field constraints, and an empty-string unknown own key were not all enforced
with exact own-property semantics. Repair round 3 commit
`00ac760c54f353f6ae242f92a5dd4809791cd633` stays inside those exact two
Capabilities paths and adds focused `Object.prototype` pollution and empty-key
regressions. Fresh implementation verification passed 49/49 focused tests,
Capabilities typecheck, and Capabilities lint. Independent repair-round-3 task
review passed with no P0/P1/P2 after 29/29 typed-binding and 20/20 composition
tests, and confirmed the exact two-path diff. The PM recorded
`implementing -> ready_for_qa`. Independent repair-round-3 behavioral QA then
returned PASS: 49/49 focused tests, 192/192 full Capabilities tests,
Capabilities typecheck/lint/build, 180/180 Compiler tests, and the adversarial
compiled probe passed. The PM previously recorded
`ready_for_qa -> reviewed`. Independent release review then returned FAIL with
two P1s: accessor-backed bindings could validate one value and expose another
before canonical lock selection, and strict parameters accepted
prototype-supplied `key`, `type`, and `required` values. The PM records
`reviewed -> implementing` for repair round 4. Repair commit
`b85dbda063fe6fa6db3b712f5891b013285e0356` snapshots immutable own-enumerable
data for strict schemas, parameters, and bindings, then uses the normalized
binding snapshot for validation and canonicalization. It changes only the
same two authorized Capabilities repair paths. Fresh engineer verification
passed 195/195 Capabilities tests plus Capabilities typecheck, lint, and build,
and 180/180 Compiler tests plus Compiler typecheck and lint. This remains
implementation evidence only. Independent task review of the repair returned
FAIL with one new P1: `manifest.parameters` is snapshotted separately during
schema validation and binding validation, so a getter can supply different
parameter schemas at those two stages. Task 2 remains `implementing` and is not
accepted. Controller-accepted ADR-0008 stops further local Task 2 repair and
its remaining review gates. Task 2A, **immutable composition resolution
boundary**, is now `accepted` after repair round 2. Its bounded writer is
**Immutable Composition Resolution Integration**, and its contract owner is
**Capability Composition Resolution Boundary**. Plan Tasks 1 through 3 produced commits
`b310d8e`, `c9e5ca3`, and
`73accc24a68d55308d127717e36cd63130024f3e`; independent review of plan Task 3
then returned FAIL with two P1s. Governance commit `76274e3` formally amended
the repair boundary to five exact Capabilities paths. Repair commit
`a09d459077f80fa82161df928137b1f2052a75bb` stayed inside those paths, and
independent repair review returned SPEC PASS and QUALITY PASS with no
P0/P1/P2. Independent behavioral QA at `a09d459` then passed with no P0/P1/P2:
Capabilities passed 214/214 with its package checks, Compiler passed 180/180
with its package checks, every public accessor probe observed zero getter
invocations and rejected with the capture error, the frozen digest remained
exact, and the largest 13-selection composition produced one digest across
1,000 resolutions at p95 2.708 ms. Scope and diff checks were clean. The PM
previously recorded `ready_for_qa -> reviewed`. Independent release review then
returned FAIL with one P1: `resolveCapabilityAssetLock`,
`assertGoldenCapabilityAssetLocks`, `assertGoldenCapabilityComposition`,
`composeDefaultCapabilityDraft`, and `composeProfileDraft` observe caller-owned
input or context before descriptor capture. Direct probes invoked getters, and
a self-changing `profile` getter produced incoherent output. The Controller
authorized repair round 2 inside the unchanged five-path boundary, and the PM
previously recorded `reviewed -> implementing`. Repair round 2 commit
`40096847c4a4b28c3d02fd33d01805d46da0bded` changes three authorized paths and
received independent SPEC PASS and QUALITY PASS with no P0/P1/P2. The reviewer
audited all eight exported structured composition/lock boundaries and their
self-redefining accessor and alias probes. The PM previously recorded
`implementing -> ready_for_qa`. Fresh repair-round-2 behavioral QA against
`40096847c4a4b28c3d02fd33d01805d46da0bded` returned PASS with no P0/P1/P2:
Capabilities passed 219/219, Compiler passed 180/180, all eight public
boundaries rejected with the capture error and zero getter invocations, and
the alias, server-lock, deep-freeze, digest, and largest-composition
single-digest probes passed at p95 2.884 ms. The PM previously recorded
`ready_for_qa -> reviewed`. Final independent release review at governance
commit `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` against source commit
`40096847c4a4b28c3d02fd33d01805d46da0bded` returned RELEASE PASS with no
P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed 219/219
Capabilities tests, 180/180 Compiler tests, and 76/76 focused tests. The
largest registered composition produced one digest across 1,000 resolutions
at p95 2.554 ms; source/governance drift and secret checks were clean. The PM
reconciles the ordered gates as `reviewed -> accepted`. The earlier task-review
and QA results against `a09d459` remain historical, not acceptance evidence.
Owner-aware Graph persistence remains explicitly owned by planned Graph Task
3, which remains `planned` and blocked; Task 2 acceptance does not start Graph
Tasks 3 through 7. Physical assets remain Task 4; Tasks 4 through 7 remain
serially blocked.

Commercial Capability Foundation Task 2 remains `implementing` and escalated
after its five permitted repair rounds. It is blocked on accepted Typed
Capability Binding Validation Task 7 and later PM reconciliation; it is not
accepted. Commercial Foundation Tasks 3 and 4 remain `planned` and blocked.

The Application Graph remains the source of truth. External intake artifacts
remain quarantined Candidate evidence or pending-review packets; they are not
Golden capabilities, Graph input, compiler input, generated runtime authority,
provider authority, approval, or source-copy execution.

## Completed evidence

ADR-0006 fixes the typed-binding architecture under controller authority:

- `factory.capability-binding/v1` is manifest-owned and interpreted by generic
  composition validation.
- The Graph owns a capability-agnostic typed index with separate symbol
  namespaces and fields resolved only under their entity owner.
- Draft composition, verified Publish lock creation, and compiler admission
  validate the exact Graph and selected locks.
- Historical Golden bytes, digests, Published revisions, and locks remain
  immutable. New current recipes migrate to verified
  `core.location-context@1.0.1`,
  `commerce.inventory-ledger@1.0.1`, and
  `commerce.inventory@2.0.0`.
- No validator may dispatch on Profile name, package version, field name,
  source path, compiler target, or output path.

ADR-0007 fixes serialized owner-aware selection ownership under controller
authority:

- Draft Graph bindings add the owner-aware
  `{ graphSymbol: "graph.domain.<entity>", fieldKey }` value without removing
  existing number, boolean, or historic `{ graphSymbol }` values.
- Graph parsing and validation prove exact entity/field existence only;
  Capabilities retains scalar, required, unique, and manifest-kind admission.
- Historic Draft JSON stays readable without owner inference or hash rewrite.
  Published Graphs remain selection-free and immutable locks retain bindings
  and digests.
- New Task 3 owns only the Graph schema, parser/validator, hashing regressions,
  browser-entry regressions, and exact three Graph paths recorded in the ledger.

ADR-0008 fixes the composition-resolution ownership boundary under controller
authority:

- Public composition and lock creation capture one descriptor-validated,
  Factory-owned snapshot before any matching, validation, normalization,
  resolution, canonicalization, or hashing.
- Records and arrays must be ordinary own-data structures; accessors, symbols,
  sparse or inherited indices, extra array properties, custom prototypes, and
  cycles fail closed.
- Existing valid `factory.capability/v1`, `factory.capability-binding/v1`, and
  `factory.composition/v1` bytes and lock digests remain unchanged.
- Commits `b310d8e`, `c9e5ca3`, and `73accc2` are historical implementation
  evidence. Governance amendment `76274e3` authorized the exact five-path
  repair, and repair commit `a09d459077f80fa82161df928137b1f2052a75bb`
  stayed within it. Independent repair review returned SPEC PASS and QUALITY
  PASS with no P0/P1/P2. Independent behavioral QA then passed with no
  P0/P1/P2 after 214/214 Capabilities tests, 180/180 Compiler tests, zero-getter
  public capture probes, exact digest compatibility, and a single digest across
  1,000 resolutions of the 13-selection composition at p95 2.708 ms. The PM
  records the historical Task 2A `ready_for_qa -> reviewed` transition.
  Subsequent release review returned FAIL with one P1 in the five exported
  wrappers named above. Their task-review and QA results remain historical;
  Controller-authorized repair round 2 returned Task 2A
  `reviewed -> implementing` under the unchanged five-path boundary. Repair
  commit `40096847c4a4b28c3d02fd33d01805d46da0bded` changes only
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/src/index.ts`, and
  `packages/capabilities/test/composition-contract.test.ts`. Independent
  repair-round-2 review returned SPEC PASS and QUALITY PASS with no P0/P1/P2
  after auditing all eight exported structured composition/lock boundaries and
  the self-redefining accessor/alias probes. The PM previously recorded
  `implementing -> ready_for_qa`. Fresh repair-round-2 behavioral QA against
  `40096847c4a4b28c3d02fd33d01805d46da0bded` passed with no P0/P1/P2 after
  219/219 Capabilities tests, 180/180 Compiler tests, zero-getter capture-error
  rejection at all eight public boundaries, and passing alias, server-lock,
  deep-freeze, digest, and largest-composition single-digest probes at p95
  2.884 ms. The PM previously recorded `ready_for_qa -> reviewed`. Final
  independent release review at governance commit
  `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` against source commit
  `40096847c4a4b28c3d02fd33d01805d46da0bded` returned RELEASE PASS with no
  P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed 219/219
  Capabilities tests, 180/180 Compiler tests, and 76/76 focused tests, with one
  digest across 1,000 largest-composition resolutions at p95 2.554 ms and clean
  source/governance drift and secret checks. The PM records
  `reviewed -> accepted` for Task 2A only.

The approved design and plan are recorded at
`docs/superpowers/specs/2026-08-01-typed-capability-binding-validation-design.md`
and
`docs/superpowers/plans/2026-08-01-typed-capability-binding-validation.md`, with
the Task 2A boundary plan at
`docs/superpowers/plans/2026-08-01-immutable-composition-resolution-input.md`.
The governed task state is recorded in
`docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`.
This status/ledger synchronization changes no product code, source manifest,
physical package, shared contract, or existing Commercial Foundation ledger.

Typed Binding Task 1 implementation, review, and QA evidence is:

- Reviewed code commit:
  `86d5a00f26d5f331764de0e8bf7694e657cd2514`
  (`feat: index typed graph symbols`).
- The implementation changes only `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`, inside the exact four-path
  boundary.
- Fresh Node `v22.11.0` verification passed 30/30 focused application-Graph and
  browser-entry tests, Graph typecheck, Graph lint, and implementation diff
  checks.
- Independent Task 1 review of
  `4617cb23752e17eaa223bdddb1b3f3164472f2a3..86d5a00f26d5f331764de0e8bf7694e657cd2514`
  returned PASS with no P0/P1/P2.
- Independent behavioral QA on Node `v22.11.0` passed
  `pnpm --filter @factory/graph test -- --run` at 30/30 tests, plus Graph
  typecheck, lint, and build.
- A direct public `dist/browser.js` probe passed 17/17 owner-scoped
  duplicate/wrong/missing-field assertions and 18/18 isolated-namespace
  assertions. Wrong or missing owners and fields returned `undefined`.
- Browser/model source and built output contained no Node builtin or
  `@factory/capabilities` import. The implementation and documentation-only
  follow-up diffs were bounded and clean.
- QA returned PASS with no P0/P1/P2. The PM reconciled this as sufficient only
  for `ready_for_qa -> reviewed`; it is not release review or acceptance.
- Release review then found one verified P1: generic `indexBy` uses
  last-write-wins `Map` construction, while semantic Graph validation omits
  duplicate navigation-entry-ID and flow-ID checks. An invalid Graph can
  therefore resolve one of those typed symbols by declaration order instead of
  failing closed.
- The PM returned Task 1 `reviewed -> implementing` and authorized bounded
  repair round 1. Earlier task-review and QA evidence remains historical but
  cannot support acceptance while this finding is open.
- Repair commit `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  makes generic indexing fail closed on duplicate keys and adds semantic
  duplicate navigation-entry-ID and flow-ID issues. The repair changes only
  `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`.
- Fresh Node `v22.11.0` verification passed 32/32 focused application/browser
  tests and 32/32 full Graph tests, plus Graph typecheck, lint, build, and
  repair diff checks.
- Independent re-review of
  `7a0ee76e620d92032c07c7272d2b637e6835a8cc..784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  returned PASS with no P0/P1/P2. The PM reconciled this as sufficient only for
  `implementing -> ready_for_qa`.
- Independent repair-round re-QA on Node `v22.11.0` passed 32/32 Graph tests,
  Graph typecheck, lint, build, and repair diff checks.
- Public built-browser probes proved validation, parsing, and indexing reject
  duplicate navigation-entry and flow IDs. Owner-scoped field and isolated
  namespace probes passed, and browser/model source plus built output contained
  no Node builtin or `@factory/capabilities` import.
- Re-QA confirmed the repair scope remained exactly
  `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts` and returned PASS with no
  P0/P1/P2. The PM reconciled this as `ready_for_qa -> reviewed`.
- Deferred limitation: `parseApplicationGraph` still accepts a duplicate
  domain field, while validation, `assertValidApplicationGraph`, and typed
  indexing reject it. Repair round 1 was bounded to the missing navigation/flow
  parse rejection and did not change this pre-existing parser behavior.
- Final independent release review of repair commit
  `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` and reconciled governance
  baseline `d6f8b994fef491ef5405fee44ae015f01de788e5` returned RELEASE PASS with
  no P0/P1/P2.
- Fresh Node `v22.11.0` acceptance verification passed 32/32 Graph tests,
  Graph typecheck, lint, build, and the bounded repair diff check. The PM
  records Task 1 `reviewed -> accepted`.
- Task 1 acceptance is limited to the pure Graph index. Typed manifests,
  serialized selections, safe assets, and Draft/Publish/compiler enforcement
  remain Tasks 2 through 6; the
  parent Foundation defect remains open.

Typed Binding Task 2 implementation, repair-review, and QA evidence is:

- Implementation commit `4458bfc7c8ffcaef29dfebb755d8399e12000198`
  (`feat: define typed capability bindings`) is a direct child of dispatch
  `bf77d90a5e2e7627ad806b7851462935b2add7e0` and changes exactly the four
  authorized Task 2 paths.
- Independent review of
  `bf77d90a5e2e7627ad806b7851462935b2add7e0..4458bfc7c8ffcaef29dfebb755d8399e12000198`
  found two P1s; Task 2 remained `implementing` at that review point.
- P1 1: strict field and non-field manifest declarations do not have exact
  own-key allowlists, and duplicate `fieldTypes` entries are accepted. Repair
  round 1 stays inside the existing Task 2 paths and writer ownership.
- Repair implementation commit
  `a7331df0ac6a6f54f82bf61a060607777bc06dc0` changes only
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Independent repair re-review of
  `4458bfc7c8ffcaef29dfebb755d8399e12000198..a7331df0ac6a6f54f82bf61a060607777bc06dc0`
  returned PASS with no P0/P1/P2. It confirmed exact strict-key allowlists,
  duplicate-`fieldTypes` rejection, preserved specific non-field rejection, and
  the exact two-path repair diff.
- Repair verification passed 45/45 focused contract tests and 188/188 full
  Capabilities tests, plus Capabilities typecheck, lint, build, and bounded diff
  checks.
- Architecture amendment commit `36317bf` finalized Task 3 ownership. The PM
  reconciles the clean implementation, verification, bounded diff, and passing
  independent re-review as `implementing -> ready_for_qa`.
- Independent behavioral QA then passed 45/45 focused typed contract tests and
  188/188 full Capabilities tests, plus Capabilities typecheck, lint, and build.
  Strict public-package probes and bounded scope checks also passed.
- QA confirmed the implementation stayed inside Task 2's exact four
  Capabilities paths and the repair stayed inside its exact two-path subset.
  The PM previously recorded `ready_for_qa -> reviewed`.
- Independent release review then returned FAIL with one P1. Strict validation
  and canonical selection could read inherited schema constraints or an
  inherited binding `fieldKey`, allowing prototype-backed data to influence
  the canonical binding value persisted in a lock. The prior task-review and
  QA evidence remains historical and cannot support acceptance while this
  finding is open. The PM records `reviewed -> implementing` for repair round 2.
- Repair implementation commit
  `565c64c5e79799261f8dc72c7e0da298fef4742d`
  (`fix: reject prototype-backed capability bindings`) changes only
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`. It adds
  plain-record/exact-own-key enforcement and focused regressions for inherited
  field-binding and schema values.
- Fresh local Node `v22.11.0` focused verification passed 47/47 tests across
  `typed-binding-contract.test.ts` and `composition-contract.test.ts`. This is
  repair-round-2 implementation evidence only.
- Independent task re-review of repair round 2 returned FAIL. Required
  `ownerBinding` and `fieldTypes` could still be satisfied through inherited
  values, optional `fieldRequired` and `fieldUnique` constraints were not
  governed solely by own-property presence, and the unknown-key guard did not
  reject an empty-string own key.
- Repair round 3 remains owned by **Typed Manifest Contract Integration** under
  the unchanged **Capability Binding Contract**. Its exact repair paths remain
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Repair implementation commit
  `00ac760c54f353f6ae242f92a5dd4809791cd633`
  (`fix: require own strict binding constraints`) requires own
  `ownerBinding`/`fieldTypes`, evaluates optional field constraints only when
  they are own properties, and rejects an empty-string unknown own key. New
  focused regressions cover `Object.prototype` pollution and the empty key.
- Fresh local Node `v22.11.0` implementation verification passed 49/49 tests
  across `typed-binding-contract.test.ts` and `composition-contract.test.ts`,
  plus Capabilities typecheck and lint. The commit changes exactly the two
  repair paths above.
- Independent repair-round-3 task review returned PASS with no P0/P1/P2. It
  passed 29/29 `typed-binding-contract.test.ts` tests and 20/20
  `composition-contract.test.ts` tests, verified the own-property and empty-key
  regressions, and confirmed the exact two-path diff.
- The PM reconciled the bounded implementation, fresh checks, and clean task
  review as `implementing -> ready_for_qa`.
- Independent repair-round-3 behavioral QA returned PASS. It passed 49/49
  focused tests, 192/192 full Capabilities tests, Capabilities typecheck, lint,
  and build, 180/180 Compiler tests, and the adversarial compiled probe.
- The PM previously reconciled that passing QA evidence as
  `ready_for_qa -> reviewed`.
- Independent release review then returned FAIL with two P1s. First,
  accessor-backed binding values could return one value during validation and
  another before canonicalization, so lock bytes could diverge from the value
  that passed validation. Second, strict parameter declarations could obtain
  `key`, `type`, and `required` through their prototype rather than exact own
  data, allowing inherited state to influence the strict contract.
- The prior repair-round-3 task-review and QA evidence remains historical and
  cannot support acceptance while these findings await independent repair
  review. The PM records `reviewed -> implementing` for repair round 4.
- Repair commit `b85dbda063fe6fa6db3b712f5891b013285e0356`
  (`fix: snapshot strict composition inputs`) changes only
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`. It snapshots
  exact own, enumerable data records; rejects accessor-backed and inherited
  strict inputs; normalizes binding values once; and uses that immutable
  snapshot for both validation and canonical selection.
- Fresh engineer verification passed 195/195 Capabilities tests plus
  Capabilities typecheck, lint, and build. Compiler regression verification
  passed 180/180 tests plus Compiler typecheck and lint. The bounded diff is
  exactly the same two-path repair subset above.
- This is repair implementation evidence only. Independent task review of
  `b85dbda063fe6fa6db3b712f5891b013285e0356` returned FAIL with one new P1:
  `validateCapabilityBindingSchema` and `validateBindings` independently read
  and snapshot `manifest.parameters`, allowing a getter-backed manifest to
  return different strict parameter schemas between the two stages.
- The original two release P1 repairs and engineer checks remain historical
  implementation evidence, but `b85dbda063fe6fa6db3b712f5891b013285e0356`
  cannot advance to QA. Independent reproduction showed the remaining witness
  belongs to the shared immutable resolution-input boundary. Task 2A is now
  independently accepted, and Task 2 remained `implementing` with its local
  repair and review gates stopped until the 2026-08-06 Stage 0 reconciliation
  determined the remaining gates and recorded Task 2 `reviewed -> accepted`
  at `0dbe0cf`.
- P1 2: `fieldKey` can exist in the Capabilities binding type but cannot persist
  through the strict `ApplicationGraphV1` composition-binding schema, which
  accepts only `{ graphSymbol }`.
- Accepted ADR-0007 and the synchronized design/plan/ledger amendment route the
  second finding to new Task 3. Task 2 remains inside its four Capabilities
  paths, Task 3 remains `planned` until Tasks 2 and 2A are accepted, and this
  update authorizes no Graph implementation.

Commercial Capability Foundation Task 1 is accepted and frozen. Its verified
`1.0.0` identities are `core.identity-context`, `core.location-context`,
`commerce.line-configuration`, and `commerce.inventory-ledger`; their physical
package, evidence-digest, verified-lock, and Publish-boundary contracts remain
unchanged.

Commercial Capability Foundation Task 2 completed two bounded fix rounds
within its exact five paths:

- Initial implementation `35aa96e` composed the two profile recipes. Fix round
  1, `ed3c2ba`, added configurable-line PolicyModel permissions, exact provider
  ownership, and complete cross-profile output assertions.
- The first scoped re-review found one remaining P1 in notification-provider
  coverage. Fix round 2, `ac43247`, added that ownership and an exact
  expected-effect-union assertion.
- Scoped re-review of `35aa96e + ed3c2ba + ac43247` returned PASS with all
  findings addressed and no P0/P1.
- Fresh Node `v22.11.0` verification passed 107/107 focused tests across
  `capability-registry`, `restaurant-profile`, and
  `commercial-profile-composition`; Capabilities typecheck and formatting also
  passed.
- Subsequent release review found four P1 semantic defects not covered by that
  scoped evidence. The earlier task-review and verification results remain
  historical evidence only; they do not support QA or acceptance while these
  findings are open.
- Fix round 3, `e61e790`, stayed inside the same exact five paths and closed all
  four findings:
  1. Simple Ecommerce now uses coherent `shopper` and `merchant` roles across
     bindings, permissions, and fulfillment.
  2. Composition now enforces fail-closed PolicyModel requirements for all four
     Foundation packages in both profiles.
  3. Restaurant stock movements now require location scope, a unique
     idempotency key/index, and item, order, and location relations, with
     adversarial validation.
  4. Production composition now admits only the three declared inventory
     co-provider effects and rejects every other overlap through the full
     profile entry points.
- Independent scoped re-review approved the repair with all four original P1s
  addressed and no P0/P1. Fresh Node `v22.11.0` verification passed 126/126
  focused tests across the three Task 2 suites; Capabilities typecheck and
  formatting also passed.
- Independent re-QA of the four-commit set passed 145/145 focused Task 2 tests
  and 152/152 full Capabilities tests. Build, typecheck, formatting, bounded
  diff checks, and direct checks of the four fix-round-3 categories passed.
  Re-QA nevertheless returned FAIL with one P1: those green suites do not prove
  Restaurant semantic rejection on the active default composition path.
- Fix round 4, `bf0b16f`, stayed inside two of the same exact five paths and
  closed that P1:
  - public `composeCapabilityDraft` now applies package- and binding-derived
    inventory-ledger semantic validation after composition resolution and
    symbol validation;
  - the validator is bounded by selection of `commerce.inventory-ledger`,
    derives movement and location entities from its bindings, and contains no
    profile-name or package-version dispatch; and
  - active `composeDefaultCapabilityDraft -> composeCapabilityDraft`
    regressions reject a non-unique idempotency key, a missing unique
    idempotency index, and a missing movement-to-location relation.
- Independent scoped re-review approved the repair with no P0/P1. Fresh Node
  `v22.11.0` verification passed all 155 Capabilities tests, including 28/28
  commercial-profile-composition tests; build, typecheck, and formatting also
  passed.
- Second independent re-QA then passed 148/148 focused Task 2 tests and 155/155
  full Capabilities tests. Build, typecheck, formatting, exact five-path diff
  checks, 56 remove-one-permission cases, the three active ledger mutations,
  no-ledger composition, and provider-overlap rejection all passed with no
  P0/P1/P2 demonstrated.
- Final release review nevertheless returned FAIL with one P1: the active
  generic validator still accepts inventory-ledger relations with a missing or
  wrong location source field and accepts missing catalog or order provenance
  relations. The green re-QA evidence does not justify acceptance while that
  public-boundary gap remains open.
- Final fix round 5, `6433940`, stayed inside two of the same exact five paths
  and closed that P1:
  - public inventory-provenance validation resolves movement, location,
    catalog, and order targets from the selected package's exact bindings;
  - it requires exactly one `many-to-one` relation to each target, an explicit
    declared string source field, required location/catalog fields, and
    distinct source fields; and
  - public-boundary tests reject missing, wrong, or reused relation fields and
    missing catalog or order relations while preserving no-ledger composition.
- Simple Ecommerce now includes the bound stock-movement-to-order relation via
  `orderId`. No profile-name, package-version, or provenance-field-name
  dispatch was introduced.
- Final scoped re-review approved the repair with no P0/P1 and the frozen scope
  intact. Fresh Node `v22.11.0` verification passed all 162 Capabilities tests,
  including 35/35 commercial-profile-composition tests; build, typecheck,
  formatting, and repair diff checks also passed.
- Final independent QA then passed 155/155 focused Task 2 tests and 162/162 full
  Capabilities tests. Build, typecheck, formatting, exact five-path diff checks,
  56 permission removals, inventory provenance mutations, no-ledger
  composition, and exact provider-overlap checks all passed with no P0/P1/P2
  demonstrated.
- Final release review nevertheless returned FAIL with one P1. Direct
  public-package probes proved that composition accepts both
  `core.location-context.locationCodeField = graph.domain.price` and
  `commerce.inventory-ledger.stockField = graph.domain.price`. The final QA
  evidence remains historical but cannot support acceptance because it did not
  exercise wrong-entity or wrong-type field substitutions.

The complete External Capability Intake project is accepted and frozen. Its
Task 6 writer record is
[`acceptance/external-capability-intake.md`](acceptance/external-capability-intake.md).
On Node `v22.11.0`, it records:

- A fixture-only CLI preflight of exactly 43 portfolio sources and 108 demand
  signals: 19 independent requested results, 24 independent policy-only
  blocks, stable redacted repeat output, no Candidate creation, and exact
  run-owned cleanup.
- Release-boundary regressions that reject Candidate artifacts at Golden,
  Graph, and compiler entry points; reject Golden/Graph/compiler/generated/
  runtime/provider/approval/copy-execution fields; and preserve package-root
  importer isolation.
- Independent re-QA after document repair `0b558fc` passed; PM ledger
  `77b4062` moved Task 6 `ready_for_qa -> reviewed`. Release review against
  `77b4062` then found two P2/no-P0/P1: the concurrent real
  directory-replacement race exceeded Vitest's 5-second default, and the prior
  documents were stale at `ready_for_qa`.
- Controller repair authorization `a9867b8` led to implementation commits
  `4924ec0 + dc6ca19`, which passed independent task review with no P0/P1/P2.
  PM ledger `43913ae` then moved Task 6 `implementing -> ready_for_qa`.
- Fresh re-QA at `43913ae` concurrently passed External Intake 392/392, Intake
  CLI 56/56, Graph 28/28, Capabilities 123/123, and Compiler 180/180. The
  directory and junction races completed in 6,361 ms and 3,688 ms.
- A serial Intake CLI run passed 56/56 with those races at 1,941 ms and 1,858
  ms; focused release-boundary and bulk-intake tests passed 3/3 and 1/1. All
  five affected typecheck/lint gates, targeted Prettier, `git diff --check`,
  and clean-worktree verification passed.

## Active work

- Typed Binding Task 1 is `accepted` and frozen under its pure Application
  Graph Type System contract. Its deferred parser limitation remains recorded.
- Typed Binding Task 2 is `accepted` under the accepted ADR, design, plan,
  and Task 1 dependency after the 2026-08-06 reconciliation review,
  behavioral QA, release review, and fresh verification passes at
  Target-Commit `0dbe0cf7959e39306bdd4693bef5402a2a2b1dec`. The
  implementation owner of record remains Typed Manifest Contract Integration
  and the contract owner remains Capability Binding Contract.
- Task 2's exact allowed paths are:
  `packages/capabilities/src/assets/contract.ts`,
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/test/composition-contract.test.ts`, and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Repair round 1 commit `a7331df0ac6a6f54f82bf61a060607777bc06dc0`
  and its task-review/QA evidence remain historical after release review found
  the prototype-backed binding-lock P1.
- Repair round 2 commit `565c64c5e79799261f8dc72c7e0da298fef4742d`
  remains inside the exact two-path repair boundary, but independent task
  re-review returned FAIL on exact own-property enforcement.
- Repair round 3 commit `00ac760c54f353f6ae242f92a5dd4809791cd633`
  changes only `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`. Fresh local
  verification passed 49/49 focused tests, Capabilities typecheck, and
  Capabilities lint. Independent task review passed with no P0/P1/P2 after
  29/29 typed-binding and 20/20 composition tests. Independent behavioral QA
  then returned PASS after 49/49 focused tests, 192/192 full Capabilities
  tests, Capabilities typecheck/lint/build, 180/180 Compiler tests, and the
  adversarial compiled probe. Release review subsequently failed with the two
  accessor/prototype P1s recorded above, so this evidence is historical.
- Repair round 4 commit `b85dbda063fe6fa6db3b712f5891b013285e0356`
  changes the same exact two paths. It replaces repeated reads of caller-owned
  strict inputs with exact own-enumerable data snapshots and normalized
  binding values shared by validation and canonical selection. Fresh engineer
  verification passed 195/195 Capabilities tests, Capabilities typecheck,
  lint, and build, plus 180/180 Compiler tests and Compiler typecheck/lint.
  Independent task review then returned FAIL: separate reads of
  `manifest.parameters` in schema validation and binding validation allow a
  getter to supply different strict parameter schemas between stages. Repair
  round 4 remained `implementing`, and accepted ADR-0008 stopped further local
  Task 2 repair. Task 2A is accepted. On 2026-08-06 the compiler-target-plugin
  Goal's Stage 0 reconciled Task 2 with accepted Task 2A using fresh evidence:
  the focused Task 2/2A suites passed 80/80 (34 typed-binding-contract, 46
  composition-contract), including the dedicated getter-backed
  `manifest.parameters` witness that rejects with zero getter invocations,
  and the full Capabilities (279/279) and Compiler (237/237) suites passed on
  the `feat/compiler-target-plugin-kernel` branch. The accepted Task 2A
  immutable resolution boundary closes the repeated-read P1: schema and
  binding validation now consume the same frozen Factory-owned snapshot.
  The reconciliation's Target-Commit reference moved from `fa57d52` to
  `0dbe0cf7959e39306bdd4693bef5402a2a2b1dec` when the repair added two P2
  regression tests to `packages/capabilities/test/typed-binding-contract.test.ts`
  only (+25 lines) and changed the branch tip; the reviewer confirmed both are
  RED-sensitive. Fresh independent task review of the remote-reachable
  Target-Commit `0dbe0cf` returned TASK_REVIEW_PASS with SPEC PASS, QUALITY
  PASS, and no P0/P1/P2, re-running the focused suites at 83/83 (37
  typed-binding-contract, 46 composition-contract) and the full Capabilities
  suite at 282/282 (20 files). The PM records Task 2 `implementing ->
ready_for_qa`. Independent behavioral QA against `0dbe0cf` then returned
  PASS with no P0/P1/P2 (read-only QA context, Node `v22.11.0`, product code
  byte-identical to `0dbe0cf` at HEAD `f530306`): focused suites 83/83,
  full Capabilities 282/282 (20 files) and Compiler 237/237 (13 files),
  Capabilities typecheck/lint/build, adversarial name-filtered probes
  including the zero-getter counter assertion, and the single-digest
  determinism probe across 100 resolutions of the largest default
  composition (18 selections). Scope checks confirmed the same
  `typed-binding-contract.test.ts` +25-line diff at `0dbe0cf` and a
  governance-docs-only diff to HEAD. The PM records Task 2 `ready_for_qa ->
reviewed`. Fresh independent release review at the remote-reachable
  Target-Commit `0dbe0cf` then returned RELEASE PASS with no P0/P1/P2:
  `0dbe0cf` changed only
  `packages/capabilities/test/typed-binding-contract.test.ts` (+25 lines),
  inside both Task 2's four authorized paths and Task 2A's five-path boundary;
  the reconciliation range `fa57d52~1..0dbe0cf` is exactly three files
  (typed-binding ledger, project status, the authorized test path); product
  code is byte-identical between `0dbe0cf` and HEAD (branch tip `2cc799f`,
  governance docs only); there was no Graph serialization, Published revision,
  lock, digest, or Draft -> Publish -> Compilation change and
  ADR-0006/0007/0008 remain unchanged; no credentials, raw prompts or
  responses, or local URLs appear in the range; history is linear with no
  force-push or rewrite; `git diff --check` is clean; the worktree is clean.
  Fresh safe re-run passed the focused suites 83/83 (37 typed-binding-contract,
  46 composition-contract) including the single-digest determinism probe. The
  PM records Task 2 `reviewed -> accepted` citing `0dbe0cf`. Task 2 acceptance
  is limited to the typed manifest and binding contracts; Typed Binding Graph
  Tasks 3 through 7 remain `planned` and blocked, and Commercial Foundation
  Task 2 remains `implementing` and escalated. Task 2 acceptance unblocks
  Stage 1 of the compiler-target-plugin-kernel Goal but does not accept that
  Goal.
- Repair round 4 may not change physical package roots and registrations,
  profile recipes, public Draft composition, Publish, compiler, Workbench,
  lifecycle, historical bindings, or introduce
  Profile/package/version/field-name dispatch.
- Typed Binding Task 2A, **immutable composition resolution boundary**, is
  `accepted` after repair round 2 under the **Capability Composition
  Resolution Boundary**
  contract owner and accepted ADR-0008. Its bounded writer is **Immutable
  Composition Resolution Integration**. Its exact allowed paths are:
  `packages/capabilities/src/node.ts`,
  `packages/capabilities/src/index.ts`,
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/test/composition-contract.test.ts`, and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Independent review of plan Task 3 commit
  `73accc24a68d55308d127717e36cd63130024f3e` returned FAIL with two P1s.
  `createVerifiedCapabilityCompositionLock` and `composeCapabilityDraft` read
  caller-owned selections or locks before capture, allowing a self-redefining
  accessor to make verification or provider-overlap checks observe different
  assets from resolution or lock creation. Compiled parameter- and
  binding-schema maps also retain runtime-mutable schema values.
- Controller-authorized repair round 1 requires capture before every public
  package-verification, provider-overlap, or other selection/lock read, reuse of
  that same owned snapshot downstream, and deep runtime immutability for every
  compiled schema value, including nested records and arrays. Governance commit
  `76274e304e1d09f58b847bcfd4c80e3db1072e28` formally amended the scope to
  those exact five paths.
- Repair commit `a09d459077f80fa82161df928137b1f2052a75bb` changes exactly the
  five authorized paths. Independent repair review returned SPEC PASS and
  QUALITY PASS with no P0/P1/P2 and no remaining task-review finding. The PM
  records `implementing -> ready_for_qa` at that task-review gate.
- Independent behavioral QA against `a09d459` returned PASS with no P0/P1/P2.
  Capabilities passed 214/214 with its package checks, and Compiler passed
  180/180 with its package checks. All public accessor probes observed zero
  getter invocations and rejected with the capture error; the valid frozen
  digest remained exact. The largest registered 13-selection composition
  resolved 1,000 times with exactly one digest and p95 2.708 ms, below the 20 ms
  ceiling. The exact five-path scope and diff checks were clean.
- Host default Node PATH is unusable because the configured NVM symlink is
  absent. Node v22.11.0 was available and every QA command used a process-local
  PATH to that binary; QA made no machine or persistent environment change.
- The PM previously reconciled QA and its environment limitation as
  `ready_for_qa -> reviewed`. Independent release review of `a09d459` then
  returned FAIL with one P1: `resolveCapabilityAssetLock`,
  `assertGoldenCapabilityAssetLocks`, `assertGoldenCapabilityComposition`,
  `composeDefaultCapabilityDraft`, and `composeProfileDraft` read caller-owned
  input or context before descriptor capture. Direct probes observed getter
  invocation, and a self-changing `profile` getter produced incoherent output.
- The Controller authorizes repair round 2 inside the same exact five paths.
  Every exported composition/lock public entry point must capture before any
  input or context observation and consume only the owned snapshot afterward.
  Exhaustive tests must prove zero getter invocations and self-changing-accessor
  coherence across all five wrappers. The PM records
  `reviewed -> implementing`; prior task-review and QA evidence remains
  historical. At that transition, fresh task review, QA, release review, and
  acceptance verification were required.
- Repair round 2 commit `40096847c4a4b28c3d02fd33d01805d46da0bded`
  changes only `packages/capabilities/src/composition.ts`,
  `packages/capabilities/src/index.ts`, and
  `packages/capabilities/test/composition-contract.test.ts`, a subset of the
  unchanged five authorized paths. Independent repair-round-2 review returned
  SPEC PASS and QUALITY PASS with no P0/P1/P2 after auditing all eight exported
  structured composition/lock boundaries and their self-redefining accessor
  and alias probes. The PM previously recorded `implementing -> ready_for_qa`.
  Prior QA against `a09d459` remains historical. Fresh repair-round-2
  behavioral QA against `40096847c4a4b28c3d02fd33d01805d46da0bded`
  returned PASS with no P0/P1/P2. Capabilities passed 219/219 and Compiler
  passed 180/180; all eight public boundaries rejected with the capture error
  and zero getter invocations; alias, server-lock, deep-freeze, and digest
  checks passed; and the largest registered composition retained one digest at
  p95 2.884 ms. The PM previously recorded `ready_for_qa -> reviewed`.
- Final independent release review at governance commit
  `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` against source commit
  `40096847c4a4b28c3d02fd33d01805d46da0bded` returned RELEASE PASS with no
  P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed 219/219
  Capabilities tests, 180/180 Compiler tests, and 76/76 focused tests. The
  1,000-resolution probe retained one digest at p95 2.554 ms, with no
  source/governance drift or secrets. The PM records `reviewed -> accepted`.
- Typed Binding Task 3 remains `planned` and blocked. Its Tasks 2 and 2A
  dependencies are accepted, but Graph Tasks 3 through 7 do not start on Task
  2 acceptance. It owns exactly:
  `packages/graph/src/model.ts`,
  `packages/graph/test/application-graph.test.ts`, and
  `packages/graph/test/browser-entry.test.ts`.
- Physical assets remain Task 4 and blocked until Task 3 is accepted. Tasks 5
  and 6 remain serially blocked on their preceding accepted task. Task 7
  remains `planned` until Tasks 1, 2, 2A, and 3 through 6 are all `accepted`.
- Commercial Foundation Task 2 remains `implementing` and escalated. No sixth
  repair is authorized; its previous exact five-path implementation boundary
  remains historical release evidence only. It cannot resume acceptance until
  Typed Binding Task 7 is accepted and the PM reconciles the parent ledger.
- This PM transition changes only the typed-binding ledger and project status.
  It modifies no implementation code, source manifest, physical package,
  shared contract, or existing Commercial Foundation ledger.

## Blocked decisions

- No Candidate has been approved, promoted, registered as Golden, linked to a
  Graph, provided runtime authority, or copied into Factory-owned code.
- The Task 6 fixture-only clarification excludes the plan's former public-source
  smoke probe. No public network, repository resolution/download, vendor
  contact, credentials, or external commitment is authorized by this slice.
- This slice is fixture-only and provides no public-network or live-service
  evidence. Acceptance grants no promotion, approval, Golden, Graph, compiler,
  generated-runtime, provider, or source-copy authority.
- Foundation Tasks 3 and 4 are blocked on accepted Task 2 profile composition
  metadata. Task 2 is back in `implementing` and escalated; neither downstream
  task is dispatched by this update.
- Typed Binding Task 2 is `implementing` in repair round 4 after independent
  release review found two P1s in accessor-backed binding canonicalization and
  prototype-supplied strict parameters. Commit
  `b85dbda063fe6fa6db3b712f5891b013285e0356` is implementation evidence only;
  independent task review failed on the separate `manifest.parameters`
  snapshot gap. Accepted ADR-0008 supersedes further local repair with Task 2A,
  now `accepted` after repair round 2 at commit
  `40096847c4a4b28c3d02fd33d01805d46da0bded` passed independent SPEC and
  QUALITY review with no P0/P1/P2. Release review of amended repair commit
  `a09d459` and its earlier QA remain historical. Fresh repair-round-2 QA
  against `40096847c4a4b28c3d02fd33d01805d46da0bded` passed with no P0/P1/P2,
  219/219 Capabilities tests, 180/180 Compiler tests, zero-getter capture-error
  rejection at all eight public boundaries, passing alias/server-lock/
  deep-freeze/digest checks, and one largest-composition digest at p95 2.884 ms.
  Final release review and fresh acceptance verification then passed against
  source `40096847c4a4b28c3d02fd33d01805d46da0bded` and governance
  `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` with no P0/P1/P2; acceptance
  verification passed 219/219 Capabilities, 180/180 Compiler, and 76/76 focused
  tests, plus one digest across 1,000 resolutions at p95 2.554 ms and clean
  drift/secret checks. The PM records `reviewed -> accepted` for Task 2A. This
  did not advance Task 2 at that transition; the 2026-08-06 Stage 0
  reconciliation of the compiler-target-plugin-kernel Goal subsequently
  recorded Task 2 `reviewed -> accepted` at `0dbe0cf`, limited to the typed
  manifest and binding contracts. Typed Binding Graph Tasks 3 through 7 remain
  `planned` and blocked; Commercial Foundation Task 2 remains escalated.
  Graph Task 3 remains `planned` and blocked on Task 2 acceptance; its Task 2A
  dependency is now accepted.
  It, not either Capabilities task, owns owner-aware Graph persistence. Tasks 4
  through 6 cannot overlap or start before the preceding task is `accepted`.
- Physical asset Task 4 is additionally blocked on accepted Task 3 serialized
  Graph round-trip, structural validation, hash, and browser evidence.
- Typed Binding Task 7 cannot start before Tasks 1, 2, 2A, and 3 through 6 are all
  `accepted`. Its acceptance does not automatically accept Commercial
  Foundation Task 2; the PM must reconcile that parent state separately.
- No sixth Commercial Foundation Task 2 repair is authorized. ADR-0006 governs
  the dedicated hardening project; any change to its accepted contract,
  dependency chain, or exact task paths stops downstream work for PM and
  architecture review.

## Risks and limitations

- Fixture evidence proves deterministic local behavior only; it does not prove
  availability or behavior of a live source, scanner, provider, or vendor.
- The repository-local CLI retains the accepted single-purpose `process.chdir`
  limitation for promotion-packet output anchoring; it is unchanged here.
- The preflight creates intake requests only. It cannot make a licence decision,
  promote a Candidate, or execute a source copy.
- Task 2 must not confuse accepted physical Foundation contracts with completed
  Restaurant or Ecommerce product behavior. Cross-profile bindings and
  deterministic recipe evidence are the gate.
- Task 2 intentionally records `commerce.inventory` and
  `commerce.inventory-ledger` as co-providers of `inventory.reserve`,
  `inventory.release`, and `inventory.decrement`. Fix round 3 now rejects the
  formerly undeclared `inventory.adjust` overlap, but future Task 3 must still
  define and prove lock-derived runtime resolution that cannot double-execute
  any of the three intentional stock movements or select behavior by profile
  name. This is a downstream risk, not authority to start Task 3.
- The flattened graph-symbol namespace allows an existing field symbol from the
  wrong entity or semantic type to satisfy a Foundation binding. Until Typed
  Binding Tasks 1, 2, 2A, and 3 through 7 are accepted, immutable locks can
  direct location or inventory behavior at unrelated data, including price
  fields.
- Task 1 provides the pure typed index but does not define typed manifest
  requirements, serialize owner-aware selections, publish safe assets, or
  enforce binding semantics at Draft, Publish, or compiler admission. Tasks 2
  through 6 are still required before recipe migration and parent closure.
- Task 2 repair round 1 closes the unexpected-own-key and duplicate-`fieldTypes`
  defects in implementation and task re-review, but its independent behavioral
  QA is historical after release review found that prototype-backed schema or
  binding values could influence lock canonicalization. Repair round 2 then
  failed independent task re-review because required and optional constraints
  were not fully own-property-bound and an empty-string own key escaped the
  unknown-key check. Repair round 3 is present inside the exact two-path repair
  boundary and passed independent task review with no P0/P1/P2. Behavioral QA
  then passed its focused, full Capabilities, compiler-regression, build-gate,
  and adversarial compiled-probe evidence, but release review then found that
  accessor-backed bindings could change between validation and
  canonicalization and that strict parameters could inherit their declaration.
  Repair round 4 commit `b85dbda063fe6fa6db3b712f5891b013285e0356`
  snapshots exact own-enumerable strict input data and passed fresh engineer
  package checks, but independent task review found a remaining time-of-check/
  time-of-use gap because `manifest.parameters` is fetched and snapshotted
  separately by schema validation and binding validation. A getter can return
  different parameter schemas between those stages. Independent reproduction
  expanded the risk to all caller-owned composition inputs. ADR-0008 assigns
  that boundary to Task 2A. Task 2A is accepted, and local Task 2 repair and
  review stayed stopped until the 2026-08-06 Stage 0 reconciliation
  determined the remaining gates and recorded Task 2 `reviewed -> accepted`
  at `0dbe0cf`.
- Task 2A plan Task 3 commit
  `73accc24a68d55308d127717e36cd63130024f3e` left public pre-capture reads and
  runtime-mutable compiled schema values. Governance amendment `76274e3`
  formalized the five-path repair, and repair commit
  `a09d459077f80fa82161df928137b1f2052a75bb` passed independent SPEC and
  QUALITY review with no P0/P1/P2. Independent behavioral QA also passed with
  no P0/P1/P2, 214/214 Capabilities tests, 180/180 Compiler tests, zero-getter
  capture rejection, exact digest compatibility, and one digest across the
  1,000-run performance probe at p95 2.708 ms. Release review then returned Task
  2A to `implementing` for repair round 2 after finding that five exported
  composition/lock wrappers still observe caller-owned inputs or context before
  capture. Direct probes invoked getters, and a changing profile getter
  produced incoherent output. The existing review and QA evidence is
  historical. Repair round 2
  commit `40096847c4a4b28c3d02fd33d01805d46da0bded` changes three of the five
  authorized paths and passed independent task review with SPEC PASS, QUALITY
  PASS, and no P0/P1/P2 after an audit of all eight exported structured
  composition/lock boundaries and self-redefining accessor/alias probes. Fresh
  behavioral QA against that commit passed with no P0/P1/P2: Capabilities
  passed 219/219, Compiler passed 180/180, every one of the eight public
  boundaries rejected with the capture error and zero getter invocations, and
  alias, server-lock, deep-freeze, digest, and largest-composition
  single-digest probes passed at p95 2.884 ms. Final release review then passed
  with no P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed
  219/219 Capabilities, 180/180 Compiler, and 76/76 focused tests, plus one
  digest across 1,000 resolutions at p95 2.554 ms and clean source/governance
  drift and secret checks. Task 2A is `accepted`; this grants no Profile,
  physical asset, Provider, Candidate Intake, or external source authority.
  The separate 2026-08-06 Stage 0 reconciliation then recorded Task 2
  `reviewed -> accepted` at `0dbe0cf`; Typed Binding Graph Tasks 3 through 7
  remain `planned` and blocked, and Commercial Foundation Task 2 remains
  escalated.
- Owner-aware field bindings cannot currently survive the Application Graph
  schema. ADR-0007 assigns the repair to Task 3, but the risk remains until that
  task passes independent review, QA, release review, and fresh verification.
  No downstream Draft, Publish, or compiler gate may assume the serialized
  `{ graphSymbol, fieldKey }` value exists before then.
- Repair round 1 rejects duplicate navigation-entry and flow IDs and makes
  `indexBy` fail closed. Independent re-QA, release review, and fresh
  verification passed; Task 1 is accepted.
- `parseApplicationGraph` still accepts a duplicate domain field even though
  validation, assertion, and typed indexing reject it. This is a documented
  deferred limitation outside the bounded navigation/flow repair.
- New safe versions must be created and digest-verified; accepted historical
  package roots and locks cannot be edited in place. Current recipes must
  migrate through a new Draft revision.
- Publish and compiler admission must become Graph-aware without restoring an
  unsafe lock-only overload or allowing compiler output before validation.

## Next smallest valuable slice

Task 2's repeated-read P1 is closed by the accepted Task 2A boundary, and
independent task review, behavioral QA, release review, and fresh verification
all passed at the remote-reachable Target-Commit
`0dbe0cf7959e39306bdd4693bef5402a2a2b1dec` with no P0/P1/P2. The PM records
Task 2 `reviewed -> accepted`. Task 2 acceptance is limited to the typed
manifest and binding contracts; Typed Binding Graph Tasks 3 through 7 remain
`planned` and blocked, Commercial Foundation Task 2 remains `implementing`
and escalated, and its Tasks 3 and 4 remain `planned` and blocked. Task 2
acceptance unblocked Stage 1 of the compiler-target-plugin-kernel Goal
(`feat(compiler): add target plugin kernel`) but does not accept that Goal.
Stage 1's final independent task review passed at the remote-reachable branch
tip `249fc8590f29152cc09456e8733e7a8a64d58fd9` (TASK_REVIEW_PASS, SPEC PASS,
QUALITY PASS, no P0/P1/P2, clean tree). The kernel was hardened after the
earlier `197270e`-based gate records (repair `197270e` closed the three
`assertSerializablePlan` P2s from the `5a692fe` review; QA then surfaced two
informational serializability edges): `bc09019` enforced descriptor-level
checks, `8921103`/`ab6186d` fixed dense-array rejection with a recorded
governance deviation (both were pushed while still failing the same two
focused tests; no history was rewritten), `d024f74` required dense
plain-data arrays, `40e941b` extracted `requireDensePlainDataArray`
(`assertSerializablePlan` now 53 lines, under the 60-line guidance), and
`249fc85` recorded the repair sequence and the deviation. Fresh evidence at
the tip: focused kernel suites 55/55 (23 target-plugin + 15 target-registry

- 17 generated-files), full Compiler suite 292/292 serial (16 files),
  Compiler typecheck, Prettier lint, and `git diff --check` clean, worktree
  clean, all 38 prior facade exports preserved plus 12 kernel symbols.
  Independent behavioral QA then passed at `249fc85` (QA_PASS, no P0/P1/P2;
  independent read-only QA context, Node `v22.11.0`, product code
  byte-identical to `249fc85` at HEAD `8f95018`): focused kernel suites 55/55
  (23 target-plugin + 15 target-registry + 17 generated-files), full Compiler
  suite 292/292 serial (16 files), Compiler typecheck/lint/build,
  compiler-worker 81/81 plus typecheck, and compilation-plan facade suite
  51/51; adversarial symbol-keyed (records and arrays), accessor-backed
  (records and array indices, zero getter invocations), non-enumerable,
  `toJSON` (enumerable, non-enumerable, inherited), sparse-array, extra-own-
  key, array-rooted-cycle, shared non-cyclic acceptance, bigint, duplicate-
  path, nondeterminism, traversal-class, and validation-failure probes all
  pass with precise messages; the two previously-recorded informational edges
  are closed at the hardened tree, and the deep-nesting recursion edge remains
  informational only. Independent release review at `249fc85` then returned
  RELEASE PASS with no P0/P1/P2 (independent read-only context, Node
  `v22.11.0`): the kernel is purely additive with the Draft -> Publish ->
  immutable Compilation lifecycle, Published Graph immutability, and
  capability-lock contracts untouched; the facade preserves all 38 prior
  exports plus 12 kernel symbols; no dependency changes; no profile-name
  branching; the hardening-range provenance matches the ledger deviation
  record (linear history, no amend/force-push); no credentials, raw prompts or
  responses, or URLs in the reviewed range; fresh re-runs at byte-identical
  HEAD passed focused 55/55, facade compilation-plan 51/51, full compiler
  serial 292/292, and typecheck and Prettier; `249fc85` is remote-reachable
  from `origin/feat/compiler-target-plugin-kernel` and the worktree is clean.
  The PM records Stage 1 `reviewed -> accepted` citing `249fc85`. Stage 1
  acceptance covers the plugin kernel (contract, registry, generated-file
  rules, facade re-exports) with the serializability hardening sequence.
  Stage 2 (documentation target parity migration) is implemented at
  Target-Commit `3fae49480d5e481fd5ed0916f0a44e5ebcc9c9c5` and its iteration
  state is `ready_for_qa`: independent task review returned TASK_REVIEW_PASS
  (SPEC PASS, QUALITY PASS, no P0/P1/P2) at the clean tree exactly at
  `3fae494`, after the two P2s from the initial `3f57542` review were closed —
  `buildDocumentationPlan` split into
  `projectDocumentationEndpoints`/`projectDocumentationEntitySections`/
  `projectDocumentationRelationRows` (behavior-neutral, 20/20 frozen digests
  still reproduced), and the fixture-session profile narrative corrected to
  Expense Approval and Simple Ecommerce (retail-counter and grocery-pickup use
  `x-factory-role`; Restaurant uses the runtime override). Fresh evidence at
  `3fae494`: documentation parity + validation tests 11/11 (5 profiles x 4
  frozen SHA-256 vectors + determinism + 5 fail-closed cases), full Compiler
  suite 303/303 serial (17 files), typecheck, Prettier lint, and
  `git diff --check` clean. The migration adds
  `packages/compiler/src/targets/documentation/target.ts`
  (`CompilerTargetPluginV1<DocumentationPlanV1>`), the frozen-digest parity
  test, facade delegation of the four docs files through the facade-owned
  registry with the six centralized renderers removed (134 lines), and the
  exported `buildCompilationInput` resolver. Typed Binding Graph Tasks 3-7
  remain `planned` and blocked, and Commercial Foundation Task 2 remains
  escalated. Independent behavioral QA then passed at `3fae494` (QA_PASS, no
  P0/P1/P2; independent read-only QA context, Node `v22.11.0`, product code
  byte-identical to `3fae494` at HEAD `423ab9e`): parity 11/11 focused (5
  profiles x 4 frozen legacy SHA-256 vectors + determinism + 5 fail-closed
  validation cases), byte-level probe confirmed `generateApplicationBundle`
  docs output byte-identical to the registry-run plugin output (8/8 files
  across simple-ecommerce and restaurant-ordering, digests equal the frozen
  vectors), full Compiler suite 303/303 serial (17 files), worker 81/81,
  compilation-plan facade suite 51/51, identity-policy-runtime 3/3, and
  typecheck/lint/build pass; scope `git show 3fae494` = 3 files and
  `git diff 249fc85..3fae494` = 5 files (index.ts, documentation target,
  parity test, two governance docs), no dependency changes, `git diff --check`
  clean, worktree clean. Informational edges (Restaurant eager context render
  plus lazy facade re-render, both pure and byte-identical; test-local fixture
  helper duplication) remain covered by the ledger residual risk. The PM
  records Stage 2 `ready_for_qa -> reviewed` citing `3fae494`. Independent
  release review at `3fae494` then returned RELEASE PASS with no P0/P1/P2
  (independent read-only context, Node `v22.11.0`): lifecycle untouched
  (Draft -> validated Published Graph -> immutable Compilation); facade export
  surface preserved exactly (only `buildCompilationInput` added);
  capability-lock contracts and contribution pipelines remain facade-owned; no
  profile-name branching (the target branches only on capability-key prefixes
  and composition-derived context); all 20 frozen SHA-256 vectors (5 profiles
  x 4 docs files) reproduce exactly; `target.ts` is 261 lines with every
  function under 60; no credentials, raw material, or URLs in the migration
  range (`249fc85..3fae494` = index.ts + documentation target + parity test +
  two governance docs); no dependency changes; tests recorded across the QA
  and release contexts (parity 11/11, full compiler serial 303/303, worker
  81/81, facade suite 51/51, identity-policy-runtime 3/3, typecheck/lint/build
  clean); `3fae494` remote-reachable, linear history with no amend/force-push,
  worktree clean. The PM records Stage 2 `reviewed -> accepted` citing
  `3fae494`. Stage 2 acceptance covers the documentation target migration
  (plugin, frozen-digest parity across all five Profiles, facade delegation,
  centralized renderers removed). Stage 3 (policy target parity migration) is
  implemented at Target-Commit `514081580ffdc172ef40935b73f7c2276739e35d` and
  its iteration state is `ready_for_qa`: independent task review returned
  TASK_REVIEW_PASS (SPEC PASS, QUALITY PASS, no P0/P1/P2) at the clean tree
  exactly at `5140815`, after repair commit `5140815` (bounded to
  `packages/compiler/test/policy-target-parity.test.ts`, +20/-3) closed the
  P2 from the initial `2ccc553` review — two malformed-validation branches
  untested (policy.csv trailing newline; policy.ts `newEnforcer`) — by making
  the malformed test table-driven with three cases, each asserting the
  malformed policy-file issue at its own path; re-review confirmed all three
  branches fire. Fresh evidence at `5140815`: policy parity + validation
  13/13 (5 profiles x 3 frozen SHA-256 vectors + determinism + 7 fail-closed
  cases), full Compiler suite 316/316 serial (18 files), typecheck, Prettier
  lint, and `git diff --check` clean. The migration adds
  `packages/compiler/src/targets/policy/target.ts` (`PolicyPlanV1`, key
  `casbin-policy`, distinct module model with `p.obj == "*"` preserved), the
  parity test (15 frozen vectors), and facade delegation of the three policy
  files via the facade-owned registry with `renderCasbinPolicy` and
  `renderPolicyModule` removed; `runtimeDefinition` and
  `lockedRuntimeHandlerEntity` were restored byte-identically after a
  deletion overrun (recorded in the ledger). Independent behavioral QA then
  passed at `5140815` (QA_PASS, no P0/P1/P2; independent read-only QA context,
  Node `v22.11.0`, product code byte-identical to `5140815` at HEAD
  `25ef916`): parity 13/13 focused (5 profiles x 3 frozen legacy SHA-256
  vectors + determinism + 7 fail-closed validation cases); byte-level probe
  confirmed `generateApplicationBundle` policy files byte-identical to the
  registry-run plugin output (15/15 bundle == plugin == frozen digest MATCH
  across all five profiles) plus two-render bundle determinism; full Compiler
  suite 316/316 serial (18 files); worker 81/81; compilation-plan facade suite
  51/51; restaurant-runtime 20/20 (asserts `api/policy/policy.csv` content);
  typecheck, lint, and build pass; the three malformed adversarial cases
  ("without matchers", "without a trailing newline", "without an enforcer")
  each assert `malformed.policy-file` at their own path, and
  missing/undeclared classes pass; `runtimeDefinition` and
  `lockedRuntimeHandlerEntity` are byte-identical to commit `4b5c6ab`;
  migration range `3fae494..5140815` = index.ts + policy target + parity test
- two governance docs, no dependency changes, `git diff --check` clean,
  worktree clean. The PM records Stage 3 `ready_for_qa -> reviewed` citing
  `5140815`. Independent release review at `5140815` then returned RELEASE
  PASS with no P0/P1/P2 (independent read-only context, Node `v22.11.0`):
  lifecycle unchanged; facade public surface 20/20 exports byte-identical;
  the three policy files byte-identical (parity); the policy module's distinct
  internal model (`p.obj == "*"`) preserved; no profile-name branching;
  `runtimeDefinition` and `lockedRuntimeHandlerEntity` byte-identical to
  `4b5c6ab`; no credentials, raw material, or URLs in the migration range
  (`3fae494..5140815` = index.ts + policy target + parity test + two
  governance docs); no dependency changes; tests recorded across the QA and
  release contexts (policy parity 13/13, full compiler serial 316/316, worker
  81/81, compilation-plan 51/51, restaurant-runtime 20/20, typecheck/lint/
  build clean); `5140815` remote-reachable, linear history with no
  force-push/amend, worktree clean, all gate records cite `5140815`. The PM
  records Stage 3 `reviewed -> accepted` citing `5140815`. Stage 3 acceptance
  covers the policy target migration (plugin with key `casbin-policy`, 15
  frozen digest vectors across all five Profiles, facade delegation,
  centralized renderers removed). Stage 4 (database target parity migration)
  is implemented at Target-Commit `76933ca7b7295a6ce053d1bfdc3dfa605aa8487f`
  and its iteration state is `ready_for_qa`: independent task review returned
  TASK_REVIEW_PASS (SPEC PASS, QUALITY PASS, no P0/P1/P2) at the clean tree
  exactly at `76933ca`, after the one P2 from the initial `35fa51d` review
  (ledger line-count inaccuracy, 667 vs actual 707) was corrected at
  `76933ca` (ledger-only, +5/-1), which also records the responsibility-based
  file-size exception (renderers moved verbatim; the parity gate justifies
  the cohesive exception, matching the design's "preserve cohesive logic"
  clause). Fresh evidence at `76933ca`: database parity + validation 13/13;
  full Compiler suite 329/329 serial (19 files); typecheck, Prettier lint,
  and `git diff --check` clean; code tree byte-identical to `35fa51d`
  (reviewed fully). The migration adds
  `packages/compiler/src/targets/database/target.ts` (707 lines,
  `DatabasePlanV1`, the nine legacy renderers moved byte-identically —
  verified by diff against `2e2753a` — private
  `toPascalCase`/`toCamelCase`/`hasCommerceCapabilities` copies, and
  fail-closed validation on missing/unexpected/malformed), the parity test
  (20 frozen vectors, 5 profiles x 4 paths), and facade delegation of the
  four database files via the facade-owned registry with the nine centralized
  renderers removed (facade diff +10/-572); the database
  package.json/Dockerfile/.dockerignore and `renderPrismaRecordStore` remain
  facade-owned. No migration bytes changed (exact parity), so no migration
  smoke was required per the design. Independent behavioral QA then passed at
  `76933ca` (QA_PASS, no P0/P1/P2; independent read-only QA context, Node
  `v22.11.0`, product code byte-identical to `76933ca` at HEAD `b6429a2`):
  parity 13/13 focused (5 profiles x 4 frozen legacy SHA-256 vectors +
  determinism + 7 fail-closed validation cases); byte-level spot check
  confirmed `generateApplicationBundle` database files byte-identical to the
  registry-run plugin output for restaurant-ordering and simple-ecommerce
  (30/30 PASS, triple agreement frozen == plugin == bundle); bundle
  deterministic across two renders; full Compiler suite 329/329 serial (19
  files); worker 81/81; compilation-plan 51/51; order-operations-runtime 9/9;
  money-pricing-runtime 4/4; restaurant-runtime 20/20; typecheck, lint, and
  build pass; all three malformed adversarial cases ("without" matcher) assert
  `malformed.database-file` at their own paths, and
  missing/undeclared/validation-failure classes pass; `76933ca` is ledger-only
  (+5/-1); migration range `5140815..76933ca` = index.ts (+10/-572) +
  database target (+707) + parity test + two governance docs; the nine moved
  renderers plus three private copies byte-identical to commit `2e2753a`
  (12/12 verified); no dependency changes; `git diff --check` clean; worktree
  clean. The PM records Stage 4 `ready_for_qa -> reviewed` citing `76933ca`.
  Independent release review at `76933ca` then returned RELEASE PASS with no
  P0/P1/P2 (independent read-only context, Node `v22.11.0`): lifecycle
  untouched; facade export surface byte-identical (13/13 named exports vs
  `2e2753a`); `renderPrismaRecordStore` and the database
  package.json/Dockerfile/.dockerignore remain facade-owned; the delegation
  replaces exactly the four legacy database file entries; no profile-name
  branching (zero profile string references in `target.ts`; Restaurant
  artifacts and package-owned fragments enter via the explicit plan context);
  verbatim-move proof — every one of the 404 unique removed lines appears
  verbatim in the target additions; the migration range `5140815..76933ca` is
  exactly 5 files with no credentials, URLs (except the legitimate repo
  remote reference), or raw material; digest vectors are evidence values
  only; fresh re-runs at byte-identical product code passed parity 13/13,
  full compiler serial 329/329 (19 files), worker 81/81, and
  typecheck/lint/`git diff --check`; `76933ca` remote-reachable, linear
  history, worktree clean, gate records consistent (task review PASS, QA
  PASS, `ready_for_qa -> reviewed` all citing `76933ca`). The PM records
  Stage 4 `reviewed -> accepted` citing `76933ca`. Stage 4 acceptance covers
  the database target migration (plugin with key `prisma-postgres`, 20 frozen
  digest vectors across all five Profiles, package-owned contribution
  fragments preserved, facade delegation, nine centralized renderers
  removed); this completes all three target migrations (documentation,
  policy, database). Stage 5 final acceptance is recorded in the ledger and
  the Goal is complete. The next smallest slice is the P0 Isolated Verifier,
  defined in `docs/superpowers/specs/2026-08-06-isolated-verifier-goal-design.md`,
  with its plan and PM ledger in
  `docs/superpowers/plans/2026-08-06-isolated-verifier.md` and
  `docs/superpowers/ledgers/2026-08-06-isolated-verifier.md`.

## Current iteration — P1 Product Closure: Base44-inspired Golden Path accepted

The P1 Product Closure gate is complete: one low-friction, evidence-backed
path from a business requirement to a runnable local preview for the Expense
Approval profile, with the browser journey and the generated application
passing acceptance from a clean checkout. Authority: the Goal Design, plan,
and PM ledger at
`docs/superpowers/{specs,plans,ledgers}/2026-08-08-base44-inspired-golden-path*`
(plan and design remain uncommitted by explicit exclusion; the ledger is
committed).

- The four-mode Workbench journey (Discuss -> Plan -> Build -> Release) is
  test-first over the immutable lifecycle: Discuss cannot mutate a Draft;
  Build requires an accepted, checksum-bound CompositionDecision; only a
  Published Graph compiles; the isolated verifier passes before the preview
  is marked ready; the preview is a generated application, never the
  Workbench. Slice commits `2fe78d30` (S1) through `395ca36a` (S7) and the
  closure record `89bd684`.
- Browser E2E green (twice, incl. clean checkout): the complete journey
  including role/data simulation with recorded authorization denial, the
  generated-app preview, and docker-level proof that the preview project's
  containers, network, volumes, and worker artifact directory are removed.
- Clean-checkout verification from the committed branch: turbo build 10/10
  (incl. workbench production build; `prisma:generate` precedes the
  control-plane build as in the Dockerfile); workbench 222/222; graph
  190/190; capabilities 356/356; adapters 34/34; compiler-worker 183/183;
  control-plane 184/184; compiler 332/332.
- Acceptance-gate self-review passed with three recorded gaps (see the S8
  ledger record): no automated axe-class accessibility audit over the
  generated app in the E2E; the failed-verification -> reviewable Draft
  Diff -> next revision path is unit-covered but not browser-exercised; the
  control-plane vitest suite should pin the forks pool for deterministic
  full-parallelism runs on this machine. Recommended next goal: a hardening
  round on those three items before resuming Foundry breadth gates.

## Current iteration — P1 Product Closure reopened: Honest Requirement-to-Product Closure

The P1 Product Closure gate is **reopened** on 2026-08-09. The Base44-inspired
Golden Path acceptance is retained as **fixed Expense Approval replay
evidence** only: it starts from the `guided-template-expense-approval` starter,
clicks fixed clarification answers, and accepts canned Expense framings — a
blank or non-Expense workspace cannot start the journey, and no free-form
requirement enters the system. It therefore does not prove requirement-to-
product closure. Authority: the 2026-08-09 plan and PM ledger at
`docs/superpowers/{plans,ledgers}/2026-08-09-honest-requirement-to-product-closure.md`
and the acceptance record `docs/acceptance/requirement-to-product-closure.md`.

- Acceptance boundary: two unrelated free-form prompts — Expense Approval and
  Appointment Booking — each from an empty workspace with **no Profile,
  starter, or template selection**, producing materially different entities,
  fields, pages, routes, roles, workflows, navigation, seed scenarios, and
  role journeys, both editable in multi-page Page Studio, publishable,
  compilable, independently bootable, verifiable, previewed, and cleanly
  removed. Final local acceptance uses the real OpenAI interpreter with
  environment-only credentials; nothing raw is persisted.
- Task 1 (boundary pin) landed: `e2e/golden-path.spec.ts` no longer clicks
  `guided-template-expense-approval`; two prompt-driven scenarios start from
  an empty workspace and expect a Requirement Summary. RED evidence recorded:
  the focused browser run fails at the missing `Requirement brief` composer
  (the empty-workspace requirement composer does not exist yet).
- The Workbench is being rebuilt around this primary journey: sparse main
  canvas, icon rail, contextual sheets, one obvious primary action, compact
  typography, Lucide icons, light default and dark functional. Portfolio
  Intelligence, Source Intake, Profile Readiness, Capability Supply, and long
  evidence lists leave the default Home frame.
