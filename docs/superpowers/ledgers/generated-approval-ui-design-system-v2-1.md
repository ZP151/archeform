# Generated Approval UI Design System v2.1 ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

Only PM changes this document's state. Engineers, task reviewers, QA, and the
release reviewer record evidence in their hand-offs; they do not change state.

## Programme state

| Field | Value |
| --- | --- |
| State | accepted |
| Outcome | A generated approval application is assembled from real, canonical Factory UI Kit-backed component packages and behaves as a concise, responsive, role-aware product rather than a legacy centralized scaffold. |
| Task identifier | `generated-approval-ui-design-system-v2-1` |
| Specialization | integration |
| Single production write owner | `/root` (integration) |
| Contract owner / status | integration / frozen |
| Frozen contract | `docs/contracts/factory-ui-kit-v1.md` (`factory-ui-kit/v1`) |
| Architecture decision | `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md` (accepted) |
| Package-lineage decision | `docs/adr/012-generated-ui-v2-lifecycle-reconciliation.md` (accepted by Founder-delegated Controller; required before a `canonical-ui.json` sidecar or `ui.*@2.1.0` package family is accepted) |
| Founder authority | Founder delegated internal approvals to the root Controller window. This does not permit a silent bypass of frozen package, Registry, trust, privacy, or adapter boundaries. |
| Parallel writers | none; this is a serialized integration change across package assets, Composer output, Registry policy, and generated-browser evidence. |

## Promotion and acceptance record

| Field | Recorded decision / evidence |
| --- | --- |
| Decision authority | The Founder-delegated Controller accepted ADR-012 and authorized the explicit, local-only 2.1 UI-family promotion after the gates below passed. This is not an external provenance, publication, cloud, or automatic-promotion decision. |
| Promoted family | ui.app-shell, ui.login-page, ui.home-page, ui.profile-page, ui.system-settings-page, ui.approval-form, ui.my-requests, and ui.approval-queue, all at exact 2.1.0. Each immutable manifest is Golden and its matching trust record is promoted. |
| Canonical identity | factory-ui-kit/v1 factory-ui 1.0.0: CSS sha256:d70330c27d8f0073e7b1a78c588459a079241b66c925a11ccdd0b98fd583d481; tokens sha256:d5993a5b2286fc9e781088649a18dc2218cd7d00b848deb3c0c7d25759b3a55a; React wrapper sha256:157bdc030d15883c04f9022e5ab2264c67dfb1c2735ada1bd464834b5ad760ea. |
| Registry policy | Fresh plans reject held 2.0 UI packages; exact historical locks replay only during contained materialization. Fresh selection and replay reject missing/invalid, candidate, unsigned, stale, revoked, or non-promoted v2 trust evidence. |
| QA evidence | Focused component contract, Composer, UI Kit, planner, and composable-control-plane suites passed. The two generated Docker products passed browser proof for keyboard tab activation, required-field focus/error feedback, submit, approve, reject, audit, responsive 390px layout, and cleanup. |
| Independent release evidence | Final read-only release review found no P0/P1. It also reran full agent/API suites, JavaScript syntax and diff checks, the Console workflow/accessibility flows, and both generated-product flows. |
| Rollback verification | Revoke the 2.1 trust/policy mapping to stop new selection and exact replay; preserve immutable packages, locks, outputs, and evidence. The Registry temporary-copy negative proof rejected revoked, unsigned, and stale records. The historical 2.0 hold remains exact-replay-only and is never silently substituted. |
| Residual risk / follow-up | The Console workflow test leaves isolated next-test build directories. This is a non-blocking release-hygiene P2; a follow-up must remove its isolated build directory after test completion without disturbing a founder-run Console. |

## Task card

### Outcome

Materialize a genuine v2.1 generated approval UI distribution from the
canonical Factory UI Kit as a new `ui.*@2.1.0` family. The Composer must assemble declared package slots
into a usable approval workspace whose navigation, theme, role actions, form
validation, decision feedback, and audit experience are actual interactions.
The Console is a separate controlled distribution and must not become an
implicit runtime dependency of generated applications.

### Non-goals

- A new frontend framework, external CDN, utility-CSS runtime, downloaded
  component dependency, cloud deployment, or arbitrary prompt-to-code path.
- Replacing, relabeling, or mutating any historical `ui.*@1.0.0` or
  `ui.*@2.0.x` package, lock, digest, template, trust sidecar, or replay path.
- Model-directed selection of package keys, versions, paths, URLs, adapters,
  or arbitrary code.
- Automatic promotion, external publication, or an unsupported supply-chain
  bypass for generated UI packages.
- A visual-only substitute for browser-verified product behavior.

### Contract and governance boundary

`factory-ui-kit/v1` remains frozen. `ui.app-shell` owns the app shell and
canonical assets; each feature package contributes only to its declared slot:

```text
frontend/app-shell
frontend/routes/login
frontend/routes/home
frontend/routes/profile
frontend/routes/settings
frontend/features/approval-form
frontend/features/my-requests
frontend/features/approval-queue
```

The current `ui.*@2.0.x` packages are immutable historical/replay assets. They
remain selectable only by their existing historical locks and are not a source
tree to edit, promote, relabel, or retrofit. The new coherent `ui.*@2.1.0`
family receives its own exact locks, manifests, digests, adapters, fixtures,
tests, trust records, and generated output. A new v2.1 composition must never
mix any `2.0.x` UI package with a `2.1.0` UI package.

Adapters bind only validated inputs and may neither select primitives nor write
outside their slot. The Composer remains the sole owner of paths, contribution
ordering, import assembly, dependency validation, and output-manifest checksums.

The current audit found an explicit governance discrepancy: v2 manifests and
trust sidecars report `golden`/`promoted` and are selected by plans, while
ADR-007 and the frozen contract specify that v2 begins `candidate` and is
unselectable until the Trusted Registry gate has valid Golden trust evidence.
This is a release-blocking condition for any new v2.1 plan. The writer must
make the implementation and governed evidence agree through an independently
versioned 2.1 family; it may not hide the historical inconsistency by mutating
2.0.x, by reusing its identity, or in tests, documentation, or UI labels.

## Allowed paths

The single writer may change only paths necessary for this bounded integration
slice:

```text
packages/ui-kit/factory-ui/1.0.0/**
packages/ui-kit/factory-ui/1.0.0/factory-ui.manifest.json
apps/console-next/components/factory-ui/factory-ui.css
packages/components/ui.*/2.1.0/**
apps/api/component_composer.py
apps/api/component_contract.py
apps/api/component_registry.py
apps/api/control_plane.py
packages/composer-scaffold/1.0.0/frontend/app/globals.css
packages/composer-scaffold/1.0.0/scaffold.json
tools/factory_ui_kit.py
tests/api/test_component_contract.py
tests/api/test_component_composer.py
tests/api/test_component_planner.py
tests/api/test_composable_control_plane.py
tests/api/test_factory_ui_kit.py
tests/web/generated-approval-app-e2e.mjs
tests/web/generated-composable-preview-e2e.mjs
docs/superpowers/plans/2026-07-27-generated-approval-ui-design-system-v2-1.md
docs/superpowers/ledgers/generated-approval-ui-design-system-v2-1.md
docs/adr/012-generated-ui-v2-lifecycle-reconciliation.md
```

Any change to a frozen schema, adapter operation, output slot, Compose
topology, Registry lifecycle/trust policy, or a path outside this list stops
implementation and returns the decision to integration/PM governance. Existing
Console distribution paths are read-only in this slice except for the controlled
canonical copy at `apps/console-next/components/factory-ui/factory-ui.css` and
its matching `packages/ui-kit/factory-ui/1.0.0/factory-ui.manifest.json` digest.
Those two files may change only together to keep the Console copy and canonical
asset manifest exactly in sync under ADR-007; this does not authorize a Console
redesign. `packages/components/ui.*/2.0.*` are explicitly read-only and outside
this writer's authority. A `canonical-ui.json` evidence sidecar is permitted
only beneath a new `2.1.0` package after ADR-012 is accepted; it cannot be
added to, or used to alter the meaning of, `2.0.x`.

## Dependencies

1. Accepted ADR-007 and frozen `factory-ui-kit/v1` contract.
2. Existing package/Composer contracts from the accepted Composable Internal
   Approval Suite.
3. Existing local generated-app fixture, API contract, and bounded loopback
   Executor; no external service or real credential is required for fixture
   coverage.
4. A documented resolution of the v2 lifecycle/promotion mismatch before a
   new v2 plan can be accepted or the release gate can pass.
5. Accepted ADR-012 before the `canonical-ui.json` evidence format or the new
   `ui.*@2.1.0` lineage is treated as an implementation contract.

## Acceptance criteria

### Canonical asset and package proof

- Every `ui.*@2.1.0` package used by the generated approval suite is a real,
  versioned package with manifest, digest, declared adapter slot, fixture,
  package test, trust/verification sidecar, and a package stylesheet/token
  asset traced to `factory-ui-kit@1.0.0`. If ADR-012 accepts it, the
  package-owned `canonical-ui.json` sidecar records that traceability without
  becoming executable configuration.
- Generated output imports its locked local style/token bundle and has the
  canonical `data-factory-ui="1.0.0"` marker plus stable component markers.
  It must not import Console source or rely on a CDN, downloaded URL, or
  undisclosed utility framework.
- No generated v2 feature output contains the legacy centralized-renderer
  marker, legacy scaffold visual system, hidden inline global style fallback,
  or Composer fallback which masks a missing component contribution.
- Composer rejects missing package styles, bad/missing canonical digest,
  duplicate/missing slot contribution, path escape, undeclared dependency,
  mixed UI generations, and a post-validation package mutation.

### Product behavior proof

- Generated navigation is genuine client navigation: accessible tabs or real
  routes are keyboard-operable and reveal Home, submit/request intake, My
  requests, approval queue, profile, and settings views as applicable to the
  selected role. It is not a static labelled mockup.
- The generated approval workspace is light by default and retains a functional
  dark theme. Both themes use canonical tokens and preserve readable states,
  focus indication, status feedback, and selected navigation.
- A generated fixture proves actor/role changes, required-field validation,
  submit, personal record visibility, approve, reject, immutable audit detail,
  status/error feedback, and keyboard-visible focus behavior.
- Browser evidence covers desktop and a 390px narrow viewport with no
  horizontal page overflow and usable navigation/actions. It verifies stable
  accessible names and focus restoration for overlays where present.

### Privacy, composition, and lifecycle proof

- Leave and expense profiles use the same approved `2.1.0` UI package lock
  family yet
  differ only through validated labels, field definitions, schema artifacts,
  and UI text. No raw brief, raw model response, capability token, API key,
  secret, or credential appears in state, materialized output, DOM, logs, or
  retained evidence.
- A candidate, unsigned, stale, incompatible, altered, or non-Golden package
  is rejected for a new plan. If v2 is selectable, exact current Golden trust
  evidence and an explicit governed promotion/lifecycle decision must exist;
  otherwise it must remain candidate and unselectable. Tests must prove the
  selected behavior, not merely assert a metadata label.
- The local generated product can still complete role-aware submit, approve,
  reject, and audit smoke flows and stop/clean up cleanly through the Executor.

## Rejection and stop rules

The task cannot advance to QA if any of the following is true:

1. A v2.1 UI package is labelled Golden/promoted or selected without evidence
   that satisfies ADR-007 and the frozen Registry policy.
2. A generated page uses inline/ad-hoc scaffold styling instead of its declared
   canonical package stylesheet, or it imports a Console path.
3. A navigation control only changes copy/state without a real accessible view
   transition; a role action is simulated without exercising the generated API
   flow; or a test passes through a legacy renderer fallback.
4. An adapter writes outside its slot, accepts unvalidated paths/URLs/code, or
   the Composer permits a missing/duplicate contribution.
5. Any raw brief, real-model request/response, credential, session-signing
   value, capability token, or secret reaches a persisted artifact, output,
   DOM, screenshot, log, or report.
6. A P0/P1 accessibility, responsive, security, privacy, source-integrity, or
   cleanup finding remains unresolved.

## Implementation and hand-off order

| ID | Owner | State | Scope / evidence required |
| --- | --- | --- | --- |
| GADUI-01 | `/root` integration | accepted | Contract/composition/browser regressions cover canonical assets, slot isolation, no legacy fallback, interaction sequence, privacy, and responsive behavior. |
| GADUI-02 | `/root` integration | accepted | Canonical package stylesheet/token consumption and independent 2.1 assembly landed without changing historical v1 or 2.0 replay identity. |
| GADUI-03 | `/root` integration | accepted | Generated navigation, theme, role-aware interaction, validation, decision feedback, and audit UI are exercised by the Docker browser flows. |
| GADUI-04 | `/root` integration | accepted | Held-generation, trust, promotion, and Planner regressions prove new-plan denial and exact replay boundaries without metadata-only bypasses. |
| GADUI-05 | Task reviewer | accepted | Read-only review findings were repaired and independently rechecked. |
| GADUI-06 | QA | accepted | Focused package, Composer, Registry, generated-browser, responsive, role, privacy, and cleanup evidence passed. |
| GADUI-07 | Release reviewer | accepted | Final independent review found no unresolved P0/P1; only the documented isolated-build-directory P2 hygiene follow-up remains. |
| GADUI-08 | PM | accepted | Evidence, delegated promotion decision, rollback behavior, risks, and project status reconciled on 2026-07-27. |

## Required verification gate

The writer records fresh commands and summarized output before hand-off. At a
minimum, run the focused contract, Composer, Registry/planner, control-plane,
and generated browser suites, then applicable project regressions:

```powershell
py -3.12 -m unittest tests.api.test_component_contract -v
py -3.12 -m unittest tests.api.test_component_composer -v
py -3.12 -m unittest tests.api.test_component_planner -v
py -3.12 -m unittest tests.api.test_composable_control_plane -v
node tests/web/generated-approval-app-e2e.mjs
node tests/web/generated-composable-preview-e2e.mjs
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
node --check apps/web/app.js
git diff --check
```

The real-model workflow is a separate guarded manual acceptance gate after
fixture, supply-chain, privacy, generated-browser, and Executor gates are
green. It uses at most five calls, reads `OPENAI_API_KEY` only from the local
process environment, and must never record the key or raw prompt/response.

## Evidence hand-off template

```text
Changed paths:
Contract consumed:
Contract/lifecycle decision and proof:
RED evidence:
GREEN evidence (exact commands and result counts):
Generated lock identities / canonical digest:
Generated product interaction evidence:
Privacy and rejection evidence:
Residual risks:
Recommended next owner:
```

## PM decision log

- **2026-07-27:** Founder-delegated Controller authorized this serialized
  integration slice. It starts in `implementing` with `/root` as the only
  production writer. Existing Ledger and project-status files remain unchanged
  until implementation, QA, and independent review provide fresh evidence.
- **2026-07-27:** The Founder-delegated Controller accepted ADR-012's
  evidence-backed local promotion of the coherent 2.1 UI family. PM reconciled
  focused QA and final independent release evidence, including
  denial/replay/rollback proof. The slice is `accepted`; no cloud, external
  provenance, publication, or automatic promotion authority is implied.
