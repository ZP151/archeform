# Task Ledger: vnext-requirement-to-product-workspace

- **State:** accepted
- **Owner:** pm
- **Single write owner:** integration owner for shared contract/template paths; one assigned engineer per serialized implementation task
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** `docs/contracts/application-definition-v1.schema.json`; `docs/contracts/control-plane-vnext-api.md` (`factory-control/vnext-1`)
- **Allowed write paths:** bounded by the active task in `docs/superpowers/plans/2026-07-25-vnext-requirement-to-product-workspace.md`
- **Read-only parallel work:** task reviews, QA, and release review only; no overlapping production writers
- **Approved ADR:** `docs/adr/002-vnext-model-adapter-and-local-executor.md` (Accepted 2026-07-25)
- **Plan:** `docs/superpowers/plans/2026-07-25-vnext-requirement-to-product-workspace.md`

## Outcome

Deliver a founder-operated requirement-to-product workspace for the constrained internal approval-app Golden Path: structured definition versions, explainable Golden plans, two approvals, separate local preview execution, evidence, and iteration.

## Non-goals

- Arbitrary application types, multi-level workflows, free-form source editing, cloud deployment, external component installation, or automatic Executor startup.
- Raw brief persistence, provider credential transport over HTTP, control-plane Docker/shell execution, or production/cloud credentials.

## Safety invariants

- Only locally validated `factory/v1` application definitions can be approved, planned, rendered, or queued.
- Only repository-owned Golden component entries with pinned key/version/digest can appear in a plan or run.
- The control plane remains free of shell, Docker, and Executor-network invocation; the separate worker consumes only contained, checksum-verified queue artifacts.
- The two approval gates cannot be skipped, and all preview URLs remain loopback-only with a 30-minute maximum lifetime.

## Dependencies

- ADR 002 accepted by founder on 2026-07-25.
- Frozen VNext schema and HTTP contract named above.
- Docker Desktop is required only for the final real preview evidence.

## Acceptance criteria

1. Three fixture briefs produce distinct valid approval-app definitions without a live OpenAI key.
2. A founder can edit a child definition version, approve it, inspect a complete explainable component plan, approve it, queue a build, open a loopback preview, stop it, and inspect evidence without using raw JSON as the primary UI.
3. The separate Executor proves checksum verification, loopback-only binding, smoke evidence, failure cleanup, explicit stop, and TTL stop.
4. Existing MVP safety, catalog, path-containment, capability-token, CORS, approval, and audit regressions remain covered.

## Coordination

ADR 002 is accepted. The VNext schema and API contract are frozen: `python -m json.tool docs/contracts/application-definition-v1.schema.json` and a Draft 2020-12 fixture validation both completed with zero errors on 2026-07-25; the backend and frontend contract reviewers independently confirmed the frozen artifact. Task 2 backend implementation owns API/domain paths. Task 3 renderer/planner and Task 5 web UI may proceed only after Task 2 has produced a reviewed contract-compatible implementation, with disjoint write paths. Task 4 is serialized after Task 3 because it changes shared renderer/Compose topology. Task 4 also owns the single superseded pre-Executor assertion in `tests/api/test_component_planner.py`, replacing it with immutable Executor-request evidence. A contract change returns work to integration and changes this ledger to `unfrozen` before any writer continues.

## Implementation evidence

- **Changed paths:** Task 1 governance artifacts; Task 2 API/domain/provider paths and focused tests; Task 3 catalog/control-plane/template/planner paths; Task 4 Executor/control-plane/runtime/test paths; Task 5 `apps/web/**` and fixture-backed browser E2E.
- **RED:** Task 2 tests first failed for missing application-definition/provider modules, provider injection, VNext project routes, VNext wrapped plan/run behavior, invalid base-version type handling, and explicit model refusal. Task 3 planner/render tests first failed for missing extended metadata, unstable plan checksum, absent dynamic output, generated-source indentation, actor/page authorization, quote/backslash label compilation, checksum tampering, and optional field semantics. Task 4 security tests reproduced unsigned request/status forgery, missing executor key/claim, expiry after build, and cleanup-retry failures. Task 5 E2E first failed because the v0 UI lacked `Local session capability`; repair tests then reproduced async stop/expiry, audit coverage, plan recovery, run-history, component-input, and label-XSS gaps.
- **GREEN:** Required gates were rerun sequentially with Python 3.12.9: `py -3.12 -m unittest discover -s tests/agents -v` (4/4), `py -3.12 -m unittest discover -s tests/api -v` (74/74), and `py -3.12 -m unittest discover -s tests/executor -v` (24/24). `node --check apps/web/app.js`, `node tests/web/workspace-e2e.mjs` (four named scenarios, including API-normalized workflow ordering), `py -3.12 packages/templates/leave-approval/smoke_test.py --help`, and `git diff --check` all passed. The versioned evaluation corpus drives fixture-backed create → definition approval → plan creation for leave, expense, and equipment access, and locks the expected six Golden components.
- **Real Docker evidence:** Run `run_KyY2YAN1Bx7E3ufY1n_bwEn090WbZEuP` was queued from an approved dynamic definition at `C:\Users\15492\AppData\Local\Temp\factory-pilot-task4-final-ve10bpk8`. The separately started worker command was `py -3.12 -m apps.executor.worker`; it executed only its fixed Compose array (`docker compose --project-name factory_<safe-run-suffix> --file <validated-output>/docker-compose.yml up --build --detach`). It reached `ready` at `http://127.0.0.1:<dynamic-port>`; its 60-second bounded smoke completed submit → approve → audit with HTTP 200. A signed explicit stop then reached `stopped`; `docker compose ps --all` found no project containers and no project volumes remained. No raw brief, capability, OpenAI key, or Executor key appeared in state or output.
- **Model boundary evidence:** The strict OpenAI transport schema is a deterministic projection that uses only supported Structured Outputs constructs, requires every object property, models optional enum choices as nullable, and is followed by the unchanged frozen schema plus semantic-policy validation. The guarded manual live smoke is documented but was not run because no API key is required for release evidence.
- **Residual risks:** The live paid-model request remains an intentional manual check; no OpenAI key was used during this release. Docker Desktop availability remains a local prerequisite for a preview. The browser may request a missing favicon, which is cosmetic and does not affect the workflow.

## Task review

- Task 1 initial review found P1 contract/schema/ledger gaps. Contract repair added schema cardinality, named semantic validation, complete object shapes, run/executor states, and controlled artifact retrieval. Backend/frontend reviewers returned `CONFIRM`; the scoped re-review requested only ADR/ledger evidence reconciliation, resolved in this entry.
- Task 2 initial review found P1 VNext plan/run legacy fallthrough, invalid base-version connection abort, and incomplete provider/schema/privacy coverage. Fix round 1 separated VNext queued runs from legacy rendering, wrapped plan/run responses, added typed invalid-ID handling, and expanded provider coverage. Fix round 2 added complete schema-boundary and persisted-state privacy regressions. Final scoped review found no P0/P1.
- Task 3 initial review found P1 actor/page authorization drift, source generation for quote-bearing valid labels, locked-definition checksum tampering, and optional number/enum semantics. Fix round 1 added exact generated API/UI role guards, Python-safe label rendering, verified checksums before planning/rendering, and null-preserving optional field handling. Scoped re-review passed with no P0/P1.
- Task 4 initial review found P1 forged request/status evidence, remote Docker authority inheritance, incomplete lifetime enforcement, non-retried cleanup, non-durable terminal state, plus publish/claim/Windows-alias gaps. Fix round 1 added HMAC-signed Executor-only evidence, local-only Docker enforcement, deadline checks, signed lease claims, durable terminal anchors, cleanup retry, write-before-publish, and junction fallback coverage. Scoped re-review passed with no P0/P1.
- Task 5 initial review found P1 async run lifecycle, audit-role edit drift, run retry/history, and stranded approved definitions plus P2 client validation/component-input/label-XSS gaps. Fix round 1 added live run polling, synchronized audit coverage, historical run selection/retry, recoverable plan creation, complete validation/input display, and real label-XSS browser evidence. Scoped re-review passed with no P0/P1.

## QA

- Whole-slice QA initially found strict-transport-schema, release-evidence, stale-server, and real API workflow gaps. Each was repaired and independently re-checked. Final focused QA passed with no P0/P1: a fresh Python 3.12.9 fixture API on loopback and real Chrome completed `POST /api/projects` (201), definition approval (200), plan creation (201), plan approval (200), and six Golden component verification. It also confirmed native project-name validation, raw brief/capability absence from persisted state, cleanup of temporary API/runtime resources, and no listener remaining on 8080.

## Release review

- Initial release review found no implementation P0/P1, but correctly blocked acceptance on Python 3.12 evidence and stale PM release records. Python 3.12 gates and the evidence/status reconciliation above addressed those findings. Final re-review passed with no P0/P1. Its only P2 was the corrected scenario-count wording in this ledger.

## PM decision

- 2026-07-25: Founder authorization to execute the VNext plan is recorded as acceptance of ADR 002. PM froze `factory-control/vnext-1` after zero-error schema example validation, backend/frontend contract confirmations, and Task 1 evidence reconciliation. PM accepted Task 2–5 for QA after final scoped task reviews found no P0/P1. Focused QA and final independent release re-review passed with no unresolved P0/P1, so PM accepts VNext.
