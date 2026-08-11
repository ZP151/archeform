# 2026-08-10 Archeform Product Reset — Prompt to Polished Product

Status: Approved product direction. Task 0 resumes immediately from the
paused-session handoff. Restaurant product code begins after the 2026-08-09
Honest Requirement-to-Product Closure Task 9 is sealed, reviewed, committed,
and pushed.

Design authority:
`docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`.
Execution authority:
`docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`.
Delivery ledger:
`docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`.

## Product outcome

Archeform must feel like a product builder, not a Graph administration
console. A business user describes an application once, watches it take shape,
opens a useful live preview, optionally edits any product model through a
business-friendly surface, and publishes it.

```text
Apps -> Describe -> Building / Live Preview -> Edit -> Publish
```

The target proof is a single restaurant prompt that produces two coordinated,
runnable application surfaces in no more than 30 minutes:

1. a customer mobile experience for menu discovery, dish configuration, cart,
   simulated checkout, and order tracking;
2. a merchant desktop experience for menu, orders, kitchen, tables, users,
   roles, and settings.

Both surfaces share one Application Graph, database model, identity and policy
model, menu, inventory, order transaction, payment simulation, workflow, and
audit trail.

The product contains at least fifteen distinct, surface-owned screens:

- customer: Home, Menu, Dish Detail, Cart, Checkout, Orders, Order Detail, and
  Profile;
- merchant: Dashboard, Menu Management, Orders, Kitchen Queue, Tables,
  Users/Roles, and Settings.

## Decision chronicle — 2026-08-10 00:00 to iteration freeze

This section records the product corrections made during the founder review so
that implementation agents do not reconstruct the iteration from screenshots
or isolated chat excerpts.

1. The previous requirement-to-product Goal was technically broad but failed
   the product test: its generated applications still looked and behaved like
   shallow CRUD demonstrations. Passing compilers and probes is necessary, but
   does not prove a useful product-builder experience.
2. The target journey was reset to one business description followed by visible
   build activity, a usable live preview, optional contextual editing, and
   Publish. Graph, database, package, and infrastructure configuration are not
   default user steps.
3. The Base44 restaurant walkthrough established the expected interaction
   rhythm: conversation explains the work in product language while entities,
   shared layout, pages, styles, and seed data are created; the preview becomes
   useful immediately; suggested follow-up changes continue in the same
   workspace.
4. Base44's product anatomy was separated into three contexts worth learning
   from rather than visually copying: Workspace Home for creation, templates,
   and resumption; Builder Workspace for conversation, preview, and visual
   editing; App Management for data, users, workflows, code, logs, security,
   settings, and release operations.
5. Template creation became an equal entry path. A curated first-party
   template must open a new independent editable Draft and preview quickly,
   retain its origin and version, and never inherit secrets or later upstream
   changes.
6. The generated application must expose editable front-end page trees,
   business-facing data and user/permission configuration, workflow editing,
   full generated source visibility, search, diff, ZIP, and Git export.
   Generated source stays derived; controlled overlays protect regeneration.
7. The first deep product was fixed as a high-end restaurant ordering system,
   with a customer mobile surface and merchant desktop surface sharing real
   commerce, restaurant, identity, authorization, workflow, and audit
   semantics. Fifteen shallow copies of generic pages do not meet this bar.
8. The visual-system decision is shadcn/ui Radix source plus Lucide as the
   governed primitive foundation, Puck for complete page trees, and XYFlow for
   bounded relationship editors. Aceternity remains quarantined; Figma and
   Stitch remain optional future authoring/design inputs rather than runtime
   dependencies.
9. The current Workbench screenshot exposed a structural problem, not merely a
   styling defect: generic canvas framing, an always-open inspector, technical
   lifecycle labels, unimplemented style hooks, large unused space, and
   fragmented cards make the product feel like an internal Graph debugger.
10. A layered UI assembly model was therefore accepted:
    `ui-primitives -> ui-patterns -> workbench-ui/generated-ui ->
screen-recipes -> experience-recipes -> product-recipes`. AI selects
    bounded recipes and parameters; registries and compilers enforce source,
    nesting, bindings, states, accessibility, provenance, and tests.
11. Public product identity is now **Archeform · 元象**, as defined by the root
    README. User-facing copy, metadata, Workbench branding, and active product
    documentation migrate to Archeform in this iteration. Existing `@factory/*`
    package names, `factory.application-graph/*` protocol identifiers, Git
    remote, historical records, and immutable hashes are not search-replaced;
    any future internal-identifier migration requires its own contract change.
12. Large-file decomposition is mandatory. The 3,818-line Workbench global
    stylesheet, 907-line Workbench controller, and 1,131-line Control Plane
    client are explicit migration inputs. New behavior may not continue to
    accumulate in those monoliths.
13. Delivery parallelism is fixed: Task 2 Restaurant semantics and Task 3 UI
    Registry/Workbench source foundation start together only after Task 1 Graph
    v2 is reviewed and frozen. Tasks 4 and 5 consume both lines. Any shared
    contract change pauses the writers and returns to the Task 1 owner.
14. The still-open 2026-08-09 Task 9 remains the hard entry gate. Its generic
    HTTP 400 composition failure, real-model reruns, clean-checkout proof,
    cleanup, review, ledger transition, commit, and push finish before Graph v2
    product implementation begins.

## Decisions locked by this reset

1. The Application Graph remains the sole business source of truth.
2. Graph internals are hidden by default. Plan, capability lock, lineage,
   evidence, provider, and diagnostic detail moves to Advanced surfaces or
   appears when an exception requires action.
3. Every pre-Publish live preview renders an immutable
   `DraftPreviewSnapshotV1` bound to one Draft revision and Graph checksum. It
   is ephemeral, non-deployable, non-exportable, and never a Compilation.
4. Publish independently creates an immutable Published Revision. Production
   compilers continue to consume Published Graphs only; a preview snapshot is
   never promoted.
5. AI produces a complete, coherent default. Clarification is reserved for a
   decision that materially changes product meaning, security, or money flow.
6. Page design, data, users, roles, permissions, and workflows remain editable
   without requiring the user to understand Prisma, SQL, Casbin, package locks,
   or deployment topology.
7. Generated source is visible, searchable, diffable, downloadable, and
   exportable to Git. Generated files are read-only in the first release;
   controlled edits are limited to `src/extensions/**` and recipe-declared
   extension slots.
8. New products use `factory.application-graph/v2`. Published V1 revisions and
   hashes remain immutable; an upgrade creates a new V2 Draft.
9. The first deep business slice is restaurant ordering, implemented over a
   reusable Commerce Module rather than a restaurant-only code path.
10. Customer mobile and merchant desktop are first-class application surfaces,
    not responsive variations of one generic CRUD page.
11. Workbench uses a neutral, compact, warm interface. Generated restaurant
    products use an independent Fine Dining experience recipe.
12. shadcn/ui Radix source and Lucide are the primary UI foundation. Puck and
    XYFlow remain replaceable authoring adapters.
13. Aceternity items remain quarantined candidates until each item passes
    license, provenance, dependency, motion, accessibility, and removal review.
14. Figma is a future optional authoring adapter. Stitch is a design-exploration
    tool only. Neither is a runtime dependency in this iteration.
15. Base44 is a public product-pattern reference only. Archeform does not
    copy Base44 source, assets, prompts, schemas, design tokens, or brand.
16. The public product name is Archeform. `Factory Pilot` remains only in
    historical records and stable internal identifiers whose mutation would
    break package resolution, protocol compatibility, or evidence hashes.
17. Curated templates are a first-class product entry, not a deferred
    marketplace. Instantiation creates an independent application Draft and
    Draft Preview Snapshot from an immutable first-party template version.
18. UI assembly uses versioned primitives, patterns, business blocks, screen
    recipes, experience recipes, and product recipes. Every registry item owns
    schemas, allowed slots, bindings, responsive variants, complete states,
    accessibility evidence, fixtures, and source provenance.
19. Workbench CSS, orchestration hooks, and API clients are split by stable
    product context and responsibility before their new features land.

## What the current platform already proves

The current platform retains valuable foundations:

- a free-form requirement interpreter with fixture and real-model adapters;
- an Archeform-owned Application Graph and Draft -> Publish -> immutable
  Compilation lifecycle;
- deterministic composition and package selection boundaries;
- Puck page editing and XYFlow-based Graph editors;
- generated Next.js, NestJS, Prisma, XState, Casbin, tests, and documentation;
- isolated migration, health, role-journey, denial, idempotency, preview, and
  cleanup verification;
- a local Docker runtime and bounded evidence model;
- source and dependency governance.

Expense Approval and Appointment Booking remain important regression products.
They stop being the target experience after closure because repeating generic
list/form/detail output does not prove that Archeform can create a polished,
domain-complete product.

## Product gap this iteration closes

The existing flow still exposes platform mechanics too early, depends on a
narrow page-intent vocabulary, and produces pages whose business value is
mostly CRUD. It lacks:

- an explicit product intent and experience brief;
- multiple application surfaces within one Graph;
- page recipes made of several editable business blocks;
- a deep commerce transaction and restaurant fulfillment model;
- coherent customer and merchant experiences;
- a source mode that connects visible files to the selected page;
- a low-friction live-building journey with Graph detail hidden by default.

## Keep, replace, and remove

### Keep and deepen

- Graph authority and immutable lifecycle;
- deterministic planners and compilers;
- Puck, XYFlow, Lucide, Next.js, NestJS, Prisma, XState, and Casbin;
- isolated verification, safe diagnosis, and cleanup;
- environment-only real-model credentials and fixture-based CI;
- Graph-first ZIP and Git export.

### Replace in the primary experience

- replace generic `dashboard/list/form/detail` composition with semantic
  `ScreenIntentV1` and approved page recipes;
- replace step-by-step Graph configuration with prompt-to-live progress;
- replace platform-copy-heavy screens with task-oriented product editors;
- replace a single responsive shell assumption with explicit mobile and
  desktop surfaces;
- replace isolated component demos with full-page, multi-block recipes;
- replace source opacity with a full read-only file tree and controlled
  extension overlay.

### Remove or hide

- remove Graph, capability locks, lineage, evidence, and diagnostics from the
  default happy path;
- remove decorative buttons and controls without an implemented action;
- remove long explanatory text from primary product canvases;
- remove any model path that directly selects package paths, URLs, providers,
  runtime configuration, or arbitrary source;
- remove the assumption that one entity equals one page;
- hide Prisma, SQL, Casbin, raw artifacts, and infrastructure detail under
  Advanced views.

## Deliberate non-goals

Until the restaurant dual-surface product is accepted, do not expand:

- the 100+ Profile catalogue or broad capability-family intake;
- real payment processing or production payment credentials;
- cloud deployment, application fleet, managed operations, or rollback UX;
- connector marketplace or unrestricted third-party runtime execution;
- unrestricted generated-file editing or source-to-Graph reverse parsing;
- production Figma, Stitch, or Aceternity integration.

## Delivery sequence

1. Resume and seal Task 0 from the paused-session handoff: clarification
   convergence, real-model Expense and Appointment acceptance, clean checkout,
   cleanup, review, commit, and push. It is implementing and unblocked; review
   and push are exit gates.
2. Freeze the product-intent and Graph v2 contract.
3. Start two isolated writer lines in parallel: one produces the deterministic
   Restaurant semantics over reusable commerce capabilities; the other
   establishes the UI Registry, source topology, screen recipes, and Fine Dining
   experience. Both consume only the frozen Task 1 contract.
4. After both lines are ready for QA, compile and verify the customer mobile and
   merchant desktop surfaces in parallel against their shared semantic and UI
   inputs.
5. Rebuild the Workbench around prompt, live preview, contextual editing, and
   publish.
6. Add visible source, diff, controlled extensions, ZIP, and Git export.
7. Run one guarded real-model restaurant acceptance and independent release
   review.

## Iteration exit

This reset is complete only when a founder can enter a high-end restaurant
ordering brief, answer at most one critical clarification, and receive a
polished, runnable customer and merchant product. The product must demonstrate
real menu configuration, server-derived cart totals, simulated payment, order
and kitchen state transitions, table operations, users and permissions, audit,
editable multi-block pages, editable business models, source visibility,
recompilation, preview, and cleanup.

The pre-Publish preview must be traceable to an immutable Draft Preview
Snapshot and remain non-deployable and non-exportable. Final production
artifacts must compile from a separate immutable Published Revision.

Passing unit tests alone, generating fifteen shallow CRUD screens, or replaying
a fixed restaurant template does not satisfy this outcome.
