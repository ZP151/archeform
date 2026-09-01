---
title: "ADR-0028: Format Baseline Byte Integrity"
status: "Accepted"
date: "2026-09-01"
authors: "Archeform Tech Lead"
tags: ["architecture", "formatting", "integrity", "capabilities", "ci"]
supersedes: ""
superseded_by: ""
---

# ADR-0028: Format Baseline Byte Integrity

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** through a minimal amendment to ADR-0027: preserve
the exact byte-addressed `core.audit` contract-test evidence, add its exact path
to `.prettierignore`, format only the remaining 57 tracked blob-changing paths,
and keep the root `prettier --check .` authority unchanged.

**Accepted on 2026-09-01** by the founder. The acceptance authorizes only this
exact byte-integrity amendment, plan/ledger reconciliation, and the bounded F0
repair. It grants no capability digest or version migration, product behavior,
release, deployment, provider, or cloud authority.

- **GAT-001**: This proposal is not approval. The founder must explicitly
  accept or reject ADR-0028 before PM authorizes a repair, commit, push, or
  replacement CI run. The current Task 3 candidate remains blocked by
  ADR-0027 `ABT-003`.
- **GAT-002**: ADR-0027 remains accepted authority unless the founder accepts
  this amendment. Acceptance would replace only ADR-0027's byte-integrity
  partition, implementation counts, and F0 verification rules identified
  below; all other ADR-0027 decisions remain unchanged.
- **GAT-003**: After acceptance, PM must reconcile the active plan, ledger,
  Task 3 brief, Task 3 report, and review manifest to this ADR before the
  implementation writer resumes. Neither this recommendation nor an existing
  working-tree edit silently reconciles those artifacts.

## Context and reproduced evidence

- **CTX-001**: ADR-0027 accepted a frozen 101-path RED manifest partitioned as
  39 provenance-bound copied-source files plus 62 project-owned writable
  candidates. The latter were expected to produce 58 tracked formatting
  changes and four local normalization-only YAML paths.
- **CTX-002**: The 58-path Task 3 candidate included
  `packages/capabilities/assets/core.audit/1.0.2/tests/contract.json`. Its
  preimage at delivered commit
  `12458713ad39bc90da4e8c541fe5f881a28ec4ba` is one-line JSON whose SHA-256 is
  exactly
  `21335a5e618119a4db05444913cd73a8940ce758df5b42de89b2ac739c94c7bb`.
  `component.json` declares that value as `verification.contractTestDigest`.
- **CTX-003**: Exact resolved Prettier `3.9.6` rewrites the evidence as
  four-line JSON with SHA-256
  `d161e7efe8e3dfac33face31c78dc238880ec20c502db59636affbf5f0eff777`.
  The parsed JSON values remain equal, but the physical evidence bytes do not.
- **CTX-004**: `verifyCapabilityAssetPackage` in
  `packages/capabilities/src/node.ts` reads the evidence as a `Buffer`, hashes
  those exact bytes with SHA-256, and rejects a mismatch before its UTF-8 and
  JSON checks. Four capability tests fail on the candidate because the
  contract-test evidence digest no longer matches. Downstream compiler and
  generated-notification verification also fail for the same cause.
- **CTX-005**: JSON deep semantic equality is therefore insufficient for this
  file. Updating the declared digest would change a stable, golden capability
  asset and its manifest identity; ADR-0027 explicitly forbids that response.
  Its `ABT-003` has triggered and requires renewed governance.
- **CTX-006**: With the contract evidence separated, the original 101 paths
  partition exactly as 39 copied-source protected paths, one byte-integrity
  protected path, and 61 writable candidates. The candidates consist of 57
  tracked blob-changing formatting paths and four project-authored YAML paths
  whose Windows working bytes normalize to their already canonical LF index
  blobs without entering the Git diff.
- **CTX-007**: The resulting dedicated implementation diff is exactly 58
  paths: 57 formatted tracked paths plus `.prettierignore`. The four YAML
  normalization-only paths and the restored byte-integrity evidence path must
  be absent from that diff.
- **CTX-008**: After the existing CI prerequisite
  `pnpm --filter @factory/control-plane prisma:generate`, root typecheck passes.
  The same prerequisite must precede root typecheck, test, and build evidence
  so generated Prisma state is not confused with a formatting regression.
- **CTX-009**: `node scripts/verify-d0-governance.mjs` currently fails six
  obsolete early-ledger state assertions after legitimate delivery
  progression. `node --test scripts/verify-d0-governance.test.mjs` emitted only
  the TAP start for 60 seconds and was terminated. Neither command is usable
  as a current F0 provenance acceptance gate. This does not authorize changing
  those scripts or weakening copied-source integrity.

## Current accepted Golden technology profile

- **CUR-001**: Node remains supported at `>=22.11.0 <23`; local selection is
  exactly `22.11.0`; application images retain `node:22-alpine`.
- **CUR-002**: `packageManager` remains exactly `pnpm@9.0.0`,
  `engines.pnpm` remains `>=9`, and `pnpm-lock.yaml` remains authoritative.
- **CUR-003**: Prettier remains declared as `^3.4.2` and exactly resolved to
  `3.9.6`; the root format gate remains `prettier --check .`.
- **CUR-004**: The accepted package coordinates remain TypeScript `^5.7.2` /
  `5.9.3`; Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` / `12.11.2`;
  Next.js `^15.1.0` / `15.5.22`; React and React DOM `^19.0.0` / `19.2.8`;
  NestJS Common/Core/Platform Express `^10.4.15` / `10.4.22`; Prisma Client
  and CLI `^6.1.0` / `6.19.3`; BullMQ `^5.34.10` / `5.81.2`; and
  compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-005**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and the accepted Compose topology remains unchanged. These
  and `node:22-alpine` are floating-major tags, not exact patch or digest pins.
- **CUR-006**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers never consume a mutable Draft.
- **CUR-007**: Application Graph V1/V2/V3, Product Recipe V1/V2, Snapshot
  V1/V2, API, data, lifecycle, compiler target, generated runtime, capability,
  provider, adapter, security, and deployment contracts remain unchanged.
- **CUR-008**: CI retains
  `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`
  (`v7.0.1`) and
  `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020`
  (`v7.0.0`), workflow-level `contents: read`, no persisted checkout
  credentials, no dependency-cache restore or save, and the accepted command
  order.

## Proposed formatting-integrity profile

This proposed profile is distinct from, and does not replace, the current
accepted Golden technology profile above.

- **PRO-001**: Keep every `CUR-*` coordinate and product contract unchanged.
  Add no package, action, script, formatter option, compatibility mechanism,
  manifest digest, capability version, lockfile change, release, or deployment.
- **PRO-002**: Preserve the frozen 101-path RED manifest but revise its
  classification to exactly `101 = 39 copied-source protected + 1
byte-integrity protected + 61 writable candidates`. The 61 candidates are
  exactly `57 tracked blob-changing + 4 normalization-only` paths.
- **PRO-003**: Restore
  `packages/capabilities/assets/core.audit/1.0.2/tests/contract.json` to its
  exact `12458713` preimage bytes and protect that exact path in
  `.prettierignore`. Its SHA-256 must remain
  `21335a5e618119a4db05444913cd73a8940ce758df5b42de89b2ac739c94c7bb`.
- **PRO-004**: Do not change `component.json`, its
  `verification.contractTestDigest`, its `manifestDigest`, any capability lock,
  any generated digest, any catalog record, or any test expectation. The
  Prettier-output digest beginning `d161e7ef` is RED characterization evidence,
  never a proposed identity.
- **PRO-005**: Run exact resolved Prettier `3.9.6 --write` only over the frozen
  61 writable candidates. Exactly 57 must change tracked blobs. The four YAML
  paths must normalize to their existing index bytes and remain absent from the
  diff.
- **PRO-006**: The final implementation diff must contain exactly 58 paths:
  the frozen 57 formatted tracked paths plus `.prettierignore`. The restored
  contract evidence, four normalization-only YAML paths, package manifests,
  lockfile, CI workflow, and all protected copied-source paths must be absent.

## Decision

- **DEC-001 — Migrate**: Amend ADR-0027 through `PRO-002` to `PRO-006`. Treat
  exact digest-bound evidence as an integrity input, not ordinary
  project-authored formatting debt.
- **DEC-002 — Preserve the root gate**: Keep `prettier --check .` as the single
  local and CI format authority. The exact ignore entry is a byte-integrity
  control, not a general debt waiver or permission to add future exceptions.
- **DEC-003 — Preserve stable capability identity**: Exact evidence bytes and
  their declared digest remain a frozen capability contract. Formatting may
  change only the 57 proven non-contract tracked paths after their own semantic
  and behavioral verification.
- **DEC-004 — Substitute direct current evidence for stale D0 state checks**:
  For this F0 migration only, prove the 39 copied-source paths byte-identical to
  commit `12458713` and run the maintained third-party and source-study gates.
  Do not claim the stale D0 CLI or hanging D0 test passes, and do not repair
  either command in this slice.
- **DEC-005 — No delivery authority**: This proposal authorizes no current
  candidate edit, task resumption, commit, push, CI run, repository release,
  external resource, or deployment.

## Exact manifest discovery and reproduction

- **MAN-001**: Reproduce and freeze the original RED evidence from delivered
  commit `12458713`; record sorted paths and index blobs. Before any resumed
  write, every frozen path must still match its preimage blob:

  ```powershell
  $preimage = "12458713ad39bc90da4e8c541fe5f881a28ec4ba"
  $all = @(pnpm exec prettier --list-different .)
  if ($LASTEXITCODE -ne 1 -or $all.Count -ne 101) {
    throw "Unexpected RED manifest"
  }
  $tracked = @(git ls-files -- $all)
  if ($tracked.Count -ne 101) { throw "Untracked format path" }
  foreach ($path in $all) {
    $expected = git rev-parse "${preimage}:$path"
    $actual = git rev-parse ":$path"
    if ($actual -ne $expected) { throw "Preimage drift: $path" }
  }
  git ls-files --stage -- $all
  ```

- **MAN-002**: Derive the same 39 copied-source paths using ADR-0027 `MAN-002`'s
  14 recorded upstream directory roots plus the exact copied
  `.agents/skills/create-architectural-decision-record/SKILL.md`. Then partition
  the remaining paths with the byte-integrity evidence and four exact
  normalization-only YAML paths:

  ```powershell
  $byteProtected =
    "packages/capabilities/assets/core.audit/1.0.2/tests/contract.json"
  $normalizationOnly = @(
    ".agents/skills/evidence-testing/agents/openai.yaml",
    ".agents/skills/market-desk-research/agents/openai.yaml",
    ".agents/skills/pm-status/agents/openai.yaml",
    ".agents/skills/release-review/agents/openai.yaml"
  )
  $writable = @($all | Where-Object {
    $_ -notin $copiedProtected -and $_ -ne $byteProtected
  })
  $blobChanging = @($writable | Where-Object {
    $_ -notin $normalizationOnly
  })
  if (
    $copiedProtected.Count -ne 39 -or
    $writable.Count -ne 61 -or
    $blobChanging.Count -ne 57 -or
    @($normalizationOnly | Where-Object { $_ -notin $writable }).Count -ne 0
  ) { throw "Partition drift" }
  ```

- **MAN-003**: Prove the byte-integrity failure without mutating the candidate.
  A Node built-in probe must hash raw preimage and working bytes, confirm the
  declared digest, and separately demonstrate parsed equality:

  ```powershell
  node -e "const{execFileSync}=require('node:child_process');const{readFileSync}=require('node:fs');const{createHash}=require('node:crypto');const p='packages/capabilities/assets/core.audit/1.0.2/tests/contract.json';const h=b=>createHash('sha256').update(b).digest('hex');const a=execFileSync('git',['show','12458713:'+p]);const b=readFileSync(p);if(h(a)!=='21335a5e618119a4db05444913cd73a8940ce758df5b42de89b2ac739c94c7bb'||h(b)!=='d161e7efe8e3dfac33face31c78dc238880ec20c502db59636affbf5f0eff777'||JSON.stringify(JSON.parse(a))!==JSON.stringify(JSON.parse(b)))process.exit(1)"
  ```

- **MAN-004**: After the accepted repair, verify exact raw identity and diff
  membership. `$copiedProtected` and `$blobChanging` retain their `MAN-002`
  values:

  ```powershell
  $contract =
    "packages/capabilities/assets/core.audit/1.0.2/tests/contract.json"
  if ((git hash-object --no-filters -- $contract) -ne
      (git rev-parse "12458713:$contract")) {
    throw "Contract evidence bytes changed"
  }
  foreach ($path in $copiedProtected) {
    if ((git hash-object --no-filters -- $path) -ne
        (git rev-parse "12458713:$path")) {
      throw "Copied-source bytes changed: $path"
    }
  }
  foreach ($path in $normalizationOnly) {
    if ((git hash-object --no-filters -- $path) -ne (git rev-parse ":$path")) {
      throw "YAML normalization mismatch: $path"
    }
  }
  $implementation = @(git diff --name-only)
  if ($implementation.Count -ne 58 -or
      $contract -in $implementation -or
      @($normalizationOnly | Where-Object { $_ -in $implementation }).Count -ne 0) {
    throw "Implementation manifest drift"
  }
  ```

## API, data, catalog, supply-chain, security, and operability effects

- **API-001**: No API, request/response, event, schema, identifier,
  serialization, compatibility, Graph, or lifecycle contract changes.
- **DAT-001**: No database migration, durable-data conversion, seed change, or
  generated data change. Prisma generation is a verification prerequisite, not
  a committed data or schema migration.
- **CAT-001**: No capability asset, version, manifest, evidence digest, lock,
  binding, catalog coordinate, compiler target, generated template, or runtime
  changes. The `core.audit@1.0.2` physical evidence remains byte-identical.
- **ADP-001**: No editor, AI, Git, compiler, runtime-provider, Compose, or
  deployment adapter change.
- **LIC-001**: The 39 copied-source blobs, provenance records, license texts,
  source-study coordinates, and retained notices remain unchanged.
- **SUP-001**: No package, action, image, upstream source, or dependency-cache
  authority is added. Existing action SHAs and no-cache CI remain unchanged.
- **SEC-001**: A declared evidence digest is an integrity boundary. Preserving
  its exact bytes prevents a style tool from silently redefining verified
  capability evidence while retaining the same logical JSON values.
- **SEC-002**: Credential, tenant, provider, browser, queue, Docker-socket,
  generated-preview, and repository-write boundaries remain unchanged. No
  secret, prompt, response, environment value, release, or deployment enters
  this migration.
- **OPS-001**: The root format gate becomes green through one exact integrity
  exclusion and 57 formatted tracked paths. Maintainers must preserve the
  excluded evidence bytes or perform a separately governed capability
  migration; ordinary formatting is not authorized to rewrite them.

## Consequences

### Positive

- **POS-001**: The root format gate can become green without corrupting
  digest-bound capability evidence or changing the accepted product contract.
- **POS-002**: The distinction between semantic JSON equality and exact byte
  identity becomes explicit, measurable, and reviewable.
- **POS-003**: Long-term exception authority remains minimal: one exact
  byte-integrity path in addition to ADR-0027's provenance-bound copied-source
  scopes.
- **POS-004**: Direct blob comparison preserves copied-source evidence despite
  the current D0 verifier's obsolete ledger-state assumptions.

### Negative

- **NEG-001**: The format baseline still creates a broad 58-path implementation
  diff: 57 formatted tracked paths plus `.prettierignore`.
- **NEG-002**: One project-owned JSON file intentionally does not conform to
  Prettier because its physical bytes are part of a stable integrity contract.
- **NEG-003**: PM must reconcile existing F0 artifacts and obtain a new review;
  the blocked candidate cannot be accepted merely by restoring one file.
- **NEG-004**: The stale D0 verifier and hanging test remain separate debt. The
  direct checks here do not repair or generally replace them outside F0.

## Alternatives considered

### Update the capability evidence digest

- **ALT-001**: Keep the Prettier output and change
  `verification.contractTestDigest` to the `d161e7ef...` value, then propagate
  any manifest, lock, generated, and expected-hash updates.
- **ALT-002**: **Rejected.** This converts formatting into a stable capability
  contract migration, contradicts ADR-0027's frozen catalog boundary, and adds
  downstream mutation solely to accommodate style.

### Weaken or focus the root format gate

- **ALT-003**: Check only U2/F0 files, add a debt ratchet, or omit the failing
  evidence without an exact integrity classification.
- **ALT-004**: **Rejected.** This preserves hidden repository debt or creates
  broad exception authority. The exact path exclusion is justified by verified
  bytes, while `prettier --check .` remains the green root contract.

### Repair the D0 verifier in this slice

- **ALT-005**: Update early-ledger assertions and debug the hanging test as part
  of F0, then retain ADR-0027's D0 commands as acceptance gates.
- **ALT-006**: **Rejected for this slice.** That is independent governance-tool
  maintenance with different ownership, RED evidence, and path scope. Adding it
  would expand a deterministic formatting baseline and invalidate the frozen
  58-path implementation manifest.

### Reject the amendment and leave F0 blocked

- **ALT-007**: Revert all candidate formatting and retain the failing root gate.
- **ALT-008**: **Rejected.** It preserves a known red mandatory CI gate without
  improving integrity. The proposed migration is bounded, reversible, and
  preserves every product and technology coordinate.

## Migration, rollback, and abort conditions

- **MIG-001**: After explicit founder acceptance, PM reconciles the active
  plan, ledger, Task 3 brief/report, and review artifact to the
  `101 = 39 + 1 + 61`, `61 = 57 + 4`, and 58-path implementation contracts.
  PM freezes the exact 57-path list and preimage blobs before work resumes.
- **MIG-002**: In the existing serialized Task 3 work only, restore the contract
  evidence to its exact `12458713` bytes, add its exact path to
  `.prettierignore`, and retain the 15 ADR-0027 copied-source entries. Never
  update the declared digest, component manifest, locks, fixtures, expectations,
  packages, lockfile, workflow, or configuration.
- **MIG-003**: Run Prettier only on the frozen 61 writable candidates. Commit
  exactly the 57 tracked formatting changes plus `.prettierignore`. Prove the
  contract evidence and four normalization-only YAML paths are absent from the
  implementation diff.
- **MIG-004**: Run focused capability and compiler verification before full
  repository gates. Generate the existing Control Plane Prisma client before
  root typecheck, test, and build. Independent review must precede
  controller-only non-force delivery and replacement two-lane CI evidence.
- **ROL-001**: Before delivery, discard only the PM-authorized Task 3 candidate
  edits and restore its exact pre-task state. Preserve all unrelated work.
- **ROL-002**: After delivery, rollback requires a non-force revert of the
  complete dedicated format-baseline commit. Do not restore only the formatted
  contract evidence or weaken CI; either would reintroduce the verified failure
  or leave a partial baseline.
- **ROL-003**: No data, Graph, service, cache, cloud, release, or deployment
  rollback exists. No irreversible step is authorized except externally
  retained CI logs containing bounded safe evidence.
- **ABT-001**: Abort on any Node, pnpm, Prettier, package, lockfile, action SHA,
  CI permission/cache/event/command-order, Dockerfile, or Compose change.
- **ABT-002**: Abort if the contract evidence does not match the exact declared
  SHA-256 and `12458713` blob, if `component.json` or any digest/manifest/lock
  changes, or if a capability, Graph, API, lifecycle, compiler, generated
  runtime, provider, security, or deployment contract changes.
- **ABT-003**: Abort if any of the 39 copied-source blobs, provenance records,
  licenses, notices, or source studies change or fail direct equality,
  `verify:third-party`, or `verify:source-studies`.
- **ABT-004**: Abort if the partition is not exactly `39 + 1 + 61`, the
  writable split is not exactly `57 + 4`, the implementation diff is not
  exactly 58 authorized paths, or the protected contract/YAML paths enter it.
- **ABT-005**: Abort on a test expectation, snapshot, fixture value, expected
  hash, generated output, D0 verifier, or D0 verifier-test edit made to obtain
  GREEN.

## Ownership, frozen contracts, and delivery sequencing

- **OWN-001**: Platform/Tech Lead owns this formatting-integrity decision.
  Capabilities owns the physical evidence and digest contract. PM owns scope,
  plan/ledger reconciliation, and authorization. The Task 3 writer owns only
  the frozen implementation manifest. QA owns independent evidence. The
  controller alone owns commit, push, and integration mutations.
- **OWN-002**: This ADR authorizes no frontend or backend product work. Existing
  versioned Graph/API/data and capability artifacts are frozen enough for
  unchanged consumption by disjoint work, but not for parallel modification.
  Capabilities is the contract owner for this byte-addressed evidence.
- **OWN-003**: Task 3 remains a single serialized repository-wide migration;
  its paths are not available to parallel writers. A contract or path-manifest
  change stops the task and returns it to PM and the applicable owner.
- **OWN-004**: Generated templates, shared API/data contracts, capability
  locks, Compose topology, migrations, and end-to-end smoke tests remain
  serialized integration work. No such artifact changes in this proposal.
- **DEL-001**: Delivery order is founder decision -> PM reconciliation ->
  bounded repair -> focused GREEN -> full GREEN -> independent review with
  P0/P1 `0/0` -> controller-only non-force commit/push -> replacement CI
  evidence -> PM ledger update. No repository release or cloud deployment is
  authorized.

## TDD and static RED-GREEN plan

- **TST-001 — RED**: Retain CI run `33510492402` and reproduce the exact
  101-path local formatting failure on Node `v22.11.0`, pnpm `9.0.0`, and
  Prettier `3.9.6`.
- **TST-002 — Integrity RED**: Prove the preimage/declared digest is exactly
  `21335a5e...c94c7bb`, the formatted working digest is exactly
  `d161e7ef...eff777`, parsed JSON values are equal, and the four capability
  tests fail only because physical contract evidence no longer matches.
- **TST-003 — Static partition**: Prove the revised exact 101-path partition,
  record all preimage blobs, and assert the one byte-integrity path and 39
  copied-source paths are outside the writable set.
- **TST-004 — Focused GREEN**: Restore the exact evidence bytes without
  changing any declared digest. The previously failing capability tests and
  downstream compiler/generated-notification verification must pass without
  expectation or snapshot changes.
- **TST-005 — Repository GREEN**: `pnpm format:check` must exit zero with no
  listed paths. All focused and full gates below must pass against exactly the
  58-path implementation diff.

## Measurable verification plan

- **VER-001**: Validate this proposal with
  `pnpm exec prettier --check docs/adr/adr-0028-format-baseline-byte-integrity.md`
  and `git diff --check`.
- **VER-002**: Run `MAN-001` through `MAN-004`. Record exact versions and the
  revised `101/39/1/61/57/4/58` counts. Prove the restored contract evidence
  SHA-256 equals the full declared value and `component.json` is unchanged.
- **VER-003**: For the remaining 11 formatted JSON paths, parse the
  `12458713:<path>` preimage and post-format file with Node built-ins and assert
  deep value equality plus unchanged identifiers and versions. The protected
  contract JSON receives byte-equality, not merely semantic-equality,
  verification.
- **VER-004**: Compare all 39 copied-source working blobs directly with
  `12458713` using `MAN-004`; record zero differences. Run
  `pnpm verify:third-party` and `pnpm verify:source-studies`; both must pass.
  The current D0 CLI and test are recorded as inapplicable known failures for
  F0, not run or reported as passing acceptance gates.
- **VER-005**: Run `pnpm --filter @factory/graph typecheck`,
  `pnpm --filter @factory/graph test`,
  `pnpm --filter @factory/capabilities typecheck`,
  `pnpm --filter @factory/capabilities test`,
  `pnpm --filter @factory/compiler typecheck`, and
  `pnpm --filter @factory/compiler test`. All must pass without a snapshot,
  fixture, expected-hash, generated-output, digest, or manifest update.
- **VER-006**: Run `pnpm verify:generated-notification-outbox`; it must pass
  with generated source manifests and digests unchanged.
- **VER-007**: Run the existing CI prerequisite
  `pnpm --filter @factory/control-plane prisma:generate`, then run
  `pnpm typecheck`, `pnpm test`, and `pnpm build` in that order. Run
  `pnpm format:check`, `git diff --check`, and
  `git diff --exit-code -- package.json pnpm-lock.yaml .github/workflows/ci.yml`.
  Every command must exit zero.
- **VER-008**: Assert the implementation diff contains exactly the frozen 57
  formatted tracked paths plus `.prettierignore`, for 58 paths. Assert the one
  protected contract evidence file, four normalization-only YAML paths, 39
  copied-source paths, package manifests, lockfile, workflow, Dockerfiles,
  Compose, provenance, license, notice, manifest, lock, and digest files are
  absent.
- **VER-009**: Independent review must report specification compliance and
  P0/P1 `0/0`. After controller-authorized delivery, both unchanged Node CI
  lanes must pass every unchanged command with no cache activity, write
  credential, artifact publication, release, or deployment.
- **VER-010**: PM records the exact partition, preimage-manifest digest,
  contract evidence SHA-256, versions, focused/full exit codes, known D0 gate
  disposition, review verdict, delivered commit, replacement CI run ID, and
  exact changed-path manifest in the active ledger.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`.
- **REF-005**:
  `docs/adr/adr-0025-explicit-pnpm-script-invocation-for-local-doctor.md`.
- **REF-006**: `docs/adr/adr-0026-ci-dependency-cache-authority.md`.
- **REF-007**: `docs/adr/adr-0027-repository-format-baseline.md`.
- **REF-008**:
  `docs/superpowers/plans/2026-09-01-post-v0.1-local-restaurant-readiness.md`.
- **REF-009**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
- **REF-010**:
  `.superpowers/sdd/2026-09-01-post-v0.1-local-restaurant-readiness/task-3-brief.md`.
- **REF-011**:
  `.superpowers/sdd/2026-09-01-post-v0.1-local-restaurant-readiness/task-3-report.md`.
- **REF-012**: `.prettierignore`.
- **REF-013**:
  `packages/capabilities/assets/core.audit/1.0.2/component.json`.
- **REF-014**:
  `packages/capabilities/assets/core.audit/1.0.2/tests/contract.json`.
- **REF-015**: `packages/capabilities/src/node.ts`.
