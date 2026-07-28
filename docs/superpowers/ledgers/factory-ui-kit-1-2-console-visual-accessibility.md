# Task Ledger: factory-ui-kit-1-2-console-visual-accessibility

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** `docs/contracts/factory-ui-kit-v1.2.md` (`factory-ui-kit/v1.2`)
- **Allowed write paths:** `packages/ui-kit/factory-ui/1.2.0/**`, `apps/console-next/components/factory-ui/**`, `apps/console-next/components/console-workspace.tsx`, `apps/console-next/app/globals.css`, `apps/console-next/tsconfig.json` solely after owned harness exit to normalize `include` to `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`, `tools/factory_ui_kit.py`, `tools/console_next_intake.py`, `tests/api/test_factory_ui_kit.py`, `tests/api/test_console_ui_sources.py`, `tests/web/console-next-e2e.mjs`, `tests/web/console-next-accessibility.mjs`, `docs/contracts/factory-ui-kit-v1.2.md`, this ledger, `docs/superpowers/plans/2026-07-28-factory-ui-kit-1-2-console-visual-accessibility.md`, and `docs/project-status.md` on acceptance. The tsconfig authority excludes compiler options, excludes, aliases, and all source-glob changes. ADR-014 is accepted read-only and may not be changed by this task.
- **Read-only parallel work:** task review, QA, and release review after integration hand-off; no concurrent production/test writer.
- **Approved ADR:** `docs/adr/014-factory-ui-1-2-console-visual-accessibility-successor.md` (accepted by Founder-delegated Controller)
- **Plan:** `docs/superpowers/plans/2026-07-28-factory-ui-kit-1-2-console-visual-accessibility.md`

## Outcome

Migrate the controlled Console to exact canonical `factory-ui@1.2.0` with
measurable visual-accessibility behavior, while preserving canonical 1.0
generated assets and verified 1.1 Console rollback.

## Non-goals

- Any mutation of `packages/ui-kit/factory-ui/1.0.0/**`,
  `packages/ui-kit/factory-ui/1.1.0/**`, or `packages/components/ui.*/2.1.0/**`.
- Generated UI migration, Registry/Composer/API/data change, dependency/source
  intake, framework change, deployment, real-model call, settings/help feature,
  or UI package promotion.

## Migration and rollback

Clone 1.1 into immutable canonical 1.2, apply only ADR-014 visual/accessibility
changes, regenerate its inventory/digests, and materialize the full verified
Console copy. The verifier must bind Console to 1.2 while retaining 1.1 rollback
and generated-1.0 proofs. On a failed gate, select the verified complete 1.1
Console copy; preserve 1.2 as evidence and do not alter generated locks.

## Acceptance criteria

1. Canonical 1.2 and the controlled Console copy are complete, exact, and
   verifier-bound; altered/missing/mixed 1.1/1.2 Console files fail closed.
2. Desktop light/dark computed-style tests prove token-family canvas/paper/ink/
   focus/border/status values, 4.5:1 normal-text contrast, 3:1 focus contrast,
   status distinction, and no unintended `color-scheme`/token fallback.
3. Reduced-motion tests prove non-essential transitions, animations, transforms,
   smooth scrolling, and automatic canvas-fit movement are suppressed while
   focus, state changes, feedback, and manual graph navigation remain usable.
4. At 390 px and 560 px, Lineage is inside the viewport without page horizontal
   overflow; Close and graph navigation remain reachable; focus is contained and
   restores to its opener. Desktop placement remains below Console chrome and
   clear of lifecycle primary actions.
5. No source retains dead `.build-evidence-peek` CSS. Evidence remains closed,
   count-first, bounded, downloadable, and diagnostic on demand. Eligible
   secondary actions are compact but accessible; disabled Settings/Help rail
   controls are absent, while destructive/primary actions retain text.
6. Generated `ui.*@2.1.0` and canonical 1.0 assets remain byte-for-byte
   unchanged and no generated reference identifies 1.1/1.2. The complete 1.1
   rollback identity remains verifiable.
7. Focused source/API tests, full agent/API suites, preflight/build, Console
   workflow/accessibility E2E, syntax, diff, task review, QA, and release review
   pass with no unresolved P0/P1.

## Stop rules

- Any 1.0/1.1/generated asset mutation, new dependency, API/Registry/Composer
  change, incomplete Console copy, generated 1.1/1.2 reference, or P0/P1
  accessibility/security finding stops the task.
- A visual assertion that cannot demonstrate its computed-style, reduced-motion,
  or viewport requirement cannot be replaced by a screenshot-only claim.

## Required verification gate

```powershell
py -3.12 -m unittest tests.api.test_factory_ui_kit -v
py -3.12 -m unittest tests.api.test_console_ui_sources -v
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
npm --prefix apps/console-next run preflight
npm --prefix apps/console-next run build
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
node --check apps/web/app.js
git diff --check
```

## Implementation evidence

- **GREEN (2026-07-28):** 19 focused tests passed; full API and agent suites,
  Console preflight, JavaScript syntax, and `git diff --check` passed. An
  isolated production build emitted `BUILD_ID`. Workflow and accessibility E2E
  passed Products-left, Command/Stop-center, Evidence-right, floating Lineage,
  reduced-motion behavior, light/dark token contrast, and 390/560 viewport
  evidence. Final owned `tsconfig.json` include normalization completed after
  the harnesses exited.
- **Residual P2:** the accepted v1.1 test-owned `.next-ui11-review` and
  `.next-ui11-release` directories remain undeleted in the policy-bound
  environment. They are not source changes and do not affect v1.2 copy
  verification, 1.1 rollback, or generated 1.0/2.1 locks.

## Task review

- Independent task review found no remaining P0/P1 after final tsconfig
  normalization.

## QA

- Focused QA found no P0/P1 and accepted the recorded source, build, workflow,
  accessibility, theme, reduced-motion, and responsive evidence.

## Release review

- Independent release review found no remaining P0/P1. The only residual is the
  documented policy-environment P2 test-output cleanup.

## PM decision

- **2026-07-28:** ADR-014 is accepted and `factory-ui-kit/v1.2` is frozen in
  the contract above. Founder-delegated Controller authorized this serialized
  integration slice; `/root` is the only writer. Implementation starts in
  `implementing`; no acceptance is implied until fresh evidence and review.
- **2026-07-28:** After the recorded GREEN evidence, PM advanced the task from
  `implementing` to `ready_for_qa`. QA and independent task review found no
  P0/P1, so PM advanced it to `reviewed`. Founder-delegated Controller accepted
  the independent release review with no P0/P1, so PM advanced it to `accepted`.
