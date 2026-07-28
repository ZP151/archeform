# Console Next Product Control Center ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

## Programme state

| Field | Value |
| --- | --- |
| State | accepted |
| Outcome | Replace the Console Next preview shell with a usable Factory Control Center and remove browser-managed local capability input. |
| Non-goals | Generated application changes, Registry/Composer changes, new UI dependencies, cloud deployment, or public API expansion. |
| Approved ADR | `docs/adr/006-console-next-product-shell-and-local-proxy.md` |
| Contract | `docs/contracts/console-local-proxy-v1.md` |
| Contract owner/status | integration / frozen |
| Single production write owner | integration |
| Allowed paths | `apps/console-next/**`, `tests/web/console-next-*.mjs`, `tests/api/test_llm_provider.py`, `apps/api/llm_provider.py`, this ledger, and project-status on acceptance. |
| Real-model limit | At most five calls for this slice; retain only redacted pass/fail provenance. |

## Acceptance criteria

- Console renders a responsive project control center with no hero or visible
  `Local connection`/capability input.
- Browser requests use only the frozen relative proxy; credentials are server
  environment-only and cannot appear in browser code, state, output, or test
  evidence.
- Proxy fails closed for malformed target, method, body, credentials, and
  upstream redirect conditions.
- Existing fixture workflow passes through the proxy.
- The OpenAI transport schema preserves fixed workflow constants sufficiently
  for a real model result to pass unchanged local definition validation.
- A real-model E2E reaches Definition -> approved plan -> local Executor
  preview -> generated application smoke -> explicit cleanup.

## Tasks

| ID | Task | Specialization | State | Evidence |
| --- | --- | --- | --- | --- |
| CCP-01 | Define proxy contract and product shell ADR | integration | accepted | ADR-006 and frozen contract |
| CCP-02 | Add real-schema regression and repair transport projection | backend | accepted | Focused API regression plus guarded live schema evidence |
| CCP-03 | Implement server proxy, product shell, and fixture E2E migration | integration | accepted | Console local proxy, canonical UI kit, workflow E2E, and accessibility evidence |
| CCP-04 | Run real-model product E2E and release review | integration | accepted | Real-model Definition → approved plan → Executor preview → browser submit/approve/audit → explicit cleanup; release gates passed |

## Stop rules

- A changed proxy contract pauses implementation and returns ownership to
  integration.
- A token, raw model output, raw brief, non-loopback target, or arbitrary
  proxy path is a P0 and blocks acceptance.
- Fixture success is regression evidence only; final acceptance requires the
  real-model E2E stated above.
- The canonical Factory UI Kit remains the Console source boundary; Console UI
  source changes must continue to use the governed component wrappers.

## Final release review

**Result:** GO for the constrained local requirement-to-product scope.

- Fresh evidence: API `168/168`, Executor `26/26`, agent governance `4/4`,
  Console preflight and production build, Console workflow E2E,
  accessibility/focus E2E, and generated leave-and-expense browser E2E.
- A real model-backed local run was verified in a browser through submitter,
  approver, and auditor roles; it retained both submission and approval audit
  events and explicitly removed its preview containers and volumes.
- Fresh production dependency audit reported zero high and zero critical
  advisories. Console browser code does not carry the local API capability.
- No P0, P1, or P2 finding remains in the accepted loopback scope. Cloud
  operation, external candidate intake, production identity, and multi-profile
  expansion remain explicit non-goals rather than release defects.
