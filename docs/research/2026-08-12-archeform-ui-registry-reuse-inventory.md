# Archeform UI Registry reuse inventory

Date: 2026-08-12

Scope: Task 3's seven private UI/recipe packages for the frozen Restaurant
key-and-binding contract. This is a reuse decision record, not a source study
or an authorization to add dependencies.

## Search order and findings

| Search area                   | Candidates examined                                                                                                                                               | Reuse decision                                                                                                                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approved Archeform registries | No existing `ui-primitives`, `ui-patterns`, `generated-ui`, screen, experience, or product recipe package exists.                                                 | No registry item can be composed or parameterized. Create only the frozen keys.                                                                                                                                                                             |
| Existing recipes              | `apps/workbench/lib/puck-page-model.ts` maps a narrow legacy PageModel/Puck adapter; it owns Graph editing semantics.                                             | Do not reuse: importing it would leak Workbench/Graph behavior into generated product source. Preserve its ordering/declared-block lesson in registry metadata only.                                                                                        |
| Existing Workbench assets     | `ResponsivePreview`, `PageTree`, shell components, and Lucide use in `apps/workbench/components/**`.                                                              | Reuse the independent implementation patterns: semantic landmarks, labelled controls, `aria-current`, `aria-pressed`, and Lucide-only icon policy. Do not import source: Workbench is a separate operator UI and is outside the generated-product boundary. |
| Generated-project templates   | Compiler page/runtime source is an existing generated application runtime, including Restaurant customer behavior.                                                | Do not reuse: it is compiler-owned runtime/API behavior and Task 3 cannot make private packages a generated runtime dependency. The new registry exposes copyable, dependency-free source descriptors instead.                                              |
| Pinned source studies         | The ecosystem research records shadcn/ui and Radix as future study candidates only; ADR-0010 explicitly rejects copying shadcn/ui and direct Radix for this wave. | Rejected. No upstream source inspected or copied; no direct Radix import/dependency is introduced.                                                                                                                                                          |

## Reused conventions

- English semantic HTML contracts, keyboard focus information, and responsive
  viewport labels use the independently implemented Workbench conventions.
- `lucide-react` is the only permitted external UI coordinate and is declared
  only by `@factory/ui-primitives`, as required by ADR-0010.
- The existing compiler boundary that generated applications must not import
  private `@factory/*` packages becomes a deterministic copy-source closure
  validation in this registry.

## Parameterization and gaps

All visual variation is a Fine Dining token or recipe parameter; no style-only
registry key is added. The frozen contract identifies exactly two semantic
gaps that require new blocks: `customer-profile-form` (identity/preferences)
and `restaurant-settings-form` (Restaurant configuration). Neither existing
Workbench source nor an existing generated template has those product
semantics without importing unrelated runtime behavior, so both are created
as Factory-authored descriptors with the frozen bindings.

## Rejected alternatives

- Copy a shadcn/ui primitive or import Radix directly: rejected by ADR-0010;
  no accepted source study, fixed source ledger, or founder authorization.
- Reuse Workbench components in a generated product: rejected because it
  crosses the Workbench/generated-product boundary.
- Reuse compiler Restaurant runtime as a block library: rejected because it
  would couple a registry experiment to Task 4/5 runtime behavior and private
  package imports.

## Result

The available candidates provide conventions, not reusable source. Task 3
creates the frozen private registry descriptors and owned copyable source only;
it introduces no copied third-party source, direct Radix dependency, or new
external coordinate.
