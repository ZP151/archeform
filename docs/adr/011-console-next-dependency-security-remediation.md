---
title: "ADR-011: Console Next Dependency-Security Remediation"
status: "Accepted"
date: "2026-07-27"
authors: "Tech Lead"
tags: ["architecture", "security", "supply-chain", "console"]
supersedes: ""
superseded_by: ""
---

# ADR-011: Console Next Dependency-Security Remediation

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

This is a remediation proposal only. It does not authorize a dependency
installation, lockfile change, closure recapture, Console promotion, or a
change to generated-application packages.

## Context

- **CTX-001**: The accepted Console Next preview is a local control-console
  path, not a Golden or generated-application runtime. ADR-006 and ADR-010
  retain its exact package closure as part of the approved preview boundary.
- **CTX-002**: On 2026-07-27, `npm --prefix apps/console-next audit --json`
  reports three high-severity advisories. The current exact closure is
  `next@15.5.21`, `postcss@8.4.31`, and optional `sharp@0.34.5`, under Node
  `v22.11.0` and npm `10.9.0` in this workspace. The current lockfile digest
  in the Console closure record is
  `sha256:9454d7232839e8e77229fcd7999a6b3c7b1015c20bb48e14a7bcb15aa31fa42a`.
- **CTX-003**: The reported PostCSS advisories cover `<=8.5.17`, including an
  attacker-controlled source-map path/read disclosure issue. The reported
  Sharp advisory covers `<0.35.0`, including inherited libvips
  vulnerabilities. npm attributes both paths to Next and offers only an
  incompatible automatic "fix" to `next@9.3.3`; that is not a valid remedy.
- **CTX-004**: Public package metadata checked on 2026-07-27 shows that the
  newest 15.x patch, `next@15.5.22`, still declares `postcss@8.4.31` and
  optional `sharp@^0.34.3`. The investigated Next 16.2.1 major line likewise
  declares `postcss@8.4.31` and `sharp@^0.34.5`, while also raising the Node
  floor to `>=20.9.0`. Neither Next-only change removes the audited paths.
- **CTX-005**: The Console source snapshot captures its full lock inventory in
  `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/console-next-closure.json`.
  `tools/console_next_intake.py` presently verifies that inventory but exposes
  no supported closure-recapture command. A manually edited closure record
  would be unauditable.

## Decision

- **DEC-001**: Recommend a bounded **migrate** remediation of the Console
  dependency closure, while retaining the existing application profile:
  `next@15.5.21`, `react@19.2.7`, `react-dom@19.2.7`, TypeScript `5.9.3`,
  the current Factory UI Kit contract, and all Factory API/generated-product
  contracts. This is not a Next major-version migration.
- **DEC-002**: The only initial candidate is a root-controlled, exact
  transitive closure override: `postcss@8.5.23` and `sharp@0.35.3`. Those
  versions are above the audit ranges on the date checked. The implementation
  must regenerate the entire lockfile and all changed `@img/*` optional
  platform packages from exact package metadata; it must not hand-edit an
  individual lock entry or use floating ranges.
- **DEC-003**: A new supported Console intake operation must deterministically
  regenerate the closure inventory from the checked-in lockfile, preserve the
  source-snapshot checks, and make stale closure evidence fail closed. The
  regenerated artifact must include every package name, version, integrity,
  lockfile digest, and license evidence required by ADR-009. The exact output
  becomes the candidate profile only after independent review.
- **DEC-004**: No Console build may be promoted beyond the present local
  founder preview, and no Console package may be called Golden or production
  ready, until the remediation gate in this ADR passes with zero high and
  critical production dependency advisories. The current local preview may
  remain available only with its explicitly documented risk; it is not a
  security acceptance.
- **DEC-005**: If the exact override fails build, runtime, browser, or
  supply-chain verification, abort this migration. Keep the Console preview
  quarantined and open a separate proposed ADR for a tested Next major or
  alternate local-console runtime. Do not silently remove Sharp, suppress an
  advisory, or waive the audit gate.

## Consequences

### Positive

- **POS-001**: The proposed minimal path addresses both verified vulnerable
  transitive paths without changing the Console's framework, UI contract, or
  Factory control-plane API.
- **POS-002**: Exact overrides and a regenerated closure preserve a
  reproducible, reviewable dependency identity rather than relying on npm's
  currently invalid automatic fix recommendation.
- **POS-003**: The remediation adds a durable closure-recapture mechanism,
  preventing future lockfile drift from being normalized by manual JSON edits.

### Negative

- **NEG-001**: `postcss@8.5.23` and `sharp@0.35.3` are candidates, not proven
  compatible replacements for this specific Next 15.5.21 Console until the
  full gate passes.
- **NEG-002**: The lock closure and its evidence will change, which requires
  dependency review, license review, and a dedicated integration-owned slice.
- **NEG-003**: A zero-high/zero-critical audit gate may reveal newly surfaced
  advisories or platform-specific Sharp package changes that extend the
  remediation scope.

## Alternatives Considered

### Patch Next within the 15.x line

- **ALT-001**: Change only `next@15.5.21` to `next@15.5.22`.
- **ALT-002**: **Rejection Reason**: Its published dependencies retain
  `postcss@8.4.31` and optional `sharp@^0.34.3`; it cannot meet the audit
  gate by itself.

### Upgrade to Next 16.2.1

- **ALT-003**: Move to the investigated latest compatible-looking Next 16
  line while retaining React 19.
- **ALT-004**: **Rejection Reason**: It is a major framework migration, raises
  the Node requirement, and still declares the audited PostCSS path. It adds
  migration risk without solving the demonstrated problem on its own.

### Suppress or accept the audit findings

- **ALT-005**: Document the local-only boundary and accept the three high
  findings without changing the dependency closure.
- **ALT-006**: **Rejection Reason**: Local-only binding reduces exposure but
  does not remediate vulnerable build/runtime dependencies or satisfy a
  production-promotion security gate.

### Remove Sharp from the lockfile manually

- **ALT-007**: Delete optional Sharp entries or hand-edit the lockfile and
  closure evidence.
- **ALT-008**: **Rejection Reason**: It creates a non-reproducible closure,
  can break Next image/runtime behavior, and bypasses the verified intake
  boundary.

## Migration and Rollback

- **MIG-001**: PM creates one integration-owned ledger after founder
  acceptance. Its only production write owner updates the Console package
  manifest, lockfile, intake closure generator/verifier, third-party notice,
  and the focused verification tests.
- **MIG-002**: The writer adds exact root overrides for `postcss@8.5.23` and
  `sharp@0.35.3`, regenerates the lockfile through npm using a clean package
  cache/install boundary, and records every resulting package/integrity change.
- **MIG-003**: The writer implements a deterministic recapture command for
  `console-next-closure.json`, uses it to generate the new closure from the
  lockfile, and proves the verifier rejects both lock and closure drift.
- **MIG-004**: QA runs the verification gate below in a clean install and on
  the supported Windows/Node profile. A release reviewer independently checks
  the dependency delta, licenses, audit result, and UI/control-plane behavior.
- **RBK-001**: Before promotion, failure means discard the candidate closure
  and keep the current preview quarantined; no Factory state or generated
  application changes require restoration.
- **RBK-002**: After an accepted candidate has been released to a local
  founder environment, rollback restores the immediately prior verified
  Console manifest, lockfile, closure record, and static output as one
  reviewed set. If the Console is unavailable, use `apps/web`; never combine
  old closure evidence with a new lockfile.
- **ABT-001**: Abort the slice on any remaining high/critical production audit
  finding, changed lockfile without regenerated closure evidence, integrity or
  license gap, production build failure, control-plane proxy regression,
  browser accessibility regression, or unresolved P0/P1 review finding.

## Verification Gate

- **VRF-001**: Record `node --version`, `npm --version`, the exact
  `package.json` overrides, `package-lock.json` digest, and the complete
  regenerated closure/notice delta in the ledger. The lockfile contains exact
  `postcss@8.5.23`, `sharp@0.35.3`, and all resolved platform artifacts.
- **VRF-002**: In a clean Console installation, run
  `npm --prefix apps/console-next audit --omit=dev --json`; it reports zero
  high and zero critical vulnerabilities. Any remaining lower-severity
  advisory is enumerated with ownership and a disposition; no audit output is
  silently filtered.
- **VRF-003**: Run `npm --prefix apps/console-next run preflight` and prove
  it rejects a changed lockfile, a changed closure record, missing integrity,
  and a missing third-party notice. The supported recapture command must be
  covered by focused tests rather than being a manual procedure.
- **VRF-004**: Run `npm --prefix apps/console-next run build`, the Console
  browser E2E and accessibility suites, and the API/proxy tests specified by
  ADR-006. The control console must remain loopback-only, preserve server-side
  capability handling, and expose no credentials or raw briefs.
- **VRF-005**: Run `git diff --check`, review every dependency and license
  change, and obtain independent task review, QA, release review, and PM
  reconciliation. No live model call is required for dependency remediation.
- **VRF-006**: Only after VRF-001 through VRF-005 are fresh and accepted may
  the founder make a separate production/Golden promotion decision. ADR
  acceptance authorizes remediation work, not that promotion.

## Founder Decisions Required

- **FND-001**: Accept or reject this proposed minimal override-and-recapture
  remediation path.
- **FND-002**: If accepted, authorize one bounded integration remediation
  ledger whose scope is Console dependency security only; generated
  applications, Factory contracts, and cloud deployment remain excluded.
- **FND-003**: Decide after independent review whether a verified remediated
  Console may be promoted beyond local founder preview. This decision cannot
  be inferred from ADR acceptance.

## References

- **REF-001**: `docs/adr/006-console-next-product-shell-and-local-proxy.md`
- **REF-002**: `docs/adr/009-governed-developer-console-source-integration.md`
- **REF-003**: `docs/adr/010-light-default-shadcn-console-composition.md`
- **REF-004**: `docs/tech-governance.md`
- **REF-005**: `apps/console-next/package.json`
- **REF-006**: `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/console-next-closure.json`
