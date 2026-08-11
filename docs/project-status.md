# Archeform delivery status

Updated: 2026-08-11

## Product outcome

Archeform is an Application Graph platform whose default experience is:

```text
Apps -> Describe -> Building / Live Preview -> Edit -> Publish
```

The user describes a product in business language and receives a polished,
runnable default. The Application Graph remains the durable business source of
truth, but Graph internals, capability locks, lineage, and evidence stay in
Advanced surfaces unless an exception requires attention. Page design, data,
users, permissions, workflows, and experience remain editable. Generated
source remains visible, searchable, diffable, exportable, and subject to
controlled extension boundaries.

The full status history through 2026-08-09 is preserved verbatim in
[`archive/status-history/2026-08-09-project-status.md`](archive/status-history/2026-08-09-project-status.md).

## Current gate — deliver accepted Honest Requirement-to-Product Closure

Task 0 Product Closure is `accepted` on the current reviewed tree. Final Terra
release QA passed, and independent Sol release review returned `ACCEPT` with
P0/P1/P2=0/0/4. The four P2s are recorded as deferred and nonblocking in the
active PM ledger. No Product Closure code or live-provider work remains.

Accepted current-tree evidence includes:

- exact clean-checkout reconstruction of 105 tracked and 56 untracked manifest
  paths, frozen install, 16/16 typecheck tasks, 16/16 test tasks, and 10/10
  builds;
- environment-only real-model Prompt A and Prompt B journeys passing 2/2 in
  20.3 minutes with no credential or raw model material in output or evidence;
- materially different Published Graphs, accessibility and theme evidence,
  live action inventory 22/22, and exactly 26 canonical evidence PNGs with
  repository/clean-checkout hash equality;
- isolated cleanup at 0 containers, 0 networks, and 0 volumes, with the
  post-run preview guard passing.

The only remaining Task 0 delivery action is the controller-owned reviewed
commit and push, followed by proof that local HEAD equals the remote branch
tip. D0 remains `implementing`; Task 1 and Restaurant Product code remain
blocked until that push completes and D0 is reviewed.

Authorities:

- [Product Closure plan](superpowers/plans/2026-08-09-honest-requirement-to-product-closure.md)
- [Product Closure ledger](superpowers/ledgers/2026-08-09-honest-requirement-to-product-closure.md)
- [Product Closure acceptance record](acceptance/requirement-to-product-closure.md)

## Sole P1 after Product Closure

After the closure gate is sealed, the only P1 product target is
**Prompt-to-Polished Restaurant Product**. One fine-dining restaurant brief
must create one immutable Published Application Graph with two coherent
surfaces:

- a customer mobile application with Home, Menu, Dish Detail, Cart, Checkout,
  Orders, Order Detail, and Profile;
- a merchant desktop application with Dashboard, Menu Management, Orders,
  Kitchen Queue, Tables, Users/Roles, and Settings.

Both surfaces share catalog, modifiers, pricing, cart totals, orders,
idempotency, inventory, simulated payment, identity, policy, workflow, and
audit semantics. The default Workbench journey hides database, policy-engine,
and infrastructure details while keeping contextual editors and Advanced
inspection available.

## Product-entry decision

The current Workbench intentionally exposes no Profile starter or template
picker. Product review has identified this as a gap. The accepted correction is
to offer two equal creation paths: `Describe a product` and `Start from a
template`. A template is a versioned, published, first-party Product
Recipe and Graph snapshot that is instantiated as an independent editable
Draft workspace with seed data and an immediate Draft Preview Snapshot. It
would retain origin/version metadata but would not auto-merge future template
updates.

The first iteration uses curated official templates only. Community publishing,
template commerce, and automatic template-update propagation remain deferred.
The three product contexts are Workspace Home, Builder Workspace, and
application-scoped Management; the last exposes only capabilities backed by
real behavior and tests.

The current Workbench screenshot does not yet meet this decision. It uses a
generic dotted canvas, exposes workspace/revision/lifecycle mechanics early,
opens the Inspector by default, shows fragmented cards and large empty areas,
and renders several requirement-composer controls without their intended
component styles. This is now treated as an information-architecture and source
ownership problem rather than a color-polish task.

The accepted UI source stack is:

```text
ui-primitives -> ui-patterns -> workbench-ui / generated-ui
              -> screen-recipes -> experience-recipes -> product-recipes
```

The 3,818-line `globals.css`, 907-line `use-workbench-controller.ts`, and
1,131-line `control-plane-client.ts` are mandatory Task 6 decomposition inputs.
The new Workspace Home, Builder Workspace, and App Management behavior will not
be appended to those monoliths.

The public product identity is Archeform · 元象, following the root README.
Stable `@factory/*` package names, `factory.application-graph/*` serialized
protocols, Git paths, history, and immutable hashes remain unchanged until a
separate versioned internal-namespace migration is approved.

Authorities:

- [Product reset](iterations/2026-08-10-prompt-to-polished-product-reset.md)
- [Restaurant Product design](superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md)
- [Restaurant Product plan](superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md)
- [Restaurant Product ledger](superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md)
- [Product-builder ecosystem research](research/2026-08-10-product-builder-ui-ecosystem.md)

## Next gate

The next authorized sequence is:

1. commit and push accepted Task 0, then verify local HEAD equals the remote
   branch tip;
2. review and accept D0 documentation and freeze scope;
3. freeze `ProductIntentV1`, `ExperienceBriefV1`, `ProductRecipeV1`,
   `ApplicationSurfaceV1`, `ScreenIntentV1`, `SourceOverlayV1`,
   `DraftPreviewSnapshotV1`, and `factory.application-graph/v2` in Task 1;
4. begin Task 2 Restaurant semantics and Task 3 UI Registry/Workbench source
   foundation in parallel only after the Graph v2 contract is reviewed and
   frozen;
5. converge those two lines in the customer and merchant compiler surfaces;
   pause both if a shared contract change is required.

## Explicitly deferred

Until Restaurant Product acceptance, do not resume:

- 100+ Profile or broad capability-family expansion;
- production payments;
- cloud deployment, application fleet, or managed operations;
- connector-marketplace or unrestricted third-party runtime ingestion;
- unrestricted generated-source editing or reverse parsing;
- Figma or Stitch runtime integration;
- production use of Aceternity candidates without item-level evidence.

## Evidence boundary

This page is a current delivery summary, not a release claim. The PM ledger and
acceptance records control task state. Credentials and raw model prompts or
responses must never enter documentation, evidence, generated source, or
runtime logs.
