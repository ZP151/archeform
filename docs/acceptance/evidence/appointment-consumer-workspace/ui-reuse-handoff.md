# Appointment workspace reuse and interaction handoff

Prepared: 2026-09-24. Source inspection in the active isolated worktree at
`7a85d6ef`, with the accepted Task 1 admission changes. This prepares Task 3;
it is not implementation, visual acceptance or permission to overlap the
active compiler writer. ADR-0081 remains the read/presentation authority;
accepted ADR-0082 SHA-256
`5734bacdd01d4b27475ea861ed94f97011191a587eddfe73ad68e8900473a7d9`
amends administrator setup writes and their recovery. Its implementation must
pass the existing source gates before facade integration. The latest ledger
permits disjoint presentation/test/helper preparation against its unchanged
accepted interfaces while its independent QA completes. Re-snapshot Task 3's
overlapping source after that handoff; preserve the original baseline.

## Ordered reuse search

| Search step         | Inspected source                                                                                                                                       | Reuse and boundary                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approved registries | `packages/ui-primitives/src/index.ts`, `packages/ui-patterns/src/index.ts`, `packages/workbench-ui/src/index.ts`, `packages/generated-ui/src/index.ts` | Button, input, label, select, badge, card, native form, confirmation, table and state patterns cover elementary controls. Generated Restaurant blocks bind Restaurant behavior; their availability control is not appointment discovery. Workbench navigation belongs to the platform editor. |
| Approved recipes    | `packages/screen-recipes/src/index.ts`, `packages/experience-recipes/src/index.ts`, `packages/product-recipes/src/index.ts`                            | Restaurant mobile/merchant compositions demonstrate surface separation and token use. Do not rename Restaurant entities or treat its order/payment semantics as booking behavior.                                                                                                             |
| Workbench assets    | `apps/workbench/components/journey/responsive-preview.tsx`, journey component inventory                                                                | Reuse the semantic/touch/token conventions, not the editor runtime or private imports in the generated app. Studio viewport previews are not actual product acceptance.                                                                                                                       |
| Generated templates | `packages/compiler/src/approval-workspace-presentation.ts`, `task-workspace-presentation.ts`, `inventory-operations-presentation.ts`                   | Existing native styles, safe data helpers, state patterns, race fences and command handling are relevant. Parameterize only where historical rendered bytes remain unchanged. Inventory's provenance and emitted-TypeScript tests provide an existing pattern.                                |
| Pinned studies      | `docs/ecosystem/source-studies/README.md`, existing study decisions and `docs/research/2026-09-05-app-definition-and-reuse-ecosystem.md`               | Existing upstream studies are reference-only. A research link to shadcn is not copying authorization. No new external source or dependency is needed for this accepted slice.                                                                                                                 |

The accepted distinct key is `appointment-workspace-presentation@1.0.0`.
Its gap is service/slot selection plus exact booking command, uncertain retry
and saved-history composition. Color or spacing does not justify another key.
The writer must record actual reused functions/keys and the final source digest;
this inventory does not claim that prospective reuse has already occurred.

## Concrete integration cautions

- `renderWorkspaceShell` and `renderWorkspaceStyles` currently accept only
  `approval` or `task`. The shell contains family-specific subtitles and icon
  component names. Do not globally replace generated text or change old branches
  to make Appointment fit. Necessary helper parameterization is permitted by
  ADR-0081, with old-byte tests and explicit Task 3 path ownership.
- `renderWorkspaceRecordHook()` returns records/loading/error/refresh, discards
  response headers, and never exposes the successful list's `Date`. Reuse its
  race-safety pattern only with an explicit Appointment clock path. A plain
  records-only hook cannot satisfy API-008 bootstrap or retry semantics.
- Preserve the distinction between a successful mutation response and a failed
  subsequent reload. An old receipt can return old state; enable follow-on
  commands only against the refreshed authoritative version. Do not silently
  replace an uncertain command's body, actor or idempotency key.
- Reuse `getCustomerIconAssets()` from
  `packages/compiler/src/targets/restaurant-v3/customer-icons.ts`. It validates
  `lucide-static@0.468.0`, fixed SVG hashes and the license. Existing allowed
  icons include refresh, clock, arrows, user, check and cancellation. Preserve
  the generated notice and decorative SVG attributes; give icon-only controls
  accessible names. No CDN loader is needed.
- Use the current `--factory-*` design tokens, meaningful status color, readable
  service/time summaries and compact icon actions. Primary and destructive
  actions retain understandable text. Do not substitute raw identifiers for
  service names or rendered form controls.

### Administrator setup amendment

Consume the frozen ADR-0082 endpoint implementation, not an invented generic
update helper. Create uses the exact flat entity field set; PATCH uses complete
`expectedValues` and `values`, plus one idempotency key. Neither operation accepts
the booking command envelope. The emitted-control harness must reject wrong
envelopes rather than normalizing them to make UI tests pass.

Keep desired form input separate from refreshed current values after a definite
conflict. Show the user what changed before a deliberate new submission. Freeze
the entire setup intent while pending or uncertain and expose only same-command
retry; refreshing data must not silently alter that retained request. Reload the
authoritative record after a successful replay before allowing another edit.
A full page reload must not automatically recreate an interrupted submission or
match a possibly created record by its nonunique name.

Use business language for protected time fields: a currently referenced schedule
cannot be retimed; administrators may create a replacement and close the old slot.
Capacity/status remain editable within occupancy limits. History-only references
do not lock a slot. Explain that closing a slot or deactivating a service stops
new bookings while retaining existing appointments; metadata edits can change
the current service label. Do not expose protocol identifiers or receipt details
as user workflow steps. This adds no separate confirmation screen beyond the
accepted form review/submit behavior.

## Focused interaction coverage for the implementation

These cases instantiate the accepted plan; they add no separate review stage.
Use emitted controls for deterministic request/state checks. Actual persisted
browser acceptance remains Task 5 and must not be inferred from those checks.

The existing `packages/compiler/test/inventory-operations-presentation.test.ts`
already bundles the real emitted React with esbuild (`write: false`), serves it
through Playwright route fulfillment, and invokes an emitted in-memory runtime.
Use that pattern for the focused Appointment controls instead of introducing an
application-server test harness. Keep its strict emitted-TypeScript check and
explicit in-memory evidence boundary. This inspection executes no browser and
does not authorize retrying the rejected Workbench startup. Any such focused
control result remains separate from actual PostgreSQL/Preview acceptance.

| Case                          | User action and visible result                                                                | Evidence to capture                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Clock bootstrap               | Open customer workspace; list supplies one valid server Date before availability is requested | Request order, seven-day window, no browser-clock fallback; missing/invalid Date disables booking and exposes recovery                      |
| Ordinary delay and retry      | Keep entered name/notes while time passes, retry availability                                 | Retained valid window; offset resets; slots replace/deduplicate; unavailable selection clears while unrelated input survives                |
| Customer request              | Choose named service and slot, review and submit                                              | Exact create envelope and one intent key; visible saved appointment with useful summary after reload                                        |
| Staff work                    | Confirm, reschedule, confirm and inspect history                                              | State-appropriate controls, exact expected version/envelopes, reschedule returns to requested, ordered history                              |
| Cancellation                  | Customer or staff enters reason and confirms                                                  | Exact cancel envelope; cancelled record remains readable and offers no mutation action                                                      |
| Setup                         | Administrator creates/edits service and offered schedules                                     | Exact ADR-0082 envelopes/key; labelled fields, positive values, valid reference/time order; preserved desired/current values on conflict    |
| Setup recovery and protection | Retry an uncertain save, correct a stale edit, close/reopen a slot and change capacity        | Identical retained intent, refresh after replay, current-reference retiming denial, history-only edit allowed and unchanged booking history |
| Uncertain result              | Lose a command response, then retry from the retained page                                    | Frozen identical method/URL/body/key/actor/version, duplicate prevention, no replay as another role; current state reload after receipt     |
| Definite conflict             | Slot fills or record version changes before submit                                            | Useful conflict, retained input, fresh authoritative state and deliberate new intent; no silent version replacement                         |
| Role and stale results        | Switch roles or selection with earlier reads in flight                                        | Prior response cannot overwrite the current view; unauthorized controls/data remain absent; shared demo scope stays visible                 |
| Saved summary                 | Read cancelled/full-slot appointment and changed service metadata                             | Stored slot history remains useful; current service metadata is labelled honestly, not presented as historical                              |
| Responsive states             | Operate the relevant customer/staff/admin job at 390/768/1440                                 | No page overflow, usable primary action, 44px targets, focus/keyboard, loaded icons/styles and light/dark/error states                      |

Actual screenshots follow assertions for the named visible state. At least the
administrator setup and customer/staff business chain must use visible controls
on the same persisted records. API helpers may inject faults and independently
check data; they cannot replace those primary actions. No screenshot or runtime
execution has been produced by this handoff.
