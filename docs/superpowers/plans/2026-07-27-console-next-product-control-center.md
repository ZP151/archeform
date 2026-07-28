# Console Next Product Control Center implementation plan

**Goal:** Turn Console Next into a usable Factory Control Center and prove the
real model can enter the requirement-to-product lifecycle without browser-held
credentials.

**Architecture:** Static owned CSS styles the existing approved primitive
markup. A Next Route Handler owns the local server-to-server proxy under the
frozen `console-local-proxy/v1` contract. Browser code uses relative routes
only. The OpenAI adapter preserves fixed frozen constants in its strict
transport schema and still performs unchanged local validation.

## Task 1: Schema regression and repair

**Files:** `tests/api/test_llm_provider.py`, `apps/api/llm_provider.py`

1. Add a failing regression that requires fixed workflow state and transition
   literals to remain exact in the OpenAI transport schema.
2. Replace lossy complex-`const` projection with an OpenAI-compatible strict
   schema representation that constrains all fixed values.
3. Run focused provider and full API tests.

## Task 2: Frozen local proxy

**Files:** `apps/console-next/app/api/factory/[...path]/route.ts`,
`apps/console-next/lib/factory-api.ts`, proxy-focused test helpers.

1. Add failing proxy containment tests for target validation, headers, body,
   redirects, absent server credentials, and no browser capability header.
2. Implement the bounded Route Handler and relative browser adapter.
3. Configure fixture browser tests through server environment, not injected
   browser configuration.

## Task 3: Product-control-center shell

**Files:** `apps/console-next/components/console-workspace.tsx`,
`apps/console-next/app/globals.css`, browser E2E/accessibility tests.

1. Replace the hero and connection Sheet with product header, project rail,
   workflow progress, contextual approval/run panels, and evidence surfaces.
2. Style approved primitives through owned CSS, including responsive breakpoints
   and visible focus states.
3. Update E2E/a11y assertions to prove no browser-held capability and no
   legacy connection text.

## Task 4: Verification and guarded live acceptance

1. Run Console preflight, build, API suite, proxy E2E, accessibility suite,
   and diff checks.
2. Use a maximum of the remaining real model calls to create one Definition;
   approve, plan, build, smoke the generated application, and explicitly stop
   it.
3. Retain only redacted outcome, model provenance, artifact checksums, run
   state, and cleanup proof in the ledger.
