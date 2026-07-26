# Project status

## Current milestone

Trusted Registry and Local Supply Chain (Stage 2) remains the next core platform
milestone under accepted ADR-004. The quarantined ADR-005 Console Next preview
is now accepted: its fixed shadcn source snapshot, exact dependency closure,
local-only lifecycle preflight, and loopback control console provide a
production-quality founder preview while leaving generated applications and
the Stage 1 component contracts unchanged.

## Completed evidence

- Requirement brief → schema-bound structured application definition → immutable child versions → definition approval → explainable six-component Golden plan → plan approval → separate local Executor preview.
- Fixture-backed leave, expense, and equipment-access briefs produce distinct definitions and exact expected Golden component plans. Raw briefs stay out of persisted state.
- The OpenAI Responses adapter uses `gpt-5.6-terra` with a strict compatible transport schema, then applies the unchanged frozen local schema and semantic policy as the final gate.
- The browser workspace supports structured editing, version lineage, two explicit approvals, run history/retry, loopback preview evidence, and stopping a preview without making raw JSON the primary workflow.
- The Executor accepts only signed, checksum-bound queue evidence; it uses fixed Compose arguments, loopback-only URLs, bounded smoke, TTL/explicit stop, and teardown.
- Fresh Python 3.12.9 verification: agent governance 4/4, API 74/74, Executor 24/24, browser workspace E2E (four named scenarios), JavaScript syntax, smoke help, and diff checks passed.
- A real Docker run reached `ready` on a redacted localhost dynamic port, completed submit/approve/audit smoke with HTTP 200, was explicitly stopped, and left no containers or volumes.
- A guarded live OpenAI smoke passed with `gpt-5.6-terra`; a real model-generated equipment-access definition was approved, planned with the six Golden components, built by the separate Executor, reached a loopback preview, and passed its generated smoke. The preview was explicitly stopped and its Compose containers and volumes were removed.
- Fourteen real Golden component packages now provide UI, signed local-session identity, RBAC, record API, approval workflow, audit, PostgreSQL runtime, fixtures, tests, typed template bindings, digests, and verification evidence.
- The Registry and Composer resolve only contained Golden packages, lock exact key/version/digest identities, reject invalid inputs, tampering, conflicts, path escapes, and post-validation changes, and atomically materialize a checksummed output manifest.
- Leave and expense applications resolve identical fourteen-package locks but have distinct validated labels, fields, UI, and schema artifacts. Both build a generated Next.js frontend, run through local Docker Compose, and pass browser-driven signed-cookie submit, role-switch, approve, and audit flows with cleanup.

## Component Suite boundary delivered

- A constrained internal approval-app product factory, not arbitrary prompt-to-code generation.
- Requirement → validated Application Definition → approved package locks → Composition Plan → contained materialization → separate local Executor → independently runnable application.
- One bounded approval profile with local signed development sessions, submitter/approver/auditor flows, and reproducible browser/Docker evidence. Cloud deployment and external component installation remain out of scope.

## Risks and decisions

- Component digests are locally verified but are not externally signed or provenance-verified; SBOM, signatures, license promotion, and candidate-to-Golden workflow remain Stage 2 work.
- Initial local Git source baseline `d14b41dec8dd5009e1c7393e76b540ec7522a71b` is established with pinned LF text checkout rules and no remote. It satisfies the repository-baseline prerequisite only; no package thereby gains provenance, and non-legacy promotion still requires exact source evidence, trust verification, lifecycle/policy decision, and explicit promotion approval.
- ADR-005 accepts a fixed-source, offline-only third-party UI intake design, not an intake action. No source snapshot, package manager/CLI, `ui.*@2.0.0` package, or v2 new-plan selection exists. Its work cannot start before Stage 2 is accepted and separately authorized external-source acquisition and promotion gates are satisfied.
- The generated session capability is a local development identity boundary backed by environment-supplied user directory and signing key; production OIDC, password KDFs, secret management, and multi-user operations require a future ADR.
- The repository has an initial local baseline and reproducible review point. It has no configured remote, so remote backup, collaboration, and publication remain deliberately out of scope.
- Generated applications use browser cookie sessions for the MVP, but their local user directory and signing key must remain external environment inputs and never enter output evidence.
- Console Next is an accepted local preview, not a Golden/generated-application
  component. Its fixed Next.js dependency tree has three high-severity audit
  advisories through `next`, `postcss`, and `sharp`; no compatible automatic
  upgrade exists for the approved profile. It must not be promoted to a
  production or Golden runtime until a dedicated dependency-security ADR and
  remediation slice are accepted.
- A paid live OpenAI call is intentionally not part of CI; the documented guarded smoke must be run manually with a locally configured `OPENAI_API_KEY` before enabling a live model-backed environment.
- Live-model reliability is not yet measured. During the first real founder test, a more detailed equipment-access brief was correctly rejected without persistent state because its output did not satisfy the frozen approval-app policy; an equivalent concise brief succeeded. The product needs an evaluation set and measured first-pass validity before broadening scope.
- The Executor is deliberately separate and must remain running to process explicit stop and TTL requests. The current console reports this correctly, but local startup still requires multiple manual processes rather than a founder-oriented development launcher.
- Cloud deployment, CI/CD mutation, artifact provenance verification, multi-user authentication, and production operations remain out of scope.

## Next smallest slice

Integration-owned TR-04: implement the append-only Trusted Registry lifecycle,
explicit legacy handling, revocations, and the per-package trust-evidence/policy
promotion blocker against the accepted frozen trust contract. Stage 1 contracts,
packages, locks, and Composer behavior remain frozen. The accepted Console Next
preview remains a local control-console path only.

## Completion gate

- Achieved: an approved dynamic definition starts as an isolated loopback local preview.
- Achieved: the submit, approve, and audit path passes an automated smoke test.
- Achieved: independent task review, focused QA, and final release review passed with no unresolved P0/P1.
- Achieved: two different validated applications use the same immutable package locks, run as generated Next.js/Docker products, and pass browser-visible role-aware approval and cleanup proof.
