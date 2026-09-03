---
title: "ADR-0027: Repository Format Baseline"
status: "Accepted"
date: "2026-09-01"
authors: "Archeform Tech Lead"
tags: ["architecture", "ci", "operability", "formatting", "supply-chain"]
supersedes: ""
superseded_by: ""
amends_if_accepted: "ADR-0024 CI delivery sequencing and the active readiness plan only"
---

# ADR-0027: Repository Format Baseline

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** through one serialized repository-format baseline:
format the exact 58 project-owned paths whose tracked blobs change, normalize
four project-authored YAML working copies to their already canonical tracked LF
bytes, preserve 39 provenance-bound copied skill files byte-for-byte behind
narrow `.prettierignore` entries, and keep the root `prettier --check .` gate
unchanged.

**Accepted on 2026-09-01** by the founder. The accepted decision preserves the
`101 = 39 protected + 62 writable-candidate` partition; its implementation
evidence distinguishes 58 tracked formatting changes from four Windows
working-tree normalization-only YAML candidates, plus the independently
tracked `.prettierignore` change. This acceptance grants no product, release,
deployment, provider, or cloud authority.

- **GAT-001**: This recommendation is not approval. The founder must explicitly
  accept or reject ADR-0027 before PM authorizes a formatting-baseline task,
  path edits, commit, push, or replacement CI run.
- **GAT-002**: Accepted ADR-0024, ADR-0025, and ADR-0026 remain historical and
  current authority. If accepted, ADR-0027 adds only a repository-format
  baseline and delivery prerequisite; it does not amend their runtime,
  package-manager, command, action, permission, cache, or product contracts.
- **GAT-003**: The failed CI run, plan prose, this recommendation, or a local
  formatting preview cannot be treated as founder acceptance or PM
  implementation authorization.

## Context and reproduced evidence

- **CTX-001**: Delivered GitHub Actions run `33510492402` on commit
  `12458713ad39bc90da4e8c541fe5f881a28ec4ba` failed in both `verify
(22.11.0)` and `verify (22.x)` jobs at the exact required
  `pnpm format:check` step. Checkout, setup-node, Corepack, exact pnpm
  activation, frozen install, `pnpm run doctor:toolchain`, and Prisma client
  generation passed in both lanes. Later commands were correctly skipped.
- **CTX-002**: Linux CI reported 97 paths that did not satisfy Prettier. On the
  accepted local Node `v22.11.0` and pnpm `9.0.0` toolchain, exact resolved
  Prettier `3.9.6` reproducibly returns exit 1 and reports 101 tracked paths.
  The four local-only paths are project-authored `.agents/skills/*/agents/openai.yaml`
  files whose index content is LF but current Windows working content is CRLF.
- **CTX-003**: All 101 local paths are tracked and have zero content changes
  between merge-base/main
  `abcae804977c73be15a033089e26f8d631561731` and delivered U2 commit
  `12458713ad39bc90da4e8c541fe5f881a28ec4ba`. U2 created none of the
  formatting violations.
- **CTX-004**: The 101-path set contains 43 `.agents` paths, 38 documentation
  paths, 19 package paths, and one end-to-end test path. By extension it
  contains 72 Markdown, 12 JSON, nine TypeScript, four YAML, two JavaScript,
  one CJS, and one HTML file.
- **CTX-005**: Thirty-nine failing `.agents/skills/**` paths are direct copied
  sources governed by `.agents/skills/UPSTREAM_PROVENANCE.md`: 38 files under
  the exact 14 `obra/superpowers` directories and the exact copied
  `create-architectural-decision-record/SKILL.md`. Their accepted provenance
  requires exact committed Git blobs; formatting them would create source
  divergence and invalidate recorded blob and manifest hashes.
- **CTX-006**: The remaining 62 paths are project-owned writable candidates:
  four agent manifests, 38 documentation paths, one end-to-end test, and 19
  Graph/compiler/capability paths. The four agent manifests are local
  normalization-only candidates: their tracked index blobs are already
  canonical LF, so Prettier replaces CRLF working bytes without changing a
  tracked blob or producing a Git diff. The other 58 candidates require tracked
  blob changes. Twelve capability JSON assets are stable catalog inputs.
  TypeScript paths include compiler and capability source plus
  Graph/compiler/capability tests. Formatting tracked content changes bytes
  even when parsed JSON values or program behavior are intended to remain
  identical.
- **CTX-007**: The current `.prettierignore` excludes only four generated
  compiler-runtime path families. The root script remains exactly
  `"format:check": "prettier --check ."`; weakening that command would hide
  repository-wide debt instead of establishing the baseline it claims to
  verify.
- **CTX-008**: U2's accepted implementation manifest contains only
  `.github/workflows/ci.yml` and `docs/third-party-sources.md`. Formatting the
  inherited repository baseline cannot be silently folded into U2 because it
  crosses package, catalog, copied-source, and historical-document ownership.

## Current accepted Golden technology profile

- **CUR-001**: Node remains supported at `>=22.11.0 <23`; local selection is
  exactly `22.11.0`; application Dockerfiles retain the floating-major
  `node:22-alpine` tag.
- **CUR-002**: `packageManager` remains exactly `pnpm@9.0.0`,
  `engines.pnpm` remains `>=9`, and `pnpm-lock.yaml` remains authoritative for
  exact package resolutions.
- **CUR-003**: The accepted application coordinates remain TypeScript
  `^5.7.2` / `5.9.3`; Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` /
  `12.11.2`; Next.js `^15.1.0` / `15.5.22`; React and React DOM `^19.0.0` /
  `19.2.8`; NestJS Common/Core/Platform Express `^10.4.15` / `10.4.22`;
  Prisma Client and CLI `^6.1.0` / `6.19.3`; BullMQ `^5.34.10` / `5.81.2`;
  and compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and Docker Compose topology remains unchanged. These image
  tags and `node:22-alpine` are floating-major constraints, not exact patch or
  digest pins.
- **CUR-005**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers never consume a mutable Draft.
- **CUR-006**: Application Graph V1/V2/V3, Product Recipe V1/V2, Snapshot
  V1/V2, API, capability, compiler target, generated Restaurant runtime,
  provider, adapter, security, and deployment contracts remain unchanged.
- **CUR-007**: CI retains
  `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`
  (`v7.0.1`) and
  `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020`
  (`v7.0.0`), workflow-level `contents: read`, no persisted checkout
  credentials, no dependency-cache restore/save, and the accepted exact
  command order.

## Current formatting profile

- **CFM-001**: The root manifest supports Prettier `^3.4.2`; the lockfile and
  installed frozen workspace resolve exactly Prettier `3.9.6`.
- **CFM-002**: The public repository gate is exactly
  `pnpm format:check` -> `prettier --check .`.
- **CFM-003**: `.prettierignore` currently excludes only generated compiler
  runtime directories. It does not protect exact copied skill-source scopes.
- **CFM-004**: The current accepted U2 workflow invokes the root gate without
  a focused-path override. The delivered branch is therefore correctly
  blocked while the root gate is red.

## Proposed repository-format profile

This proposed profile is distinct from, and does not replace, the current
accepted Golden technology profile.

- **PRO-001**: Keep every `CUR-*` and `CFM-001`/`CFM-002` coordinate unchanged.
  Add no package, action, script, formatter option, compatibility mechanism, or
  lockfile change.
- **PRO-002**: Freeze the exact 101-path RED manifest and each path's preimage
  Git blob at delivered commit
  `12458713ad39bc90da4e8c541fe5f881a28ec4ba`. Do not admit a path discovered
  later without PM reconciliation and renewed review.
- **PRO-003**: Partition that manifest into exactly 39 provenance-bound copied
  skill files and exactly 62 project-owned writable candidates. Partition the
  latter again into exactly 58 tracked blob-changing paths and the four exact
  local normalization-only YAML paths recorded in `MAN-002`. The copied-source
  partition is determined only by the 14 upstream directory scopes and one
  exact file already recorded in `.agents/skills/UPSTREAM_PROVENANCE.md`.
- **PRO-004**: Add `.prettierignore` entries for exactly those 14 copied-source
  directory scopes and the exact copied
  `.agents/skills/create-architectural-decision-record/SKILL.md`. These are
  integrity exclusions, not formatting-debt waivers. Existing D0 governance
  verification continues to enforce the upstream scope, file count, exact Git
  blobs, normalized content, licenses, and retained notices.
- **PRO-005**: Run exact resolved Prettier `3.9.6` once with `--write` against
  only the frozen 62 project-owned writable candidates. Exactly 58 must produce
  tracked blob changes. The four normalization-only YAML files must become raw
  byte-identical to their index/preimage blobs and remain absent from the Git
  diff. The migration must not format an entire directory, use a wildcard that
  can expand after review, or modify a path merely because it becomes newly
  discoverable.
- **PRO-006**: After migration, `pnpm format:check` must pass on exact Node
  `22.11.0`/pnpm `9.0.0` locally and in both unchanged CI Node lanes. No ratchet,
  warning budget, focused-CI substitute, or baseline suppression file is
  introduced.

## Decision

- **DEC-001 — Migrate**: Establish the one-time partitioned baseline in
  `PRO-002` through `PRO-006`. This adopts the deterministic formatting portion
  of alternative A while protecting provenance-bound inputs instead of
  rewriting all 101 files indiscriminately.
- **DEC-002 — Treat copied-source exclusions as integrity controls**: Exact
  upstream copies are governed by their provenance and license checks, not by
  local Prettier style. A future divergence, formatter adoption, or source
  update for those scopes requires an explicit source-study update and
  applicable governance before implementation.
- **DEC-003 — Treat tracked project-owned formatting as byte-changing
  migration**: The 58 tracked blob changes are not assumed semantically
  harmless merely because they are mechanical. JSON value equivalence, package
  behavior, generated output, hashes, documentation facts, and code blocks must
  be verified before acceptance. The four YAML candidates are working-tree
  normalization only and must produce no tracked change.
- **DEC-004 — Preserve the root authority**: Keep `prettier --check .` as the
  single local and CI format gate. Do not narrow U2 to its two files and do not
  add an accumulating debt mechanism.
- **DEC-005 — No product or delivery authority**: This proposal authorizes no
  product behavior, release, deployment, cloud resource, Product Publish,
  repository commit, or push.

## Exact manifest discovery and reproduction

- **MAN-001**: PM freezes the following RED evidence at commit `12458713` and
  records the sorted 101 paths plus `git ls-files --stage` blob rows in the
  formatting task brief/review artifact. The command must exit with Prettier
  code 1, counts `101`, `101`, and `0`, and merge-base `abcae804...`:

  ```powershell
  git status --short
  git rev-parse HEAD
  git merge-base HEAD main
  $all = @(pnpm exec prettier --list-different .)
  if ($LASTEXITCODE -ne 1 -or $all.Count -ne 101) { throw "Unexpected RED manifest" }
  $tracked = @(git ls-files -- $all)
  if ($tracked.Count -ne 101) { throw "Untracked format path" }
  $base = git merge-base HEAD main
  $introduced = @(git diff --name-only $base HEAD -- $all)
  if ($introduced.Count -ne 0) { throw "U2 changed a format path" }
  git ls-files --stage -- $all
  ```

- **MAN-002**: Partition only with these previously recorded provenance scopes
  and exact normalization-only paths; the result must be exactly 39 protected,
  62 writable candidates, 58 blob-changing paths, and four normalization-only
  paths:

  ```powershell
  $roots = @(
    ".agents/skills/brainstorming/",
    ".agents/skills/dispatching-parallel-agents/",
    ".agents/skills/executing-plans/",
    ".agents/skills/finishing-a-development-branch/",
    ".agents/skills/receiving-code-review/",
    ".agents/skills/requesting-code-review/",
    ".agents/skills/subagent-driven-development/",
    ".agents/skills/systematic-debugging/",
    ".agents/skills/test-driven-development/",
    ".agents/skills/using-git-worktrees/",
    ".agents/skills/using-superpowers/",
    ".agents/skills/verification-before-completion/",
    ".agents/skills/writing-plans/",
    ".agents/skills/writing-skills/"
  )
  $exact = ".agents/skills/create-architectural-decision-record/SKILL.md"
  $protected = @($all | Where-Object {
    $path = ($_ -replace "\\", "/")
    $path -eq $exact -or @($roots | Where-Object { $path.StartsWith($_) }).Count -gt 0
  })
  $writable = @($all | Where-Object { $_ -notin $protected })
  $normalizationOnly = @(
    ".agents/skills/evidence-testing/agents/openai.yaml",
    ".agents/skills/market-desk-research/agents/openai.yaml",
    ".agents/skills/pm-status/agents/openai.yaml",
    ".agents/skills/release-review/agents/openai.yaml"
  )
  $blobChanging = @($writable | Where-Object { $_ -notin $normalizationOnly })
  if (
    $protected.Count -ne 39 -or
    $writable.Count -ne 62 -or
    $blobChanging.Count -ne 58 -or
    @($normalizationOnly | Where-Object { $_ -notin $writable }).Count -ne 0
  ) { throw "Partition drift" }
  ```

- **MAN-003**: After Prettier writes the 62 candidates, verify each
  normalization-only working file is raw byte-identical to its index blob and
  absent from the Git diff; verify every blob-changing path is present:

  ```powershell
  foreach ($path in $normalizationOnly) {
    $workingBlob = git hash-object --no-filters -- $path
    $indexBlob = git rev-parse ":$path"
    if ($workingBlob -ne $indexBlob) { throw "YAML normalization mismatch: $path" }
  }
  if (@(git diff --name-only -- $normalizationOnly).Count -ne 0) {
    throw "Normalization-only YAML entered the diff"
  }
  $changed = @(git diff --name-only -- $blobChanging)
  if ($changed.Count -ne 58) { throw "Blob-changing manifest drift" }
  ```

- **MAN-004**: If ADR acceptance or PM reconciliation advances HEAD before the
  formatting writer begins, every frozen path must still have the same blob as
  `12458713`. Any content drift stops the task; it is not silently added to or
  removed from the baseline.

## API, data, adapter, catalog, license, and supply-chain effects

- **API-001**: No API, request/response, event, schema, serialization,
  identifier, compatibility, Graph, or lifecycle contract change is
  authorized. Existing versioned contracts remain frozen.
- **DAT-001**: No database migration, durable-data conversion, seed behavior,
  or persistence change. JSON whitespace changes bytes, so every formatted
  JSON file must parse to values deeply equal to its frozen preimage.
- **ADP-001**: No editor, AI, Git, compiler, runtime-provider, or deployment
  adapter behavior change. Source formatting may not change adapter exports or
  generated commands.
- **CAT-001**: The 12 formatted capability JSON files retain identical parsed
  values, identifiers, versions, bindings, permissions, tests, and catalog
  admission results. No catalog entry is added, removed, renamed, or
  re-versioned.
- **LIC-001**: No copied source, license text, retained notice, repository,
  tag, commit, content hash, or divergence classification changes. The 39
  provenance-bound files remain exact committed blobs.
- **SUP-001**: No package, action, image, or upstream source is added. The
  existing D0 governance verifier must continue to prove the copied-skill
  provenance manifest and the exact Awesome Copilot copied file.

## Security and operability effects

- **SEC-001**: No credential, secret, provider, tenant, browser, queue,
  generated-preview, or Docker-socket boundary changes. Formatting and
  evidence must not print or persist environment values, raw prompts, raw
  responses, request bodies, or generated secrets.
- **SEC-002**: Preserving exact copied-source blobs avoids silently converting
  reviewed upstream inputs into local forks. Capability and compiler paths
  remain subject to their existing validation, containment, and deterministic
  generation tests.
- **OPS-001**: The root format gate becomes actionable and green without
  reducing its coverage for project-owned files. Future project-authored drift
  fails locally and in both CI lanes.
- **OPS-002**: The one-time migration is broad and review-heavy, but it adds no
  continuing runtime, service, cache, deployment, or operational authority.

## Consequences

### Positive

- **POS-001**: The unchanged root format gate becomes truthful and green across
  the supported Windows and Linux evidence environments.
- **POS-002**: U2 can be judged on the required repository gate without
  attributing inherited formatting debt to its two-file implementation.
- **POS-003**: All project-owned known debt is removed in one bounded wave; no
  warning budget or permanent 101-path exemption accumulates.
- **POS-004**: Exact upstream copied-source identity and retained license
  evidence remain intact.

### Negative

- **NEG-001**: The migration creates a large 59-path implementation diff: 58
  tracked formatted paths plus `.prettierignore`. The four local
  normalization-only YAML paths are writable candidates but do not enter the
  diff. The migration causes line-level blame churn across historical documents
  and cross-package sources.
- **NEG-002**: Formatting JSON, Markdown, TypeScript, JavaScript, CJS, HTML, and
  YAML changes bytes and may affect hashes, generated-source digests, code
  blocks, or parser behavior if verification is incomplete.
- **NEG-003**: Thirty-nine copied skill files remain outside Prettier coverage.
  Their integrity depends on the stronger provenance verifier rather than the
  root style gate.
- **NEG-004**: U2 and U3 remain blocked while governance, the serialized
  baseline, independent review, delivery, and replacement CI evidence run.

## Alternatives considered

### A. Format all 101 tracked paths

- **ALT-001**: Run exact Prettier `3.9.6` over every current failing path and
  keep `prettier --check .` unchanged with no new ignore entries.
- **ALT-002**: **Rejected as written.** It would modify 39 exact copied-source
  blobs and invalidate accepted provenance claims. The proposed decision keeps
  A's one-time project-owned migration while protecting those inputs.

### B. Add a debt ignore or ratchet

- **ALT-003**: Ignore all 101 paths, store a violation allowlist, or change the
  root gate to permit a non-increasing violation count.
- **ALT-004**: **Rejected.** It creates continuing exception authority,
  preserves project-owned debt, complicates deletion/rename accounting, and
  allows the root gate to pass while known files remain nonconforming. Narrow
  copied-source integrity exclusions are not a general debt ratchet.

### C. Focus CI formatting on U2 paths

- **ALT-005**: Replace the root step with focused Prettier checks for
  `.github/workflows/ci.yml` and `docs/third-party-sources.md`.
- **ALT-006**: **Rejected.** It weakens the accepted command sequence, makes
  local and CI format authorities disagree, and leaves the promised green root
  gate false.

### D. Reject migration and leave U2 blocked

- **ALT-007**: Make no repository change and retain the reproducibly failing
  gate.
- **ALT-008**: **Rejected.** It preserves the smallest immediate diff but
  prevents the accepted CI profile and downstream readiness work from reaching
  measurable acceptance.

## Migration, rollback, and abort conditions

- **MIG-001**: After founder acceptance, PM creates a separate serialized
  format-baseline task rather than widening U2 retroactively. PM freezes the
  101/39/62/58/4 partition, preimage blobs, exact allowed paths, owners, and
  evidence artifact before implementation begins.
- **MIG-002**: First add only the 15 provenance-scope entries described in
  `PRO-004` to `.prettierignore`; then run exact Prettier `3.9.6 --write` only
  over the frozen 62-candidate writable manifest. Commit only the expected 58
  tracked formatting changes plus `.prettierignore`; verify the four
  normalization-only YAML files against their index blobs and exclude them from
  the diff. Do not update package or lockfile state.
- **MIG-003**: Review JSON and generated/compiler-sensitive changes before
  ordinary documentation formatting. Parsed JSON values, capability admission,
  generated output, Graph hashes, lifecycle assertions, and copied-source
  provenance must remain unchanged.
- **MIG-004**: Deliver the baseline as its own non-force commit after focused
  GREEN evidence and independent review. Only then may the controller push and
  obtain replacement two-lane CI evidence for U2. U3 remains serialized behind
  accepted U2.
- **ROL-001**: Before delivery, discard only the authorized formatting-task
  edits if any abort condition occurs. Preserve unrelated work and do not use
  destructive history rewriting.
- **ROL-002**: After delivery, rollback is one normal non-force revert of the
  dedicated baseline commit. That restores the known red root gate and blocks
  U2 again; it does not authorize weakening CI or retaining a partial baseline.
- **ROL-003**: No data, Graph, cache, service, cloud, release, or deployment
  rollback exists. No step is irreversible other than externally retained CI
  logs, which must contain safe bounded evidence.
- **ABT-001**: Abort on any package or lockfile change; Node/pnpm/Prettier or
  action-version change; workflow permission/cache/event/command change; or new
  formatter dependency/configuration.
- **ABT-002**: Abort if a copied-source blob, provenance record, license text,
  notice, source-study coordinate, or protected scope changes or fails its D0
  verifier.
- **ABT-003**: Abort on any JSON value/order-sensitive contract change,
  capability catalog change, Graph hash or serialization change, lifecycle or
  compiler behavior change, generated-runtime byte/digest change, provider or
  security-boundary change, Dockerfile or Compose topology change, test
  expectation rewrite, or snapshot update.
- **ABT-004**: Abort if the final changed-path set differs from the PM-frozen
  58 blob-changing paths plus `.prettierignore`, if a normalization-only YAML
  path appears in the diff, or if a normalization-only working file is not raw
  byte-identical to its index blob, excluding separately owned PM reconciliation
  records.

## Ownership, frozen contracts, and delivery sequencing

- **OWN-001**: Platform/Tech Lead owns the repository-format contract. PM owns
  task state, the exact manifest, plan reconciliation, and implementation
  authorization. A PM-assigned mechanical writer owns only the frozen format
  paths. Package owners review capability/compiler/Graph effects. QA owns
  independent evidence. The controller alone owns commit and push mutations.
- **OWN-002**: This cross-cutting 59-path implementation migration remains
  serialized with no
  concurrent writers. A path-content change before formatting stops the task
  and returns it to PM rather than being merged into the manifest.
- **OWN-003**: This ADR authorizes no frontend or backend product modification.
  Existing versioned Graph/API/data contracts remain frozen enough for
  unchanged consumption, but no disjoint frontend/backend task is authorized.
  Any future contract change requires a named contract owner and separately
  versioned frozen artifact.
- **OWN-004**: Generated templates, shared API/data contracts, Compose
  topology, migrations, and end-to-end smoke tests remain serialized
  integration work. Formatting the existing `e2e/viewport-focus.spec.ts` does
  not authorize changing its behavior or the future readiness smoke path.
- **DEL-001**: PM records ADR-0027's founder decision, adds the separate
  baseline task and exact manifest to the active plan/ledger, keeps U2 blocked
  pending replacement green CI, and keeps U3 planned. ADR acceptance alone
  does not amend these live artifacts.
- **DEL-002**: After baseline review and delivery, rerun the unchanged CI
  workflow. U2 may advance only if both lanes pass every step and the PM ledger
  records the run, exact versions, manifest, reviews, and safe results.
- **DEL-003**: This sequence grants no merge to `main`, Product Publish,
  repository release, Git tag, GitHub Release, external resource, or cloud
  deployment authority.

## TDD and static RED-GREEN plan

- **TST-001 — RED**: Reproduce `pnpm format:check` exit 1 and the exact 101
  local tracked paths on Node `v22.11.0`, pnpm `9.0.0`, and Prettier `3.9.6`.
  Retain GitHub run `33510492402` as independent Linux RED evidence for 97
  paths and both failing lanes.
- **TST-002 — Static partition**: Prove all 101 paths are tracked, unchanged
  from merge-base/main, and partitioned 39 protected/62 writable candidates,
  with the candidates partitioned again into 58 blob-changing/four
  normalization-only paths, using the commands in `MAN-*`. Record preimage blob
  IDs before any write.
- **TST-003 — GREEN**: After the exact migration, run
  `pnpm format:check`; it must exit zero. Re-run
  `pnpm exec prettier --list-different .`; it must return zero paths and exit
  zero on both supported operating-system evidence paths.
- **TST-004 — No product test rewrite**: Formatting is a static migration, so
  no new product behavior test is required. Existing tests and snapshots are
  immutable evidence; changing an assertion, fixture value, expected hash, or
  snapshot to obtain GREEN is an abort condition.

## Measurable verification plan

- **VER-001**: Validate this proposal with
  `pnpm exec prettier --check docs/adr/adr-0027-repository-format-baseline.md`
  and `git diff --check`.
- **VER-002**: Before migration, run `MAN-001` and `MAN-002`, verify exact
  versions with `node --version`, `pnpm --version`, and
  `pnpm exec prettier --version`, and compare every frozen path's current blob
  to commit `12458713`.
- **VER-003**: For all 12 formatted JSON files, a Node built-in probe must load
  the `12458713:<path>` preimage with `git show`, parse the preimage and
  post-format file with `JSON.parse`, and assert deep value equality. It must
  also prove identifiers and version fields are unchanged.
- **VER-004**: Run
  `node --test scripts/verify-d0-governance.test.mjs` and
  `node scripts/verify-d0-governance.mjs`. Both must pass with the recorded
  50-file Superpowers manifest, exact Awesome Copilot blob, license hashes, and
  retained notices unchanged.
- **VER-005**: Run `pnpm --filter @factory/graph typecheck`,
  `pnpm --filter @factory/graph test`,
  `pnpm --filter @factory/capabilities typecheck`,
  `pnpm --filter @factory/capabilities test`,
  `pnpm --filter @factory/compiler typecheck`, and
  `pnpm --filter @factory/compiler test`. All must pass without snapshot,
  fixture-value, expected-hash, or generated-output updates.
- **VER-006**: Run `pnpm verify:generated-notification-outbox`,
  `pnpm verify:third-party`, and `pnpm verify:source-studies`. Generated source
  manifests/digests, source-study coordinates, and retained notices must remain
  unchanged.
- **VER-007**: Run `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm format:check`, `git diff --check`, and
  `git diff --exit-code -- pnpm-lock.yaml`. All must exit zero. Review the
  Markdown diff for unchanged facts, URLs, code-block contents, decision
  statuses, and historical evidence.
- **VER-008**: Assert the implementation diff contains exactly the frozen 58
  tracked formatted paths plus `.prettierignore`, for 59 implementation paths.
  Run `MAN-003` to prove the four normalization-only YAML working files match
  their preimage/index blobs and are absent from the diff. Separately owned PM
  plan/ledger reconciliation must remain in its own reviewed manifest. Assert
  zero changes to `.github/workflows/ci.yml`, package manifests,
  `pnpm-lock.yaml`, Dockerfiles, Compose, provenance/license/notice records, or
  protected copied files.
- **VER-009**: After controller-authorized delivery, observe a new run of the
  unchanged CI workflow. Both Node lanes must pass formatting, typecheck, test,
  build, third-party, and source-study steps with no dependency-cache activity,
  secret, write permission, artifact publication, release, or deployment.
- **VER-010**: PM records the exact 101/39/62/58/4 partition, 59-path
  implementation diff, preimage-manifest digest, versions, focused/full command
  exit codes, independent review verdict, replacement CI run ID, and exact
  changed-path manifest in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
  Evidence contains no credential, environment value, raw prompt, raw response,
  or request body.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**: `docs/delivery-policy.md`.
- **REF-005**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`.
- **REF-006**:
  `docs/adr/adr-0025-explicit-pnpm-script-invocation-for-local-doctor.md`.
- **REF-007**: `docs/adr/adr-0026-ci-dependency-cache-authority.md`.
- **REF-008**:
  `docs/superpowers/plans/2026-09-01-post-v0.1-local-restaurant-readiness.md`.
- **REF-009**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
- **REF-010**: `.github/workflows/ci.yml`.
- **REF-011**: `.prettierignore`.
- **REF-012**: `.agents/skills/UPSTREAM_PROVENANCE.md`.
- **REF-013**: GitHub Actions CI run `33510492402`,
  <https://github.com/ZP151/archeform/actions/runs/33510492402>.
