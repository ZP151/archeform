# Factory Pilot

Factory Pilot is an Application Graph platform. The Graph is the source of truth;
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

## Workspace map

- `apps/workbench`: Next.js Graph Studio.
- `apps/control-plane`: NestJS lifecycle and Graph API.
- `apps/compiler-worker`: BullMQ compilation worker.
- `packages/graph`: versioned Graph schemas and semantic validation.
- `packages/adapters`: editor, AI, Git, and provider adapters.
- `packages/compiler`: deterministic targets and generated-project templates.
- `packages/capabilities`: reusable business capabilities.
