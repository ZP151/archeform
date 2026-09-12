# Team Task B3 Independent Task Review

TASK_REVIEW_PASS: yes
READY_FOR_ACTUAL_QA: yes
Open findings: P0 0 / P1 0 / P2 0

## Scope and authority

Reviewer: /root/task_business_review, independent read-only task reviewer. Reviewed the uncommitted integrated slice against base/HEAD `d28f1fedf4fa0aaefe3e81492cabd857db69d8cb` in the consumer-delivery worktree. The only reviewer write is this report. No production, test, Git, service, provider, or runtime mutation was performed.

Read AGENTS.md, current technology governance, threat model, delivery policy, the active ledger ending, and the canonical Task plan. The 2026-09-13 resume and accepted ADR-0063 amendments supersede historical plan assumptions. Verified exact ADR-0057 SHA-256 `8ee8ff2870369bed43d076ab8ff8d63653138d761c9970ace9358dd9d5465017` and ADR-0063 SHA-256 `8d5b2042a798b98f130fe7265f6e1bc1389bd67f618cf1f35a9ce0d8b966ea68`.

This verdict establishes implementation readiness for the existing actual QA stage. It does not establish runtime acceptance, product completeness, release, deployment, or permission to change an immutable artifact.

## Findings and focused closure

- **Closed P1: conflict feedback lost on record remount.** In `packages/compiler/src/task-workspace-presentation.ts`, an event received HTTP 409, refreshed a changed version, and remounted the id:version-keyed TaskRecord before its local conflict message survived. The exact reproduction used the not-started filter, a 409 response followed by a version-1 in-progress record, and removal of that row from the filter. The final implementation retains the alert at TaskRecords before refreshing. Root reproduced RED and reports GREEN for the permanent emitted browser regression; inspected regression also clears the filter and requires the updated Complete action plus the retained alert.
- **Closed P2: runtime fixture assertions contradicted emitted UI and existing GET shape.** The reopen assertion expected obsolete text and initially selected a descendant status rather than the status-bearing paragraph. The reload assertion included a hidden Title prefix in textContent. The Viewer GET reused the exact eight-key command response assertion despite existing Prisma timestamps. Final assertions target the list result directly, use the heading's accessible name, and validate ten GET fields including timestamps while preserving exact eight-field mutation/replay checks.
- **Compiler boundary failures resolved.** Read the initial full result: 736 passed / 2 failed. Graph state declaration ordering is now independent of explicit initialState; Task-only generic write methods now contain fixed denial bodies instead of unreachable legacy code. The final focused Task/port/compatibility run passes 28/28, including emitted strict API/store/React typechecking. Unaffected full-suite evidence is retained.
- **Owner self-review alias correction accepted.** An event URL could pass operation create with a record ID. Final Task command authorization rejects that combination before receipt/write; inspected focused test requires safe 403 and no audit. Owner reports the alias and strict emitted typecheck pass 2/2, followed by compiler build/lint.

No required production fix remains.

## Implementation assessment

The additive Blueprint verbs and strict provider grammar are synchronized. Canonical Task selection owns the complete reviewed structure, keeps parameters null, and presents unsupported identity/editing requirements as material clarification. Workbench recognition binds checksums, the six exact capability locks and nine bindings to exact fields, actors, grants, pages and lifecycle semantics.

Task mutation and presentation share the private lock-bound selector. True Published Graph inputs with separate immutable locks are exercised. The bounded candidate rejection does not blanket-reject arbitrary existing Graph event names. Renamed symbols and permitted ordering remain supported. Infrastructure entities retain reads and cannot use generic mutations under exact Task output.

The private shared write-protection fragments provide common key validation, length-delimited scope hashing, canonical body hashing, receipt replay/conflict, conditional updates, receipt persistence and rollback/retry mechanics. Approval retains legacy raw-key output bytes; Task fixes digest-only receipt key storage. Authorization precedes receipt lookup. Task command bodies are strict, the exact validated body supplies request identity, and record/version/status, audit and receipt participate in one transaction. Tests execute both memory and generated Prisma adapters, including reconstruction, races and injected rollback boundaries.

The worker's optional per-step key override is bounded by existing key rules and one declared parent key. It replaces only that header after session/principal assembly. The Task chain uses distinct activations through version 4 and stored-success replay. Existing journeys retain their old path.

The Task UI composes the approved private shell, styles, controls, finder, safe value formatting and record hook with distinct Task semantics. Retry retains one activation/body after transport uncertainty; pending controls and keyed role/route/version scopes protect callbacks. The conflict correction retains feedback through filtering. Assignee remains display-only; editing stays explicitly deferred.

## Evidence examined

- Owner's completed implementation report: Graph 667 pass; Capabilities 405 pass; Adapters 194 pass plus one branch-count correction with focused 2/2; Workbench 616 pass plus one stale approval expectation correction with focused simulator 5/5.
- Read worker full log: 313/313 pass. Owner reports final affected Task/override probes 3/3.
- Read compiler full failure log and final focused log: 28/28 Task, shared protection and compatibility checks pass. Three old definition hashes and all ten complete ordered bundle hashes remain exact; immutable baseline fixture was not changed during review.
- Read package and Workbench build logs. Owner reports all six affected typechecks/lints pass, all affected builds pass, final formatting passes.
- Inspected permanent emitted React/CSS browser test. Root reports 1/1 GREEN covering 390/768/1440, tablet positions, axe, asset-negative checks, and the reproduced 409/remount/filter regression. This uses synthetic transport, not an actual backend.
- Read authored real-runtime lane and its static report. Its completed UI/GET corrections were rechecked. Root-authorized receipt/audit cardinality additions are still being prepared and are not claimed as executed by this verdict.
- Independently ran read-only `git diff --check`: exit 0.

## Remaining actual QA

Execute the separately authorized immutable Publish/Compilation/verifier/Preview journey against actual generated HTTP and PostgreSQL. Prove persistent create/start/complete/reopen/recomplete, unknown-result replay after API restart, competing writes, Viewer and invalid-state denials, exact receipt/audit cardinality, no extra effects, real UI conflict/retry continuity, responsive and qualitative visual acceptance, safe evidence and exact resource cleanup. The existing Terra QA and Sol release review remain required. Counts and maturity claims must wait for their applicable acceptance evidence.

The readonly receipt/audit addition to the runtime test may be reviewed as a focused continuation; it does not reopen unchanged production paths or require another stage.

## Focused runtime attempt-1 identity repair review

TASK_REVIEW_PASS remains yes; open P0/P1/P2: 0/0/0. The runtime attempt-1 failure was real and remains part of the retained QA history; this recheck does not claim a successful runtime rerun.

Read the corrected Task selector and focused tests, and verified the unchanged Control Plane creation path. In `apps/control-plane/src/composition/product-composition.service.ts:416`, the blank Graph uses `requirement.requirementId` as its application identity; the resulting principal/session Graph symbols use that identity. The persisted review stores the distinct database row `created.id` at line456, which remains the lifecycle address. The earlier Task selector incorrectly used that database row ID for Graph-symbol matching.

The bounded correction passes the already parsed and checksum-validated `spec.requirementId` to Task binding recognition. The nine exact binding checks, six locks, and structural/grant checks remain unchanged; no compiler, API, persistence, or lifecycle-address contract changes. The test fixture now deliberately uses different requirement/Graph and database identities. It proves positive recognition and rejects bindings aimed at the database identity. Root reports focused consumer hook GREEN 34/34. This is an appropriate focused repair; unchanged evidence remains valid. Root will rebuild only the affected Workbench and record its new image/source identity before the next authorized actual lane.

Superseding source identities:

- `apps/workbench/lib/product-journey/consumer-family.ts`: `9a4eedb2dcf47737ec60ad9e3bd837ef646c3b4f93651fbec45874876a025ec5`.
- `apps/workbench/lib/product-journey/use-consumer-generation.test.tsx`: `b091deb11d7b2ff86b7ee7fbe21b9aea8d2b11f951d324b82a189873ca8e4e18`.


## Reviewed identities

SHA-256 over current bytes. Initial identities were captured during review; changed production and fixture paths were re-read after repairs. Root may retain this manifest with the final source freeze.

```text
23e2fe39601f4ee748ed3416393069c1b1a93f10f61b9302dcc2ef96e1b0c7e8 apps/compiler-worker/src/verifier/probes.ts
34f68695c293fa4df9292aba07cf48821119bf9a9ff9f8f7f91829df8c601a33 apps/compiler-worker/src/verifier/role-journey.ts
2f01b2fe4b75318bcc093a5d00fff27963b10930d8e5cfd97435bafaf4966edc apps/compiler-worker/src/verifier/verification-graph-plan.ts
7ada1ef0c55c2ba99aedebb8af34217677fc11db36a7d7dd7a6e4eac20a60542 apps/compiler-worker/test/verification-graph-plan.test.ts
6644252587d6157e0ac939b25e288c37e0a478b6e45a7555f111e703e6b1f123 apps/compiler-worker/test/verification-probes.test.ts
614e91e4d7cefe94fd35971a23f1b72aac9ab949c880717a70c22718546ed135 apps/workbench/components/journey/role-simulator.test.tsx
4309ae1a8fb78d5ceb4fe3a2a89826256d508f0db54ff0ff76f7c5d13bccb5ad apps/workbench/components/workbench-home.test.tsx
e2c8db14dc45930f88407c748cc6b0088e31345022254699d7a4f6212676c4d5 apps/workbench/components/workbench-home.tsx
4395d39d87d54048c2a82b3d468c9a573d31909e733cace87aceb6500cd860e5 apps/workbench/lib/product-journey/consumer-family.ts
232eca75e67f47311cadae36d39646808e651a992f05838fb096dbfd4aae6481 apps/workbench/lib/product-journey/use-consumer-generation.test.tsx
0915c7a54b00b2f0fa10fc412cd2f755693720543ba86769f6eaf040e1ea959e apps/workbench/lib/product-journey/use-consumer-generation.ts
11df0645bc90190b1e1c275be494fd6a0ac410c813fdc79bc31bd73d407e894e e2e/consumer-task-fixture.ts
55782fe3c0c32929969249d6863c220d569b4e58886f7816459072f0b56a94fb e2e/consumer-task-ui.spec.ts
60e32be7774fa65aa726cca0e8da29a2cda53e499f8ee4e4ab5e7fe878b9e0ed e2e/consumer-task.spec.ts
7e73c8f8a1ed62d0145473f2692b6471d857a29b09edbd1ac4fdead2a5108949 e2e/task-presentation.ts
5b611c3772d7c4e9b80eeea48223cd3f4b1fc7deff6ef001ae72aef2d279f92b packages/adapters/src/requirements/definition-selection-catalogue.ts
db6e9b6c5c98f5dd74c42e6d39dc2100dc2fdcbb591139dd2d780ac09ae89e34 packages/adapters/src/requirements/openai-interpreter.ts
d1d355c5c951df96f84cac5fb09d0ee3054222046c87bed64db4aaa70010625f packages/adapters/src/requirements/task-definition-selection.ts
d2d800d3e164f235ecfe48fdd374ccddffcfbf1ff20693aa92791bfa455c6ed8 packages/adapters/test/requirement-interpreter.test.ts
df7baca976dcc50b7818c625c6b9abbc90c8b718ed39dd7996fb7c69510f02b3 packages/capabilities/test/plan-alternatives.test.ts
3cf91722bbe4bb8eefa860d605216fc0d2979058187aebe8fdb9306e06aabfda packages/capabilities/test/product-composer.test.ts
34ed24c9fd665593547d57c8743b0e6d2d016e4c69e8feffe891b17b9a1d4a17 packages/compiler/src/approval-mutation-contract.ts
210dca9f500c8ab0ffcc6fbfbad3add73c70f7657b38eb62e4107c52768e6f40 packages/compiler/src/approval-workspace-presentation.ts
317d3436cf0e9eeb3419190df69f27984958ae90ceb31472ce9ce0c2676d5ba8 packages/compiler/src/index.ts
28c4a6d9a67e644b7f20f7a0a97e6199aac801a4383a2258ac4035e1cc5c98a6 packages/compiler/src/mutation-write-protection.ts
54aceec8fbb1ce5d32942acc1ead05701a317a6a03b4bc904a1dc17983285b24 packages/compiler/src/targets/database/target.ts
23ea227eeb16e9fe8de40b7d86c78554447f5e5c9ce508e87aa1f451bc63f732 packages/compiler/src/task-mutation-contract.ts
3d4aa45170bab194d5672f069aab2817683e0409e4eb024e2cc9236f9666dc42 packages/compiler/src/task-workspace-presentation.ts
2329854bf2cb87900ce85bf6774e2df189c19e56ecf4afb33ee57d661286680f packages/compiler/test/fixtures/task-non-task-baseline.json
3778da20ad7a90fa5138631f11b9135f1a72a127163d11ee5ca27703f17eb036 packages/compiler/test/mutation-write-protection.test.ts
60e08de65ba439839a23496c9939d4382018c8a81870203ca732601ae7bf611a packages/compiler/test/task-compatibility.test.ts
f9f7137e0d6f64d8a8d1f5cef80ab038cda1280ce6a07ea8d20237c3351e0d64 packages/compiler/test/task-mutation-runtime.test.ts
2111705e119d539509007a0a4d68c64e33ca40c9aae54e26775101b9316d460c packages/graph/src/product-blueprint.ts
3d412701f13f0092b5ac198bf60ba133948bfc6d0a3e7b95c0530c7a5ee67f36 packages/graph/test/product-blueprint.test.ts
93cdd97188e621f5c9edf8160339389b791a40055486b8d7b57558cc135c18e8 scripts/emit-composed-ui.mjs
```

## Focused runtime-test addition recheck

Scoped continuation reviewed `e2e/consumer-task.spec.ts` at SHA-256 `7cf08fa32401e7f510c9a445a2c382e5f7b8c7c7fe93ec255c4c48d4f508440b`, superseding its manifest entry above. TASK_REVIEW_PASS remains yes; P0/P1/P2 remain 0/0/0.

The added helper selects one API container by the exact validated Preview project and API service labels, then executes a read-only Prisma query. It selects only record IDs and stored key values in transient process memory; output contains aggregate count arrays and key-shape booleans, with a fixed safe query failure message. It writes no rows, exports no keys or receipt bodies, and prints no credentials. Returning the recovered Create record supplies its exact ID for the query.

The expected audit and receipt counts [5, 2, 1] correctly correspond to the full create/start/complete/reopen/recomplete lifecycle, replayed Create plus one winning raced Start, and the lost-response Create recovered after restart. Counts are scoped to those three actual record IDs, excluding verifier fixtures. Key-shape checks require digest-only storage. Root reports author formatting, test listing and whitespace checks pass. This review approves the authored check; actual execution and outcomes remain pending QA. Production identities and the preceding production verdict are unchanged. Root confirms the latest fast-UI-only edit removed an unused debug fact without behavior change.
