---
title: "ADR-0051: Requirement Response Output Budget"
status: "Proposed"
date: "2026-09-09"
authors: "Tech Lead"
tags: ["architecture", "decision", "requirements", "openai"]
supersedes: ""
superseded_by: ""
---

# ADR-0051: Requirement Response Output Budget

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This proposal grants no implementation, provider call, Product Publish,
repository release, cloud action, or deployment authority. The founder must
accept or reject it under `docs/tech-governance.md`; PM then records the result.

## Recommendation

**Experiment** with a fixed `max_output_tokens: 25000` on every OpenAI Responses
API call made by the requirement interpreter. Keep the configured model and its
provider-default reasoning behavior unchanged. Treat every non-completed SDK
result, response error, or refusal as terminal `output_invalid` before semantic
repair. Retain the current two-repair limit only for a completed text result
whose JSON, private schema, projection, or public semantics are invalid.

## Context

- **CTX-001**: Genuine A10 and A02 attempts returned the existing HTTP 422
  `requirement.output_invalid`; their response metadata was not retained, so
  this ADR does not claim their precise provider cause.
- **CTX-002**: One later, separately instrumented request returned
  `status: incomplete`, `incomplete_details.reason: max_output_tokens`, and no
  visible or nested text, error, or refusal. The current three-round loop then
  spent all repair rounds although no completed candidate reached parsing.
- **CTX-003**: The current SDK request omits both `max_output_tokens` and
  `reasoning`. Effective prior budget and token usage were not measured.
  OpenAI documents that the output cap includes reasoning and visible tokens,
  that exhaustion can occur before visible output, and recommends reserving at
  least 25,000 tokens when beginning reasoning-model experiments.

## Current and Proposed Profiles

- **CUR-001**: Keep the exact Golden coordinates recorded in ADR-0050
  **CUR-001** through **CUR-004**: Node.js `>=22.11.0 <23`, pnpm `9.0.0`,
  TypeScript `^5.7.2` resolved `5.9.3`, and the unchanged Next.js 15, React 19,
  NestJS 10, Prisma 6, BullMQ 5, PostgreSQL 16, Redis 7, and Compose profile.
- **CUR-002**: `@factory/adapters` remains private `0.1.0`; OpenAI remains
  `^4.77.0` resolved `4.104.0` and Zod remains `^3.24.1` resolved `3.25.76`.
  D2 uses the existing safe-enum `gpt-5-mini` configuration with no base-URL
  override. No model or provider coordinate changes.
- **PRO-001**: Add one private constant `25000` and pass it as
  `max_output_tokens` in the existing requirement `responses.create` body.
  Do not send a `reasoning` field. `store: false`, strict JSON Schema, per-round
  timeout `180000` ms, total timeout `540000` ms, and SDK `maxRetries: 0` remain.
- **PRO-002**: Before reading `output_text`, require `status === "completed"`,
  `error === null`, and no output content item of type `refusal`. `incomplete`,
  `failed`, `in_progress`, `cancelled`, `queued`, missing/unknown status,
  non-null error, and refusal all return the existing safe `output_invalid`
  failure immediately. Partial text and provider-authored details are ignored.
- **PRO-003**: Only a completed, non-refusal result enters JSON and semantic
  validation. Invalid completed content retains `MAX_REPAIR_ROUNDS = 2`; every
  repair call uses the same 25,000-token cap. A terminal result receives zero
  repair calls and no automatic enlarged-budget retry.
- **PRO-004**: SDK-thrown timeout, abort, availability, and HTTP 400/401/403
  handling remains exact. No public error code, status, message, Graph/API/data
  schema, definition selector, Workbench predicate, capability, lifecycle, or
  generated template changes.

The current accepted Golden profile remains the sole accepted profile. The
25,000-token transport behavior is proposed and is not accepted by this ADR.

## Effects and Ownership

- **CON-001**: The requirements adapter owner owns the request budget and
  terminal response classification. The shared `OpenAIResponseTransport`
  contract remains `{ outputText: string }`; the production requirement
  transport validates SDK metadata internally, so other AI adapters do not
  change. No frontend/backend contract artifact changes, and no parallel
  contract writers are needed.
- **API-001**: Public compatibility is unchanged, including
  `factory.requirement-interpretation-result/v1`, its existing fixed failure
  envelope, all Graph and composition contracts, and immutable history.
- **CAT-001**: Catalog, dependency, license, supply-chain, database, queue,
  Compose, compiler, and deployment impact is zero.
- **SEC-001**: Status, reason enum, error presence, and refusal presence are
  inspected transiently. Provider error/refusal text, raw output, prompt,
  brief, IDs, usage, and credentials are never logged, persisted, returned, or
  placed in evidence. Existing safe public failures remain the only output.
- **OPS-001**: The cap bounds one call at 25,000 generated tokens and the
  existing completed-invalid path at at most three such calls. It is an
  experimental ceiling, not a prediction of sufficiency or actual spend.
  Terminal responses consume one call and stop.

## Consequences

- **POS-001**: The requirement request explicitly reserves OpenAI's documented
  starting buffer while keeping a fixed per-call cost ceiling.
- **POS-002**: Incomplete, failed, and refused responses no longer waste
  semantic repairs that cannot correct a provider terminal condition.
- **NEG-001**: A valid full generated blueprint could still exceed 25,000
  combined reasoning and visible tokens; that safely fails and requires new
  measured evidence before any budget change.
- **NEG-002**: Up to three completed-invalid calls can each use the cap, so the
  experiment retains the existing repair cost exposure.

## Alternatives Considered

- **ALT-001**: Keep the omitted budget. Reject because the observed incomplete
  response reached no parser and the effective limit is unknown.
- **ALT-002**: Use the model maximum or retry incomplete output with a larger
  cap. Reject because it expands cost automatically and obscures the measured
  one-variable experiment.
- **ALT-003**: Lower reasoning effort or change models. Reject for this slice
  because either changes classification behavior alongside the transport fix.
- **ALT-004**: Redesign the private schema envelope. Reject because the schema
  and canonical projection were never reached in the observed diagnostic.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: After acceptance, one adapters owner adds failing no-cost tests,
  then changes only
  `packages/adapters/src/requirements/openai-interpreter.ts` and
  `packages/adapters/test/requirement-interpreter.test.ts`.
- **ROL-001**: Rollback removes the fixed body field and terminal classifier
  tests/logic from those two paths. No data migration or immutable rewrite runs.
- **ABT-001**: Abort on any need for a model/reasoning change, new dependency,
  public error/Graph/API/schema change, automatic budget increase, provider
  retry, raw-material retention, or additional production path.

## Verification Plan

- **VER-001**: With fake SDK responses, assert every request body contains
  exactly `max_output_tokens: 25000`, contains no `reasoning`, and preserves
  `store: false`, strict schema, 180-second timeout, and zero SDK retries.
- **VER-002**: Assert completed valid JSON succeeds; completed invalid JSON or
  semantics receives at most two repair rounds; every round retains 25,000.
- **VER-003**: Table-test incomplete for `max_output_tokens` and
  `content_filter`, failed, queued, in-progress, cancelled, missing/unknown
  status, non-null error, and nested refusal. Each yields only `output_invalid`,
  performs one call, ignores partial/raw details, and leaks no canary text.
- **VER-004**: Preserve existing timeout, abort, HTTP 400/401/403, availability,
  Restaurant, Expense, fixture-hash, and all adapter regression tests. Run the
  no-provider commands
  `pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts`,
  `pnpm --filter @factory/adapters test`,
  `pnpm --filter @factory/adapters typecheck`,
  `pnpm --filter @factory/adapters build`, and
  `pnpm exec prettier --check packages/adapters/src/requirements/openai-interpreter.ts packages/adapters/test/requirement-interpreter.test.ts`.
  PM records commands, results, implementation hash, review, and acceptance in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **VER-005**: After local proof and separate execution authorization, root may
  freeze one corrected A10 and one corrected A02 genuine attempt. ADR-0050's
  A10 privacy fail-closed rule and A02 full unassisted journey remain exact.
  This ADR grants no provider action and no retry authority.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, ADR-0050, and the active D2 ledger.
- **REF-002**: [OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)
  and [OpenAI Node 4.104.0 Responses types](https://github.com/openai/openai-node/blob/v4.104.0/src/resources/responses/responses.ts).
- **REF-003**: [GPT-5 mini model limits](https://developers.openai.com/api/docs/models/gpt-5-mini).
