# Inventory Operations acceptance brief

Status: Task 1 implementation is under a bounded P1 correction after final review
found stripped stock coordinates could permit generic fallback. Earlier task
review and independent QA evidence remain valid outside that gap. No Inventory
runtime or product acceptance has run.
Authority: accepted ADR-0076 and the active PM ledger. This file defines the
business and visual observations before implementation. It adds no approval gate.
The catalogue remains nine locally accepted definitions across five demonstrated
runtime families until actual Inventory evidence and the existing review close.

## Scenario and useful surfaces

A shared supplies stockroom tracks indivisible items. One stockkeeper uses desktop
Web for receiving and correction, then a phone to look up and issue stock. An
observer may read item availability but cannot see movement history or mutate it.
Demo role selection is explicit; this scenario proves no private identity or tenancy.

Start with an empty stockroom. The stockkeeper adds `CABLE-USB-C` named
`USB-C charging cable` and `PAD-A5` named `A5 writing pad`. Both start at zero
`each`; there are no seeded business records or fabricated movement history.
Receive 10 cables with a reason, issue 3 from the phone, then record a desktop
adjustment of -1 with a reason linked to the original receiving movement. The
authoritative cable balance becomes 6, with all three movements retained; the
writing pad remains zero. Correct the cable's name without changing its SKU,
quantity or history. Reload both surfaces and replay the original command after
an API restart; IDs, balances, receipts and history must remain consistent.

Corrections are compensating records, not deletion or rewriting of the original.
The UI must explain the proposed resulting balance and show the saved server
result. No schema, template ID, technical key, code or explicit workflow setup
belongs in this stockroom journey.

## Observable acceptance matrix

| Area                      | Required observation                                                                                                         | Evidence method                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Empty and create          | Empty item and movement stores; Add item works; SKU normalized and unique; zero balance with labelled unit                   | Actual emitted app + PostgreSQL, duplicate-SKU race                                |
| Main job                  | Receive 10 -> issue 3 -> adjust -1 produces 6 with three immutable movements and reasons                                     | Same IDs through desktop/phone, saved history and fresh reads                      |
| Correction                | Name-only update preserves SKU/quantity/history; linked adjustment preserves its original movement                           | Before/after persisted state; link stays within the same item                      |
| Insufficient stock        | Issue more than available shows a useful error, keeps entered intent and writes nothing                                      | UI recovery plus unchanged balance/movement/receipt/audit counts                   |
| Stale and concurrent work | Two same-version commands admit one winner; refresh retains intent for explicit review, without automatic stale resubmission | Real database race and rendered conflict recovery                                  |
| Uncertain outcome         | Drop a response after commit; retry the exact body/key, obtain the original result and refresh detail/history                | Actual intercepted response, replay after API restart, no extra movement           |
| Numeric bounds            | Reject coercion, fractions, negative zero, zero delta, upper/lower overflow and exhausted versions                           | Focused adversarial cases and actual emitted PostgreSQL adapter                    |
| Atomicity                 | A movement/audit/receipt failure leaves every part unchanged                                                                 | Injected transactional failure using real generated storage                        |
| Access                    | Observer sees item availability only; history, mutations, replay and alternate generic routes cannot bypass policy           | Server denials before lookup/disclosure; role switch clears stale views            |
| Find and read             | Literal SKU/name search, bounded paging, no results and clear filters work                                                   | Database predicates, wildcard-shaped search and actual UI                          |
| Persistence and lifecycle | Immutable Published Graph/lock/Compilation; restart retains data and replay identity                                         | Recorded digests and database facts, not only screenshots                          |
| Delivery                  | Five-minute prepared-local readiness target, first useful job timing and exact owned cleanup                                 | Preserve every attempt; distinguish outer preparation, ready app and completed job |

This scenario restarts the API while retaining PostgreSQL. Do not describe it as
a database restart. Task 2 separately proves transactions against PostgreSQL;
mocked stores cannot satisfy that condition. Model interpretation and ordinary-user
success remain unmeasured until their own actual evaluations exist.

## Composition and first viewport

Use the approved primitive keys `button`, `input`, `label`, `select`, `card`,
`badge` and `dialog`, then existing `form-field`, `data-table`, navigation and
interaction-state patterns. Restaurant `merchant-menu-management` and
`menu-management-table` supply useful table conventions, but require menu price,
availability and preparation bindings; do not invent those fields for inventory.
Workbench shell conventions and the generated Directory/Task protection and
presentation patterns are first-party references. The pinned source-study index
grants no new third-party copying authority.

The semantic gap is a stock balance and immutable movements with receive/issue/
adjust forms. ADR-0076 assigns the distinct private presentation key
`inventory-operations-presentation@1.0.0`; it is not a new generic component library.
Compose existing color, spacing, typography and locally licensed Lucide assets.
The implementing owner records exact icon provenance/digests in the existing
pattern. A stock quantity workflow does not require item photography.

- At 390 x 844, empty-state Add item is reachable in the first viewport. With the
  two authored SKUs, both meaningful name/SKU/quantity summaries are visible before
  scrolling. Test the complete workspace, including navigation, heading and search.
- On phone detail, the item identity, available quantity with `each`, and the
  primary Issue stock control are visible in the first viewport. Desktop detail
  makes Receive stock and Adjust stock discoverable alongside current balance and
  authorized recent movement history. A dense desktop table is not the sole mobile
  route to issue stock.
- At 768 and 1440 px, use available width for meaningful records and history.
  Movement rows show signed delta, before/after values, reason and time with labels;
  color alone must not convey receive, issue or correction. Avoid empty decoration.
- Search and refresh may use accessible library icons with 44 px controls.
  Receive, Issue and Adjust retain clear words because they change business state.
  Preserve visible units, plain text, keyboard focus and long-name wrapping.
- Capture populated, input, result, no-results, insufficient-stock, stale and
  uncertain-retry states. Verify dark mode, reduced motion, absent decorative
  media and no unintended remote requests. Group one image review and its affected
  correction checks within the existing task review.

## Requirement-fit cases for later admission

These are authored coverage scenarios, not market research or additional products.

| Rough need                                                             | Expected treatment                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Track individual office supplies received and issued from one cupboard | Fits the canonical shared stockroom when the role/unit boundary is confirmed                           |
| Track workshop spare parts with reasons for stock corrections          | Fits only the same supported stock behavior; relabeling it does not add a distinct accepted definition |
| Lend laboratory equipment and track who must return it                 | Requires borrower/return obligations; do not reduce it silently to stock issue                         |
| Track medicines by batch and expiry                                    | Requires excluded batch/expiry semantics; not a supported stockroom match                              |
| Receive rolls of fabric and issue fractional meters across warehouses  | Requires fractional units and locations; clarify unsupported scope rather than coercing to `each`      |

## Evidence and delivery limits

Task 1 focused tests pass 465/465: Graph 184, composition/planner 72, adapter
admission 98 and compiler/compatibility 111. Four dependency builds/typechecks
and all eight phases of `pnpm regression definitions` pass. These are contract
and historical regression results, not a generated Inventory user journey.
The frozen nine-product baseline retains SHA-256
`9c39f0b1e8a624b3dbac57707c8c7c6d81b0e945ad3cd9f63642d6619bdc209a`;
all captured inputs/locks reproduce identical generated paths and content hashes.
Valid Inventory compilation deliberately fails closed until its runtime exists.

Runtime result fields are pending. Record actual source/ADR hashes, generated bundle,
Published/Compilation identities, failure attempts, timings, screenshot findings,
business state and cleanup here when available. A canonical row, passing selector
or generated UI fixture does not increase accepted counts.

The earlier Team Task local upgrade/rollback/restore rehearsal is not evidence for
Inventory upgrades, schema migration or cross-revision exactly-once commands.
Inventory Preview remains disposable. Hosted deployment and durable migrations
require their concrete environment and accepted implementation.
