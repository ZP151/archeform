# Reusable Definition Bank Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the bounded
> implementation. Root owns integration, acceptance, evidence and Git. The
> active ledger and accepted ADR-0054 determine write ownership and final scope.

**Goal:** Add reusable definition selection to the actual consumer generation
path and prove expansion with a Purchase Request approval application.

**Architecture:** The model selects a reviewed definition and bounded business
parameters; an internal bank supplies validated semantics and existing assets.
The deterministic planner, composer and immutable compiler remain authoritative.
Do not add a disconnected catalog that the generation path never consumes.

**Tech stack:** Existing TypeScript, Zod, adapters, Graph/composer and generated
approval UI. No new dependency, provider, hosted resource or public Graph API.

## Scope and alternatives

An unused source index would improve discovery without reducing the model's
current blueprint workload. Implementing a complete new booking runtime first
would mix availability, conflict/capacity, identity and calendar gaps into one
large task. Choose the integrated definition bank and one new approval business
definition first, then admit reusable materials against demonstrated needs.

Restaurant and Expense currently use compact canonical selection. Other
products still require a fuller model-authored business blueprint. Runtime
source is already deterministically generated; this slice extends the prepared
business semantics, not a new code-generating agent.

The new Purchase Request definition is distinct business content within the
existing approval runtime family. It ends with a decision on a request; it does
not order goods, reserve stock, pay a supplier or provide private real-user
identity. Do not count it as a third runtime family.

## Reuse and acceptance

Inspected existing approved assets: 15 primitives, 11 patterns, 19 generated UI
entries, 15 Restaurant screen recipes and 27 current capabilities. Existing
Restaurant and approval projectors, the structural approval predicate and
`EntityRecords` are the first reuse targets. Do not clone a second application
renderer. The pinned Lucide package has 1544 SVG files, but only the accepted
emitter allowlist is currently integrated. Upstream material count is separate
from usable definition count.

The [shared acceptance matrix](../../acceptance/consumer-product-checklist.md)
applies. Before production writes, ADR-0054 freezes exact Purchase fields,
roles, supported/excluded requirements, definition registration and any minimal
presentation adaptation needed to identify the requested item at a glance.
Preserve existing material clarification and safe failure behavior.

## B1: integrated bank and one additional business definition

- [x] Record independent standing acceptance of the exact ADR and assign one
      serialized implementation owner. Root owns disjoint acceptance paths.
- [x] Add focused failing tests for registry completeness and uniqueness,
      unknown/mixed selections, compact Purchase projection, semantic checksum
      binding, preserved existing canonical outputs and material questions.
- [x] Register Restaurant, Expense and Purchase with strict parsers, provider
      schema fragments, compact guides and deterministic projectors. Derive
      provider selection and dispatch from this bank. Keep it internal; no
      network-loaded executable registry or public package export.
- [x] Reuse approval semantics through explicit business data where practical;
      avoid another large copied blueprint or hard-coded interpreter branch.
      Follow ADR-0054's exact construction and compatibility rules.
- [x] Prove the Purchase interpretation takes the existing automatic approval
      path; validate missing/unsupported requirements remain material. The model
      must not provide its fields, routes, workflow, capabilities or source.
- [x] Run relevant adapter/compiler/Workbench checks for the actual changed
      paths. Reuse unaffected evidence and obtain one scoped implementation
      review rather than separate unchanged audit waves.
- [x] Run one separately authorized provider-free canonical consumer lane from
      interpretation through real composition and immutable delivery to the
      generated Purchase UI. Create/submit two requests, approve/reject, reload
      retained results and prove requester denial. Inspect actual primary,
      input and outcome screens at 390/768/1440 px with appropriate state,
      keyboard, readable-summary, overflow and accessibility checks.
- [x] Record all applicable acceptance dimensions and measured first usable
      outcome, questions, technical handoffs and rescue. Distinguish fixed
      interpretation from real-model accuracy and real-phone user research.
- [x] Prove exact runtime cleanup, update the scorecard and next priorities,
      authorize the bounded controller commit and normal iteration-branch push.

## Subsequent supply and multi-type sequence

| Stage                                | Work                                                                                                                                                                                                                 | Exit evidence                                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B2: reusable material admission      | Use the public-source shortlist to select the smallest useful list, calendar or media asset. Pin version/source, license, dependencies, bindings and notices; evaluate through the existing intake/registry process. | An approved asset is consumed by a real generated screen and passes its relevant business/visual states. Discovery alone remains research inventory.                                         |
| B3: new business families            | Extend Appointment only after slot/conflict/capacity and usable calendar gaps are addressed; then prioritize tasks/inventory and content/directory according to shared capability coverage.                          | Each family completes its actual primary journey and the shared acceptance matrix. Missing identity/provider behavior remains explicit.                                                      |
| B4: scaled retrieval and definitions | Grow authored definitions across the planned families, retrieve a bounded relevant candidate set, and bind only approved assets. Keep large catalogs out of unbounded model prompts.                                 | Measure candidate recall, unsupported-intent handling, selection/assembly time, definition validity and real task completion. Test retrieval scale separately from counting usable products. |

Retain the product-reset progression of 30 detailed definitions across initial
families, then 100 and eventually hundreds/thousands as demand and validated
capability coverage grow. Those are supply objectives, not this slice's delivered
counts. Track researched sources, licensed materials, approved composable
assets, authored definitions, runtime families and end-to-end validated products
separately. Cosmetic permutations do not become additional business definitions.

H1 real identity/access/hosting remains an explicit delivery milestone. A large
material catalog does not close it. The governing metric remains how quickly an
ordinary user gets the intended working application with minimal correction.

## Scale without source duplication

Each future admitted definition should specify its intended job, roles and data,
primary and exception journeys, supported parameters, reusable behavior family,
UI recipe/bindings, licensed media references, and regression/visual examples.
Store definition data and accepted asset references rather than independent
application repositories. The compiler owns executable source. A source or media
catalog needs provenance, version/item identity, usage rights and removal path;
its existence alone never grants executable or model authority.

Grow the initial 30 definitions by demonstrated shared business behavior across
approval, booking, ordering, tasks/inventory and content/directory. Before moving
to 100, test retrieval against ambiguous and unsupported intents and prove the
same accepted asset works in multiple distinct definitions. Hundreds/thousands
require bounded candidate retrieval, automated definition validation, demand-led
coverage and representative business regression per family. Do not inject the
entire catalog into every model request or count color/layout permutations as
different products. H1 identity/hosting and representative real-user task trials
must progress alongside supply expansion before claiming a mature platform.

Keep intake and regression scalable. Review a pinned library/version and its
shared dependency/license closure once; admit compatible assets in a bounded
batch using automated schema, binding, unsafe-content and notice checks. Reuse
the accepted library evidence for ordinary new configurations. Review individual
media rights where upstream licenses differ, and escalate only actual new
authority or behavior boundaries. Do not create a separate architecture or
manual audit ceremony for each icon, field option or cosmetic variant.

Every new business definition still needs its supported primary journey and
applicable visual outcome proved. On later changes, run definition validation
for the catalog and affected family regressions; reuse unchanged component/state
evidence. Keep representative full browser lanes and the final release gate at
their existing boundaries. This balances fast assembly with complete consumer
acceptance instead of multiplying identical screenshots and review stages.

The [B1 acceptance record](../../acceptance/reusable-definition-bank.md) fixes
the concrete cases and local timing target before runtime execution. Root owns
the Workbench fixture/hook and new E2E paths; the serialized implementation
owner has ADR-0054 MIG-001's nine paths. Exact accepted ADR hash and independent
verdict are recorded in the active ledger.
