# Guided Application Creation design

## Outcome

Enable a business user to start a new application without selecting or editing
an `ApplicationGraphV1` directly. The user chooses an accepted business
outcome, supplies a product name and experience mode, and receives a new
mutable Draft that can be refined in the existing Studios and then published.

## Scope

The first slice supports Expense approval, Restaurant ordering, and Simple
ecommerce. It may customize Graph identity, display name, and experience mode,
but may not generate arbitrary schema, code, providers, routes, or effects.
The browser creates Graphs only from pinned, validated starters and constrained
identity/experience edits. The Control Plane runs `assertValidApplicationGraph`
before persisting a Draft; the browser must not import the Node-only hashing
entry point.

## Experience

A `New application` action opens a left-side drawer. It has three stages:

1. Choose an outcome from the accepted profile cards.
2. Name the application and choose light or dark mode.
3. Review page, entity, role, and flow counts, then create a Draft.

Creation generates a new Graph key, bootstraps the Graph through the existing
Control Plane, closes only after that succeeds, and opens Page Studio. The
Draft -> Publish -> immutable Compilation lifecycle remains unchanged.

## Contract

```ts
type GuidedApplicationInput = {
  profile: FactoryProfile;
  name: string;
  theme: "light" | "dark";
};

createGuidedApplicationDraft(input, nonce): ApplicationGraphV1
```

The helper rejects blank names, creates a bounded deterministic key from the
name and nonce, clones the starter, and never mutates a starter. The browser
supplies the nonce, allowing deterministic tests. Server-side Graph validation
remains the persistence boundary.

## Acceptance evidence

- Unit tests prove valid independent Graph generation, identity shaping, name
  rejection, and no starter mutation.
- Browser E2E creates a named Expense application through the drawer and lands
  in Page Studio while remaining in Draft.
- No automatic Publish, Compilation, model call, or persisted raw prompt occurs.
