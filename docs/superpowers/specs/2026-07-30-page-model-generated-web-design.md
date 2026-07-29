# PageModel-generated Web Design

## Goal

Make a published Factory Application Graph's `PageModel` define the visible
structure and route behavior of the generated standalone Next.js application.
Puck remains an authoring adapter; it is not shipped inside generated products.

## Decision

The compiler will derive a deterministic `factory.generated-page-runtime/v1`
projection from the published Graph. The projection contains only supported
page blocks, declared routes, entity bindings, navigation, theme mode, and
safe presentational props. It will be embedded in generated source rather than
persisted as an independent source of truth.

The generated Web target will contain a Factory-owned React runtime with a
root route and a catch-all route. The runtime resolves the active PageModel
route, renders only its declared blocks in order, and links only declared
navigation or derived same-entity form routes. It will use the existing
generated Nest API, role header, flow events, and capability APIs.

## Supported block contract

| PageModel block | Required Graph data                                                                                   | Generated behavior                                    |
| --------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `hero`          | `eyebrow` and `heading` props are optional                                                            | Headline and safe primary route action.               |
| `form`          | Bound entity                                                                                          | Role-guarded create form for declared entity fields.  |
| `collection`    | Bound entity                                                                                          | Role-guarded records and a derived route to its form. |
| `catalog`       | Bound catalog entity; declared `order` entity and FlowModel; exact Factory cart and payment contracts | Seeded/loaded records with add-to-cart action.        |
| `cart`          | Bound `order` entity; declared `order` FlowModel; exact Factory cart and payment contracts            | Current cart state and simulated checkout action.     |
| `queue`         | Bound entity                                                                                          | Records and declared transition controls.             |
| `checkout`      | Bound `order` entity; declared `order` FlowModel; exact Factory cart and payment contracts            | Current cart state and simulated checkout action.     |

For every `catalog`, `cart`, or `checkout` block, the compiler requires all of
the following before it emits an output bundle: a DomainModel `order` entity;
an `order` FlowModel; Factory capability `cart.add` with operation `add`; and
Factory capability `payment.simulate` with operation `simulate`. The declared
`order` FlowModel must contain a transition with a
`payment.simulate`/`simulate` effect. The compiler rejects unsupported block
types, missing required bindings, or any missing commerce prerequisite. It
never evaluates PageModel props as code, HTML, URLs, imports, or component
names.

## Route and interaction model

The generated root route resolves to the Graph page at `/`, or to the first
declared PageModel page when no root page exists. A catch-all route resolves
all other declared paths. Unknown paths show a controlled Not Found state;
they never infer a new route.

PageModel routes must be canonical local paths and may not claim generated
Next application internals: `/api`, `/api/**`, `/_next`, `/_next/**`, or
`/favicon.ico`. Such a Graph fails during projection before an output bundle is
returned.

`collection` derives a create action only when a declared `form` page is bound
to the same entity. `catalog`, `cart`, and `checkout` use the validated order
flow and its declared simulated-payment event; they do not infer a payment
operation from the page block. `queue` presents only FlowModel events for its
bound entity and lets generated API policy enforcement make the final decision.
All data-bearing blocks use the declared role and generated API proxy.

## Design and accessibility

Generated applications use Factory-owned responsive components and CSS. The
Graph `experience.theme.mode` sets light or dark defaults; Graph theme tokens
may override only documented CSS variables. Navigation, role selection, forms,
record actions, and loading/error states remain keyboard accessible and expose
semantic labels used by browser journeys.

## Boundaries

- Puck is present only in `apps/workbench`; no generated Web package imports it.
- PageModel is still validated and hashed as part of the Application Graph.
- Generated application behavior remains limited to DomainModel fields,
  PolicyModel permissions, FlowModel events, and declared Factory capabilities.
- The compiler consumes only a Published Graph; a mutable Draft cannot render
  generated output.
- No real-model call is required for this deterministic slice.

## Verification

Compiler tests will prove deterministic projection, route resolution,
block/binding/capability rejection, safe prop serialization, and emitted
Next.js source. Each generated profile's browser journey will prove the
visible PageModel route sequence: Expense collection to form, Restaurant menu
to cart to kitchen queue, and Ecommerce catalog to checkout/orders. An
isolated Compose run will prove the current generated applications build and
execute without Puck in their dependencies.
