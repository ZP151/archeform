# Governed Console Source Integration Ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

## Programme state

| Field | Value |
| --- | --- |
| State | implementing |
| Outcome | A real Factory control console based on verified Factory wrappers, governed third-party primitives, and a read-only lineage surface. |
| Approved ADR | `docs/adr/009-governed-developer-console-source-integration.md` |
| Design | `docs/superpowers/specs/2026-07-27-governed-factory-console-design.md` |
| Contract owner/status | integration / frozen (`docs/contracts/factory-ui-kit-v1.md`) |
| Single production write owner | integration |
| Allowed paths | `apps/console-next/`, `packages/ui-kit/factory-ui/`, `packages/vendor/temporal-ui/`, `tools/`, `tests/api/`, `tests/web/`, `docs/` |
| Non-goals | Backstage runtime adoption, Appsmith integration, generated-app promotion, cloud deployment, visual editing of Factory lifecycle state. |

## Tasks

| ID | Task | State | Completion evidence |
| --- | --- | --- | --- |
| GCI-01 | Create source inventory and exact dependency closure | implementing | Source SHA, notices, lockfile, audit output, integrity verifier. |
| GCI-02 | Rebuild canonical Factory wrappers and Console product shell | planned | Wrapper-only imports, production visual and accessibility evidence. |
| GCI-03 | Add read-only lineage and evidence inspector | planned | Sanitized graph model and interaction tests. |
| GCI-04 | Materialize generated-app candidate boundary and denial proof | planned | Candidate-package verification and Registry denial tests. |
| GCI-05 | Complete fixture and guarded live-model acceptance | planned | Production browser evidence, real model record, Executor cleanup evidence. |

## Stop rules

- A source snapshot, license notice, lockfile, or checksum mismatch blocks
  dependent implementation.
- Direct UI-library imports from Console product pages are prohibited; pages
  consume Factory-owned wrappers only.
- Temporal is a Svelte reference only; no Temporal code may enter the React
  Console runtime.
- Candidate UI packages are never selectable before the existing Trusted
  Registry promotion gate.
