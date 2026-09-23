# Unresolved requirement recovery implementation plan

Decision: ADR-0078 is accepted under the recorded standing authority at SHA-256
`d607d8a57b9a90625d339fe17d141b8363bab2b07279ac47af047bcf9db0f6d6`.
Independent `scope_decision_review` returns yes and P0/P1/P2 0/0/0.
Root owns this plan and acceptance
evidence; one serialized contract writer owns the source paths below. ADR-0079
automatic delivery remains a separate slice.

## Product outcome and frozen boundaries

An ordinary user who still needs an unsupported capability sees their previous
questions and submitted answers, can revise those decisions without retyping,
and explicitly starts a changed request with all prior context retained. A valid
business refusal stops redundant format-repair calls. It never becomes a claim
that unsupported functionality was implemented.

Use ADR-0078 DEC/API/UXR requirements verbatim as the contract. Keep old V1 error
pairs, successful result/request/Graph contracts, generated-blueprint behavior,
Restaurant parameters, two-cycle bound, privacy and immutable lifecycle unchanged.
The new V2 error contains only its version and fixed code. No provider call,
cloud resource, new package, storage or generated-template change is authorized.

## Task 1: typed refusal and closed error contracts

Owner: `unresolved_scope_implementation`, one serialized strongest-model writer.

Paths:

- `packages/adapters/src/requirements/requirement-interpreter.ts`
- `packages/adapters/src/requirements/openai-interpreter.ts`
- `packages/adapters/test/requirement-interpreter.test.ts`
- `packages/adapters/test/supplies-stockroom-definition.test.ts`
- `apps/workbench/lib/product-journey/interpret-contract.ts`
- `apps/workbench/lib/product-journey/interpret-payload.ts`
- Existing corresponding contract/payload and interpret-route tests.

Start with a fully valid registered follow-up fixture that retains a material
question. The current implementation must fail the new expectation:

```ts
await expect(adapter.interpret(input)).rejects.toMatchObject({
  code: "definition_scope_unresolved",
});
expect(transportCalls).toBe(1);
expect(input.priorInterpretation).toEqual(originalPriorInterpretation);
```

Validate the final result before throwing the typed refusal. Malformed candidates
still use existing repair behavior. Map only the new code to HTTP 422 and
`factory.requirement-interpretation-error/v2`; test the closed V1/V2 union,
cross-version/code mismatches, extra fields, wrong status and discarded raw text.
Update historical valid-refusal expectations only for the accepted classification
and request-count change. Keep their refusal and requirement-retention assertions.

Run focused adapter and Workbench contract/route suites. Reuse existing Expense,
Restaurant, Purchase, Task and Inventory fixtures for independent material needs,
blank answers, explicit supported-scope acceptance and prior menu drift. Report
authored transport-call savings separately from actual model performance.

## Task 2: preserve context through deliberate revision

The same owner continues serially in:

- `apps/workbench/lib/product-journey/journey-model.ts`
- `apps/workbench/lib/product-journey/use-product-journey.ts`
- `apps/workbench/components/workbench.tsx`
- `apps/workbench/components/workbench-home.tsx`
- Existing `components/journey/requirement-composer.tsx` and
  `clarification-panel.tsx`, with their matching tests.

Reuse the existing summary, composer and clarification controls after recording
the required UI registry/recipe/template search. Add no duplicate registry asset.
Keep the last submitted snapshot distinct from editing values. Expose the
ADR-specified `submitRevisedRequirement()` action and one "Start revised request"
control. Do not route it through the context-clearing ordinary `submitBrief`.

The integrated RED/GREEN sequence is initial question -> answered but unresolved
refusal -> visible previous questions/answers -> changed single answer -> one
explicit revised request. Inspect the request in memory, without logging it:

```ts
expect(revisedBody.priorInterpretation).toEqual(previousInterpretation);
expect(revisedBody.answers).toEqual({ ...previousAnswers, [editedKey]: edit });
expect(revisedBody.clarificationContext).toEqual(expectedAnsweredContext);
expect(productMutationCalls).toHaveLength(0); // while refusal remains
```

Test two independent differences: accepting one must retain the other. Verify
unchanged/invalid submission prevention, clearing an answer is not acceptance,
busy/double-click and stale-result suppression, repeated refusal, the existing
two-cycle bound and explicit unrelated-request reset. Preserve all submitted
context after network failure; do not reword or retry automatically.

## Task 3: actual Home UI evidence and scoped delivery

Case owner is the same writer; create only
`e2e/unresolved-requirement-follow-up.spec.ts`. Reuse the existing consumer fixture
and route helpers where suitable; keep any new authored fixture local to the case.
Root owns the local server process and any additional runtime authorization.

Run the real Home/hook/parser at 390x844 and 1440x900 using explicitly authored
route responses, no external model or Control Plane mutation. Exercise the full
recovery sequence, retained independent requirements, keyboard/overflow checks,
one visible revision action, request counts and zero lifecycle calls on refusal.
After explicit acceptance of the remaining difference, prove the existing planning
path resumes; do not require a technical planning button as the durable contract.
Capture only synthetic UI and bounded metadata. Scope alerts to the product region.

Commands after focused fixes:

```powershell
pnpm --filter @factory/adapters test -- requirement-interpreter.test.ts supplies-stockroom-definition.test.ts
pnpm --filter @factory/workbench test -- interpret-contract.test.ts route.test.ts journey-model.test.ts use-product-journey.test.tsx workbench-home.test.tsx requirement-composer.test.tsx clarification-panel.test.tsx
pnpm --filter @factory/adapters typecheck
pnpm --filter @factory/adapters build
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench build
pnpm regression definitions
pnpm exec playwright test e2e/unresolved-requirement-follow-up.spec.ts --workers=1
```

Use the existing shared-contract task review, independent QA and final scoped
judgment; retain valid unchanged evidence and rerun only affected corrections.
Root records source hashes, actual screenshots, synthetic provider-call count
3 -> 1 where applicable, user actions and residual limits in
`docs/acceptance/evidence/unresolved-requirement-follow-up/`. After PM acceptance,
root commits, pushes and verifies remote equality. This slice increases neither
product counts nor hosted-delivery claims. Continue ADR-0079 next.
