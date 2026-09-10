# Reusable Record Finding Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the bounded
> implementation. Root owns the ledger, integration, acceptance and Git; the
> accepted B2 ADR freezes production ownership before implementation.

**Goal:** Let ordinary users find and process relevant records in generated
Expense and Purchase applications through one reusable interaction.

**Architecture:** Compose existing generated record cards and native approved
input/select/button patterns. The compiler binds the interaction to declared
entity fields and workflow states. The same implementation serves both approval
definitions; the model supplies no UI code or filter logic.

**Tech stack:** Existing TypeScript, React, immutable Graph compiler and approved
UI assets. A researched library is a candidate, not an adopted dependency.

## Product direction and scope

Optimize time from a rough requirement to a usable application, then time to
perform the application's primary task. Track both separately. B1 supplies
three canonical definitions in two runtime families. B2 improves reusable
record handling; it does not increase either count. The supply goal remains
30 detailed definitions, then 100 and eventually hundreds/thousands, backed by
actual demand, bounded retrieval and representative family regressions.

The B2 primary user is a requester or reviewer with several records to find.
They can search declared values, narrow by workflow status, identify the result
count, reset filters and perform the existing permitted action. Existing compact
summaries, icons and responsive layout remain the presentation foundation.
No-match recovery must differ from an empty database. Filtering only operates
on records already authorized and returned by the current API; it is not a
server search, pagination, identity or data-isolation feature.

Alternatives: a full table engine adds little to the current card list; an
unconsumed material registry adds no immediate user capability; a new calendar
family needs availability and conflict semantics first. Select the smallest
existing asset composition that closes the observed record-finding gap. The
Tech Lead records exact reuse/provenance and any new private key in the ADR.

## One implementation slice

- [x] Record the proposed ADR's independent standing acceptance and exact hash.
- [x] Freeze compiler implementation/test ownership separately from root's
      E2E, acceptance, plan and ledger paths. Preserve other writers' changes.
- [x] Write and run a failing focused test for actual emitted behavior: search
      normalization, combined filters, no-match/reset, workflow state changes,
      declared fields only and unchanged role enforcement.
- [x] Implement the shared interaction and responsive controls under the
      accepted ADR. Preserve non-approval output and existing business details.
- [x] Prove both Expense and Purchase bind the same implementation; run affected
      compiler tests, generated TypeScript verification, package checks and format.
- [x] Extend the existing Purchase browser lane with search/status/reset,
      filtered actions, reload, state recovery and 390/768/1440 evidence. Keep
      earlier B1 screenshots intact; use a distinct B2 evidence directory.
- [x] Authorize one isolated provider-free actual immutable delivery lane after
      source freeze. Inspect the resulting screenshots and runtime outcomes.
- [x] Obtain one independent implementation/evidence review, correct actionable
      findings, prove exact resource cleanup and record final acceptance.
- [x] Commit and normally push the bounded accepted iteration branch; verify
      remote equality. No main, repository release or cloud deployment.

## Acceptance prepared before implementation

Apply the [shared matrix](../../acceptance/consumer-product-checklist.md).

| Dimension          | Concrete B2 case and target                                                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Need fidelity      | Same declared Purchase and Expense semantics; search/filter requires no model-authored code or new question. Preserve B1 unsupported-intent evidence because interpretation is unchanged.                                                                                                        |
| Effort             | Prepared local deterministic selection reaches usable app within 5 minutes; zero questions, technical handoffs or in-run rescue. Find one known record with search and status in at most two input changes; clear restores the list in one action. These are test targets, not real-user claims. |
| Business           | Create and submit two real Purchase requests, find submitted records, approve/reject, verify filtered results update and exact persisted values survive reload.                                                                                                                                  |
| Correctness/access | Case-insensitive trimmed search, declared values only, conjunctive status filter, no stale filtered action; existing requester and terminal-state denials remain 403. Demo roles are not authenticated identity.                                                                                 |
| States             | Populated, no matches, clear/reset, empty data, loading, safe service error, pending actions and permission denial. Reuse unchanged form validation evidence, but prove filtering does not bypass actions or hide recovery.                                                                      |
| Visual             | Inspect actual phone search/result and no-match recovery, tablet and desktop output. Keep record title, amount, status and useful icons prominent; controls must not create a text-heavy wall.                                                                                                   |
| Responsive/access  | 390/768/1440, labels and keyboard, no overflow, 44 px phone controls, no axe violations; long record/role labels still fit.                                                                                                                                                                      |
| Delivery           | Actual Published Graph, immutable Compilation and local Preview; real persistence and recovery; bind source/image hashes and exact cleanup. Hosted/private product capability remains deferred.                                                                                                  |

Record every attempt and repair separately. Reuse unchanged evidence and use
one independent final review; do not add separate cosmetic or per-icon gates.

## Next outcome after B2

Prioritize a complete Task application family using shared record finding and
existing CRUD/workflow capabilities. Freeze actual task roles, ownership, status,
due dates and primary journey before implementation; identity or assignment
gaps must be explicit. Appointment follows a slot/conflict/capacity decision and
calendar admission. Inventory needs actual stock-change invariants. Content and
directory need useful media and discovery. H1 identity/access/hosting and D2.5
real-model/ordinary-user validation remain essential maturity work alongside
template expansion. Each step adds a usable outcome, not another unused list
of sources or visual permutations counted as products.

For Task admission, require a real create -> start -> complete/reopen journey,
clear due-date and priority summaries, useful status discovery, exact values
after reload, and explicit supported assignment/access semantics. Reuse the
record-finding behavior while designing task-oriented summaries and actions;
an Expense screen with renamed headings is insufficient. No canonical Task
definition currently exists in the adapter bank, and Restaurant inventory
behavior is profile-specific. These are next implementation gaps, not accepted
general-purpose capabilities. Keep the next design decision concise by citing
unchanged technology and license authorities rather than repeating their tables.
