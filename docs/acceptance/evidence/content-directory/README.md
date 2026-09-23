# Content Directory evidence

Status: actual attempt 3 passes the generated-product journey and scoped cleanup.
The case is `e2e/content-directory.spec.ts`. The two failed attempts remain
preserved. Final product-count authority is the PM ledger, not this directory or
the executable case binding. See [acceptance record](../../content-directory.md).

## Executed preflight

Root ran these commands on 2026-09-24, both exit 0:

```sh
pnpm --filter @factory/compiler test -- content-directory-presentation.test.ts
pnpm --filter @factory/compiler-worker test -- content-directory-verification.test.ts verification-environment.test.ts
```

Results: 10 emitted UI cases and 39 bounded-worker cases pass. The UI renders
actual generated React/CSS in Chromium, with mocked HTTP dispatched to the
emitted in-memory runtime. The worker tests execute the emitted controller with
a Prisma delegate double. Neither is an actual PostgreSQL-backed product run.
Task 2's separate real database probe is recorded in the PM ledger, with its
earlier scratch-cleanup limitation; it does not fill this missing product result.

The `preflight` images come from those actual emitted-browser runs at the named
widths. Root inspected the initial reader/curator batch and one corrected batch:
mobile content appears earlier, search/refresh are accessible icon controls,
knowledge categories have distinct pinned local glyphs, and curator creation is
visibly primary. Detail remains plain text. These are internal observations,
not founder, physical-device or ordinary-user acceptance.

Tested presentation SHA-256:
`cd8d5b8bf6b4f79687fa4dc9f48b6d297377a4cd939f3db9e50801f4f1ff4df8`.
Tested worker environment SHA-256:
`412fe6b87c7671e3e9066cd7f4ff025ff013997b6a38f509f28eac43a2c30950`.
The one changed-file Impeccable detector invocation returns `[]`, exit 0; it is
not a visual or business acceptance authority.

## Actual result

Attempt `4775a00c-fc89-4d8b-8485-aacf5f818464` passes after persisted-lock and
Next-announcer test corrections. Its journey binds source/Compilation identity,
business/recovery checks, phase timings and Preview cleanup. Root separately
records the 22/22 verification summary and empty outer-stack Docker inventories.
Ready time is 208,554 ms; complete case including cleanup is 243,808 ms. Root
inspects actual reader, curator and recovery screenshots. The raw journey retains
its original pending-inspection field; this record documents subsequent internal
inspection without rewriting test output. No founder approval, real-user result
or hosted deployment is claimed.
