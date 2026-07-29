# Package-local Capability Templates Acceptance

## Scope

This slice proves that every initial Golden capability is a real,
digest-verified package asset that contributes restricted source to a generated
application. It does not yet move effect-handler implementations out of the
shared generated runtime.

## Acceptance criteria

- Every Golden package declares one package-local API template in
  `component.json` and `adapter.json`, with a SHA-256 content digest.
- The Node-only package loader rejects unsafe targets, package-manifest
  mismatches, missing files, and digest mismatches.
- A Published Graph with locked Golden assets compiles those exact templates
  into `api/src/capabilities/`.
- `api/src/capabilities/registry.ts` derives the generated runtime
  effect-availability set from those modules.
- `capability-template-lock.json` records only selected template identities,
  targets, output slots, and digests.
- A Graph with declared Factory capabilities but no matching Golden locks is
  rejected before output is returned.
- The Workbench makes template-lock evidence inspectable from its compilation
  artifact preview.

## Verification record

Verified on 2026-07-29 without a real-model call. This is deterministic
component-asset verification; it does not perform the profile-level guarded
real-model acceptance call.

| Check                                | Result                                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                          | Passed: Graph, capability, compiler, Control Plane, Worker, Workbench, and adapter suites.                                                                                                      |
| `pnpm typecheck`                     | Passed for all seven TypeScript packages/apps.                                                                                                                                                  |
| `pnpm build`                         | Passed for all seven TypeScript packages/apps.                                                                                                                                                  |
| `pnpm verify:third-party`            | Passed: five direct ecosystem notices verified.                                                                                                                                                 |
| `pnpm verify:source-studies`         | Passed: two immutable reference-only studies verified.                                                                                                                                          |
| Changed source/config Prettier check | Passed. The pnpm-generated lockfile is excluded; repository-wide `pnpm format:check` still reports pre-existing formatting outside this slice, including `.agents` and historical source files. |
| `git diff --check`                   | Passed.                                                                                                                                                                                         |
| Generated Expense application        | Passed: generated API Prisma client generation, TypeScript build, and journey tests ran in an isolated temporary output directory.                                                              |
| Worker image                         | Passed: `apps/compiler-worker/Dockerfile` built with the capability package dependency chain.                                                                                                   |
| Isolated Workbench E2E               | Passed: three browser journeys against the isolated Docker Compose stack, including publication, compilation, and inspection of `capability-template-lock.json`.                                |
| Independent P0/P1 review             | Passed: no P0/P1 findings.                                                                                                                                                                      |

The isolated Docker Compose project used dedicated test ports. Its containers,
volumes, and generated temporary output were removed after the final review.
