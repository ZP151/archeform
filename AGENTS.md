# Archeform · 元象

Archeform is an Application Graph platform. The Graph is the source of truth;
visual editors, AI providers, generated code, and runtime providers are adapters.

## Non-negotiable rules

- Write code, tests, UI text, and documentation in English.
- Keep credentials in local environment files only. Never log, commit, persist,
  screenshot, or report credentials or raw AI prompts/responses.
- New product behavior starts with a failing focused test whenever practical.
- Preserve Draft -> Publish -> immutable Compilation. Compilers never consume a
  mutable draft.
- Do not add compatibility code for the archived Python/legacy-console platform.
- Use published package versions and retain their license notices; do not copy
  source from reference repositories without an explicit source-study record.
- Treat `@factory/*` packages and `factory.application-graph/*` values as stable
  implementation identifiers until an explicit versioned migration changes them.
- Follow the active PM ledger for write ownership. Parallel writers require a
  frozen shared contract and disjoint paths; a shared-contract change stops the
  parallel wave.
- Use GPT-5.3-Codex-Spark for bounded exploration, mechanical edits, focused
  tests, component/CSS details, formatting, and scoped re-review. Keep Graph,
  lifecycle, security, cross-package contracts, hard debugging, and final
  release judgment on the strongest assigned model.
- UI work is reuse-first. Before creating a component, block, screen, or
  template, search the approved Archeform UI registries, recipes, existing
  Workbench assets, generated-project templates, and pinned source studies in
  that order. Parameterize or compose an existing asset when it satisfies the
  contract; add a new asset only with a documented gap, provenance, tests, and
  a distinct registry key. Never copy Base44 assets or introduce a
  near-duplicate merely to change styling.
- Follow `docs/delivery-policy.md` for commits, pushes, integration into `main`,
  product Publish, and repository releases. Never force-push or bypass an
  acceptance gate. A repository release does not authorize cloud deployment.

## Technology-governance dispatch

`docs/tech-governance.md` is the current technology-decision authority, and
`docs/threat-model.md` is the current security and residual-risk authority.
Designs, plans, requirements, research, and generated proposals cannot silently
supersede either document.

PM must dispatch the Tech Lead before implementation whenever work changes or
introduces any of the following:

- a runtime, framework, package, or supported version;
- a database, ORM, queue, provider, or Compose topology;
- a stable Graph, API, schema, identifier, serialization, or compatibility
  contract;
- a security, credential, tenant, or data boundary;
- a compiler target, generated template, deployment, or operability contract;
- any current-to-proposed Golden profile transition.

The Tech Lead reads both authorities and writes only a proposed ADR. The ADR
must recommend `keep`, `experiment`, `migrate`, or `reject`; the founder must
explicitly accept or reject it before PM authorizes implementation. A plan,
design, or recommendation is not founder acceptance.

## Workspace map

- `apps/workbench`: Next.js Graph Studio.
- `apps/control-plane`: NestJS lifecycle and Graph API.
- `apps/compiler-worker`: BullMQ compilation worker.
- `packages/graph`: versioned Graph schemas and semantic validation.
- `packages/adapters`: editor, AI, Git, and provider adapters.
- `packages/compiler`: deterministic targets and generated-project templates.
- `packages/capabilities`: reusable business capabilities.
