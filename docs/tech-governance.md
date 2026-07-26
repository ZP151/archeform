# Technology governance

## Purpose

Factory Pilot treats a material technology choice as an explicit product, security, and operational decision rather than an incidental implementation preference. Requirement text describes business capability; it never authorizes an agent to select a runtime stack. The workflow uses the pinned GitHub Spec Kit constitution and plan templates as read-only references and the pinned Awesome Copilot ADR skill to structure proposals.

## Authority

| Role | Authority |
|---|---|
| PM | Defines the product outcome, detects a governance trigger, records the decision, and creates implementation plans and ledgers. |
| Tech Lead | Investigates a concrete decision, writes only a proposed ADR under `docs/adr/`, and returns `keep`, `experiment`, `migrate`, or `reject`. |
| Founder | Accepts or rejects a proposed ADR. No other role can approve a Golden Profile change. |
| Engineer | Implements only the founder-approved profile and the paths assigned by PM. |

The Tech Lead cannot edit product code, component manifests, deployment configuration, or task state. A recommendation is not approval.

## Golden profiles

The current approved profile for the M2 product boundary is the stack stated in the product plan: generated Python 3.12/FastAPI service, PostgreSQL 16, Next.js 15/React web client, and Docker Compose. Repository manifests, lockfiles, base-image tags, and component BOMs hold the concrete dependency pins. A task implements that profile unless the founder accepts an ADR that changes it.

The Tech Lead may recommend one of four outcomes: `keep`, `experiment`, `migrate`, or `reject`. An experiment must be reversible, have bounded evidence, and must not silently replace the Golden Profile.

## Decision triggers

PM requests a Tech Lead ADR before implementation planning that changes or introduces a framework, language, database, cloud/runtime service, deployment topology, major-version dependency, shared API/data contract, Golden component implementation or compatibility range, or security-sensitive platform integration. Routine work inside the existing pinned profile does not require a new ADR.

The Tech Lead owns only the proposal in `docs/adr/`. The ADR records context, decision drivers, considered options, consequences, rollout or experiment boundary, compatibility impact, and recommendation. The founder explicitly accepts or rejects it before the PM may route implementation.

## ADR completion gate

### Founder approval

Every ADR is a proposal until the founder records an approval or rejection. PM records the decision, date, and ADR path in the task ledger. PM may not schedule a Golden Profile change from an unapproved or rejected ADR, and the Tech Lead cannot approve its own decision.

### Exact versions

An approved technology decision records exact language, framework, database, runtime image, build tool, and material direct-dependency versions. Floating tags and unbounded ranges are not profile definitions. It must also identify component-catalog, configuration, supply-chain, and license implications.

### Migration and rollback

Any `migrate` decision states ordered migration steps, the compatibility boundary, data and API migration, rollback point, abort conditions, owner, restoration procedure, and irreversible step. An `experiment` must identify its isolation, expiry or decision gate, and removal path and must remain reversible.

### Verification plan

The ADR defines measurable behavior, security, reliability, performance, and operational checks required before a profile change is accepted, including exact verification commands. The plan names where evidence will be recorded in the task ledger.

### Frozen API contract

Before frontend and backend tasks run in parallel, the contract owner records the versioned request/response or event shape, errors, actor/authentication semantics, compatibility rule, artifact path, and `frozen` status in each ledger. A changed or unfrozen contract immediately stops dependent work, moves to the `integration` specialization, and is serialized until PM records a new frozen version.

## Task specialization

Every implementation ledger declares one of these specializations:

- `frontend`: browser and UI implementation.
- `backend`: service, domain, persistence, and backend tests.
- `platform`: CI, containers, deployment, and runtime configuration.
- `integration`: shared contracts, generated templates, cross-service wiring, and end-to-end verification.

Each ledger records a contract owner, contract status (`not applicable`, `unfrozen`, or `frozen`), and versioned contract artifact. Frontend and backend writers may run concurrently only when both ledgers name the same owner and frozen artifact, their allowed write paths are disjoint, and neither writer touches the shared contract, generated template root, Compose topology, or end-to-end smoke path. Work that changes an unfrozen shared contract is owned and serialized by `integration`.
