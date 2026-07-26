---
title: "ADR-002: VNext Model Adapter and Local Executor"
status: "Accepted"
date: "2026-07-25"
authors: "Tech Lead"
tags: ["architecture", "decision", "experiment", "vnext"]
supersedes: ""
superseded_by: ""
---

# ADR-002: VNext Model Adapter and Local Executor

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Founder accepted this bounded experiment on 2026-07-25 by authorizing execution of the VNext implementation plan. PM records this ADR as the technology boundary for the VNext ledger.

## Context

- **CTX-001**: The approved MVP profile generates an isolated blueprint from a fixed requirement normalizer. Its control plane intentionally does not invoke Docker, shell commands, cloud APIs, or arbitrary external components.
- **CTX-002**: The VNext product contract requires an editable, versioned `ApplicationDefinition`, an explainable Golden component plan, and a local runnable preview for the bounded internal approval-app profile.
- **CTX-003**: Requirement interpretation must remain constrained: an LLM may propose only a strict application definition; it must not choose a technology profile, write source files, use tools, or influence Docker arguments.
- **CTX-004**: Running a preview changes the deployment topology. The control plane must retain its no-Docker/no-shell boundary, so preview execution needs an independently constrained local process.

## Decision

Recommend a bounded, reversible **experiment** with the following proposed profile. The existing MVP Golden profile remains the approved default until the founder accepts this ADR and VNext evidence passes.

- **DEC-001**: Keep Python **3.12**, FastAPI, PostgreSQL **16**, Next.js **15**/React, and Docker Compose as the application Golden profile; do not select a stack from requirement text.
- **DEC-002**: Add a control-plane-only OpenAI adapter pinned to **`openai==2.48.0`** and strict local JSON Schema validation pinned to **`jsonschema==4.26.0`**, using the **Responses API**, model **`gpt-5.6-terra`**, and `reasoning.effort="medium"`.
- **DEC-003**: Require the adapter to return only the versioned `ApplicationDefinition` JSON shape. Validate every response again locally against the repository-owned strict JSON Schema before persisting or planning it; invalid, unsafe, unavailable, or malformed output creates no project version, plan, or run.
- **DEC-004**: Read `OPENAI_API_KEY` only from the local process environment. It is never accepted in HTTP input, persisted in state, rendered into output, copied to evidence, or logged. The model setting is an environment configuration, not a UI or requirement choice.
- **DEC-005**: Preserve the control-plane execution boundary. After both approvals, it renders only repository-owned, checksum-recorded artifacts and writes an immutable queue-file request under `apps/api/runs/<run-id>/`; it does not import `subprocess`, call Docker, or send requests to an Executor.
- **DEC-006**: Add a distinct, explicitly started localhost Executor process. It polls only the validated runs root, verifies the queue request, Golden component lock, output path containment, and recorded checksums, then invokes only fixed-array Docker Compose commands for the approved output.
- **DEC-007**: Bind previews only to `127.0.0.1`; derive the preview URL from fixed Compose port inspection and reject non-loopback results. Preview runs expire after **30 minutes**, support an explicit stop request, and are torn down after build or smoke-test failure.
- **DEC-008**: Keep the experiment limited to one submitter, one approver, zero to three auditor/observer roles, one primary record, the fixed submit/approve/reject lifecycle, and the existing six Golden components. It does not add cloud deployment, external component acquisition, multi-level workflows, source editing, or arbitrary command execution.

## Proposed Profiles and Compatibility

| Aspect | Existing approved MVP profile | Proposed VNext experiment |
|---|---|---|
| Requirement normalization | Fixed deterministic leave parser | Schema-bound OpenAI candidate, then local strict validation |
| Model dependency | None | Python 3.12 + `openai==2.48.0` + `jsonschema==4.26.0`; Responses API; `gpt-5.6-terra`; medium reasoning |
| Business contract | `factory/v1alpha1` fixed IR | Versioned `factory/v1` `ApplicationDefinition` JSON Schema |
| Generated output | Isolated rendered blueprint only | Same owned-template renderer plus immutable render manifest and Executor request |
| Runtime topology | Control plane only; no Docker execution | Control plane plus separately started localhost queue-file Executor |
| Preview lifetime | Not applicable | Loopback only; 30-minute maximum; explicit/automatic teardown |

- **COM-001**: Existing MVP endpoints and generated leave blueprint remain available as deprecated compatibility shims during VNext; the VNext workspace depends only on the frozen VNext HTTP contract.
- **COM-002**: The VNext schema and HTTP contract must be frozen by the integration owner before frontend and backend tasks run in parallel. A contract change stops parallel work and returns it to serialized integration ownership.
- **COM-003**: The experiment adds no database migration. JSON state gains version, plan, run, and evidence records only; raw requirements remain browser-session-only after their checksum is calculated.

## Consequences

### Positive

- **POS-001**: Requirement understanding becomes useful across leave, expense, and equipment-access approval applications without allowing unconstrained prompt-to-code behavior.
- **POS-002**: Double validation combines model structured output with deterministic local policy enforcement and makes model failures fail closed.
- **POS-003**: A separate queue-file Executor preserves the control-plane safety boundary while allowing measurable local preview and smoke evidence.
- **POS-004**: Versioned structured definitions, pinned component locks, render manifests, and run evidence provide replayable lineage for every preview.

### Negative

- **NEG-001**: The local OpenAI API dependency introduces key management, latency, cost, provider availability, and model-output variance that the deterministic MVP did not have.
- **NEG-002**: The Executor adds Docker Desktop availability, host-resource usage, cleanup reliability, port handling, and queue-file integrity concerns.
- **NEG-003**: The approval-app schema intentionally excludes many product shapes; requests outside its limits must return open questions or validation feedback rather than approximate a solution.
- **NEG-004**: The experiment requires a new shared data/API contract and serial integration work around template rendering and Compose topology.

## Alternatives Considered

### Keep the deterministic leave-only parser and blueprint generator

- **ALT-001**: **Description**: Retain the current fixed parser, all-components plan, and render-only output.
- **ALT-002**: **Rejection Reason**: It cannot meet the VNext outcome of different editable approval-app definitions or a real local product preview.

### Allow an LLM to generate source code and launch it from the control plane

- **ALT-003**: **Description**: Let the model write arbitrary files and have the API service run Docker or shell commands directly.
- **ALT-004**: **Rejection Reason**: It violates the approved threat-model boundary, cannot guarantee Golden components or deterministic provenance, and couples untrusted text to host execution.

### Use a direct HTTP control-plane-to-Executor invocation

- **ALT-005**: **Description**: Have the control plane call a local Executor endpoint to start and stop previews.
- **ALT-006**: **Rejection Reason**: It creates an additional authority channel and weakens the clear no-network/no-execution control-plane boundary. A validated filesystem queue keeps the handoff inspectable and fail-closed.

### Add a cloud preview environment now

- **ALT-007**: **Description**: Provision preview infrastructure in a cloud account for every approved plan.
- **ALT-008**: **Rejection Reason**: It adds credentials, cost, deployment governance, egress, and cleanup obligations outside the local VNext scope.

## Security and Operability Controls

- **SEC-001**: The model receives a bounded prompt and has no tool access, runtime selection authority, shell access, registry access, cloud credentials, or code-write channel.
- **SEC-002**: The OpenAI key, raw brief, prompt contents, full provider response, and command lines are excluded from persisted state, generated artifacts, and evidence. Store only a raw-brief checksum, validated definition, and minimal model provenance.
- **SEC-003**: The Executor has no cloud or production credentials, consumes only contained run paths, rejects unapproved/tampered/expired/duplicate requests, and writes status atomically in the run directory.
- **SEC-004**: Docker execution uses fixed argument arrays only. No requirement, label, path, identifier, or UI value is interpolated into a shell command. Build failure, smoke failure, explicit stop, and TTL expiry use fixed teardown arguments.
- **SEC-005**: The generated application retains role-based multi-user workflow, append-only audit history, Golden catalog pinning, two independent approvals, capability-token/CORS checks, and path-containment regressions.
- **OPS-001**: Executor status is limited to queued, building, smoke-testing, ready, failed, and stopped; status exposes bounded credential-redacted log excerpts, timestamps, smoke evidence, and loopback preview URL only.
- **OPS-002**: A missing API key, model timeout/refusal, invalid structured output, offline Executor, failed Docker build, unavailable preview, or failed smoke test leaves no partially approved run and presents an explicit retryable failure.

## Component Catalog Impact

- **CAT-001**: No public registry, package download, dynamic capability discovery, or unpinned artifact is introduced.
- **CAT-002**: The VNext experiment continues to resolve only the six repository-owned Golden components: `frontend.admin-shell`, `backend.fastapi-crud`, `auth.rbac-local`, `workflow.single-level-approval`, `ops.audit-log`, and `data.postgres-compose`.
- **CAT-003**: Each existing manifest will gain deterministic `provides`, `input_contract`, and `selection_explanation` metadata, while retaining its key, exact version, digest, and Golden status.
- **CAT-004**: The component plan records the resolved key, version, digest, trust level, dependency relationship, definition-derived inputs, and human-readable reason for every selected component. A missing, non-Golden, incompatible, or digest-mismatched component blocks planning and execution.

## Migration, Rollback, and Experiment Gate

- **MIG-001**: Before implementation, the founder must explicitly accept this proposed ADR. PM then creates the VNext ledger, and the integration owner freezes the JSON Schema and HTTP contract before writers are dispatched.
- **MIG-002**: Introduce the adapter behind the VNext project route and deterministic fixture provider. No required unit, API, or browser test may require a live model key or paid API call.
- **MIG-003**: Add the Executor only after deterministic definition-driven rendering and component locks are proven. Its worker is started explicitly; it never starts automatically with the control plane.
- **MIG-004**: Accept the experiment only when the VNext release evidence proves three distinct valid approval definitions, a real loopback preview with submit/approve/audit smoke evidence, tamper/expiry cleanup, and all MVP safety regressions.
- **RBK-001**: Rollback is configuration and process removal: disable the VNext OpenAI provider and do not start the Executor. Retain existing v0 deterministic blueprint rendering, approvals, Golden catalog, and state without data migration.
- **RBK-002**: Abort the experiment if model output cannot be reliably validated, secrets/raw briefs appear in state or evidence, Docker cannot be contained to loopback/approved output, cleanup cannot be demonstrated, or any P0/P1 release-review finding remains unresolved.

## Implementation Notes

- **IMP-001**: The control-plane direct dependencies are exactly `openai==2.48.0` and `jsonschema==4.26.0`; the model setting is `FACTORY_OPENAI_MODEL` defaulting to `gpt-5.6-terra`. Changing the default model, reasoning level, provider, or either pin requires a new ADR review.
- **IMP-002**: The `ApplicationDefinition` schema uses `additionalProperties: false` at every object level and enforces the fixed structural role, record, field, lifecycle, and page constraints. The frozen semantic-validation rules in `docs/contracts/control-plane-vnext-api.md` additionally enforce duplicate-ID, reserved-identifier, label, credential-like-text, and page-coverage constraints before persistence.
- **IMP-003**: The renderer may consume only a locally validated, approved definition and locked plan. It emits application definition, component lock, render manifest, and run summary artifacts with checksums and no raw brief or credential.
- **IMP-004**: The Executor validates queue-request, lock, and render-manifest checksums before its fixed Compose `up`, port inspection, smoke, and `down` operations. It never interprets generated content as commands.
- **IMP-005**: The owner records command output, run ID, redacted localhost preview evidence, cleanup result, residual risks, task-review findings, QA findings, and release-review result in the VNext ledger.

## Verification Gate

The experiment is not accepted merely because this ADR exists. The delivery ledger must contain fresh successful evidence for the following commands and scenario checks:

```powershell
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
python -m unittest discover -s tests/executor -v
node --check apps/web/app.js
node tests/web/workspace-e2e.mjs
python packages/templates/leave-approval/smoke_test.py --help
git diff --check
```

- **VER-001**: Fixture-based tests prove that leave, expense, and equipment-access briefs produce distinct locally valid application definitions without using a live key.
- **VER-002**: API and domain tests prove raw brief/API-key absence from persisted state and output; invalid or unavailable provider results create no version, plan, or run; and both approval gates cannot be skipped.
- **VER-003**: Executor fake-Docker and real Docker evidence prove fixed argument construction, checksum/tamper rejection, loopback-only URL validation, smoke success, explicit stop, TTL stop, and teardown after failure.
- **VER-004**: Browser evidence proves the founder can complete Brief → editable application definition → first approval → explained plan → second approval → queue → ready preview → stop → child version without raw JSON as the primary UI.
- **VER-005**: Task reviewers, QA, and the independent release reviewer record no unresolved P0/P1 findings. The founder makes the final accept/reject decision after reviewing the ledger evidence.

## References

- **REF-001**: `docs/architecture.md` — ADR 001 controlled-compilation invariants and planned substitution points.
- **REF-002**: `docs/tech-governance.md` — founder approval, exact-version, rollback, and verification requirements.
- **REF-003**: `docs/threat-model.md` — current no-Docker/no-cloud control and required later-runner boundary.
- **REF-004**: `docs/superpowers/plans/2026-07-25-vnext-requirement-to-product-workspace.md` — VNext bounded contract and acceptance evidence.
