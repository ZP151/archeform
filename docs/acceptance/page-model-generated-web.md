# PageModel-generated Web acceptance

## Scope and revision

This record accepts the deterministic PageModel-to-generated-Web projection
introduced through commits `09d8666`, `e5fc83e`, `978fbd8`, and `00c9be4`.
The compiler consumes a published `ApplicationGraphV1` and embeds the derived
`factory.generated-page-runtime/v1` document in a standalone generated Next.js
application. A Draft is not a compiler input.

No AI model call, credential, raw requirement input, raw model prompt, or raw
model response was used, persisted, or retained for this acceptance run.

## Projection contract

The projection is Factory-owned data. Its allowed block vocabulary is exactly:

```text
hero | form | collection | catalog | cart | queue | checkout
```

It includes only declared canonical local routes, navigation, the active theme
mode, entity bindings, and safe presentational string props (`title`,
`eyebrow`, and `heading`). The generated Web runtime is Factory-owned and does
not import Puck, React Flow, Workbench editor source, arbitrary URLs, arbitrary
component names, or executable PageModel values.

Projection validation fails before an output bundle for an unsupported block,
non-local route, missing or unknown entity binding, an invalid order binding, a
missing navigation target, or a missing required Factory capability. `catalog`
requires `cart.add`; `checkout` requires `payment.simulate`; `cart` and
`checkout` require the `order` entity. The generated root resolves the declared
`/` page when present, otherwise the first declared page. The catch-all entry
renders only declared routes and produces a controlled Not Found state for an
unknown route.

## Published profile route evidence

The deterministic compiler source tests assert the exact published PageModel
routes and block types below. The generated runtime renders ordered blocks and
uses only the generated API proxy for record, workflow, policy, and capability
actions.

| Profile             | Published route | Block        | Browser journey proof                                                                                         |
| ------------------- | --------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| Expense Approval    | `/expenses`     | `collection` | Employee opens expenses, creates a record from the derived form route, submits it, and a manager approves it. |
| Expense Approval    | `/expenses/new` | `form`       | The `New expense` link resolves to the declared same-entity form route.                                       |
| Restaurant Ordering | `/menu`         | `catalog`    | Customer adds the seeded Margherita pizza and checks out.                                                     |
| Restaurant Ordering | `/cart`         | `cart`       | The declared Cart navigation route is opened after checkout.                                                  |
| Restaurant Ordering | `/kitchen`      | `queue`      | Kitchen role moves a paid order through preparing to ready.                                                   |
| Simple Ecommerce    | `/`             | `catalog`    | Customer adds the seeded Everyday tote and checks out.                                                        |
| Simple Ecommerce    | `/checkout`     | `checkout`   | The generated checkout route renders after a cart checkout action.                                            |
| Simple Ecommerce    | `/orders`       | `collection` | Operator opens Orders and fulfils the paid order.                                                             |

## Isolated generated-browser evidence

On 2026-07-30, Task 3 materialized each profile as a separate generated
application and ran the route-aware Playwright journeys against only these
named isolated services:

| Profile             | Compose project                     | Generated Web port | Generated API port |
| ------------------- | ----------------------------------- | -----------------: | -----------------: |
| Expense Approval    | `factory-task3-expense-20260730`    |            `15381` |            `15382` |
| Restaurant Ordering | `factory-task3-restaurant-20260730` |            `15383` |            `15384` |
| Simple Ecommerce    | `factory-task3-ecommerce-20260730`  |            `15385` |            `15386` |

The route-aware Playwright invocation completed with `3 passed`: one journey
per independently materialized profile. The evidence covered the designed
Expense collection-to-form flow, Restaurant menu-to-cart-to-kitchen flow, and
Ecommerce catalog-to-checkout-to-orders flow while retaining the role-aware API
and FlowModel state assertions described above.

All named Compose resources, volumes, and the scoped temporary materialization
directory `generated/task3-route-proof-20260730` were removed after the run.
No existing user services were stopped, restarted, or modified.

## Release gates

The following current-HEAD gates are required for this acceptance record and
were run after the PageModel route-proof commit:

```text
pnpm test
pnpm typecheck
pnpm build
pnpm verify:third-party
pnpm verify:source-studies
pnpm exec prettier --check docs/acceptance/page-model-generated-web.md docs/roadmap.md
git diff --check
```

The deterministic CI suite remains fixture-based. A future guarded real-model
Graph-Diff acceptance, if enabled for a profile, is separately scoped and must
continue to keep credentials and raw model traffic out of state and evidence.

## Residual scope

This acceptance covers the bounded v1 block vocabulary and the three accepted
profile route journeys. It does not make third-party visual editors or external
runtime providers part of generated applications; those remain adapters behind
their own contracts and verification slices.
