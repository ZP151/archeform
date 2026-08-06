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
| 3    | Migration, API, role, denial, idempotency probes   | ready_for_qa | e58b5a6       | task review FAIL P2 (header names) repaired d652bfc, re-review PASS d652bfc; QA FAIL P1 (unreachable endpoints emitted httpStatus 0 → evidence contract rejected → probe.crashed) repaired de2e667; RED 5/27 then GREEN 27/27 + lifecycle regression; worker 128/128; typecheck/lint clean; QA re-run pending |
| 4    | Deterministic diagnosis and constrained Draft Diff | planned | —             | —        |
| 5    | Control Plane persistence and review APIs          | planned | —             | —        |
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

**Residual risk (accepted):** success journeys on record-bearing routes
(`expense.approve`, `order.place`, `order.capture-payment` as authorized
principals) cannot pass end-to-end until the Task 6 acceptance fixture seeds
the referenced records — the registry entries are declared data and the
end-to-end acceptance is Task 6's scope; denial journeys and create/list/read
journeys are fully exercisable now.

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
