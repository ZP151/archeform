---
title: "ADR-0052: Approval Provider Text Patterns"
status: "Proposed"
date: "2026-09-10"
authors: "Tech Lead"
tags: ["architecture", "decision", "requirements", "openai"]
supersedes: ""
superseded_by: ""
---

# ADR-0052: Approval Provider Text Patterns

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This proposal grants no implementation, provider call, Product Publish,
repository release, cloud action, or deployment authority. The founder must
accept or reject it under `docs/tech-governance.md`; PM then records the result.

## Recommendation

**Experiment** by removing only the complex business-text `pattern` keywords
from the two emitted Expense Approval definition-selection dispositions. Keep
the authoritative Zod text boundary unchanged. This narrowly amends ADR-0050's
provider JSON Schema/Zod pattern-parity choice; every other ADR-0050 and
ADR-0051 contract remains exact.

## Context

- **CTX-001**: After ADR-0051, a corrected genuine request still returned the
  existing HTTP 422 failure. A same-configuration `gpt-5-mini`, 25,000-token
  diagnostic returned `incomplete/max_output_tokens` with no text, while a tiny
  control completed. These observations do not identify a general model limit.
- **CTX-002**: One targeted diagnostic kept the exact A02 instructions, input,
  model, budget, and schema except for removing six emitted occurrences of the
  Expense business-text regex: `title`, `outcome`, and
  `materialQuestions[].question` in each disposition branch. It completed once
  with 513 characters; that response passed the original provider JSON Schema,
  original authoritative Zod schema, canonical projection, and public envelope.
  This is one-variable causal evidence for this request, not a statistical
  reliability guarantee.
- **CTX-003**: Strict Structured Outputs constrain generation, but Archeform's
  local parser remains the acceptance boundary. The current regex combines
  negative lookaheads and path, URL, prototype-key, control, blank, and trim
  exclusions. Those safety rules can remain exact in local Zod without making
  the provider generate against the complex expression.

## Current and Proposed Profiles

- **CUR-001**: Keep the exact Golden versions and coordinates in ADR-0050
  **CUR-001** through **CUR-004** and ADR-0051: Node.js `>=22.11.0 <23`, pnpm
  `9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`, private
  `@factory/adapters@0.1.0`, OpenAI `^4.77.0` resolved `4.104.0`, Zod
  `^3.24.1` resolved `3.25.76`, and configured `gpt-5-mini` with no base-URL
  override or reasoning change.
- **PRO-001**: Delete the unused `approvalBusinessTextJsonPattern` constant and
  only the three source `pattern` properties that expand across both Expense
  disposition branches. Retain JSON Schema string types, min/max lengths,
  requirement-key pattern, enums, question cardinality, strict objects,
  required properties, discriminators, prompts, and all Restaurant/generated
  schema branches unchanged.
- **PRO-002**: Keep `approvalDefinitionSelectionSchema` authoritative and byte
  unchanged: `safeBusinessTextSchema`, title trim/control/min/max checks,
  outcome and question bounds, keys, disposition/question invariants, strict
  objects, projection, and public-envelope validation still reject unsafe text.
  Provider-structural acceptance never authorizes local acceptance.
- **PRO-003**: Keep ADR-0051's `max_output_tokens: 25000`, no `reasoning`,
  `store: false`, strict format, terminal-status guard, 180-second round and
  540-second total timeouts, SDK retries zero, and completed-invalid semantic
  repair cap two. Keep all Graph/API/data, permissions, identity/privacy,
  consumer predicates, canonical definitions, capabilities, and lifecycle exact.

The accepted Golden profile remains the sole accepted profile. This local
schema-guidance change is proposed, bounded, and reversible.

## Effects and Ownership

- **CON-001**: One requirements-adapter owner owns the provider schema and its
  matching tests. Public contracts are frozen and unchanged; no frontend,
  backend, generated-template, or parallel contract writer is needed.
- **API-001**: Public serialization and error compatibility are unchanged,
  including `factory.requirement-interpretation-result/v1`, Graph, composition,
  and immutable lifecycle artifacts. Catalog, dependency, license,
  supply-chain, database, queue, Compose, compiler, and deployment impact is zero.
- **SEC-001**: The model remains untrusted. Locally parsed Zod and projection
  boundaries still reject paths, URLs, prototype material, blanks, and excessive
  text in all three fields; title additionally rejects controls and trim
  violations. Valid multiline outcome/question prose and their permitted
  surrounding whitespace remain accepted; no local validator is strengthened.
  Raw prompts/responses, canaries, credentials, and provider details remain
  absent from logs, persistence, errors, screenshots, and evidence.
- **OPS-001**: This removes provider-side regex complexity only. It adds no
  provider call, retry, token, latency, service, resource, or operational state.

## Consequences

- **POS-001**: The demonstrated A02 response can reach the existing complete
  local validation boundary without weakening accepted output.
- **NEG-001**: The provider may generate structurally valid text that local Zod
  rejects, consuming an existing semantic repair; no unsafe result is returned.
- **NEG-002**: One successful diagnostic does not prove broader provider
  reliability. Genuine A10/A02 evidence remains separately authorized.

## Alternatives Considered

- **ALT-001**: Keep the complex patterns and increase budget or retry. Reject
  because 25,000 still exhausted and the one-variable pattern removal completed.
- **ALT-002**: Remove or weaken authoritative Zod validation. Reject because it
  would weaken the model trust boundary and allow unsafe business text.
- **ALT-003**: Redesign the envelope, prompt, model, or reasoning. Reject because
  the targeted diagnostic reached the original accepted contracts unchanged.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: After acceptance, add failing no-cost tests, then change only
  `packages/adapters/src/requirements/openai-interpreter.ts` and
  `packages/adapters/test/requirement-interpreter.test.ts`.
- **ROL-001**: Rollback restores the deleted constant and three source pattern
  properties plus their tests. No data migration or immutable rewrite runs.
- **ABT-001**: Abort on any need to weaken Zod, change public contracts,
  prompts, model/reasoning/budget, retry behavior, permissions/privacy, another
  production path, or retain raw provider material.

## Verification Plan

- **VER-001**: Prove the provider JSON Schema structurally permits safe canary
  examples of URL, path, prototype-key, and blank text in each of title, outcome,
  and question, while unchanged Zod rejects them and returns no unsafe output.
  Separately prove title control/trim canaries are rejected and valid multiline
  outcome/question prose with permitted surrounding whitespace remains accepted,
  preserving the existing authoritative acceptance boundary exactly.
- **VER-002**: Prove valid Expense supported/clarification responses still pass;
  min/max, key pattern, enum/cardinality, strict/discriminator, Restaurant,
  generated-blueprint, ADR-0050 fixture hashes, and ADR-0051 terminal/budget
  cases remain exact.
- **VER-003**: Run
  `pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts`,
  `pnpm --filter @factory/adapters test`,
  `pnpm --filter @factory/adapters typecheck`,
  `pnpm --filter @factory/adapters build`, and
  `pnpm exec prettier --check packages/adapters/src/requirements/openai-interpreter.ts packages/adapters/test/requirement-interpreter.test.ts`.
  Record hashes, commands, results, reviews, and acceptance in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **VER-004**: After local proof and separate execution authorization, root may
  freeze one corrected A10 and one corrected A02 attempt under ADR-0050. This
  ADR grants no provider call or retry authority and adds no new gate wave.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, ADR-0050, ADR-0051, and the active D2 ledger.
- **REF-002**: [OpenAI Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).
  This source documents strict schema output; it does not attribute this
  request's behavior to unsupported regex syntax.
