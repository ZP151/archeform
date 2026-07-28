# Factory UI Kit and Console migration ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

## Programme state

| Field | Value |
| --- | --- |
| State | planned |
| Outcome | One canonical Factory UI Kit produces a verified Console copy and governed generated-app candidate packages. |
| Approved ADR | `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md` |
| Contract | `docs/contracts/factory-ui-kit-v1.md` |
| Contract owner/status | integration / frozen |
| Single production write owner | integration until copy verification is green |
| Non-goals | Candidate promotion, new-plan selection, cloud deployment, or an arbitrary third-party UI installation. |

## Tasks

| ID | Task | Specialization | State | Dependency |
| --- | --- | --- | --- | --- |
| FUI-01 | Canonical UI Kit manifest, tokens, primitives, fixtures, and tests | integration | planned | frozen v1 contract |
| FUI-02 | Deterministic Console distribution and copy verifier | integration | planned | FUI-01 |
| FUI-03 | Console migration and visual/accessibility workflow evidence | frontend | planned | FUI-02 |
| FUI-04 | `ui.*@2.0.0` candidate package materialization and Registry denial proof | integration | planned | FUI-01, FUI-02 |
| FUI-05 | QA/review; resume real-model E2E only after UI acceptance | integration | planned | FUI-03, FUI-04 |
| FUI-06 | Read-only project lineage DAG using `@xyflow/react@12.11.2` | frontend | planned | ADR-008, FUI-02 |

## Acceptance criteria

- Console UI uses only the verified Console distribution, not ad-hoc component
  source or styling.
- A generated-app candidate set has real package manifests, templates,
  adapters, fixtures, tests, digests, and trust sidecars tied to the same
  canonical UI Kit version.
- A digest mismatch, missing style asset, candidate selection, or output-slot
  escape fails closed.
- Console and generated-app fixture prove matching canonical UI markers and
  accessible interaction states.

## Stop rules

- Do not run the real-model acceptance workflow while the Console and
  generated-app UI sources are different component systems.
- Any canonical contract change serializes ownership back to integration.
- Candidate packages remain outside Golden plan selection until the existing
  Trusted Registry promotion gate is independently accepted.
