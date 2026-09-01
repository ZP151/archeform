---
title: "ADR-0025: Explicit pnpm Script Invocation for Local Doctor"
status: "Accepted"
date: "2026-09-01"
authors: "Archeform Tech Lead"
tags: ["architecture", "operability", "pnpm", "onboarding", "ci"]
supersedes: ""
superseded_by: ""
amends_if_accepted: "ADR-0024 DEC-005 doctor invocation spellings only"
---

# ADR-0025: Explicit pnpm Script Invocation for Local Doctor

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** the supported doctor invocation contract from
`pnpm doctor` and `pnpm doctor:toolchain` to the explicit package-script forms
`pnpm run doctor` and `pnpm run doctor:toolchain`.

**Accepted on 2026-09-01** by the founder. The acceptance authorizes this
bounded command-spelling correction only; it does not change the Golden
technology profile, product contracts, security boundaries, or Compose
topology. PM must record the decision before authorizing implementation or
documentation changes that consume the accepted spellings.

## Context and reproduced evidence

- **CTX-001**: Accepted ADR-0024 DEC-005 freezes `pnpm doctor` as the supported
  local preflight and maps the root `doctor` script to
  `node scripts/doctor.mjs local`.
- **CTX-002**: The accepted package manager is exactly pnpm `9.0.0`. In that
  version, `doctor` is also a pnpm built-in command. `pnpm help doctor` exits
  zero and identifies `pnpm doctor` as the pnpm health-check command.
- **CTX-003**: On the supported Node `22.11.0` and pnpm `9.0.0` toolchain,
  `pnpm doctor` exits zero without invoking the root package script and without
  emitting any Archeform `Doctor local:` result. The exit code can therefore
  falsely appear to satisfy the accepted local-readiness gate.
- **CTX-004**: `pnpm run doctor` invokes
  `node scripts/doctor.mjs local` and reports the actual local result. In the
  reproduced environment it failed closed because the Docker server was not
  running, which is the expected Archeform behavior rather than a defect.
- **CTX-005**: `pnpm run doctor:toolchain` invokes
  `node scripts/doctor.mjs toolchain` and passes all current toolchain checks.
  The shorthand `pnpm doctor:toolchain` currently resolves to the script, but
  retaining mixed implicit and explicit invocation rules would leave the
  supported interface dependent on pnpm command-name resolution.

## Current accepted Golden profile

- **CUR-001**: Node remains supported at `>=22.11.0 <23`; the local selector
  remains exactly `22.11.0`, and the three tracked application Dockerfiles
  continue to use the floating-major `node:22-alpine` image.
- **CUR-002**: `packageManager` remains exactly `pnpm@9.0.0`,
  `engines.pnpm` remains `>=9`, and `pnpm-lock.yaml` remains the exact package
  resolution authority.
- **CUR-003**: The accepted application stack remains TypeScript `^5.7.2`
  resolved to `5.9.3`; Next.js `^15.1.0` / `15.5.22`; React and React DOM
  `^19.0.0` / `19.2.8`; Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` /
  `12.11.2`; NestJS `^10.4.15` / `10.4.22`; Prisma `^6.1.0` / `6.19.3`;
  BullMQ `^5.34.10` / `5.81.2`; and ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and the accepted Docker Compose service topology remains
  unchanged.
- **CUR-005**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers never consume mutable Drafts.
- **CUR-006**: Application Graph V1/V2/V3, Product Recipe V1/V2, Snapshot
  V1/V2, capability, API, generated Restaurant runtime, compiler target, and
  deployment contracts remain unchanged.

## Current accepted operability contract

- **AOP-001**: ADR-0024 currently names `pnpm doctor` and
  `pnpm doctor:toolchain` as the supported evaluator and CI command spellings.
- **AOP-002**: The root package-script keys are `doctor` and
  `doctor:toolchain`, mapped respectively to `node scripts/doctor.mjs local`
  and `node scripts/doctor.mjs toolchain`.
- **AOP-003**: `pnpm accept:local`, the future local product-acceptance command,
  is outside this collision and remains unchanged by this proposal.

## Accepted profile and decision

- **DEC-001 — Migrate**: The supported local preflight is exactly
  `pnpm run doctor`.
- **DEC-002 — Migrate consistently**: The supported toolchain preflight is
  exactly `pnpm run doctor:toolchain`, including in GitHub
  CI. Both doctor entry points therefore use pnpm's explicit package-script
  namespace.
- **DEC-003 — Keep implementation coordinates**: Keep the `doctor` and
  `doctor:toolchain` keys and their existing `node scripts/doctor.mjs ...`
  mappings. No wrapper, alias, package, executable, or compatibility shim is
  introduced.
- **DEC-004 — Keep the Golden profile**: This is an operability-contract
  correction, not a proposed Golden technology profile. All runtime,
  framework, package, lockfile, image, Graph, API, data, compiler, generated
  template, security, and Compose coordinates remain exactly the current
  accepted profile listed above.
- **DEC-005 — Preserve historical evidence**: ADR-0024 remains the accepted
  historical decision. If this ADR is accepted, it has precedence only over
  ADR-0024 DEC-005's two doctor invocation spellings; every other ADR-0024
  decision remains accepted and unchanged.

## Consequences

### Positive

- **POS-001**: The supported local command cannot be captured by pnpm's
  built-in `doctor` command and therefore reports the real Archeform readiness
  result and exit code.
- **POS-002**: Local documentation and CI use one explicit rule for both doctor
  scopes, independent of current or future pnpm shorthand resolution.
- **POS-003**: The correction requires no dependency, lockfile, runtime,
  service, data, or product-contract migration.

### Negative

- **NEG-001**: ADR-0024 retains historical obsolete shorthand, and active
  command surfaces require a bounded documentation and workflow update.
- **NEG-002**: `pnpm doctor` continues to be a valid pnpm built-in command and
  cannot be made to invoke Archeform without changing the package-manager
  boundary or adding a wrapper. Users relying on the obsolete spelling must be
  redirected by documentation; no compatibility interception is provided.
- **NEG-003**: The supported commands become five characters longer and require
  exact spelling in evaluator instructions and CI.

## Alternatives considered

### Keep `pnpm doctor`

- **ALT-001**: Retain ADR-0024 DEC-005 unchanged and accept pnpm's built-in
  result as the supported preflight.
- **ALT-002**: **Rejected.** The built-in does not execute Archeform checks,
  may exit zero when the local product stack is unusable, and would create
  misleading acceptance evidence.

### Rename the package script to `doctor:local`

- **ALT-003**: Replace the `doctor` key with `doctor:local` and support
  `pnpm doctor:local` or `pnpm run doctor:local`.
- **ALT-004**: **Rejected.** It creates a broader script-key migration when
  explicit `pnpm run doctor` already disambiguates the accepted mapping. It
  also provides no advantage over using explicit `run` consistently.

### Add a wrapper or package-manager shim

- **ALT-005**: Add a root executable, shell wrapper, pnpm patch, or helper
  package that intercepts `pnpm doctor`.
- **ALT-006**: **Rejected.** A repository script cannot safely override a pnpm
  built-in invoked before package-script resolution. A wrapper would add
  platform, supply-chain, support, and compatibility surface for no product
  value.

### Use direct Node commands as the public contract

- **ALT-007**: Document `node scripts/doctor.mjs local|toolchain` instead of
  pnpm package-script entry points.
- **ALT-008**: **Rejected.** Direct Node remains a useful diagnostic boundary,
  but it duplicates user-facing commands and bypasses the root manifest's
  supported script interface.

## API, data, adapter, catalog, license, and supply-chain effects

- **API-001**: No API, request/response, event, schema, serialization,
  identifier, compatibility, Graph, or lifecycle contract changes.
- **DAT-001**: No database migration, durable-data conversion, seed change, or
  persistence effect.
- **ADP-001**: No editor, AI, Git, compiler, runtime-provider, or deployment
  adapter change.
- **CAT-001**: No capability, UI registry, recipe, compiler-target, generated
  template, package, or runtime catalog coordinate changes.
- **LIC-001**: No source intake, copied code, package, action, image, or license
  notice is added or changed.
- **SUP-001**: pnpm remains exactly `9.0.0`; no dependency or lockfile change is
  authorized. The proposal reduces reliance on implicit CLI dispatch without
  adding a supply-chain input.

## Security and operability effects

- **SEC-001**: The doctor continues to print only safe check names, safe tool
  versions, missing environment-variable names, and bounded remediation. It
  never prints environment values, credentials, raw prompts, raw responses,
  request bodies, or child-process environments.
- **SEC-002**: The browser, tenant, provider, worker, Docker-socket, generated
  preview, and deployment trust boundaries remain unchanged. Docker access
  remains privileged local infrastructure and not production authority.
- **OPS-001**: CI and evaluator instructions receive the real doctor exit code
  instead of a successful unrelated pnpm health check.
- **OPS-002**: No service, queue, provider, network exposure, Compose mutation,
  deployment, cloud resource, or repository release is authorized.

## Migration, rollback, and abort conditions

- **MIG-001**: Following founder acceptance and PM authorization, replace
  supported references to `pnpm doctor` with `pnpm run doctor` and references
  to `pnpm doctor:toolchain` with `pnpm run doctor:toolchain` in the active
  readiness plan, future README quick start, future acceptance record, and
  future `.github/workflows/ci.yml`.
- **MIG-002**: Keep `package.json`, `scripts/doctor.mjs`, and
  `scripts/doctor.test.mjs` behavior unchanged except for independently proven
  fixes unrelated to command naming. Do not alter `pnpm-lock.yaml`.
- **MIG-003**: PM records ADR-0025's founder decision and reconciles U1 state in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`
  and `docs/project-status.md` before U1 delivery resumes.
- **ROL-001**: Before any downstream delivery, rollback is documentation-only:
  reject this proposal and retain ADR-0024's existing command text. No data,
  runtime, package, or infrastructure rollback exists.
- **ROL-002**: After accepted migration, rollback requires a new governance
  decision because restoring `pnpm doctor` would restore the proven collision.
  Repository rollback is a non-force revert of only the command-reference
  changes; product artifacts and data remain untouched.
- **ABT-001**: Abort if implementation requires a pnpm version change, package
  or lockfile change, wrapper, compatibility shim, Dockerfile or Compose
  topology change, Graph/API/data change, secret, provider call, repository
  write permission, artifact publication, or deployment permission.
- **ABT-002**: Abort if either explicit command does not invoke the exact root
  script mapping or if its exit code diverges from the underlying doctor
  result.
- **IRR-001**: No irreversible repository, data, infrastructure, provider, or
  deployment action is proposed.

## Ownership and parallel-work decision

- **OWN-001**: Platform/Tech Lead owns this operability contract. PM owns task
  state and implementation authorization. Platform owns doctor implementation
  and CI consumption. QA owns independent command and output evidence. The
  controller alone owns commit, push, and integration mutations.
- **OWN-002**: No frontend/backend product contract changes. Existing versioned
  Graph/API/data artifacts remain frozen enough for unchanged consumption, but
  this ADR authorizes no frontend or backend writer.
- **OWN-003**: U1 remains serialized until the founder decision is recorded.
  U2 may consume the exact accepted toolchain command only after U1 acceptance.
  Generated templates, shared API contracts, Compose topology, migrations, and
  end-to-end smoke tests remain serialized integration work.

## Measurable verification plan

- **VER-001 — Collision characterization**: On Node `v22.11.0` and pnpm
  `9.0.0`, run `pnpm help doctor` and `pnpm doctor`. Record exit codes and prove
  the latter output contains no `Doctor local:` line. This is historical
  characterization, not an accepted readiness command.
- **VER-002 — Explicit toolchain command**: Run
  `pnpm run doctor:toolchain`. It must exit zero and contain all six safe PASS
  records plus `Doctor toolchain: PASS`.
- **VER-003 — Explicit local command**: With Docker server, Docker Compose, and
  the required root `.env` names available, run `pnpm run doctor`. It must exit
  zero and end with `Doctor local: PASS`. With any required precondition
  unavailable, it must exit non-zero and end with `Doctor local: FAIL`.
- **VER-004 — Focused regression**: Run
  `node --test scripts/doctor.test.mjs`; every focused doctor test must pass and
  output scans must contain no injected secret sentinel.
- **VER-005 — Static and supply-chain gates**: Run Prettier on the exact changed
  paths, `git diff --check`, and `git diff --exit-code -- pnpm-lock.yaml`. Search
  active plan, README, acceptance, and workflow command surfaces for obsolete
  shorthand. The lockfile must remain byte-identical and obsolete supported
  spellings must have zero active matches outside historical ADR evidence.
- **VER-006 — Ledger evidence**: PM records resolved Node/pnpm versions, exact
  focused-test count, safe command results, review verdict, changed-path
  manifest, and U1 state in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
  No credential, environment value, raw prompt, raw response, or request body
  may enter evidence.

## References

- **REF-001**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`
- **REF-002**: `docs/tech-governance.md`
- **REF-003**: `docs/threat-model.md`
- **REF-004**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`
- **REF-005**: pnpm 9 doctor command documentation,
  <https://pnpm.io/9.x/cli/doctor>
- **REF-006**: pnpm 9 run command documentation,
  <https://pnpm.io/9.x/cli/run>
