# Task Ledger: Generated Approval UI 2.3 Visual Convergence

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** `docs/contracts/generated-approval-ui-2-3.md`
- **Approved ADR:** `docs/adr/016-factory-ui-visual-convergence-and-generated-icon-actions.md`
- **Plan:** `docs/superpowers/plans/2026-07-28-generated-approval-ui-2-3-visual-convergence.md`
- **Allowed write paths:**

  ```text
  packages/ui-kit/factory-ui/1.4.0/**
  packages/components/ui.*/2.3.0/**
  packages/composer-scaffold/1.0.0/frontend/**
  packages/composer-scaffold/1.0.0/scaffold.json
  apps/api/component_composer.py
  apps/api/component_contract.py
  apps/api/component_registry.py
  tools/factory_ui_kit.py
  tests/api/test_factory_ui_kit.py
  tests/api/test_component_contract.py
  tests/api/test_component_composer.py
  tests/web/generated-approval-app-e2e.mjs
  tests/web/generated-composable-preview-e2e.mjs
  docs/contracts/generated-approval-ui-2-3.md
  docs/superpowers/ledgers/generated-approval-ui-2-3-visual-convergence.md
  docs/superpowers/plans/2026-07-28-generated-approval-ui-2-3-visual-convergence.md
  ```

## Outcome

Create immutable candidate canonical `factory-ui@1.4.0` and a coherent
`ui.*@2.3.0` approval family that deliver the approved compact workspace
without changing current 2.1/2.2 history or promoting a candidate.

## Acceptance criteria

1. All nine successor identities and the generated Lucide dependency closure
   are inventory/digest/license/fixture/test/trust complete.
2. Candidate generated output uses a single active-decision column, real
   icon-led rail/top utilities, centered focus-trapped confirmation, truthful
   2.3 audit identity, and compact read-only Settings/Profile presentation.
3. Leave and expense use identical 2.3 locks but differ only through validated
   inputs; signed-out/role/approval/audit/privacy behavior remains governed.
4. Candidate isolation, Composer containment, static icon rules, browser
   visual/accessibility evidence, API smoke, and Docker cleanup pass with no
   unresolved P0/P1.
5. Candidate promotion and generated Lineage remain excluded.

## Stop rules

Stop on a frozen API/data/slot/topology change, external runtime retrieval,
unapproved icon source, historical identity mutation, raw brief/credential
leak, or any P0/P1 role/privacy/accessibility regression.

## PM decision

- **2026-07-28:** ADR-016 is accepted and this ledger records the frozen 2.3
  contract. It remains planned until the current 2.2 review cycle is closed
  and PM assigns the serialized integration writer.
- **2026-07-28:** 2.2 is accepted with no candidate promotion. Founder-
  delegated Controller authorizes this new immutable candidate line. `/root`
  is the only integration writer within the listed paths; 2.1/2.2 history,
  Console assets, API/data contracts, routes, Compose topology, and generated
  Lineage remain excluded.
- **2026-07-28:** The complete 2.3 candidate family is accepted for release
  review scope, not promoted. Evidence: 45 deterministic Factory UI/Composer
  tests pass; the closure verifier rejects a tampered Lucide record even when
  its canonical manifest hash is refreshed; the unbounded generated-browser
  gate completed leave and expense Docker/Playwright flows and removed all
  `factory_browser_e2e` resources; independent release review found no P0/P1.
