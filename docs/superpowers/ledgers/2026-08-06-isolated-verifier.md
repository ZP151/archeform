# P0 Isolated Verifier Ledger

**Goal:** compile immutable Published Compilations into isolated generated
applications, prove their runtime behavior, and produce safe reviewable
diagnosis-to-Draft-Diff evidence.

**Design:** `docs/superpowers/specs/2026-08-06-isolated-verifier-goal-design.md`

**Plan:** `docs/superpowers/plans/2026-08-06-isolated-verifier.md`

**Owner:** PM role; only the PM advances task state.

## Status vocabulary

```text
planned -> implementing -> ready_for_qa -> reviewed -> accepted
```

Any P0/P1/P2 finding, unexplained digest change, contract expansion, secret
leak, or cleanup failure returns the task to `implementing` with evidence.

## Baseline

- Prior compiler plugin Goal accepted at `1137e1e` on the inspected branch.
- Existing fresh gates: `@factory/compiler` 329/329; compiler-worker 81/81;
  compiler and worker typechecks pass; compiler lint passes.
- Existing preview lifecycle is in `apps/compiler-worker/src/preview-runner.ts`.

## Task ledger

| Task | Deliverable                                        | State   | Target commit | Evidence |
| ---- | -------------------------------------------------- | ------- | ------------- | -------- |
| 1    | Verification/evidence/Draft-Diff contracts         | accepted | f804d67       | task review, QA, and release review each PASSed f804d67; worker baseline 81/81 |
| 2    | Isolated lifecycle and cleanup                     | accepted | 9b954ea       | task review PASS (9b954ea, re-review 2a23b0b, P2s d01e5f3); QA FAIL P1 (9b954ea) then PASS (d01e5f3); release review PASS (f392446); focused 19/19; worker 100/100; graph 70/70 |
| 3    | Migration, API, role, denial, idempotency probes   | accepted | fe50aca       | task review FAIL P2 (header names) repaired d652bfc, re-review PASS d652bfc; QA FAIL P1 (unreachable endpoints emitted httpStatus 0 → evidence contract rejected → probe.crashed) repaired de2e667, QA re-run PASS de2e667 (P1 symptom reproduced on old code, closed end-to-end; 147-check contract sweep; RED 5/27 → GREEN 27/27 + 20/20 lifecycle); worker 128/128; typecheck/lint clean; release review FAIL 2 P2s (plan checkboxes unchecked; residual-risk overstatement) remediated fe50aca, re-review PASS fe50aca; PM acceptance at fe50aca |
| 4    | Deterministic diagnosis and constrained Draft Diff | accepted   | e7ffb02       | feature `feat: add safe verification diagnosis` (9637528); RED graph 26/26 + worker 4/4 (module missing), GREEN 26/26 + 4/4; full graph 98/98, worker 132/132; graph typecheck/lint/build clean; worker typecheck/lint clean; task review FAIL P2 (derived diagnosisId/baseDraftRevisionId overflow factoryId 128 at schema-extreme inputs, reproduced by reviewer) repaired 3a032a0 (bounded derived IDs, RED 2/28 → GREEN 28/28); re-review PASS at 3a032a0 (P2 independently reproduced at 9637528 length 138 and closed; edge-math probes 128/119/118/117/1-char green; identity binding untrimmed; gates 28/98/4 + worker 132/132, typecheck/lint/build clean; P0/P1/P2 none); QA PASS at 3a032a0 (P2 reproduced at parent 26/2 test fail + 138/134-char overflow, closed at fix; sweep 28/98/4 + worker 132/132; 9/9 adversarial probes incl. round-trip and identity binding; commit hygiene 2 files; P0/P1/P2 none); release review FAIL 2 P2s (blocked-segment entity keys produce schema-invalid affectedPaths, reproduced by probe; undocumented baseDraftRevisionId resolution seam) repaired e7ffb02 (blockedPathSegments guard fails closed to graph.unknown_entity, RED 4/32 → GREEN 32/32, full graph 102/102, worker 132/132; resolution contract documented in module docstring + plan); release re-review PASS at e7ffb02 (both P2s reproduced at parent 3a032a0 incl. parseDiagnosis throw and add-binding diff failure, closed at fix; 0/9 collateral differences; 32/102/4 + worker 132/132; typecheck/lint/build clean; P0/P1/P2 none); PM acceptance at e7ffb02 (independent check: clean tree, remediation diff read, PM runs 32/102/4/132 green) |
| 5    | Control Plane persistence and review APIs          | ready_for_qa | 4ad23f3       | feature `feat: expose verification evidence review` (4ad23f3); RED service 17/17 + controller 6/6 module-missing; GREEN 17/17 + 6/6 + prisma-schema 8/8; full control-plane 145/145; typecheck/lint/build clean; 4 RED-round fixture/classification corrections documented in section |
| 6    | BullMQ integration and one profile acceptance      | planned | —             | —        |
| 7    | Independent gates and release hand-off             | planned | —             | —        |

## Task 1 — verification contracts — 2026-08-06

**Paths changed:** `packages/graph/src/verification.ts` (new),
`packages/graph/src/index.ts` (+1 export line),
`packages/graph/test/verification-contract.test.ts` (new).

**RED:** the focused contract suite failed before implementation (13 failed
plus throw-any artifacts of the missing module). **GREEN + repair:** the
initial implementation failed the valid Draft Diff fixture because capability
keys are dotted (`core.crud`) while the op schema reused the plain Graph
identifier regex, and the diagnosis `code` (`migration.apply_failed`) and step
`failureCode` allow underscores. Both were corrected inside the new module.

**P2 repair round 1 (task-review finding):** the reviewer found the redaction
backstop missed env-style compound credential keys (`secret_key=`,
`Secret_Access_Key=`, `AWS_SECRET_ACCESS_KEY=`) and separator-less bearer forms
(`Bearer xyz`). Repaired with TDD: regression tests added first and confirmed
failing (RED), then the backstop was hardened into three checks — plain-key
assignments with word boundaries, env-style compound keys (any key-like token
containing a credential keyword and followed by `:`/`=`), and a standalone
`bearer` token. Regression tests confirmed green (GREEN), and an over-rejection
guard test keeps the allowlisted `authorization-denial` prose vocabulary
accepted.

**P2 repair round 2 (re-review observations, PASSed with two non-blocking
P2s):** the re-reviewer PASSed but observed (a) `Basic dXNlcjpwYXNz`
(separator-less Basic base64 credential) slipped past the backstop, and
(b) `monkey=banana` is deliberately over-rejected by the compound-key check.
Repaired (a) with TDD — a fourth backstop check for bare Basic credentials
whose token must contain a real uppercase letter, digit, or `+`/`/` (every
base64 of a printable user:password pair does), so `Basic requirements passed.`
and `basic health check returned 200` stay accepted; regression tests confirmed
failing first (RED) then green (GREEN). Resolved (b) as the reviewer's
sanctioned alternative: a guard test asserting the deliberate fail-closed
behavior (`monkey=banana`, `hockey=2` rejected; rationale: evidence is
allowlisted prose with no assignment forms, and the backstop cannot tell
`monkey=` from `secret_key=`).

**P2 repair round 3 (re-review observation):** the PASS noted the Basic
discriminator was position-locked to token index >= 3, letting degenerate
base64 slip (`Basic dTpw` = `u:p`, `Basic AbCd`). Repaired with TDD: a 4+ char
length lookahead frees the discriminator to sit anywhere in the token, which
still accepts 3-char tokens (`basic API contract`, `basic 200 response`).
Regression tests confirmed failing first (RED) then green (GREEN).

**Evidence (Node v22.11.0):**
- Focused `verification-contract.test.ts`: 35/35 — valid run/evidence/diff/
  diagnosis records; unknown run status, step kind, step status, diagnosis
  category rejection; non-sha256 compilation digest and step digest rejection;
  duplicate ordered step IDs in runs and evidence; evidence/run step-ID
  disagreement; hostile `modelPrompt`/`rawResponse` unknown keys rejected by
  exact-key validation; credential-like material in summaries rejected with
  the redaction message: plain assignments (`authorization: Bearer ...`,
  `api_key=...`, `password=...`), env-style compound keys (`secret_key=`,
  `Secret_Access_Key=`, `AWS_SECRET_ACCESS_KEY=`, `database password=`),
  separator-less bearer forms (`Bearer xyz`, `Authorization Bearer xyz`,
  `sent bearer token directly`), bare Basic credentials (`Basic dXNlcjpwYXNz`,
  `Basic aGVsbG8=`, degenerate `Basic dTpw` and `Basic AbCd`,
  `Authorization: Basic dXNlcjpwYXNz`), and deliberate fail-closed guard
  (`monkey=banana`, `hockey=2`), while allowlisted `authorization-denial`
  prose, `Status: ok`, `basic health check returned 200`,
  `basic API contract`, and `Basic requirements passed.` stay accepted;
  out-of-range HTTP status (600);
  unbounded summary (10,000 chars); missing cleanup facts; artifact path
  traversal (`../../etc/passwd`); unknown diff operations (arbitrary JSON
  patch rejected), nested object values, source paths and URLs in affected
  paths, empty operation lists; non-Graph affected path in diagnosis;
  conflicting retry identity (same `verificationRunId`, different
  `compilationDigest`) fails closed while idempotent and distinct identities
  pass.
- Full `@factory/graph` suite: 70/70 (3 files); `typecheck` pass; `lint`
  (Prettier) pass; `git diff --check` clean.

**Residual risk (redaction backstop):** bare credentials that are neither
assigned nor bearer/Basic-shaped (e.g. a bare `sk-live-...` value) are out of
backstop scope by design — the allowlisted evidence vocabulary is the first
line of defense, and the backstop covers credential-like *assignments* and
separator-less bearer/Basic forms.

**Contracts:** `VerificationRunV1` (immutable `compilationDigest`, profileKey,
run status, ISO timestamps, ordered unique stepIds),
`VerificationStepV1` (kind, status, bounded redacted summary, bounded
httpStatus, allowlisted role/action names, sha256 digest, failureCode,
durationMs), `VerificationEvidenceV1` (ordered steps, mandatory cleanup facts,
artifact digest manifest), `DraftDiffV1` (four constrained operations:
`replace-input`, `add-binding`, `remove-binding`, `change-constraint`; no
source path/URL/shell/JSON patch), `DiagnosisV1` (category
graph/capability/binding/target/runtime/unknown, stable code, Graph paths,
nullable Draft Diff), `assertConsistentVerificationRetry` fail-closed retry
identity, `VerificationContractError`. Parse helpers: `parseVerificationRun`,
`parseVerificationEvidence(input, run?)`, `parseDraftDiff`, `parseDiagnosis`
— all reject malformed input with `VerificationContractError`; the evidence
helper additionally cross-checks identity, digest, and ordered step IDs when
the owning run is supplied. Schema exports with z.infer type aliases:
`VerificationStepKindV1`, `VerificationStepStatusV1`, `VerificationRunStatusV1`,
`DraftDiffOperationV1`.

**Gates (all three independent, all citing f804d67):** task review PASS (with
hostile-input probes: 13/13 credential forms rejected, 7/7 benign forms
accepted, RED property proven against the pre-fix parent), QA PASS (42/42
realistic-usage smoke tests including exact boundary values on both sides of
every contract limit, export-surface compile via a strict NodeNext consumer,
secret scan clean), release review PASS (ledger counts match reruns 35/35 and
70/70, diff chain touches only the three expected files, secret scan clean
with synthetic fixtures identified as such, plan Task 1 checkboxes all marked,
worker baseline `@factory/compiler-worker` 81/81 undisturbed, no
`GOAL_COMPLETE` claim). PM acceptance: Task 1 recorded `accepted` at f804d67.

**Residual risk:** bounded contract text is a redaction backstop; probe
construction in later Tasks remains responsible for emitting only allowlisted
evidence. `parseVerificationEvidence(input, run?)` cross-checks identity,
digest, and step order when the run is supplied.

## Task 2 — isolated lifecycle and cleanup — 2026-08-06

**Paths changed:** `apps/compiler-worker/src/verifier/verification-lifecycle.ts`
(new), `apps/compiler-worker/src/verifier/verification-environment.ts` (new),
`apps/compiler-worker/test/verification-lifecycle.test.ts` (new),
`apps/compiler-worker/src/preview-runner.ts` (plan-sanctioned small reusable
export of `safeArtifactManifest`).

**RED:** the focused suite was written first and failed to collect — the
verifier modules did not exist.

**GREEN + fixture repairs:** implementation in three passes. First pass
introduced three self-inflicted failures the tests rightly caught: (a) the
test fixture used `operationTimeoutMs: 50` while the lifecycle enforces a
bounded 1s floor (unbounded/degenerate timeouts are rejected by design), fixed
by moving the fixture to the floor; (b) `evidence.artifactDigests` is the
path+digest manifest by contract, while the fixture compared against the full
size-bearing manifest, fixed by comparing the digest-only projection;
(c) the hostile-artifact-path test's mocked compilation returned an extra
artifact so the derived digest differed from the fixture digest and the digest
gate tripped first, fixed by deriving the expected digest from the mocked
manifest so the run reaches the artifact-manifest gate. A stale
`@factory/graph` dist (the worker resolves the package to built output, which
predated Task 1) was rebuilt; the graph barrel re-export now carries the
verification contracts, and the graph suite still passes 70/70.

**Evidence (Node v22.11.0):**
- Focused `verification-lifecycle.test.ts`: 16/16 — declared-order probes with
  cleanup last and evidence bound to the derived run (identity, digest,
  ordered step IDs, digest-only artifact manifest, ISO timestamps); digest
  mismatch rejected before Docker starts (start/stop preview never called);
  untrusted artifact path (`../../etc/passwd`) rejected before Docker starts;
  mutable draft-shaped input rejected before compiling; unbounded/out-of-range
  timeouts (`0`, `-1`, `1`, `3_600_001`, `NaN`) rejected before compiling;
  duplicate/unknown step-plan IDs rejected before compiling; probe crash →
  `probe.crashed` failed step, later probes skipped, cleanup still ran; hanging
  probe aborted at the lifecycle timeout → skipped step with `/timeout/i`
  summary, cleanup still ran; boot failure → all probes `skipped` with
  `/did not start/i` summaries (never fabricated as results), cleanup still
  ran; cleanup failure reported truthfully (`cleanup.succeeded` false,
  `/cleanup failed/i`, evidence still contract-parses); digest derivation
  deterministic across manifest reordering and sensitive to graph hash and
  artifact set; environment delegates boot/cleanup to the preview runner with
  bounded options; migrations run through a bounded `docker compose exec -T
  migrate` command shape; untrusted command tokens rejected before any process
  run; bounded health/request statuses via injected fetch (body never read);
  request paths with traversal/query/`#` rejected before any fetch.
- Full `@factory/compiler-worker` suite: 97/97 (81 baseline + 16 new);
  `typecheck` pass; `lint` (Prettier) pass; `git diff --check` clean.
- `@factory/graph` suite: 70/70 (re-run after dist rebuild).

**Security observations:** the lifecycle never persists raw process output or
HTTP bodies — every environment operation returns bounded status results and
evidence summaries are fixed allowlisted prose; the digest gate and the
artifact-manifest gate both run before Docker starts; probe crashes and
timeouts are recorded as failed/skipped steps with allowlisted summaries,
never fabricated results; cleanup ALWAYS runs and its outcome is reported
truthfully in the cleanup facts; migration commands are token-allowlisted
(`/^[a-zA-Z0-9._-]+$/`, max 10 tokens) and pinned to the fixed
`compose --project-directory <artifactRoot>/.preview-runs/<runId> exec -T
migrate` invocation; request routes must be absolute single-segment paths
without traversal, query, or fragment. Secret scan: clean (one hostile-test
query string `?secret=1` is a deliberate rejection fixture).

**Residual risk:** bounded operation timeouts abort in-flight work but
timeouts of subprocesses under docker compose are best-effort; `now`/`nowMs`
are injectable for determinism in tests, production uses wall-clock. The
lifecycle assumes the preview-runner guards it already validates (its full
guard set is exercised by the worker baseline suite).

**QA gate (independent, citing 9b954ea):** returned FAIL with one P1 and two
P2s. P1 — functional wiring defect: `runVerificationLifecycle` never
forwarded `processRunner`/`fetch` into `VerificationEnvironment`
(`VerificationLifecycleDependencies` declared neither field), so inside any
lifecycle run `migrate()` no-oped through `processRunner?.()` to
`{succeeded: true}` — a migration probe could report PASSED without Docker
ever running (silent false-positive evidence) — and `fetch?.()` was always
undefined, so HTTP probes could never succeed. TypeScript excess-property
checking forbade consumers from wiring runners in. P2s: (a) the crash-cascade
skip summary said "after an earlier probe failed" but only crashes cascade —
a `status: "failed"` step does not skip later probes; (b) runner-less
`migrate()` silently succeeded while a missing `fetch` at least failed
fail-ward (status 0). The QA verified the wiring gap empirically (Script B:
migration "passed" with no runner; health got status 0) and proved the
repaired composition works 13/13 with a simulated fix.

**P1 repair round (QA finding):** repaired with TDD — three RED test groups
added first and confirmed failing: (1) a lifecycle test whose probe calls
`environment.migrate(...)`/`environment.request(...)` asserts the injected
runner is invoked with the pinned `compose exec -T migrate` shape and the
injected client hits `http://127.0.0.1:<apiPort>/expenses`; (2) environment
fail-closed tests asserting runner-less `migrate()` and client-less
`health()` throw `VerificationLifecycleError` instead of bounding;
(3) the crash test extended to a three-probe plan asserting the later skip
summary matches `/crashed/i`. Implementation: `VerificationLifecycleDependencies`
gains required `processRunner: PreviewProcessRunner` and `fetch: typeof
fetch` (compile-time enforcement — the false-pass class is impossible
again), both forwarded to the environment constructor; the environment
throws `process_runner_required`/`fetch_required` when either is
unconfigured (programming errors are never bounded results); skip wording
corrected to "after an earlier probe crashed." Regression: focused 19/19
(3 new `it` blocks plus one crash test extended to three probes), worker
100/100 (81 baseline + 19), typecheck pass, lint pass, `git diff --check`
clean; graph suite untouched (dist carries Task 1 contracts). Per the gate
protocol the task returned to `implementing` with the QA evidence and
re-advanced to `ready_for_qa` for re-review at the repaired commit.

**QA re-run (independent, PASS with one P2, citing d01e5f3):** the repaired
deliverable PASSed end-to-end — a realistic-usage script drove
`runVerificationLifecycle` with Task 3-style probes (migration, api,
authorization-denial, health) over an injected runner plus REAL Node fetch
against a real HTTP server on 127.0.0.1; the runner was invoked exactly once
with the pinned full compose shape and a live AbortSignal, the server
actually received GET/POST/health traffic at the apiPort URL, the real 403
came back as a truthful bounded denial, evidence bound to the run with
cleanup last, and the vestigial `?.` removal changed nothing observable
(runner-less still throws `process_runner_required`). Boundary spot-checks:
99-entry plan runs vs 100 rejected pre-compile; timeout 1_000 accepted vs
999 rejected pre-compile; 10-token migrate runs vs 11/0-token rejected
pre-run; consumer omitting `fetch` or `processRunner` fails typecheck with
TS2741 while a complete consumer typechecks clean. Truthful-evidence
regressions: throwing runner → bounded failed step, hanging runner → skipped
with `/timeout/i`, rejecting fetch → `{status:0, ok:false}`, cleanup always
ran, no dangling timers (all scenarios exit clean under a 90s hard timeout).
One P2 (documentation): d01e5f3 was not hash-cited in the ledger — repaired
by this record, which cites it. Row state advanced to `reviewed`.

**Release review (independent, PASS with two P2s, citing f392446):** every
recorded count re-verified against the tree — focused 19/19, worker 100/100,
graph 70/70, typecheck, lint, diff check — with the diff chain touching
exactly the three Task 2 source/test files plus the one-line
`safeArtifactManifest` export and the two docs files; graph dist correctly
gitignored; Task 1 contracts and the compiler package byte-identical to
f804d67; secret scan clean (only the documented `?secret=1` rejection
fixture); Task 2 plan checkboxes all marked with Tasks 3–7 untouched; no
`GOAL_COMPLETE` claim and an unchanged completion-marker rule. Two
non-blocking P2s: (a) the record commits 3ea1088/f392446 are not hash-cited
in the ledger (3ea1088 could have been by the final record; f392446 cannot
self-cite) — accepted with this record, which cites 3ea1088 and names the
tip; (b) the Task 2 chain's strict parent is the Task 1 acceptance-record
commit a9d083c rather than f804d67 directly — expected protocol bookkeeping.

**PM acceptance (Task 2 accepted at 9b954ea with repairs 2a23b0b, d01e5f3,
records 3ea1088, f392446):** the three independent gates each PASSed the
Task 2 deliverable citing the same feature commit: task review (code gates
at 9b954ea, re-review at 2a23b0b), QA (re-run at d01e5f3 after the wiring
P1 repair), and release review (f392446). Evidence: focused 19/19; worker
100/100 (81 baseline + 19); graph 70/70; worker typecheck and lint pass;
`git diff --check` clean; clean worktree; remote-reachable commit. Both
release-review P2s are documentation-precision items, resolved by this
record. Task 2 recorded `accepted`.

**Re-review (task review, PASS with three P2s, citing 2a23b0b):** the
repair commit 2a23b0b PASSed every gate — required runner/client fields are
compile-enforced (`tsc` consumer omitting either fails), both forwarded into
the environment constructor, the runner guard throws outside the try/catch
so invocation is guaranteed, fetch invoked directly, throwing/never-
resolving/rejecting runners and clients produce truthful bounded evidence,
and the evidence round-trips. Hostile wiring probes 5/5. Three P2s noted:
(a) vestigial `?.` on the processRunner invocation — unreachable as a no-op
today but inconsistent with the direct fetch invocation; repaired by
invoking the runner directly under the existing guard; (b) the repair commit
hash was unnamed in the ledger — repaired by citing 2a23b0b here;
(c) "(4 new)" was imprecise — corrected to 3 new tests plus one extended
test. The P2 repair changes no observable behavior; the 19 focused tests
still cover runner-less and client-less fail-closed paths.

**Gates (independent, citing 9b954ea):** task review returned FAIL with one
P1 — the Task 2 ledger record never cited 9b954ea (Target-commit column `—`,
zero hash mentions in narrative), a gate-protocol documentation requirement;
every code, test, security, and hostile-input gate PASSed (requirements
1–9 verified independently: contract fidelity with the Task 1 contracts,
fail-closed pre-Docker gates probed with draft-shaped input, digest
mismatch, traversal + backslash artifact paths, `Infinity`/`-Infinity`/
fractional/string timeouts, 100-entry plans, hostile step IDs, `md5:`/bad
identities; cleanup-after-crash/timeout/boot-failure and truthful cleanup
failure with evidence still parsing; no fabricated evidence — wrong stepId,
wrong kind, and credential-like probe summaries recorded as
`probe.crashed`; bounded results with HTTP bodies never read; composition
over the preview-runner primitives; 75/75 + 7/7 hostile probes from the
throwaway tmp dir; secret scan clean). The P1 was repaired here by citing
9b954ea in the row and this narrative; per the protocol the task returned to
`implementing` and re-advanced to `ready_for_qa` with the repair recorded.
Two non-blocking P2s recorded: the environment constructor relies on the
lifecycle's validated inputs plus the preview-runner's own guards (defensive
depth only — a directly constructed hostile environment is still bounded),
and `boundedErrorMessage` does not credential-redact raw text (unreachable
today because environment errors are always wrapped in fixed allowlisted
messages; if a future dependency threw credential-like text, the evidence
contract would reject the whole bundle — fail-closed, nothing bad persisted).

## Task 3 — migration, API, role, denial, idempotency probes — 2026-08-06

**Paths changed (e58b5a6):**
`apps/compiler-worker/src/verifier/role-journey.ts` (new — declared fixture
data: per-profile allowlisted API registries for expense-approval and
simple-ecommerce, journey fixture types, and fail-closed validation),
`apps/compiler-worker/src/verifier/probes.ts` (new — the six probes:
`runMigrationProbe`, `runHealthProbe`, `runApiProbe`,
`runRoleJourneyProbe`, `runAuthorizationDenialProbe`,
`runIdempotencyProbe`),
`apps/compiler-worker/src/verifier/verification-environment.ts` (+120 — the
`request` surface extended with declared fixture options: allowlisted role
header (`x-factory-role`, credential headers rejected) and bounded flat-JSON
bodies; `isSafeRequestPath` exported for fixture validation),
`apps/compiler-worker/test/verification-probes.test.ts` (new, 21 tests).

**RED:** the focused suite failed to load before implementation (0 tests run —
missing `probes.js`/`role-journey.js` modules). **GREEN + fixture repairs:**
the first implementation round passed 18/21; three failures were test-fixture
bugs, not probe bugs — the denial and API-status tests never mocked the
declared status (default mock returned 201 where the fixture declares 403/200),
so the probes correctly reported mismatch. The fixtures were corrected to mock
the declared statuses; 21/21 green.

**Design (grounded in the generated app):** order transitions are the only
keyed path — `POST /api/:entity/:recordId/events/:event` with body
`{expectedVersion, idempotencyKey}`, repeated keys rejected with 403 via
`rejected()` — so the idempotency probe asserts status-only semantics: first
request must return the declared status, the byte-identical replay must be
rejected with 403. Denials are proven before any record lookup (policy-first),
so denial journeys work without seeded records; success journeys on
record-bearing routes are wired to seeded fixture records by the Task 6
acceptance fixture. The environment never reads response bodies; probes return
only fixed allowlisted prose plus declared status/role/action facts.

**Evidence (Node v22.11.0, e58b5a6):**
- Focused `verification-probes.test.ts`: 21/21 — migration applied/unapplied;
  health 200/unreachable; API action expected status, unexpected status, and
  untrusted-route fail-closed; Expense create journey as employee with
  role header + declared body forwarded; journey status mismatch; approval
  denial (employee attempts approve → 403), payment denial (shopper attempts
  capture-payment → 403), denial mismatch; idempotency pass (first 201, replay
  403, two byte-identical requests), first-request failure (one request only),
  replay not rejected; hostile body/response material never echoed into
  summaries and the bounded summary passes the contract redaction backstop;
  unregistered action and untrusted principal fail closed before any request;
  environment forwards declared headers/bodies with JSON content type and
  rejects credential headers, hostile header values, nested/oversized/non-JSON
  bodies.
- Full `@factory/compiler-worker` suite: 121/121 (12 files, incl. 19 lifecycle
  tests on the extended request surface); `typecheck` pass; `lint` (Prettier)
  pass; `git diff --check` clean; secret scan clean (the only credential-like
  strings in the diff are synthetic hostile-fixture data that the tests assert
  are rejected).

**P2 repair round (task-review finding at e58b5a6, repaired at d652bfc):**
the reviewer FAILed the gate with one P2: header-name validation was a shape
check (`/^[a-z][a-z0-9-]{0,63}$/`), not an allowlist — credential-named
headers (`authorization`, `x-api-key`, `cookie`) passed whenever the value was
identifier-shaped, so the comment/ledger claim that credential headers are
rejected was overstated (the reviewer proved `authorization/BearerX` was
accepted at e58b5a6). Impact was contained (values are identifier-bounded so
real bearer/Basic forms cannot be expressed; probes only ever send
`x-factory-role`; values never reach evidence) but the fix is fail-closed:
header names must now match the explicit allowlist — `x-factory-role` only.
Repaired with TDD: a regression test asserting `authorization`, `x-api-key`,
and `cookie` names with benign-shaped values are rejected without any fetch
confirmed failing first (RED, 1/22) then green (GREEN, 22/22 focused; 41/41
with lifecycle; 122/122 full worker; typecheck/lint clean).

**P1 repair round (QA finding at e58b5a6, repaired at de2e667):** the QA gate
FAILed with one P1: on an unreachable endpoint the environment reports
`status: 0`, the probes copied it into `httpStatus: 0`, and the evidence
contract bounds `httpStatus` to 100..599 — so the lifecycle's parse gate
rejected the step and the real evidence became `probe.crashed`; the declared
bounded failure codes (`health.failed`, `api.unexpected_status`,
`role-journey.unexpected_status`, `authorization.denial_mismatch`,
`idempotency.first_request_unexpected`) were unreachable for a dead preview,
the most common real-world defect. QA proved it end-to-end through
`runVerificationLifecycle` with the real `runHealthProbe` against a dead
port. Repaired with TDD: regression tests asserting each probe's no-response
path yields a distinct bounded code (`health.unreachable`, `api.unreachable`,
`role-journey.unreachable`, `authorization.unreachable`, `idempotency.unreachable`)
with NO `httpStatus` field (the contract has no status for a no-response) and
with the step parsing `verificationStepSchema` confirmed failing first (RED,
5/27) then green (GREEN, 27/27); a lifecycle-level regression test proves the
bounded failure now flows through the real parse gate into evidence instead
of `probe.crashed`; wrong-status failures still carry their bounded
`httpStatus` (e.g. 503/health.failed). Full worker 128/128; typecheck/lint
clean.

**Contracts:** six probes each return exactly one bounded `VerificationStepV1`
(kind migration/health/api/role-journey/authorization-denial/idempotency);
journeys are static declared fixtures (journeyId, registry action, principal,
optional body, idempotency key/version) that resolve routes from the per-profile
registry and never accept arbitrary URLs or code; malformed or hostile fixtures
throw `VerificationContractError` before any request (recorded as
`probe.crashed` by the lifecycle).

**Residual risk (accepted):** denial journeys, migration, and health are fully
exercisable against real generated apps now; create/list/read SUCCESS journeys
are not — both target profiles require `core.identity-policy`, so the generated
app resolves principals from the `x-factory-fixture-session` header and denies
every request without one (403 missing-session), while the probe header
allowlist is exactly `x-factory-role`; `expense.read` additionally references
`expense-fixture-01`, which no profile seeds. Task 6's acceptance fixture must
therefore provide the fixture-session mechanism (an allowlist extension or a
non-identity composition), not merely seed records, before success journeys
can pass end-to-end; the registry entries are declared data and the end-to-end
acceptance is Task 6's scope.

**Release review round (FAIL at 200936f, remediated at fe50aca):** the release
reviewer FAILed the gate with two P2 findings, both ledger/documentation
accuracy issues (the delivered code was judged sound): (1) the plan Task 3
checkboxes were unchecked — marked `[x]` at fe50aca; (2) the residual-risk
paragraph overstated what is exercisable now — corrected at fe50aca to state
that denial, migration, and health are exercisable while create/list/read
SUCCESS journeys are not until Task 6 provides the fixture-session mechanism
(header-allowlist extension or non-identity composition), not merely seeded
records; `expense.read` also references unseeded `expense-fixture-01`. The
re-review gate independently verified every factual claim in the corrected
paragraph against the code at fe50aca (identity-policy requirement in both
profiles, `x-factory-fixture-session` principal resolution with 403
missing-session, `x-factory-role`-only header allowlist, no profile seeding
`expense-fixture-01`) and returned PASS with zero findings (one informational
note: denial probes assert only `status === 403`, so a session-gate 403
satisfies them — accurate, not an overstatement).

**PM acceptance (Task 3 accepted at fe50aca):** task review FAIL P2 → repaired
d652bfc → re-review PASS; QA FAIL P1 → repaired de2e667 → re-run PASS; release
review FAIL 2 P2s → remediated fe50aca → re-review PASS; all gates cite the
same code commit chain e58b5a6/d652bfc/de2e667 with the docs remediation at
fe50aca; focused 27/27 probes, 20/20 lifecycle, 128/128 worker, typecheck/lint
clean, secret scan clean. Residual risk above is accepted and owned by Task 6.
Task 3 recorded `accepted`.

## Task 4 — deterministic diagnosis and constrained Draft Diff — 2026-08-06

**Changed paths:** `packages/graph/src/diagnosis.ts` (new, pure mapping),
`packages/graph/src/index.ts` (exports `./diagnosis.js`), `packages/graph/src/model.ts`
(`canonicalize`/`hashApplicationGraph` moved here from `index.ts` so diagnosis
imports model/verification without a module cycle; the `@factory/graph` public
surface is unchanged because index already re-exports model),
`packages/graph/test/diagnosis-contract.test.ts` (new, 26 tests),
`apps/compiler-worker/src/verifier/diagnosis.ts` (new, worker-boundary parse
gate), `apps/compiler-worker/test/verification-diagnosis.test.ts` (new, 4 tests).

**RED:** both suites failed before implementation — the diagnosis module did
not exist (graph 26/26 module-missing, worker 4/4 module-missing).

**GREEN:** graph 26/26; worker 4/4; full suites after the `hashApplicationGraph`
move: graph 96/96, worker 132/132; graph typecheck/lint/build clean; worker
typecheck/lint clean. Two RED→GREEN fixture iterations were test-fixture bugs,
not logic bugs: the `orderGraph` fixture initially kept expense cross-references
while renaming the entity (semantic validation correctly rejected it — 4
issues), and the cleanup test double-appended stepId `cleanup` (evidence
contract correctly rejected duplicate step IDs). One mapper gap found by the
tests: `probe.crashed` fell through to `unknown.unmapped_failure` instead of
its own code — fixed explicitly.

**Deterministic mapping (first failed step in evidence order wins):** failure
code -> category/code/diff. `runtime.*` (`migration.failed`, `health.failed`,
all five `*.unreachable`, cleanup failure) -> category `runtime` with distinct
codes and NO diff; `probe.crashed` and unrecognized codes -> `unknown` with NO
diff; lock-checksum-vs-graph mismatch -> `target.graph_lock_mismatch` (checked
before step mapping); journey entity absent from the Graph -> `graph.unknown_entity`;
status mismatches (`api.unexpected_status`, `role-journey.unexpected_status`,
`idempotency.first_request_unexpected`) -> `binding.status_mismatch` with NO
diff (no safe value is derivable); `authorization.denial_mismatch` ->
`binding.denial_policy_not_bound` with an `add-binding core.identity-policy`
diff when the lock lacks the capability, else `binding.denial_not_enforced`
with NO diff; `idempotency.replay_not_rejected` -> `capability.*` with a
`change-constraint` diff only when a concrete constraint fix is derivable
(type/unique/required on `idempotencyKey`, mirroring the
`commerce.inventory-ledger` field requirement), else NO diff. `replace-input`
and `remove-binding` remain contract-legal but are never emitted: no evidence
input can deterministically supply a new input value or justify removing a
binding — an honest null diff beats a fabricated op. Affected paths are
`/domain/<entity>` (validated against the snapshot), `/domain`, or `/metadata`;
diagnosis summaries and diff summaries are fixed allowlisted prose and never
copy evidence text. The diff `rationaleCode` is the diagnosis code with
underscores hyphenated (rationale codes forbid underscores); `baseDraftRevisionId`
is derived `draft-<graph-id>`, `baseGraphHash` is `hashApplicationGraph(snapshot)`
— only hashes and safe summaries are preserved.

**Immutable Published Graph protection:** draft revision envelopes, published
exchange envelopes, and any carrier with `status`/`revision`/`publishedRevision`/
`draftRevisionId` keys are rejected by `VerificationContractError` both in the
pure function and again at the worker boundary before parsing; every produced
diff binds to the derived draft base, never to the snapshot.

**Hostile evidence:** the pure function re-parses evidence through
`parseVerificationEvidence` (redaction backstop); action strings are resolved
only through the snapshot's entity keys; a missing action identity on
entity-derived codes fails closed to `unknown.missing_identity`; unmapped
failure codes fail closed to `unknown.unmapped_failure`.

**Residual risk (accepted):** the `graph` category only detects a missing
journey entity and `target` only detects lock/graph checksum mismatch — both
are honest narrow detectors; diff operations are proposals for human review
and are never applied automatically (approval into a mutable Draft revision is
Task 5's scope); the worker boundary parses graph input before the pure
function re-parses it (double validation is deliberate fail-closed behavior).
**Task-review round (FAIL at 9637528, repaired at 3a032a0):** the task
reviewer FAILed the gate with one P2 (executed probe): `diagnosisId` was
derived `diagnosis-${verificationRunId}` and `baseDraftRevisionId`
`draft-${graph.metadata.id}`, and both source IDs are contract-legal at 128
characters — the prefix then overflowed the 128-character factoryId bound and
the produced record failed `parseDiagnosis`/`parseDraftDiff` (fail-closed
downstream, but schema-invalid output for schema-legal input). Repaired with
TDD at 3a032a0: a deterministic `derivedId(prefix, source)` trims the source
to keep the derived ID within the bound (identity binding still travels in
the intact `verificationRunId`/`baseGraphHash` fields); two regression tests
with 128-char run and graph IDs confirmed failing first (RED 2/28) then green
(GREEN 28/28; full graph 98/98, worker 132/132; typecheck/lint/build clean).
The reviewer's non-blocking notes (single-op constraint diffs, the
index-requirement case honestly resolving to no diff, deliberate double-parse
at the worker boundary) were accepted without change. Task 4 re-advanced to
`ready_for_qa` at 3a032a0; re-review pending.
**Task-review re-round (PASS at 3a032a0):** the reviewer re-ran the gate
independently at the repaired commit: the diff is exactly scoped
(`diagnosis.ts` +14/-5 adding the module-private `derivedId`, the suite +53/-2
adding the `orderGraph` graphId / `evidence` verificationRunId parameters and
the two 128-char regression tests); the original P2 was independently
reproduced at 9637528 (diagnosisId length 138, `parseDiagnosis` throwing the
128-character error) and is closed — both regression tests fail at 9637528 and
pass at 3a032a0; nine independent edge-math probes (128/119/118/117/1-char run
IDs, 128/123/122/6-char graph IDs) confirm deterministic bounding at the
cutover, with identity binding intact (`verificationRunId`/`baseGraphHash`
pass through untrimmed) and derived IDs regex-legal; no consumer keys off the
derived IDs, so trim collisions are harmless display-level identity. All gates
green at 3a032a0: diagnosis-contract 28/28, full graph 98/98, worker
verification-diagnosis 4/4 against rebuilt dist (derivedId confirmed in
dist), full worker 132/132, graph typecheck/lint/build clean, worker
typecheck/lint clean. VERDICT PASS — P0/P1/P2 none; the two non-blocking
notes (latent `derivedId` behavior for a prefix >= 128 chars, unreachable at
both fixed call sites; two `order-operations-lifecycle` full-suite failures
once, reproduced identically at the pre-fix commit, pre-existing parallel-run
flakiness) were accepted. Task 4 stands `ready_for_qa` at 3a032a0; QA gate
launched next.
**QA gate (PASS at 3a032a0):** QA ran independently in its own detached
worktree (parent worktree at 9637528 for reproduction): P2 independently
reproduced (128-char runId -> diagnosisId 138 chars, `parseDiagnosis` throwing
the 128-character contract error; 128-char graph id -> baseDraftRevisionId 134
chars, `parseDraftDiff` throwing) and confirmed closed at the fix; the shipped
regression tests genuinely detect the bug (26/2 fail at 9637528, 28/28 pass at
3a032a0). Full sweep at 3a032a0: diagnosis-contract 28/28, full graph 98/98,
graph build clean, worker verification-diagnosis 4/4 against rebuilt dist,
full worker 132/132 (one clean rerun; the known order-operations-lifecycle
contention flake passes solo and file is untouched by Task 4), typecheck/lint
4/4 both packages. 9/9 adversarial probes: edge-math (runId 1/117/118/119/128,
graph id 6/122/123/128 — all derived IDs <= 128, regex-legal, round-trip),
identity binding intact under 128-char runId (full verificationRunId and
baseGraphHash untrimmed), hostile evidence prose never copied into diagnosis/
diff, end-to-end parse round-trips for both diff op kinds, envelope rejection,
determinism. Commit hygiene: diff 3a032a0^ -> 3a032a0 touches only
diagnosis.ts and diagnosis-contract.test.ts (62+/5-). VERDICT PASS — P0/P1/P2
none; non-blocking notes (fresh-worktree dep builds; colliding 118-char
derived display IDs accepted by design with identity traveling intact; probe
artifacts left in the job tmp dir) accepted. Release-review gate launched
next.
**Release-review round (FAIL at 3a032a0 with two P2s, repaired at e7ffb02):** the
release reviewer ran the full sweep (diagnosis-contract 28/28, graph 98/98,
worker 4/4 + 132/132, typecheck/lint/build clean) plus 8 independent probes
(all 13 probe-emittable failure codes map deterministically; credential-shaped
evidence rejected; determinism; worker boundary fail-closed) and FAILed the
gate with two P2s, both independently reproduced:
- P2-1: the domain entity-key schema permits blocked graphEvidencePath
  segments (`constructor`/`prototype`), so a schema-legal published graph with
  such an entity made the mapper emit `affectedPaths: ["/domain/constructor"]`
  — a path the contract refuses — producing a DiagnosisV1 that failed
  `parseDiagnosis` (confirmed by probe for both keys; reachable through
  status-mismatch, denial, and idempotency mappings). Repaired with TDD at e7ffb02:
  `blockedPathSegments` (".", "..", "__proto__", "constructor", "prototype")
  guards `entityKnown` in `mapFailure`, so such entities fail closed to
  `graph.unknown_entity` with `["/domain"]` and never emit a blocked path; the
  fixed summary now reads "does not define or cannot address" (honest for both
  cases); the resolution contract is documented in the module docstring. Four
  regression tests (status-mismatch, denial, idempotency, runtime-unreachable
  on blocked keys) failed first (RED 4/32) then green (GREEN 32/32; full graph
  102/102, worker 132/132; typecheck/lint/build clean both packages). Two
  RED-round fixture bugs were test bugs, not logic bugs: the new tests passed
  the bare variant string instead of `{ variant: ... }`, and used step kind
  `authorization` instead of the contract's `authorization-denial`.
- P2-2: `baseDraftRevisionId` is a symbolic `draft-<graph metadata id>` that
  can never match a persisted Prisma cuid row, and the Task 5 approval
  resolution seam was undesigned and undocumented. Repaired by documenting the
  resolution contract (module docstring + Task 5 plan note): approval resolves
  the id by application-graph identity — the lifecycle enforces that every
  draft revision of an application graph carries the same metadata id — takes
  the LATEST mutable Draft revision of that application graph, and refuses
  when `hashApplicationGraph(draft.graph)` diverges from the diff's
  `baseGraphHash` (a draft edited after the published snapshot is not a valid
  approval base). Task 4 re-advanced to `ready_for_qa` at e7ffb02; release
  re-review launched next.
**Release re-review (PASS at e7ffb02):** the release reviewer re-ran the gate
in a detached worktree and confirmed both P2s closed: P2-1 reproduced at the
parent 3a032a0 exactly as found (binding.status_mismatch with
`["/domain/constructor"]` — `parseDiagnosis` throwing "Affected paths must be
mutable Graph paths."; the denial case emitted the add-binding diff with a
blocked affected path failing `parseDraftDiff`; the four regression tests fail
28/4 at the parent) and closed at e7ffb02 (every blocked-entity case fails
closed to graph.unknown_entity with ["/domain"], unreachable to ["/metadata"],
draftDiff null, every diagnosis round-trips; the blocked set exactly matches
the five graphEvidencePath-refused segments, and the entity-key schema admits
only constructor/prototype of them — "."/".."/"__proto__" are defense in
depth); P2-2 verified against code (assertGraphIdentity enforces
metadata.id === aggregate.key on every appendDraftRevision, latest-draft
selection by revisionNumber desc, hashApplicationGraph exported) and the
contract is sufficient for Task 5's approval interface. Gates: 32/32, 102/102,
4/4, full worker 132/132 single clean run, typecheck/lint/build clean.
Adversarial battery: 0/9 collateral differences vs the parent across a 9-case
normal-mapping comparison; no diff op for blocked entities; determinism holds;
no stale consumers of the old summary. Commit hygiene: e7ffb02^..e7ffb02
touches exactly diagnosis.ts (+31), diagnosis-contract.test.ts (+112), plan
(+1); diff --check clean. VERDICT PASS — P0/P1/P2 none. Non-blocking notes
(transient @factory/capabilities build TS7006 in a file untouched by this
diff, environmental; the blockedPathSegments and graphEvidencePath segment
lists are coupled across files with no equality test — recorded as residual
risk, noted for Task 7 hardening) accepted.
**PM acceptance at e7ffb02:** the PM independently verified at the commit —
working tree clean; the remediation diff read directly (the `entityKnown`
choke point covers every `/domain/<entity>` emission site, summary prose
honest, resolution contract documented); the PM's own runs at the commit:
diagnosis-contract 32/32, full graph 102/102, worker verification-diagnosis
4/4, full worker 132/132, graph typecheck/lint/build clean, worker
typecheck/lint clean. Task 4 is ACCEPTED: deterministic diagnosis and
reviewable Draft Diff are delivered as designed — first-failed-step-wins
mapping over the full probe failure-code vocabulary, immutable Published
Graph protection at both boundaries, bounded derived IDs, hostile-evidence
fail-closed, and draft diffs emitted only when a concrete safe operation is
derivable, with the approval resolution contract documented for Task 5.

## Task 5 — persist run evidence and expose review APIs — 2026-08-07

**Changed paths:** `apps/control-plane/prisma/schema.prisma` (+25:
`VerificationRun` model and the `Compilation.verificationRuns` back-relation),
`apps/control-plane/prisma/migrations/20260807_add_verification_run/migration.sql`
(new, hand-written, Prisma-style constraint names, `ON DELETE RESTRICT ON
UPDATE CASCADE`, mirroring the 20260730 composition-lock migration style),
`apps/control-plane/src/lifecycle.service.ts` (+2/-2: exported `exactRecord`,
`requiredString`, and `succeededCompilation` for reuse — single source of
truth, no duplication),
`apps/control-plane/src/verification/verification.service.ts` (new:
`createRun`/`getRun`/`reportEvidence`/`approveDraftDiff`),
`apps/control-plane/src/verification/verification.controller.ts` (new: 4
routes, worker-only evidence route behind `x-factory-internal-token`),
`apps/control-plane/src/app.module.ts` (+4, registered controller + provider),
`apps/control-plane/test/verification.service.test.ts` (new, 17 tests),
`apps/control-plane/test/verification.controller.test.ts` (new, 6 tests),
`apps/control-plane/test/prisma-schema.test.ts` (+54, VerificationRun model
assertions and a no-secret-field-name sweep).

**RED:** both new suites failed before implementation — the service and
controller modules did not exist (service 17/17 module-missing, controller 6/6
module-missing).

**GREEN:** service 17/17, controller 6/6, prisma-schema 8/8; full
control-plane 145/145; typecheck, lint, and build clean at 4ad23f3. All four
RED-round iterations were test-fixture or error-classification bugs, not logic
bugs, and are recorded here for the reviewers:
- the stale-base fixture used an empty domain (`entities: []`), which is
  semantically invalid — the policy permissions reference the removed expense
  entity — so `parseApplicationGraph` threw `GraphSemanticError` before the
  hash check (correct fail-closed behavior for a corrupt persisted draft,
  wrong fixture for the stale path); the fixture now uses a valid newer draft
  (expense gained a `note` field) so the stale-hash path is genuinely
  exercised;
- `field: "missing-field"` is not a contract-legal `fieldKey`
  (`/^[a-z][a-zA-Z0-9_]*$/` — hyphens rejected), so the not-applicable case
  failed at parse time with a 400 instead of `draft_diff_not_approvable`; the
  fixture now uses `field: "note"` (legal key, absent from the entity);
- `value: "not-a-boolean"` for a `unique` constraint is shape-valid in the
  Draft Diff contract (strings allowed) but shape-INVALID in the Graph field
  schema, and `@factory/graph` surfaces shape failures as raw `ZodError`
  (semantic failures as `GraphSemanticError`); the approval boundary now
  classifies both as non-applicability and refuses with 422
  `draft_diff_rejected` — mirroring the catch-all `validatedGraph` in the
  lifecycle service while keeping the 422 business-refusal semantics the
  tests pin;
- the digest assertion read `result.evidenceDigest` off the mock's stub row
  (null) instead of the update call args; it now asserts the digest the
  service actually wrote.

**Boundary design:** `createRun` binds the run identity to a compilation,
refuses non-succeeded compilations (422 `compilation_not_succeeded`), is
idempotent on retry with the same identity and compilation (no second
create), and returns 409 on a conflicting identity bound to a different
compilation. `reportEvidence` parses the evidence through the contract
redaction backstop, verifies the evidence's run identity matches the
addressed run, digests the parsed bundle deterministically (`sha256:` over
the schema-ordered JSON — the parsed object is rebuilt in schema key order),
persists only the bounded bundle, its digest, and the optional
diagnosis/Draft Diff (raw requests, responses, and generated material are
never stored), and maps the run to `succeeded`/`failed` from the evidence's
step statuses. A terminal run accepts only an identical digest (idempotent
retry); any different digest is a 409 illegal status transition.
`approveDraftDiff` resolves `baseDraftRevisionId` by application-graph
identity (`draft-<metadata id>` per the Task 4 resolution contract), takes
the LATEST mutable draft of that application graph, refuses a different
identity (`draft_diff_mismatch`) and drift (`hashApplicationGraph` vs
`baseGraphHash` → `draft_diff_stale`), translates ONLY `change-constraint`
operations into `{op: "add", path: /domain/entities/<i>/fields/<j>/<constraint>}`
Graph Diffs (add-binding/remove-binding/replace-input →
`draft_diff_not_approvable`: composition lock metadata cannot be fabricated
honestly at a review boundary), refuses unknown entities/fields the same way,
applies via `applyGraphDiffToDraft` (GraphDiffError/GraphSemanticError/
ZodError → `draft_diff_rejected`), and persists a new draft revision at
`latest.revisionNumber + 1` mirroring `proposeDraftRevision`. Input envelopes
are `exactRecord`-checked at the controller, so caller-controlled fields
(such as `compilationId` on the approve route) are 400 before the handler
runs. The internal evidence route requires the worker token
(`assertInternalWorkerToken`), 401 for missing or wrong tokens.

**Security/redaction:** evidence summaries are contract-allowlisted prose
with the 4-check redaction backstop; persisted columns are the bounded
bundle, its digest, and the reviewable diagnosis/Draft Diff — never raw
requests, responses, or generated material; the schema test asserts no
secret/token/credential/password-named fields on VerificationRun. Draft Diff
paths are derived from entity/field array indexes, never from caller
strings, so no JSON-pointer injection is possible.

**Residual risk (accepted):** approval is a deliberately narrow deterministic
translator (change-constraint only); broader diff kinds remain proposals for
human review. The `draft-<metadata id>` symbolic identity plus the drift
check refuse any base that does not match the current mutable draft, by
design. ZodError name-matching (control-plane has no direct zod dependency)
tracks `@factory/graph`'s error surface; it is pinned by the
not-a-boolean regression test. VerificationRun statuses are stored as text
and validated only at the boundary — consistent with the existing
`PreviewRun`/`Compilation` pattern.

**Task-review gate (PASS at 4ad23f3):** the task reviewer ran independently in
a detached worktree at the feature commit (full hash
4ad23f3658347d6f7494d7d2c9c6401e0644fedd): focused suites 31/31 (17+6+8),
full control-plane 145/145 run twice, typecheck/lint/build clean, prisma
generate with VerificationRun present; 28/28 adversarial checks across 14
scenarios (129-char verificationRunId -> 400; key-order-shuffled evidence ->
identical digest; terminal same-digest re-report idempotent with zero extra
updates; different evidence on terminal run -> 409; evidence run-identity
mismatch -> 400; leaked-secret and unknown-key rejections; approve with
matching hash but other-graph identity -> 422 draft_diff_mismatch with no
revision created; stale hash -> draft_diff_stale; add-binding ->
draft_diff_not_approvable; full success path bumps revisionNumber and stores
a revalidated graph; no published revision -> draft_diff_rejected); commit
hygiene exactly the 9 claimed files, diff --check clean; RED plausibility
confirmed structurally (parent has no src/verification/); ledger/plan
consistent. VERDICT PASS — P0/P1/P2 none. Non-blocking notes accepted:
check-then-create races on idempotent createRun and concurrent approvals
(consistent with existing repo patterns, not spec-demanded); diagnosis
verificationRunId parsed but not cross-bound against the addressed run
(evidence is the authoritative record); migration validated field-for-field
+ `prisma validate` (no live Postgres on this machine); approveDraftDiff
imposes no run-status gate and affectedPaths are advisory (spec requires
neither). Task 5 stands `ready_for_qa` at 4ad23f3; QA gate launched next.
**QA gate (PASS at 4ad23f3):** QA ran independently in its own detached
worktrees. RED at the parent (3a032a0): both suites absent there; run with
the gate's test files in the parent worktree they failed 2/2 suites, the
only error being module-missing for `src/verification/*` (vitest 2.x counts
a collection failure as 0 tests per file, so the ledger's "17/17, 6/6
module-missing" framing is a count-style claim; the cause is exactly as
stated). GREEN at the gate: graph build clean, prisma generate clean with
VerificationRun present, focused 31/31 (17+6+8), full control-plane 145/145
across 14 files run twice, typecheck/lint/build clean. Adversarial battery
28/28 across 20+ scenarios incl. key-order-shuffled evidence -> identical
canonical digest (parser canonicalizes to schema order), 128-char boundary
accepted vs 129-char rejected, no draftRevision created on any refusal,
success path applies at `/domain/entities/0/fields/0/unique` with
revisionNumber latest+1, corrupt persisted draft -> draft_diff_rejected,
idempotent createRun retry (3 calls, 1 create). Migration validation:
`prisma validate` OK, Prisma-engine `migrate diff --from-empty
--to-schema-datamodel` confirms table/constraint set matches migration.sql,
schema test against generated DMMF 8/8; live-DB application impossible (no
Postgres on this machine). Commit hygiene: exactly the 9 claimed files,
diff --check clean, lifecycle.service.ts diff exactly the three
function->export changes. VERDICT PASS — P0/P1/P2 none; all four prior
non-blocking notes independently confirmed, none escalated (race worst case
is a DB-unique-constraint-backed transient 500, retryable — the repo's
`startPreview` race-resilient pattern exists but the new code mirrors the
pre-existing appendDraftRevision/proposeDraftRevision check-then-create and
no corruption path exists; diagnosis run identity nit with evidence
authoritative; migration static validation; approval without run-status
gate and advisory affectedPaths — plan requires none). Observation for the
record: `reportEvidence` does not cross-check `evidence.compilationDigest`
against the compilation's `inputGraphHash` at the control-plane boundary —
the contract's full cross-bind exists for the Task 6 worker and the plan's
Task 5 interfaces do not demand it here. Release-review gate launched
next.
**Release-review gate (PASS at 4ad23f3):** the release reviewer ran the full
sweep in a detached worktree at the exact gate hash (graph build/
typecheck/lint clean, graph tests 102/102, prisma generate + validate clean,
focused 31/31, full control-plane 145/145, control-plane typecheck/lint/
build clean; migration DDL identical to `prisma migrate diff --from-empty
--to-schema-datamodel`, 20 normalized statements) plus a 60/60 adversarial
battery across 13 groups, including the release angles: affectedPaths
naming an unrelated root does not redirect the mutation (mutation lands on
the ops-named entity/field; traversal segments rejected at contract parse;
path derivation is numeric-index + 3-value enum, re-gated by
`assertPermittedDiffPath` — no caller string can reach a JSON pointer);
type-constraint approvals (type "unique" -> draft_diff_rejected, type=true
-> draft_diff_rejected, type "string" on an enum field persists a
contract-valid graph — the graph package enforces no enum/value consistency
rule, acceptable per mandate); persisted-key allowlist (persisted evidence
keys exactly the 7 contract keys; diagnosis/draftDiff columns null when
absent); 128/129-char and 400/401-char boundaries; missing cleanup and
missing artifactDigests fail closed with nothing persisted (artifactDigests
is contract-REQUIRED, not optional — reviewer's initial probe expectation
was wrong, the service was right); 20 ops applied vs 21 ops rejected at
parse; token guard compares sha256 digests via `timingSafeEqual` with
constant 32-byte buffers (no length-timing leak); digest determinism under
key-order shuffle; zero revisions created on every refusal. Hygiene: diff
exactly the 9 claimed files, diff --check clean, `4ad23f3^..HEAD` = feature
commit + three ledger/docs commits only; security vocabulary scan clean
(test-only fixture strings, token read solely from
process.env.FACTORY_INTERNAL_WORKER_TOKEN, .env gitignored); boundary
surface exactly 4 routes / 4 service methods / 1 controller + 1 provider;
plan Task 5 checkboxes all [x]; ledger complete. VERDICT PASS — P0/P1/P2
none. Non-blocking notes accepted: (1) the baseline schema has NO tracked
migration repo-wide (only 20260730_add_composition_lock ALTER + the new
20260807_add_verification_run exist; identical state at parent) — pre-
existing, out of Task 5 scope, provisioning via migrate dev/db push;
recommend a baseline migration outside this program; (2) type "string" on
an enum field persists a contract-valid graph (no enum/value consistency
rule in the graph package) — worth Task 6 worker consideration; (3) no
run-status gate on approval + advisory affectedPaths (accepted by plan);
(4) artifactDigests contract-required, fail-closed; (5) concurrency worst
case retryable DB-unique-violation 500, never corruption; (6)
compilationDigest cross-bind belongs to the Task 6 worker (already
recorded). PM acceptance launched next.

## Gate protocol

Each task must record: changed paths, tests run and exact counts, typecheck,
lint/build status, redaction/security observations, residual risks, and commit
hash. The task reviewer, QA, release reviewer, and PM must independently cite
the same commit before a task advances.

## Completion marker

`GOAL_COMPLETE` is forbidden until Task 6 demonstrates the full loop and Task 7
records fresh independent review, QA, release review, PM acceptance, a clean
worktree, and a remote-reachable commit. The next Goal after completion is
staged AI composition (`RequirementSpec -> CompositionPlan -> constrained
Graph Diff`).
