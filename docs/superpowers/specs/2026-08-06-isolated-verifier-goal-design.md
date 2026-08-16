---
Date: 2026-08-06
Status: Approved
Approved-By: Founder
Required-Plan: docs/superpowers/plans/2026-08-06-isolated-verifier.md
Required-Ledger: docs/superpowers/ledgers/2026-08-06-isolated-verifier.md
---

# P0 Isolated Verifier Goal Design

## Outcome

Deliver the next P0 boundary for Factory Pilot: an isolated generated-application
verifier that consumes only an immutable Compilation and returns bounded,
redacted evidence. It must execute the complete local acceptance loop:

```text
compile -> isolated boot -> migration -> health -> API -> role journeys
-> authorization denial -> idempotency -> cleanup -> safe diagnosis
-> reviewable Draft Diff
```

The verifier proves that a published Graph can become a runnable application;
the diagnosis result may propose a constrained Draft Diff, but it may never
patch generated source, runtime state, a Published Graph, or a Compilation.

## Evidence baseline

- The Compiler Target Plugin Kernel Goal is accepted at branch tip
  `1137e1e` with the database migration accepted at `76933ca`.
- `@factory/compiler` currently passes 329 tests and
  `@factory/compiler-worker` currently passes 81 tests at the inspected tip.
- `apps/compiler-worker/src/preview-runner.ts` already provides verified
  artifact materialisation, Docker Compose start/health/stop, derived project
  names, and cleanup failure codes. The new verifier must compose this boundary,
  not bypass it.
- Existing generated profiles contain role-aware journeys and idempotent
  operations, but no single verifier owns the complete sequence or produces a
  reviewable diagnosis-to-Draft-Diff record.

## Invariants

1. The only compilation input is an immutable Published Graph plus its locked
   package versions and digests. A mutable Draft is never compiled or verified.
2. Every environment, port, Compose project, temporary directory, and database
   is Factory-derived, isolated, bounded by a timeout, and cleaned up on every
   exit path.
3. Evidence is allowlisted and digest-addressed. It contains statuses, bounded
   response summaries, role/action names, artifact digests, and cleanup facts;
   it never contains credentials, raw prompts, raw model responses, headers,
   cookies, full request bodies, or unrestricted process output.
4. Diagnosis is deterministic for verifier evidence. It classifies a failure as
   `graph`, `capability`, `binding`, `target`, `runtime`, or `unknown` and emits
   only a schema-valid Draft Diff against a mutable Draft.
5. A verifier retry is idempotent by `verificationRunId` and immutable
   Compilation digest. A conflicting retry fails closed.
6. A failed or cancelled verifier must still attempt cleanup and must report
   cleanup failure separately; cleanup failure is a release-blocking P1.
7. Fixture-based tests remain deterministic. A guarded real OpenAI check is not
   required to verify runtime behavior and may not be used to hide missing
   deterministic coverage.

## Scope

### Included

- Versioned verification-run, evidence, diagnosis, and Draft-Diff contracts.
- Worker orchestration over the existing compilation executor and preview
  runner.
- Migration, health, API, role-journey, denial, idempotency, and cleanup probes.
- Safe evidence redaction, deterministic diagnosis, and a reviewable Draft Diff.
- Control Plane persistence/read APIs for run status, evidence, and proposed
  Draft Diff, without mutating Published Graph or Compilation records.
- One complete acceptance profile, selected by the implementer from the
  already accepted Expense Approval or Simple Ecommerce fixtures, plus a
  regression run over the other profile when the existing harness supports it.

### Excluded

- New business profiles or new capability packages.
- Production identity, real payments, external providers, cloud deployment,
  fleet management, observability, or managed rollback.
- Reverse parsing generated source into a Graph.
- Automatic application of a diagnosis or AI-generated diff.
- A UI redesign. The Workbench may expose evidence only through existing
  lifecycle surfaces in this Goal.

## Completion decision

The Goal is complete only when the ledger records `GOAL_COMPLETE`, a fresh
independent task review, QA, release review, and PM acceptance all cite the
same remote-reachable commit, and one profile has a reproducible evidence bundle
covering every step in the loop plus immutable-state and cleanup assertions.
