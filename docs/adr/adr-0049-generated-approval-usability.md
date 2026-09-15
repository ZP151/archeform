---
title: "ADR-0049: Generated Approval Usability"
status: "Proposed"
date: "2026-09-09"
authors: "Archeform Tech Lead"
tags: ["architecture", "compiler", "generated-ui", "approval", "accessibility"]
supersedes: ""
superseded_by: ""
---

# ADR-0049: Generated Approval Usability

## Status and founder gate

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **keep** the current Golden profile and make one bounded,
compiler-local presentation change for future generic approval Compilations.
Use the current dynamic `form`, `collection`, `queue`, `list`, and `detail`
blocks to render typed request fields, labelled record values and status,
record-state-valid actions, and pending/success/error/empty feedback. Reuse the
interaction contracts of the accepted UI registry and the already accepted
hash-checked `lucide-static` assets without adding a package, registry key,
runtime, Graph field, API route, capability, recipe, or demo. Icons supplement
visible text and accessible names; they never replace them.

This proposal is not accepted and authorizes no implementation, Product
Publish, Compilation, provider/model call, credential access, Git action,
Docker action, external resource, deployment, or release. ADR-0048 must first
be accepted, and its D2.1 provider-free evidence must retain the reproduced
form failure, the distinct successful API-only role journey, the inspected
baseline screenshots, and verified preview cleanup described below. The
founder must then explicitly accept or reject this ADR, directly or through
the recorded standing independent-review policy. PM records the decision and
assigns any implementation.

## Context

- **CTX-001**: D2.1 reached one ready generated app through exactly one
  interpretation, Publish, Compile, Verify, and Preview sequence, then the
  actual browser failed when its requester form created the first record.
  Cleanup passed. This is a reproduced product failure, so D2.1 does not claim
  UI journey success. The current generic renderer in
  `packages/compiler/src/index.ts` also emits every record as
  `JSON.stringify(record)`, labels form controls with field keys, treats all
  controls as text inputs, clears a successful form silently, and offers every
  role-permitted flow event without matching the record's current status.
- **CTX-002**: The generated API already authorizes create/read/transition
  calls and the runtime owns workflow validity. Presentation filtering is a
  usability aid only; the browser remains untrusted and the server remains the
  final authorization and concurrency authority.
- **CTX-003**: `CollectionBlock`, `QueueBlock`, `ListBlock`, and `DetailBlock`
  already share `EntityRecords`; `SettingsBlock` and form pages share
  `FormBlock`. Improving these two existing dynamic components is the smallest
  useful slice.
- **CTX-004**: Application Graph V1 already declares the field types `string`,
  `text`, `integer`, `decimal`, `boolean`, `date`, `datetime`, `enum`, `json`,
  `url`, and `email`, including enum values. It does not carry the blueprint's
  field label or reference metadata. Human-readable field names must therefore
  be derived deterministically from the stable field key; this proposal does
  not change Graph V1 to recover authoring-only labels.
- **CTX-005**: Approved factory-authored UI registry assets already establish
  the relevant behavior: `form-field`, `empty-state`, and
  `confirmation-state` in `@factory/ui-patterns` `0.1.0`, plus the `input`,
  `select`, `checkbox`, `button`, `badge`, and `toast` primitives. Existing
  generated UI assets are Restaurant-specific and are not suitable generic
  approval records. No copied source or new registry asset is justified.
- **CTX-006**: `packages/compiler/test/composition-page-runtime.test.ts`
  already composes canonical Expense Approval and Appointment products and
  strictly type-checks emitted React. `e2e/generated-expense.spec.ts` already
  drives an isolated emitted browser through create -> submit -> approve and
  direct denied API access. These are the correct focused harnesses.
- **CTX-007**: The founder has already rejected all-text generated product UI.
  Accepted ADR-0043 added compile-time `lucide-static` `0.468.0` with exact
  package, license, and SVG hashes. The existing private
  `getCustomerIconAssets()` helper already returns decorative safe markup and
  the retained license notice. Seven allowlisted assets have generic approval
  meaning: `house`, `receipt-text`, `user-round`, `refresh-cw`, `clock`,
  `circle-check`, and `circle-x`. Reusing them is smaller and safer than a new
  icon abstraction, source copy, or styling wave.
- **CTX-008**: A one-variable request matrix against the same immutable D2.1
  Compilation found the create failure. A date-only `YYYY-MM-DD` value failed
  with both string and numeric amounts; a UTC-midnight ISO date succeeded with
  both string and numeric amounts. The current API reports the Prisma temporal
  rejection through its existing `403` classification. A separate direct-API
  journey then created and submitted two new requests, denied employee
  approval with `403`, let the manager approve one and reject one, and let the
  employee read both terminal results. This proves the current Graph/API role
  workflow independently of the broken form; it is not UI success.
- **CTX-009**: Graph V1 keeps natural date values such as `2026-08-01`.
  `packages/compiler/src/targets/database/target.ts` already converts a
  date-only seed value to `T00:00:00.000Z` because Prisma `DateTime @db.Date`
  rejects a zone-less value. The generated `PrismaRecordStore.create` passes
  browser input directly to Prisma, so the client must perform the same
  declared-field conversion. No server or shared serialization change is
  needed.
- **CTX-010**: The inspected synthetic baseline screenshots at
  `docs/acceptance/evidence/consumer-approval/d21-baseline-results-390.png`,
  `d21-baseline-results-768.png`, `d21-baseline-results-1440.png`, and
  `d21-baseline-form-390.png` record the actual raw JSON, text-only controls,
  missing icons, and confusing mobile presentation. They contain no provider
  material and serve only as the pre-change visual baseline.

## Current accepted Golden profile

The following remains the sole accepted Golden profile. Manifest ranges,
lockfile resolutions, and floating image tags retain their distinct meanings.

| Coordinate      | Accepted value                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Node / pnpm     | `>=22.11.0 <23`; `pnpm@9.0.0`; tracked images `node:22-alpine`                                                                   |
| TypeScript      | manifest `^5.7.2`; lock `5.9.3`                                                                                                  |
| Workbench       | Next `^15.1.0` / `15.5.22`; React and React DOM `^19.0.0` / `19.2.8`; Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` / `12.11.2`    |
| Control Plane   | NestJS `^10.4.15` / `10.4.22`; Prisma `^6.1.0` / `6.19.3`; BullMQ `^5.34.10` / `5.81.2`                                          |
| Compiler worker | BullMQ `^5.34.10` / `5.81.2`; ioredis `^5.4.2` / `5.11.1`                                                                        |
| Services        | `postgres:16-alpine`; `redis:7-alpine`; Docker Compose local topology                                                            |
| Contracts       | mutable Draft -> immutable Published Graph -> immutable Compilation; implemented serialized Graph `factory.application-graph/v1` |

The compiler's accepted local SVG coordinate remains `lucide-static` exactly
`0.468.0`; this proposal reuses it without changing its package, helper,
allowlist, hashes, or retained compiler notice. The current generated-web
template continues to declare Next `^15.5.0`, React/React DOM `^19.0.0`, and
TypeScript `^5.7.0`; it emits no dependency lock, and this proposal changes no
generated manifest coordinate. The tracked manifests, `pnpm-lock.yaml`,
Dockerfiles, and `infra/docker-compose.yml` remain authoritative.

## Proposed profile and decision

The proposed Golden profile is **identical** to the current accepted profile.
The change stays inside the accepted TypeScript compiler and generated
Next.js/React template.

- **DEC-001 — Approval presentation selector**: Add the compiler-local union
  `type GeneratedPresentationProfile = "legacy" | "approval-v1"`. A pure
  `presentationProfileFor(graph)` selects `approval-v1` only when one Graph
  flow has distinct `approve` and `reject` transitions from the same review
  state for the same entity and a `submit` transition enters that state. It
  uses only Graph structure, never application name, requirement text,
  profile name, first-entity position, or array order. Zero or ambiguous
  matches select `legacy`.
- **DEC-002 — Byte-preserving branch**: Pass the selected profile to the
  existing generic `renderPageRuntime` and `renderWebStyles` functions. Every
  new definition member, generated helper, component body, and CSS rule is
  emitted only for `approval-v1`; the `legacy` branch must return the current
  bytes exactly. Restaurant V3 continues through its separate accepted target
  and must also remain byte-identical.
- **DEC-003 — Accepted icon asset reuse**: Only for `approval-v1`,
  `packages/compiler/src/index.ts` imports the unchanged
  `getCustomerIconAssets()` from
  `packages/compiler/src/targets/restaurant-v3/customer-icons.ts`, calls it at
  compile time, and copies exactly `house`, `receipt-text`, `user-round`,
  `refresh-cw`, `clock`, `circle-check`, and `circle-x` into the generated
  source. The helper's Restaurant-oriented name does not change; no caller,
  Graph value, runtime request, or untrusted path can select an asset. The
  compiler owns this fixed mapping: root navigation -> `house`; approval
  navigation and empty state -> `receipt-text`; role control -> `user-round`;
  refresh -> `refresh-cw`; review state -> `clock`; `submit` -> `receipt-text`;
  `approve` and its target state -> `circle-check`; `reject` and its target
  state -> `circle-x`. Any other action or state receives no icon.
- **DEC-004 — Generated icon and notice contract**: The generated
  `ApprovalIcon` accepts only the seven-key local union and renders only the
  compiler-embedded, hash-verified string. The fixed SVG already carries
  `aria-hidden="true"` and `focusable="false"`; its wrapper adds no accessible
  name. Every navigation item, role label, refresh control, workflow action,
  empty state, and status retains visible text and its current accessible
  name. Add exactly one approval-bundle root `THIRD_PARTY_NOTICES.md` containing
  `getCustomerIconAssets().notice`; do not add `lucide-static` to the generated
  manifest. The existing safe generated-file-set collision check rejects a
  duplicate notice path.
- **DEC-005 — Internal field contract**: Only in `approval-v1`, enrich the
  unexported generated `RuntimeEntity.fields` member to
  `{ key, type, required, values? }`, where `values` is copied only from an
  enum field. This is plain data derived from the immutable Published Graph.
  It does not alter `factory.generated-page-runtime/v1` or any serialized
  Graph, API, capability, lock, or database contract.
- **DEC-006 — Deterministic labels and values**: `fieldLabel(key)` splits
  camelCase, snake_case, and hyphenated keys, then sentence-cases the result.
  `formatValue(field, value)` displays missing values as `Not provided`,
  booleans as `Yes`/`No`, declared temporal values with native semantic
  `<time>` markup, and other scalar values as text. The record view renders
  only `id`, `status`, and Graph-declared fields in Graph declaration order in
  a `<dl>`; it does not dump the whole response object. Status uses the
  existing badge semantics and a humanized value.
- **DEC-007 — Typed form contract**: Compose native React controls according
  to the declared Graph V1 field type: `text` and `json` use `<textarea>`;
  `integer` uses number/step `1`; `decimal` uses number/step `any`; `boolean`
  uses checkbox; `date`, `datetime`, `url`, and `email` use their matching
  HTML input types; `enum` uses a select containing only declared values; and
  `string` uses text. Required non-boolean controls retain native `required`
  semantics. A boolean checkbox never receives HTML `required`: unchecked is
  the valid boolean value `false`, including for a required Graph field, and
  checked is `true`. Optional booleans also default to and submit explicit
  `false`. Submission omits optional empty strings, sends integer/decimal
  values as finite numbers, parses JSON locally, converts a valid datetime to
  ISO 8601, and leaves the remaining values as strings. For a `date` field,
  `calendarDateToPrisma(value)` accepts only exact `YYYY-MM-DD`, constructs
  `${value}T00:00:00.000Z`, and returns it only when parsing succeeds and
  `toISOString()` equals that exact candidate. This rejects malformed dates
  and calendar rollover without using the browser's local timezone. Invalid
  conversion reports a field-labelled validation error and sends no request.
- **DEC-008 — Form state**: Each `FormBlock` owns
  `type SubmissionState = "idle" | "pending" | "success" | "error"` and one
  bounded safe message. While pending, disable the submit button and set
  `aria-busy`; on success, clear the form and announce
  `Created <Entity label>.` through `role="status" aria-live="polite"`; on
  failure, retain entered values and render a `role="alert"`. A second submit
  while pending makes no request. `safeResponseMessage(status)` maps `400` and
  `409` to a changed-or-invalid-record message, `401` and `403` to an
  unavailable-for-role-or-state message, `5xx` to service unavailable, and
  all other failures to a generic retry message; generated browser code never
  reads or renders a failure response body. Successful create/list/transition
  JSON remains available for the existing runtime behavior.
- **DEC-009 — Valid action contract**: For each record,
  `validTransitions(role, entityKey, recordStatus)` returns the distinct
  transitions whose entity and `from` equal the record's current status and
  whose existing role/permission predicate passes. Render only those actions,
  with humanized labels. Per-record
  `type MutationState = { event: string; status: MutationStatus; message: string } | null`,
  where `MutationStatus` is `"pending" | "success" | "error"`, disables that
  record's actions during a mutation and announces the result. A successful
  transition refreshes from the server before announcing the returned state. A
  stale/racing request may still be rejected; the error remains visible and no
  optimistic status is invented. Initial record load, explicit refresh,
  create, and transition all use `safeResponseMessage`; none exposes a failure
  response body.
- **DEC-010 — Empty and touch states**: An allowed empty collection renders
  the existing empty-state semantics and the current create link when one
  exists. Approval record cards and action groups wrap without horizontal
  overflow. At `max-width: 720px`, navigation and primary actions provide at
  least a 44 CSS-pixel target, retain keyboard-visible focus, and remain usable
  at a 390 CSS-pixel viewport. Icon wrappers use one compact, current-color
  size and spacing rule; no component restyle, imagery surface, alternate
  mobile route, or shell is added.
- **DEC-011 — Approval header and demo identity copy**: Only `approval-v1`
  replaces the implementation-facing header eyebrow. The old text is
  `Published Graph application`; the new text is `Requests and approvals`.
  The existing selector label becomes `Demo role`. The application name and
  Graph-declared role option values stay unchanged. The `user-round` icon is
  decorative beside the visible label. The `legacy` header remains byte-
  identical.
- **DEC-012 — Security boundary**: Role selection and fixture sessions remain
  explicit local-demo behavior under ADR-0048. UI filtering grants no access.
  The generated Nest API continues to authenticate its current fixture
  principal and authorize every direct request; workflow runtime checks remain
  authoritative. This proposal adds no requester-owned row privacy, real
  identity, tenant separation, or hosted-use claim.

## Versioned contracts, ownership, and compatibility

- **CON-001**: `factory.application-graph/v1`,
  `factory.generated-page-runtime/v1`, capability/composition locks, generated
  API paths and response bodies, Prisma schema, status/event keys, and fixture
  session headers remain unchanged. Existing immutable Published revisions and
  Compilations are never rewritten.
- **CON-002**: For `approval-v1`, create request values now conform to their
  already-declared Graph types instead of sending every value as text. Generic
  transition requests retain the existing `{}` body, API path, error behavior,
  and server checks. Date values cross the browser boundary as UTC-midnight
  ISO strings compatible with the existing Prisma `DateTime @db.Date` target.
  This is a generated-client correction within the current API/data model, not
  a server contract revision.
- **CON-003**: The Compiler owner owns
  `GeneratedPresentationProfile`, `presentationProfileFor`, the internal
  runtime field/view/submission/mutation helpers, and their emitted browser
  behavior in `packages/compiler/src/index.ts`. Root retains ownership of the
  serialized lifecycle/runtime acceptance in `e2e/consumer-approval.spec.ts`.
  These identifiers are local implementation contracts and are not exported
  as `@factory/*` or `factory.*` stable identifiers.
- **CON-004**: The existing Graph and generated API artifacts are frozen
  enough because this proposal makes no backend or shared-contract change.
  There is no disjoint frontend/backend wave: generated templates, their CSS,
  compilation fixtures, and the emitted-browser smoke path remain one
  serialized Compiler integration task. A need to change a Graph/API/data
  contract stops the task and requires a new decision.
- **CON-005**: All generic Appointment and hand-built non-approval bundle
  files remain byte-identical. Restaurant V3 bundle files remain byte-
  identical through its separate target. Approval bundle source bytes change
  only in new Compilations and gain one root `THIRD_PARTY_NOTICES.md`; business
  data and API behavior remain readable by the previous generated API.

## API, data, adapter, catalog, supply-chain, security, and operability impact

- **IMP-001 — API/data**: No route, status code, response, table, migration,
  seed, relation, Graph serialization, hash, or lifecycle transition changes.
  Form coercion is bounded by the existing Graph V1 types. The server retains
  its current `403` failure classification; this proposal does not reinterpret
  it as a new API error contract. Unknown field types fail compilation rather
  than degrade to an invented input.
- **IMP-002 — Adapters/catalog**: No adapter, capability package, capability
  lock, product recipe, screen recipe, UI primitive/pattern registry entry,
  target registry key, or catalog record changes. The generated JSX composes
  the approved registry behavior and embeds seven generic Lucide strings only
  through the accepted helper; it does not copy Restaurant UI source or add an
  independent third-party source path. Restaurant templates and helper source
  remain unchanged.
- **IMP-003 — License/supply chain**: No package, image, font, network asset,
  copied source, compiler notice, hash, or lockfile entry is added or changed.
  Each new approval bundle receives the existing exact Lucide notice because
  it now embeds the accepted SVG subset. The icons make no browser request and
  add no generated runtime dependency.
- **IMP-004 — Security/privacy**: Removing raw JSON reduces accidental display
  of undeclared response properties, but it does not establish record-level
  privacy. Current role-wide reads and local fixture identities remain known
  demo limitations. Safe UI messages must not include request bodies, raw
  server responses, credentials, prompts, or provider material.
- **IMP-005 — Operability**: Build, start, health, preview, proxy, and Compose
  topology remain unchanged. Pending controls make duplicate browser actions
  less likely; server idempotency/transition enforcement remains required.
  Approval bundles gain exactly one generated notice artifact, so their file
  count and artifact-manifest digest change deterministically. No consumer may
  rely on the prior count. No telemetry or external service is introduced.
- **IMP-006 — Accessibility**: Native labels/control types, semantic
  definition lists, live regions, alerts, focus visibility, and touch targets
  make the approval task measurable with browser roles rather than JSON text
  selectors. Status is never conveyed by color alone.

## Alternatives

- **ALT-001 — Keep the current raw, all-text renderer**: Rejected. The app can execute
  the workflow but exposes implementation-shaped data, invalid action choices,
  silent mutations, and no visual action/status cues to ordinary users.
- **ALT-002 — Add a generic approval component or capability package**:
  Rejected for this slice. The two existing dynamic renderer components and
  approved registry patterns cover the need; a new registry key or capability
  would enlarge catalog and contract scope without a demonstrated gap.
- **ALT-003 — Reuse Restaurant generated assets**: Rejected. Their order,
  kitchen, payment, and merchant semantics are product-specific and would
  misrepresent a generic approval record.
- **ALT-004 — Replace the generated frontend framework or add a form/state
  library**: Rejected. Native React and HTML controls provide the required
  behavior inside the accepted stack with no supply-chain addition.
- **ALT-005 — Change Graph V1 to preserve blueprint field labels**: Rejected
  for D2.2. It would require a shared serialization migration and would not be
  needed to make the bounded approval task usable.
- **ALT-006 — Add hand-authored SVG, `lucide-react`, a new icon package, or a
  remote icon/imagery service**: Rejected. The accepted compiler helper already
  provides a sufficient fixed local vocabulary with hashes, license, and
  decorative accessibility semantics.

## Implementation manifest, migration, rollback, and aborts

- **MIG-001**: After ADR acceptance, the serialized Compiler owner may modify
  exactly `packages/compiler/src/index.ts`,
  `packages/compiler/test/composition-page-runtime.test.ts`, and
  `e2e/generated-expense.spec.ts`. After those changes pass, root may update
  exactly `e2e/consumer-approval.spec.ts` as the serialized lifecycle/runtime
  acceptance owner. These four paths are the complete implementation and
  acceptance-test manifest. PM ledger updates are decision/evidence records
  outside it. No other source path is authorized by this proposal.
- **MIG-002**: Before changing compiler source, materialize the canonical
  Appointment fixture and one hand-built generic non-approval fixture with the
  accepted compiler. Record SHA-256 digests for the ordered generated file
  paths and contents. The focused test freezes those pre-change digests and
  must still pass after the approval branch is added. Run the existing
  Restaurant V3 deterministic target and customer-icon tests unchanged.
- **MIG-003**: Add the structural selector and emitted-runtime unit evidence
  first, then change only the conditional approval definition/component/style
  fragments and conditional notice file. Import the existing helper and select
  the seven frozen keys in `index.ts`; do not edit or move the helper. Extend
  the existing strict emitted-runtime type-check harness to both Expense
  Approval and Appointment. Do not duplicate the complete renderer or
  introduce an approval-specific page tree.
- **MIG-004**: A new Compilation materializes the new approval source. Prior
  Compilations remain immutable and runnable. There is no database or Graph
  migration and no irreversible step.
- **ROL-001**: Rollback reverts the four manifest paths and compiles a new
  legacy approval bundle. Existing records need no conversion. Never edit
  or delete a prior Published revision, Compilation, or evidence record.
- **ABT-001**: The accepted D2.1 prerequisite is the reproduced browser create
  failure, its date/amount one-variable matrix, the separate successful
  API-only two-request role journey, inspected four-viewport baseline, and
  verified cleanup. It does not require or claim a successful current-form UI
  journey. Abort if those evidence boundaries are absent, conflated, or change
  the Graph/API/compiler premises used here.
- **ABT-002**: Abort on any need for a new package, registry/catalog asset,
  capability, recipe, Graph/API/data version, database or Compose change,
  identity/privacy boundary, provider/model call, external resource, or
  deployment.
- **ABT-003**: Abort if the selector cannot be structural and deterministic,
  if any zero/ambiguous match changes legacy output, or if Appointment,
  hand-built non-approval, or Restaurant V3 bundle bytes drift.
- **ABT-004**: Abort if typed values cannot be represented by the existing
  Graph V1 field contract, if UI filtering becomes an authorization premise,
  if date conversion uses local timezone interpretation or accepts calendar
  rollover, or if a safe failure would require exposing a raw server response.
- **ABT-005**: Abort on a helper, version, hash, license, or SVG integrity
  mismatch; a dynamic icon key/path; a missing or duplicate generated notice;
  `dangerouslySetInnerHTML` receiving anything except the seven compiler-owned
  constants; loss of visible text/accessibility names; or any helper,
  Restaurant target, package manifest, lockfile, or compiler notice change.

## Measurable verification

- **VER-001**: In `composition-page-runtime.test.ts`, prove the canonical
  Expense Graph alone selects `approval-v1`; Appointment, a hand-built
  non-approval Graph, zero matching flows, and two matching flows select
  `legacy`. Reordered entities/flows must not change the selection.
- **VER-002**: Inspect the emitted Expense runtime to prove Graph-type control
  mapping, finite number/boolean/JSON conversion, optional-empty omission,
  required and optional unchecked booleans submitting explicit `false` without
  HTML `required`, humanized labels, declared-field-only `<dl>` output, status
  badge, empty state, pending lock, live success, retained-value error,
  record-status transition filtering, deduplication, and server refresh. Prove
  create, initial load, refresh, and transition failures use the bounded status
  mapping without reading a failure body, while successful JSON is still
  consumed. Prove only the seven fixed icon strings are embedded, the
  action/state mapping is exact, every icon is decorative beside visible text,
  no dynamic key reaches the markup sink, the generated manifest has no Lucide
  dependency, and the approval bundle contains exactly one unchanged Lucide
  notice. Strictly type-check emitted Expense and Appointment runtimes.
- **VER-002A**: Prove `calendarDateToPrisma` maps `2026-09-09` exactly to
  `2026-09-09T00:00:00.000Z` and accepts a valid leap day. Reject malformed,
  impossible, and rollover dates, including `2026-02-29` and `2026-02-30`,
  before any request. The result must be identical under at least two distinct
  process timezone settings.
- **VER-003**: Compare the pre-change and post-change ordered-bundle SHA-256
  digests for Appointment and the hand-built non-approval fixture. Run the
  unchanged Restaurant V3 deterministic and `restaurant-customer-icons` suites;
  all three output boundaries must show zero byte drift. Compile the same
  approval input twice and require identical paths, contents, and digests.
- **VER-004**: Update `e2e/generated-expense.spec.ts` to use accessible names,
  not raw JSON. In the isolated emitted app, create and submit two synthetic
  expenses; show only `Submit` for a draft; as manager approve one and reject
  the other; as employee read labelled `Approved` and `Rejected` results;
  preserve the direct employee-approve `403`; and prove pending/success/error
  feedback. Assert approval-only `Requests and approvals` header copy and the
  `Demo role` selector label, plus the exact decorative icon beside navigation,
  role, refresh, submit, review, approved, and rejected visible text. Exercise
  one bounded list/refresh failure and require safe copy without raw response
  text. Assert the successful create request carries a UTC-midnight ISO date
  and receives the existing success response without a server change. No
  selector may depend on serialized record text or use an icon as the only
  action/status evidence.
- **VER-005**: In the same browser harness at 390 by 844 CSS pixels, prove
  navigation and available workflow actions remain visible and operable,
  primary interactive targets are at least 44 by 44 CSS pixels, and
  `document.documentElement.scrollWidth <= window.innerWidth`. Keyboard-only
  traversal must expose visible focus and all form/action controls.
- **VER-006**: Root updates `e2e/consumer-approval.spec.ts` only after the
  focused Compiler checks pass. Through the real Control Plane -> compiler
  worker -> immutable Compilation -> generated runtime path, preserve its two
  requests, approve/reject results, requester-role `403`, and page-reload
  persistence while replacing raw JSON/state selectors with visible labelled
  business-field and status assertions. It also proves representative
  decorative navigation, action, and terminal-status icons remain beside
  their visible text. The updated harness must still use the provider-free
  interpreter and synthetic data. Create, submit, approve, reject, and result
  reading must use the generated UI; only the deliberate unauthorized-action
  probe remains a direct API call.
- **VER-007**: Run
  `pnpm --filter @factory/compiler test -- composition-page-runtime.test.ts restaurant-customer-icons.test.ts restaurant-product-v3-target.test.ts`
  and `pnpm --filter @factory/compiler typecheck`. Both commands must exit zero
  with no skipped focused case.
- **VER-008**: Against one freshly materialized isolated generated Expense
  runtime, run
  `pnpm test:e2e -- generated-expense.spec.ts --workers=1 --retries=0` with
  `FACTORY_GENERATED_EXPENSE_E2E_URL` set through the existing environment-only
  harness. It must pass **VER-004** and **VER-005**, then the existing owner
  must prove deterministic runtime teardown. This ADR performs no start,
  Docker, or cleanup action itself.
- **VER-009**: Run the accepted serialized command for
  `e2e/consumer-approval.spec.ts` with one worker and zero retries after
  **VER-008**. It must satisfy **VER-006** and prove the generated state again
  after one browser reload before teardown. The D2.2 implementation cannot be
  accepted until this unassisted full UI business journey and cleanup pass; the
  diagnostic request matrix and successful API-only role journey are baseline
  evidence and cannot substitute for it.
- **VER-010**: Run Prettier on the four manifest paths and `git diff --check`.
  Run `pnpm verify:third-party` to reconfirm the already accepted compiler
  notice. PM records exact commands, exit codes, test counts, pre/post digests,
  changed-path manifest, reviewer verdict, safe browser assertions, and
  teardown result in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Metric and log evidence excludes raw business-field values and response
  bodies. Screenshots may show only declared synthetic business data and must
  never show a credential, prompt, provider material, or sensitive input.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: ADR-0048, ADR-0021, ADR-0022, ADR-0023, ADR-0038, ADR-0041,
  and ADR-0043.
- **REF-003**: `packages/compiler/src/index.ts`,
  `packages/compiler/src/page-runtime-projection.ts`,
  `packages/compiler/src/targets/database/target.ts`, and
  `packages/graph/src/model.ts`.
- **REF-004**: `packages/ui-patterns/src/index.ts`,
  `packages/ui-primitives/src/index.ts`, and
  `packages/generated-ui/src/index.ts`.
- **REF-005**: `packages/compiler/test/composition-page-runtime.test.ts`,
  `packages/compiler/src/targets/restaurant-v3/customer-icons.ts`,
  `packages/compiler/test/restaurant-customer-icons.test.ts`,
  `packages/compiler/test/restaurant-product-v3-target.test.ts`, and
  `e2e/generated-expense.spec.ts`.
- **REF-006**:
  `docs/superpowers/plans/2026-09-09-approval-consumer-delivery.md` and
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
