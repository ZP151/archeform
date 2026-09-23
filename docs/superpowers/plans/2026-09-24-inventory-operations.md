# Inventory Operations implementation plan

Execute with one serialized contract owner, then disjoint presentation and
verification assignments after the contract freezes. The active PM ledger owns
write authorization. No implementation starts before Directory's local family
delivery closes.

## Outcome and authority

Deliver `supplies-stockroom` through the reusable Inventory Operations family.
A stockkeeper creates an item, receives stock, issues it and records a justified
correction; a fresh reader sees the authoritative balance. Desktop supports
receiving, correction and movement history. Mobile web supports stock lookup and
issue against the same records. This first slice uses indivisible `each` units
and one local shared pool, with demo roles and no hosted/private-identity claim.

ADR-0076 is accepted through the standing independent-review authority at SHA-256
`b73f303c780e371ef9afa146b5940153fa84d9e5e87b433c16bf91aaad446800`.
The accepted AMN-001 through AMN-012 amendment shares one exact browser-safe
Graph witness between semantic validation and compiler admission. Only the five
Inventory numeric fields may have empty seeds; actual create/receive/readback
worker probes replace persisted seed witnesses. All other numeric rules remain.
Its exact fields, numeric bounds, role rules, routes, Graph projections, audit,
receipt/CAS behavior and exclusions govern implementation. Keep the current
Golden stack and six core locks; no package/version/service change. Existing
Restaurant inventory assets are order-coupled or metadata-only, so reuse actual
mutation protection and transaction patterns without changing their bytes.

## Task 1: freeze the nine-product baseline and exact contract

Owner: one strongest assigned contract implementer; root assigns concrete files
in the ledger before dispatch. Scope: new Inventory contract/tests, additive ninth
baseline capture, and exact-family composer/admission seams in the current
adapter/capability modules. No runtime, UI, worker or unrelated edits.

- [x] Capture the accepted pre-Inventory source revision, immutable inputs,
      separate locks and all generated file hashes for the existing nine products.
      Preserve the earlier eight-product fixture; never refresh an expectation
      after changing the implementation.
- [ ] Start RED for exact family eligibility, JSON persistence round trip, rejected
      malformed data, numeric bounds, reference mapping, unique fields/indexes,
      empty seeds and Graph-backed audit declaration.
- [ ] Compose only the frozen Inventory witness. Publish `stockItemId` with the
      declared relation/indexes and expose `stockItem` only through the accepted
      API projection. Require `domain.seedData: []`; invent no initial stock.
- [ ] Freeze the readonly selector/type through the two accepted compiler-root
      exports. Prove all historical outputs remain byte-identical.

## Task 2: implement transactional stock and movement behavior

Owner: one serialized runtime implementer. Scope: private Inventory emitter,
profile-only fresh generated schema/migration and narrow compiler integration.
Do not apply its schema to an existing product database.

- [ ] RED/GREEN for zero-initialized item creation, receive, issue, justified
      signed correction, name correction, bounded reads and immutable history.
- [ ] Prove nonnegative bounded balances, duplicate SKU protection, scoped
      idempotency, same-version one-winner CAS and generic mutation-route denial.
- [ ] Use one transaction for balance, movement, receipt and declared audit.
      Test injected failures and prove no partial mutation or duplicate history.
- [ ] Run the actual emitted Prisma/PostgreSQL cases on a root-owned local
      fixture: last-unit races, overflow/underflow, replay after reconnect and
      rollback. Report skipped prerequisites separately from passed tests.

## Task 3: compose the two scenario surfaces and worker checks

After the interface freezes, assign disjoint private presentation and worker
verification files. Root alone owns common compiler facade/style integration.

- [ ] Search approved registries, recipes and existing generated assets first.
      Compose stock identity, balance/unit, primary action and compact movement
      history; use pinned local icons and deliberate status/action color.
- [ ] Render the complete workspace at 390/768/1440 with two authored SKUs.
      Prove mobile lookup/issue and desktop receive/correct/history, meaningful
      empty state, no results, invalid/insufficient stock, conflict and retry.
- [ ] Preserve input on recoverable errors, prevent accidental double commands
      and use the authoritative server result after reload.
- [ ] Derive actual bounded verifier probes through the one compiler selector.
      Keep payloads private; persist only existing safe evidence shapes.

## Task 4: admit the product and exercise the actual journey

Owner: one definition/case implementer under a frozen contract; root owns runtime
creation and cleanup. Reuse the Directory lifecycle/diagnostic lessons and the
existing case index. Add no new approval or deployment harness.

- [ ] Admit one meaningful canonical definition with coarse-intent selection,
      explicit unsupported units/locations and material clarification cases.
- [ ] Run the existing short definition lane before image construction.
- [ ] Start with an empty actual store. Create two SKUs; receive 10, issue 3 and
      correct -1 on one item. Verify balance 6 and all three retained movements;
      the second SKU stays unchanged. Correct the same item's name and reload.
- [ ] Exercise denial, over-issue, stale/concurrent writes, uncertain same-key
      retry and API restart replay with no extra movement/receipt/audit.
- [ ] Record immutable Published/Compilation and source identities, actual
      responsive screenshots, ready/first-job timings and exact scoped cleanup.
      Preserve failed attempts; target prepared-local readiness within five minutes.

## Task 5: close the slice and select the next varied job

- [ ] Use the existing task review and required family-boundary QA/release review,
      reusing unchanged evidence. PM distinguishes registration, demonstrated
      runtime, accepted local journey and hosted delivery counts.
- [ ] Root creates and pushes the bounded accepted commit and verifies remote
      equality. This authorizes no main merge, repository release or cloud action.
- [ ] Choose the next genuinely different job from the roadmap. Add variants
      through data only when their business semantics already fit the family;
      do not increase counts by changing names, colors or example records.

Keep continuous delivery as a parallel product outcome: the existing synthetic
upgrade/rollback/restore rehearsal is evidence for compatible local artifacts.
Hosted delivery still requires a concrete authorized environment and an accepted
adapter. Users should eventually see a working address and understandable release
progress; platform internals remain platform responsibilities.
