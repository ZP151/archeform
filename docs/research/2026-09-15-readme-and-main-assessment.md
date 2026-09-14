# README references and main integration assessment

Date: 2026-09-15. Scope: public README correction and read-only delivery review.
This document records observations, not a technology decision or release acceptance.

## Product evidence and editorial choices

The September 5 consumer reset establishes the default goal: describe a need,
answer necessary business questions, and receive a usable application.
The September 13 definition-batch acceptance establishes five local definitions
across Ordering, Approval, and Team Task. Approval correction, Task correction,
and Publication Review supply actual business and recovery evidence.
The product-definition scale plan supplies the next coverage goals.
The threat model supplies the production identity and operating limitations.

The README now leads with that user outcome, shows an inspected actual generated
Publication Review screenshot, links each supported application to acceptance,
and separates local capability from production work. It replaces the old
assembler clone address, pins the documented package manager, protects an
existing local environment file, and explains that Compose down removes volumes.
The architecture retains Draft -> Publish -> immutable Compilation and stable
implementation identifiers. No source, dependency, security, or deployment
contract changes are proposed.

## Public GitHub references

Read on September 15, 2026. These are documentation and product-positioning
references only; no source, branding, or third-party assets were copied.

| Project and source                                                                     | Observed documentation pattern                                                          | Application to Archeform                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Appsmith README](https://github.com/appsmithorg/appsmith/blob/release/README.md)      | Concrete business use cases, installation choices, and a separate developer setup entry | Lead with useful business jobs and make local trial instructions discoverable     |
| [ToolJet README](https://github.com/ToolJet/ToolJet/blob/develop/README.md)            | Explicit feature boundaries and distinct quick-start and self-hosting guidance          | Name the supported scope and distinguish a local trial from production deployment |
| [Dyad README](https://github.com/dyad-sh/dyad/blob/main/README.md)                     | Short local-builder positioning and a direct download entry                             | State who the product serves and the next action before internal architecture     |
| [Amplication README](https://github.com/amplication/amplication/blob/master/README.md) | Reusable generation standards, usage, and monorepo development instructions             | Explain reviewed reusable definitions and retain a concise architecture map       |

These editorial choices are an interpretation of the linked examples.
Archeform does not inherit their features, license terms, maturity, integrations,
or hosting support. Popularity counts were not used as product evidence.

## Fresh Git and CI inspection

- Local and remote main both resolve to
  `ff9ae7eca0ca09b0d643d32627fa2882678eae94` after fetching origin.
- The latest delivered consumer branch resolves locally and remotely to
  `6c937d61dd50f56df3227af2e958ae3669627b34`, 29 commits ahead of main.
- The consumer worktree was clean before this documentation task.
- The original checkout remains on `codex/post-v0.1-local-readiness` with
  pre-existing document and Candidate-test changes; they were preserved.
- [Main CI run 33756827488](https://github.com/ZP151/archeform/actions/runs/33756827488)
  is failed. Its recorded Node 22.11 Candidate concurrency failure remains
  unresolved in the delivery ledger.
- [Consumer CI run 34758145809](https://github.com/ZP151/archeform/actions/runs/34758145809)
  at the inspected consumer tip failed `pnpm format:check` on both Node 22.11
  and Node 22.x. Later checks did not run.
- Local `pnpm exec prettier --list-different .` exited 1 and identified 30
  pre-existing files, including historical evidence and ADRs. This is a fresh
  formatting failure, not a fresh reproduction of the Candidate failure.

The latest slice is accepted for bounded local branch delivery. Its ledger
explicitly excludes main integration and repository release from that earlier
delivery. The new founder request asks for an up-to-date main, but does not
waive acceptance gates in `docs/delivery-policy.md`.

## Integration boundary

Synchronizing local main with origin/main is verified. Integrating the latest
functional iteration remains blocked by the recorded baseline and missing
passing full gates. A reviewed pull request must retain these failures and
must not mark the iteration or release accepted just because individual
product slices passed.

Historical source identities, approval hashes, and acceptance receipts must
remain traceable when addressing formatting. A blanket rewrite of evidence is
not part of this README correction. Candidate repair must address the actual
unchanged concurrency behavior; excluding tests, reducing concurrency, or
retrying until green does not resolve it.

The README describes the consumer branch explicitly until integration is
accepted. When main is accepted and merged, remove the temporary availability
notice, restore the default-branch clone command, rerun the applicable gate at
the merged commit, and verify local main equals origin/main.

This task does not restart the stopped PostgreSQL publication experiment,
publish a product revision, run a model, launch runtime resources, create a
repository release, or deploy to a cloud.
