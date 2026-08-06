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
| 1    | Verification/evidence/Draft-Diff contracts         | implementing | —     | —        |
| 2    | Isolated lifecycle and cleanup                     | planned | —             | —        |
| 3    | Migration, API, role, denial, idempotency probes   | planned | —             | —        |
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
identity, `VerificationContractError`.

**Residual risk:** bounded contract text is a redaction backstop; probe
construction in later Tasks remains responsible for emitting only allowlisted
evidence. `parseVerificationEvidence(input, run?)` cross-checks identity,
digest, and step order when the run is supplied.

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
