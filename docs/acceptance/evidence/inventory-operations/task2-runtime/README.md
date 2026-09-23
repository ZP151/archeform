# Inventory transactional runtime evidence

Date: 2026-09-24. Authority: accepted ADR-0076 SHA-256
`b73f303c780e371ef9afa146b5940153fa84d9e5e87b433c16bf91aaad446800`.
Status: task review, independent Terra QA and final Sol judgment close 0/0/0.
PM accepts the bounded Task 2 source delivery.
This evidence concerns the
actual emitted runtime and Prisma adapter; it is not UI, worker, canonical
definition, hosted or completed-product acceptance.

## Verification

| Layer                          | Observation                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Focused RED                    | Main emitted journey fails at the temporary Inventory runtime guard before implementation                      |
| Final provider-free checks     | 60 emitted runtime cases and 40 contract cases pass; all nine historical bundles remain byte-identical         |
| Toolchain                      | Compiler build, typecheck, lint and complete emitted API typecheck pass                                        |
| First real PostgreSQL attempt  | 4/4 pass; process exit 0; 50.18 seconds total                                                                  |
| Second real PostgreSQL attempt | 5/5 pass after receipt-column/C1 filtering corrections; process exit 0; 9.65 seconds total                     |
| Third attempt                  | Both renamed schemas validate/generate; stale fixture port prevents migration; 5 business tests skipped        |
| Final corrected attempt        | Both renamed schemas validate/generate; fresh migration and 5/5 actual tests pass; exit 0; 14.98 seconds total |
| Independent Terra QA           | 100/100, compiler build/typecheck, targeted formatting, all six hashes and diff checks pass; P0/P1/P2 0/0/0    |

The real database cases exercise empty item storage, concurrent same-key creation
and receiving, normalized duplicate SKU rejection, distinct-key SKU races,
receive 10 -> issue 3 -> adjust -1 -> balance 6, signed movement sum and unchanged
original movement, name-only correction, literal search, bounded history and
observer denial. Last-unit commands have one winner. Injected balance, movement,
audit, capability-effect and receipt failures roll back persistent state.
Database constraints reject invalid balances, versions, movement coordinates,
references and duplicate movement versions. Upper-bound commands leave state
unchanged. Receipt storage contains digests under `keyDigest`.

Replay is checked after Prisma disconnect/reconnect and reconstruction of the
runtime/store objects. This is not a separate API-process or PostgreSQL-server
restart; those product journey claims remain for the later actual app acceptance.

## Frozen implementation

| Path relative to `packages/compiler/`           | SHA-256                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `src/index.ts`                                  | `75be845570052e8d91048869914b8e108fcd88f18d3af69b1da14b7f8ed3a83e` |
| `src/inventory-operations-runtime.ts`           | `55550b02d77d89e483cce91e8ad0a91f6e3a222d2ce43b2fbd0f1accbf1be2dd` |
| `test/inventory-operations-runtime.test.ts`     | `a99810a216328434d9aa02b6d421a4751bcb835c65f39e5d204631125ebbef03` |
| `test/inventory-operations-postgres.test.ts`    | `03f5c797b321e2c153d505f7d91752b853dc0007f5fd40457b4fd01b8e78c714` |
| `test/fixtures/inventory-operations-runtime.ts` | `00a978d0f86e7281ee1bee1b160538bf3f5af250f84ae67e9763404dc49b8327` |
| `test/inventory-operations-contract.test.ts`    | `7e5800b2483dda678327ce3de75604f5b53338068c881210eca4fa799698e96b` |

The emitted fixture has 62 files; sorted path/content-hash JSON aggregate is
`93de8216e7bb9cd866c94a10ad1f3584598c8969c30263543d49ab61363f6bf3`.
Public read/command methods and response shapes follow the accepted ADR. There
is no change to Graph admission, existing family semantics or package versions.

## Owned test resources

Both owned containers use the existing `postgres:16-alpine` image and loopback-only ports.
Only ignored local environment files contain credentials.

- Attempt 1: owner `d8f368d2928847839dfd6a00523a7989`, port 58960. Test process
  exited. Automatic approval rejected the combined container/client cleanup
  command with `blocked by policy`. Root did not retry directory deletion and
  instead stopped the container; Docker confirms `exited`. The container, volume,
  probe and configuration remain `cleanup_required_container_stopped`.
- Attempt 2: owner `525e5d922e0d4b0ead401ccf66c2718a`, port 57578. Test process
  exited. Root stopped the container, confirmed `exited`, and retains the owned
  fixture pending review. Configuration and probe are under
  `generated/.inventory-task2-525e5d922e0d4b0ead401ccf66c2718a`.
- Correction attempts reuse owner 2 with a fresh `_r2` database and absent `-r2`
  then `-r3` client directories. Restart changes its dynamic host port to 59860;
  the first copied environment retained the old port and failed before migration.
  Root confirms zero public tables, refreshes the port, and the final run passes.
  The container is stopped again and Docker confirms `exited`; both databases,
  probes and configuration remain retained pending review.
- Two writer-created schema/junction directories hit Windows `EBUSY` and remain:
  `C:/Users/15492/AppData/Local/Temp/archeform-inventory-prisma-s0hUd8` and
  `C:/Users/15492/AppData/Local/Temp/archeform-inventory-prisma-L4vVOO`. The temporary
  CLI test is removed; all final Prisma checks use the root-owned probe instead.

## Scoped review corrections

Independent task review found two P2 identifier-composition issues. The correction
uses the existing `Factory_` internal namespace for receipts; Graph entity keys
cannot contain its underscore. Actual Prisma validates/generates admitted receipt-
like business names. Real Nest HTTP tests exercise item names `audit`,
`capability-events` and `health` without shadowing their authorized list routes.
Audit/capability disclosure stays denied. Health remains publicly available without
a session header; for item `health`, any present session header takes the normal
principal/list path, and invalid headers fail 403 rather than falling back.
The independent reviewer verifies final hashes and closes P0/P1/P2 0/0/0, retaining
the unaffected atomicity/security review and final actual database evidence.

This record claims no complete cleanup or repository release. Older residual
paths are untouched. The active ledger records final review and delivery.
