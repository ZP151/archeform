# Typed Capability Binding Validation Design

## Status

Approved by the Factory controller for the dedicated hardening slice under
ADR-0006 and amended by accepted ADR-0007. This design supersedes the
existence-only binding check for new Draft, Publish, and Compiler admission. It
does not alter historical Graphs, locks, or accepted `1.0.0` Golden package
bytes.

## Problem

`factory.composition/v1` currently represents a Graph binding as a string such
as `graph.domain.price`. The generic validator flattens entity and field keys
into one namespace and confirms only that a matching string exists. A binding
therefore can be syntactically valid while referring to a field owned by the
wrong entity or of the wrong scalar type. For example, a location resolver can
bind to a decimal price, or an inventory mutation can bind to a price rather
than stock.

This is a shared composition integrity defect. It is not a Restaurant or
Ecommerce behaviour and must be solved before either profile recipe can be
accepted or compiled.

## Decision

Adopt a manifest-owned typed binding contract named
`factory.capability-binding/v1`.

The Application Graph remains the source of truth. The Graph package exports a
pure typed symbol index, but remains unaware of capability manifests. The
Capabilities package interprets manifest input requirements against that index
at every public composition boundary. No check may dispatch on Profile name,
package version, field name, source path, or compiler target.

```ts
type CapabilityBindingInputV1 = {
  readonly key: string;
  readonly type:
    | "domain.entity"
    | "domain.field"
    | "page.page"
    | "page.navigation"
    | "policy.role"
    | "flow.flow"
    | "integration.provider"
    | "experience.token";
  readonly required: boolean;
  readonly ownerBinding?: string;
  readonly fieldTypes?: readonly DomainFieldType[];
  readonly fieldRequired?: boolean;
  readonly fieldUnique?: boolean;
};

type GraphFieldBindingV1 = {
  readonly graphSymbol: "graph.domain.<entity-key>";
  readonly fieldKey: string;
};
```

`fieldKey` is legal only for `domain.field`. A `domain.field` input must declare
an `ownerBinding`; that binding must be a required `domain.entity` input of the
same manifest. It must also declare at least one allowed scalar type. The field
is resolved only in the selected owner entity; duplicate field keys elsewhere
in the Graph are irrelevant.

The Graph typed symbol index contains separate maps for entities, fields by
entity, pages, navigation, roles, flows, providers, and experience tokens. It
does not merge independently typed identifiers into a shared set.

### Serialized Draft Graph contract

Draft `ApplicationGraphV1.integration.compositionSelections` uses this additive
serialized value contract:

```ts
type SerializedCompositionBindingV1 =
  | number
  | boolean
  | { graphSymbol: string }
  | {
      graphSymbol: `graph.domain.${string}`;
      fieldKey: string;
    };
```

The Graph schema and semantic validator accept an owner-aware field object only
for a domain entity symbol and prove that the exact entity and its exact field
exist. They do not interpret manifest scalar, required, unique, or input-kind
requirements; those remain Capabilities admission responsibilities.

Historic `{ graphSymbol }` Draft JSON remains readable and retains its existing
hash. Reading it never infers an owner, scans globally for a field, or promotes
it into a field binding for new admission. Published Graphs remain free of
composition selections; immutable locks retain the bindings and digests needed
by the later Publish and compiler gates.

## New Golden versions

Existing Golden artifacts remain immutable historical evidence. New Drafts use
new verified package versions:

| Package                     | New version | Change                                                                             |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `core.location-context`     | `1.0.1`     | `locationCodeField` requires a string, required, unique field on `locationEntity`. |
| `commerce.inventory-ledger` | `1.0.1`     | `stockField` requires an integer field on `catalogEntity`.                         |
| `commerce.inventory`        | `2.0.0`     | Adds its required `catalogEntity` binding and typed stock-field contract.          |

`core.identity-context@1.0.0` and
`commerce.line-configuration@1.0.0` contain entity/page/role bindings only and
remain valid under generic namespace validation. The new versioned manifests,
physical `component.json` files, fixtures, evidence, and digests must be
verified before a current recipe can select them.

## Boundaries and lifecycle

The same manifest-aware validator runs at three points:

1. `composeCapabilityDraft` before a Draft can retain owner-aware serialized
   composition selections.
2. Verified Publish lock creation before a Published revision or immutable lock
   is persisted.
3. Compiler admission before any generated output directory or artifact is
   created.

The lock factory and compiler verification receive the exact immutable Graph
with the selected locks. Unsafe historical package versions remain readable but
are ineligible for new Draft selection, Publish, and Compilation. A local
Draft migrates by creating a new Draft revision; a Published revision is never
rewritten.

## Rejected alternatives

- **Per-package Profile checks:** duplicates logic and fails to scale across
  the planned Profile portfolio.
- **Global field uniqueness or scalar inference:** cannot prove field ownership
  and cannot distinguish numeric stock from numeric monetary values.
- **Qualified `graph.domain.entity.field` grammar now:** semantically viable but
  broadens the serialized Graph and lock grammar unnecessarily. The explicit
  field-binding object gives the same ownership guarantee with a bounded
  migration.

## Acceptance invariants

- A `domain.entity` cannot bind to a field, a `page.page` cannot bind to
  navigation, and a `policy.role` cannot bind to a resource.
- A `domain.field` resolves only under its declared owner entity and satisfies
  all declared scalar, required, and unique constraints.
- Wrong-entity `code`, wrong-type `price`, and wrong-entity numeric table
  fields reject through Draft composition, Publish, and Compiler entry points.
- Valid Restaurant and Ecommerce location and stock fields pass even when
  another entity declares the same key.
- Missing/unknown `ownerBinding`, duplicate schema key, incompatible field type,
  or parameter/schema mismatch rejects deterministically.
- An owner-aware field object round-trips through Draft Graph parse and
  serialization; wrong-model, wrong-owner, and missing-field objects reject.
- Duplicate field keys remain safe because structural lookup is scoped to the
  serialized owner entity.
- Changing only `fieldKey` changes the Application Graph hash, while historic
  `{ graphSymbol }` Graph hashes remain unchanged.
- The owner-aware schema, parser, validator, and typed exports remain available
  from the browser-safe Graph entry without Node-only dependencies.
- Every changed physical manifest changes its digest and fails verification if
  its physical evidence is stale or tampered.
- There is no Profile/package/version/field-name branch in the validator.
- Draft -> Publish -> immutable Compilation remains unchanged.

## Scope

This slice changes type safety, serialized Draft selection safety, and package
version selection only. The serialized-Graph task owns only the Graph schema,
parser/validator, hashing regressions, browser-entry regressions, and their
tests; it adds no physical capability asset, Profile recipe, Publish gate,
compiler gate, UI surface, external Provider, payment integration, deployment
target, or arbitrary source import. Runtime exactly-once stock execution
remains the later commercial compiler slice.
