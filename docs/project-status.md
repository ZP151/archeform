# Project status

## Current milestone

Trusted Registry and Local Supply Chain (Stage 2) remains the next core platform
milestone under accepted ADR-004. The local Console and generated approval-suite
v2.1 are accepted for the constrained loopback scope: their fixed UI source
snapshot, exact dependency closure, canonically traced component packages,
explicit local trust/promotion policy, and loopback control surface provide a
founder-operable requirement-to-product path while leaving cloud and
production-operability contracts out of scope.

## Completed evidence

- Requirement brief → schema-bound structured application definition → immutable child versions → definition approval → explainable six-component Golden plan → plan approval → separate local Executor preview.
- Fixture-backed leave, expense, and equipment-access briefs produce distinct definitions and exact expected Golden component plans. Raw briefs stay out of persisted state.
- The OpenAI Responses adapter uses `gpt-5.6-terra` with a strict compatible transport schema, then applies the unchanged frozen local schema and semantic policy as the final gate.
- The browser workspace supports structured editing, version lineage, two explicit approvals, run history/retry, loopback preview evidence, and stopping a preview without making raw JSON the primary workflow.
- The Executor accepts only signed, checksum-bound queue evidence; it uses fixed Compose arguments, loopback-only URLs, bounded smoke, TTL/explicit stop, and teardown.
- Fresh Python 3.12 verification: agent governance 4/4, API 168/168, Executor 26/26, Console workflow and accessibility browser E2E, generated-product browser E2E, JavaScript syntax, Console preflight/build, zero-high/critical production dependency audit, and diff checks passed.
- A real Docker run reached `ready` on a redacted localhost dynamic port, completed submit/approve/audit smoke with HTTP 200, was explicitly stopped, and left no containers or volumes.
- A guarded live OpenAI smoke passed with `gpt-5.6-terra`; a real model-generated approval definition was approved, planned with Golden components, built by the separate Executor, reached a loopback preview, and passed browser-visible submit, role-switch, approve, and immutable-audit evidence. The preview was explicitly stopped and its Compose containers and volumes were removed.
- Fourteen real Golden component packages now provide UI, signed local-session identity, RBAC, record API, approval workflow, audit, PostgreSQL runtime, fixtures, tests, typed template bindings, digests, and verification evidence.
- The Registry and Composer resolve only contained Golden packages, lock exact key/version/digest identities, reject invalid inputs, tampering, conflicts, path escapes, and post-validation changes, and atomically materialize a checksummed output manifest.
- Leave and expense applications resolve identical fourteen-package locks but have distinct validated labels, fields, UI, and schema artifacts. Both build a generated Next.js frontend, run through local Docker Compose, and pass browser-driven signed-cookie submit, role-switch, approve, and audit flows with cleanup.
- ADR-012 accepted a coherent 2.1 UI successor family from the local canonical Factory UI Kit. Historical 2.0 UI packages are held for exact contained replay only; fresh plans require current Golden manifest plus promoted trust evidence. Candidate, unsigned, stale, revoked, altered, incompatible, and held packages fail closed.
- Fresh release evidence: component/Registry policy, canonical package, Planner/control-plane, agent/API/Executor, Console workflow/accessibility, generated leave/expense Docker-browser, syntax, production Console build/preflight, and diff gates passed. The release review found no P0/P1.
- CUI-01 is accepted: the Console has a compact connected lifecycle route,
  closed/count-first evidence, bounded keyboard-contained Lineage, the defined
  Products-left/Evidence-right/Command-and-Stop-center/Lineage-floating overlay
  matrix, founder Next-output isolation, and owned E2E cleanup.
- The governed `factory-ui@1.1.0` Console successor is accepted with marker,
  source-contract, API, workflow/accessibility, preflight/build, syntax, and
  release evidence. Generated `ui.*@2.1.0` remains locked to canonical 1.0.
- The governed `factory-ui@1.2.0` Console visual-accessibility successor is
  accepted. Nineteen focused tests, full API/agent suites, isolated production
  build (`BUILD_ID` emitted), preflight, syntax, diff, workflow, and
  accessibility E2E passed; the latter proves reduced motion, light/dark token
  contrast, the overlay matrix, and Lineage at 390 px and 560 px. Canonical
  1.0/generated 2.1 assets remain frozen and 1.1 remains the verified rollback.
- The Composer scaffold fixture-collision hygiene regression is accepted; its
  intentional collision and no-output fail-closed assertion remain covered.
- CUI-02 Compact Project Context & Inspectable Evidence is accepted: source
  RED→GREEN 9/9, agent governance 4/4, full API exit 0, preflight, isolated
  production `BUILD_ID`, syntax/diff, workflow, and accessibility evidence
  passed. It proves long-name `aria`/title context, stage discovery at
  390/560/768, and visible filename plus keyboard-operable evidence download.
- CUI-03 Brief-context CSS hygiene is accepted: its source guard proves the
  eliminated context-panel selectors remain absent while the live Brief
  composer and accepted CUI-02 lifecycle/overlay behavior remain intact.
- CUI-04 Console Run-State Safety and Transition Recovery is accepted: fixture
  browser evidence proves one delayed queue POST under duplicate activation,
  action-specific transition feedback, native conflicting-control exclusion,
  centered stop confirmation, GET-only initial/poll recovery, and preservation
  of a local Name/Brief against late hydration. Task review, QA, and independent
  release review found no P0/P1; the duplicate guard is intentionally
  browser-side interaction protection while durable server authority remains
  unchanged.
- CUI-05 Products Drawer Entrypoint Regression is accepted: rail, topbar, and
  Command > Open products now independently prove the same left-edge Products
  drawer, usable product rows, and origin-specific Close/Escape focus return.
  The repair retained the sole shared drawer and the full Evidence-right,
  Command/Stop-center, Lineage-floating matrix; task review, QA, and release
  review found no P0/P1.
- CUI-07 Lineage Containment and Responsive Layout is accepted as a
  candidate-only `factory-ui-console@1.5.0` correction. Source identity
  37/37, preflight, production build, workflow E2E, accessibility E2E, and
  diff gates passed. Fresh browser evidence measured all 17 Lineage nodes and
  both endpoints of all 16 SVG edges inside the canvas across the required
  desktop/responsive refits; 390px controlled full-window, keyboard/focus,
  reduced motion, and overlay-matrix behavior also passed. Console 1.4 stays
  immutable and 1.5 is not Golden or eligible for generated-app selection.

## Component Suite boundary delivered

- A constrained internal approval-app product factory, not arbitrary prompt-to-code generation.
- Requirement → validated Application Definition → approved package locks → Composition Plan → contained materialization → separate local Executor → independently runnable application.
- One bounded approval profile with local signed development sessions, submitter/approver/auditor flows, and reproducible browser/Docker evidence. Cloud deployment and external component installation remain out of scope.

## Risks and decisions

- Component digests are locally verified but are not externally signed or provenance-verified; SBOM, signatures, license promotion, and candidate-to-Golden workflow remain Stage 2 work.
- Initial local Git source baseline `d14b41dec8dd5009e1c7393e76b540ec7522a71b` is established with pinned LF text checkout rules. The `origin` remote is configured for the founder-owned repository; no package thereby gains provenance, and non-legacy promotion still requires exact source evidence, trust verification, lifecycle/policy decision, and explicit promotion approval.
- The fixed-source UI intake and local `ui.*@2.0.0` package set support the approval-suite preview. They remain governed local assets: external candidate intake, third-party package download at runtime, and automatic Golden promotion are not enabled.
- The generated session capability is a local development identity boundary backed by environment-supplied user directory and signing key; production OIDC, password KDFs, secret management, and multi-user operations require a future ADR.
- The repository has an initial local baseline, configured founder-owned remote, and reproducible review point. External publication and release automation remain deliberately out of scope.
- Generated applications use browser cookie sessions for the MVP, but their local user directory and signing key must remain external environment inputs and never enter output evidence.
- Console Next is an accepted local preview, not a Golden/generated-application
  component. ADR-011 remediated its approved dependency closure with exact
  `postcss@8.5.23` and `sharp@0.35.3` overrides; the fresh production audit
  reports zero high and zero critical vulnerabilities. Production hosting and
  Golden runtime promotion still require their own operational decision.
- Remaining Console work is P2 only: the accepted v1.1 test-owned
  `.next-ui11-review` and `.next-ui11-release` output directories cannot be
  deleted in this policy-bound environment; they are not source changes and do
  not alter the accepted copy/lock boundary. CUI-03 removed the former
  Brief-context CSS residue. CUI-04's duplicate guard is intentionally
  browser-side only; durable backend checks remain the security authority.
  Neither follow-up pre-empts Stage 2 Registry work.
- CUI-07 release review deferred one P2 asset-topology concern: scoped
  generated-application selectors remain in canonical Console CSS from
  earlier assets. They do not participate in the accepted Lineage behavior,
  but must be separated or otherwise governed in a standalone cleanup before
  future Console asset-topology changes rely on that boundary.
- A paid live OpenAI call is intentionally not part of CI; the documented guarded smoke must be run manually with a locally configured `OPENAI_API_KEY` before enabling a live model-backed environment.
- Live-model reliability is not yet measured. During the first real founder test, a more detailed equipment-access brief was correctly rejected without persistent state because its output did not satisfy the frozen approval-app policy; an equivalent concise brief succeeded. The product needs an evaluation set and measured first-pass validity before broadening scope.
- The Executor is deliberately separate and must remain running to process
  explicit stop and TTL requests. The Console now isolates its own Next output;
  a full local product loop still requires separately controlled local
  control-plane and Executor processes.
- Cloud deployment, CI/CD mutation, artifact provenance verification, multi-user authentication, and production operations remain out of scope.

## Next smallest slice

The next smallest frontend slice is a separately governed Console
asset-topology cleanup for the CUI-07 P2: establish and test a clear boundary
between canonical Console-only selectors and generated-application selectors,
without changing Console 1.4, promoting 1.5, or modifying generated products.
Its completion gate is an accepted contract/ledger, source-identity proof,
browser regression evidence, and independent review with no unresolved P0/P1.
Stage 2 TR-04 remains the next Trusted Registry core slice after the current
governed UI work; Console, Registry, Composer, Executor, and generated-product
contracts stay frozen until an explicit task authorizes a compatible change.

## Completion gate

- Achieved: an approved dynamic definition starts as an isolated loopback local preview.
- Achieved: the submit, approve, and audit path passes an automated smoke test.
- Achieved: independent task review, focused QA, and final release review passed with no unresolved P0/P1.
- Achieved: two different validated applications use the same immutable package locks, run as generated Next.js/Docker products, and pass browser-visible role-aware approval and cleanup proof.
- Achieved: the explicit local 2.1 UI promotion decision records canonical
  asset digests, trust-policy rejection/rollback proof, QA evidence, and a
  final independent release review with no unresolved P0/P1.
