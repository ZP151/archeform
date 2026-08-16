# Template Restaurant Experience Theme Revision Design

Status: accepted by ADR-0016 on 2026-08-14. The exact implementation and release
evidence are PM-accepted for delivery; controller delivery has not occurred.

## Goal and exact visible outcome

Starting from delivered Task 7C Draft r.5, the user follows:

```text
Builder -> Experience -> Theme
Light -> Dark
```

A successful save appends Draft r.6 and exactly one active immutable Snapshot
V2. The Customer and Merchant Workbench preview frames switch to dark only
after a strict checksum-bound Control Plane response replaces the accepted
instance. Pending and failed saves leave both accepted frames light.

This is one curated Graph property revision, not a theme system. It changes
only `graph.experience.theme.mode` and does not change tokens, optional
`designSystem`, locales, navigation, pages, product output, generated runtime,
Graph schema, recipes, capabilities, compiler contracts, Prisma, dependencies,
providers, services, or deployment.

## Feasibility and selected approach

The current contracts admit the operation without widening:

- Application Graph V3 inherits the existing `experience.theme.mode` enum of
  `light | dark | system`.
- The curated Restaurant Graph is currently `light`; the server-owned source
  Experience Recipe used to construct that exact template declares
  `supportsDark: true`.
- `assertRestaurantDraftPreviewGraphClosure` reasserts Graph V3 and the exact
  Restaurant surface/page/binding closure without pinning theme mode.
- the existing strict template response already proves Graph checksum, latest
  Draft/Snapshot identity, active Snapshot state, and the exact Customer and
  Merchant preview pair before Workbench can adopt an instance.

Select one server-owned `light -> dark` command. Capture the exact two
primitives once, re-read the authoritative latest Draft and its latest active
Snapshot within each Serializable attempt, change the one property, prove full
restoration equality, run the existing pure compiler preview closure, and use
the delivered atomic Draft/Snapshot/two-render lifecycle.

Whole-Graph or whole-Experience submission is rejected because it grants the
browser authority over unrelated properties. Local Workbench chrome theme is
rejected because it is not persisted Graph truth. Compiler/generated-runtime
theming is deferred because this slice proves Workbench Draft preview state,
not Published compilation output.

## Reuse inventory and additive UI boundary

Reuse the delivered Task 7C boundaries:

- the Control Plane local-workspace-before-origin lookup, latest-Draft/current-
  Snapshot admission, three-attempt Serializable helper, compiler closure,
  `instanceFrom`, dual rendering, and immutable Snapshot append;
- `WorkbenchTemplateDraftInstance` plus `templateDraftResponse` for strict
  checksum/identity/state/two-preview admission;
- controller state that retains the accepted instance through pending/failure
  and replaces it only after a strict client result;
- Workbench shell navigation, template-only destination allowlist, fixed status,
  focus-visible behavior, and responsive conventions;
- existing form, radio, button, status, frame, and Lucide icon primitives; and
- the real Restaurant r.5 fixture and serialized Playwright journey.

Builder currently has no Experience destination. Add exactly one `experience`
destination to `@factory/workbench-ui`, one `experience` Workbench `Surface`,
and the corresponding shell mapping using the existing Lucide `Palette` icon.
This is an additive operator-UI registry change, not a Graph, recipe, compiler,
or generated-runtime destination. Existing destination keys and Workbench
chrome `Theme` state remain unchanged.

No approved package, recipe, generated template, or pinned source study contains
the checksum-bound theme editor needed here. Create only
`TemplateExperienceWorkspace`; no external source, copied asset, package, or
dependency is introduced.

## Exact API and interfaces

The endpoint is exactly:

```text
POST /template-draft-instances/:applicationGraphId/experience-theme-revisions
```

The request body is exactly:

```ts
export type AppendTemplateExperienceThemeRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly mode: "dark";
};

export type TemplateExperienceThemeEditResult =
  AppendTemplateExperienceThemeRevisionInput & {
    readonly graph: ApplicationGraphV3;
  };

export function captureTemplateExperienceThemeRevisionInput(
  input: unknown,
): AppendTemplateExperienceThemeRevisionInput;

export function applyTemplateExperienceThemeEdit(
  graphInput: unknown,
  input: unknown,
): TemplateExperienceThemeEditResult;

export function applyCapturedTemplateExperienceThemeEdit(
  graphInput: unknown,
  command: AppendTemplateExperienceThemeRevisionInput,
): TemplateExperienceThemeEditResult;
```

The controller delegates the raw body to:

```ts
appendTemplateExperienceThemeRevision(
  applicationGraphId: string,
  input: unknown,
): Promise<TemplateDraftInstanceV1>;
```

The Workbench client exposes the same method name with
`AppendTemplateExperienceThemeRevisionInput` and returns
`Promise<WorkbenchTemplateDraftInstance>` only through the existing strict
response parser.

## Hostile-safe command admission

Capture happens exactly once before Prisma, workspace, origin, Graph, Snapshot,
hash, registry, compiler, or renderer work. Every retry reuses only the frozen
captured primitive record.

The body must be an own plain object with exactly two enumerable own data
properties in any JSON key order: `baseDraftRevisionId` and `mode`. Reject
arrays, custom prototypes, inherited/accessor/symbol/non-enumerable/missing/
extra properties, sparse or reflection failures, and caller conversions. Do not
invoke getters, iterators, `toString`, `valueOf`, or `toJSON`.
`baseDraftRevisionId` is a primitive 1..128 Graph key and `mode` is the exact
primitive literal `dark`.

Malformed input returns fixed HTTP 400
`Template Draft request is invalid.` No error or log echoes the body, ids,
Graph, Snapshot, mode, hostile value, or reflection error.

## Current authority and exact mutation

Within every Serializable attempt, the service must:

1. select by `applicationGraphId` and server-owned local workspace before
   inspecting origin; missing/cross-workspace share the existing fixed 404;
2. prove the exact curated Restaurant origin and read the latest Draft with its
   latest Snapshot;
3. require the captured base id to equal the latest Draft id;
4. assert Graph V3 and prove workspace, Application, aggregate name, Draft
   ownership, and current Graph checksum;
5. assert Snapshot V2 and prove local workspace, Application, latest Draft,
   exact Graph checksum, and `active` state;
6. require the current mode to be exactly `light`; and
7. preserve the complete Restaurant compiler preview closure.

Clone the server-owned current Graph and change only
`graph.experience.theme.mode` to `dark`. Restore the candidate mode to `light`
in a clone and require deep structural equality with the entire base Graph,
including ordering. Reassert Graph V3, compute its checksum, and invoke the
existing `assertRestaurantDraftPreviewGraphClosure` before Draft creation or
renderer invocation.

Current `dark` is a no-op conflict. Current `system`, identity/hash/Snapshot
drift, Graph failure, or compiler-closure failure is malformed current
authority and returns fixed 400. `supportsDark` is source-recipe feasibility
evidence, not a browser field or an invented Graph admission property.

## Concurrency and atomic lifecycle

Use one Prisma Serializable operation with at most three attempts. Every retry
re-reads and revalidates all server-owned authority while reusing the captured
command.

- stale base, current-dark no-op, P2002, and exhausted P2034 return fixed HTTP
  409 `Template Draft revision moved; reload before editing.`;
- malformed input or authority/Graph/closure drift returns fixed HTTP 400
  `Template Draft request is invalid.`; and
- no automatic rebase, alternate mode, or partial success exists.

Success atomically appends Draft r.6, renders exactly Customer and Merchant,
appends exactly one checksum-bound immutable active Snapshot V2, selects it,
and returns the strict existing envelope. Validation, checksum, renderer,
Snapshot insert, response assembly, uniqueness, or exhausted serialization
failure leaves no attempted Draft/Snapshot. r.5 and every earlier row remain
unchanged and readable.

## Workbench interaction

The template-only Builder destinations become Page, Data, and Experience. The
Experience workspace shows one `Theme` section and a native labelled radio
group with Light selected from the accepted r.5 instance and Dark as the sole
saveable proposal. Selecting Dark is local form state only; it never changes a
preview frame.

Two labelled frames, `Customer` and `Merchant`, carry the accepted Snapshot id
and expose `data-template-theme="light|dark"` or an equivalent exact class. The
frame presentation derives only from `instance.draft.graph.experience.theme.mode`
after strict response admission. It does not read the proposal or Workbench
chrome theme.

While saving or after failure, the accepted r.5 instance and both light frames
remain authoritative and the Dark proposal remains recoverable. Only strict
success adopts r.6 and switches both frames to dark. Browser failures normalize
to `Template experience could not be saved.` A reload derives dark again from
the strict r.6 Graph/Snapshot response.

The group, radios, action, status, and frames have accessible names; status is
announced; focus remains useful after failure and moves to the success status
after success; controls are keyboard-operable, focus-visible, at least 44px,
and WCAG AA. At 390px the editor and frames stack without horizontal overflow;
1440px retains the current sparse split-workspace language.

## Explicit deferrals

Deferred and unauthorized: `system` or `dark -> light`; token, design-system,
locale, responsive-navigation, page, surface, content, Data, Access, Users,
permission, Workflow, Source, history picker, audit, export, Publish,
Compilation, generated-runtime behavior, provider, service, network, queue,
worker, Docker, Compose, deployment, dependency, package, lockfile, Graph,
Capability, Product/Screen/Experience Recipe, Compiler, Prisma, database, or
generic theme/editor changes.

The earlier permission-only Access proposal remains `blocked_at_design` because
Graph V3 requires the declared permission behind its governed `canManage`
binding. ADR-0016 grants no Access authority.

## Verification and delivery

TDD proceeds from pure capture/mutation, through Control Plane current-
Snapshot/concurrency/rollback, strict client and controller state, additive
registry/navigation and accessible workspace, then a real browser r.5 -> r.6
and reload at 1440px and 390px. Focused/full Control Plane, Workbench, and
Workbench UI tests plus Graph, Capabilities, and Compiler compatibility;
six no-emit checks; builds, Prisma, Next, Playwright; exact containment; format,
diff, import/boundary/forbidden-path/static/sensitive checks must pass.

Delivery is serialized: one Sol writer owns the exact implementation manifest,
then one independent intended-vs-implemented review, targeted Terra/browser QA,
one final Sol release review, PM acceptance, and controller-only exact delivery
with a non-force push and local/upstream equality. Reviewers do not edit, stage,
commit, or push.
