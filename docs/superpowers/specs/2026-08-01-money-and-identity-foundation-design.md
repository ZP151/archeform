# Money and identity foundation design

Status: approved scope selection on 2026-08-01; implementation remains pending
the controller review of this specification.

## Purpose

Add two reusable, independently versioned capability families that increase
Factory Pilot's cross-profile coverage without turning an external product,
identity provider, payment provider, or SDK-specific data model into the
Application Graph source of truth:

1. `commerce.money-pricing` supplies server-authoritative monetary calculation,
   price snapshots, promotions, tax allocation, and deterministic simulated
   refunds.
2. `core.identity-policy` supplies a provider-neutral principal, session,
   tenant, role, and authorization-decision boundary with a local generated-app
   fake.

The first acceptance proves that the same Money package compiles into Restaurant
Ordering and Simple Ecommerce, and the same Identity package compiles into
Expense Approval and Simple Ecommerce. The generated applications must differ
only through validated Graph bindings, not profile-name branches or mutable
external configuration.

## Scope and non-goals

### Included

- Fixed-scale integer money amounts, ISO currency codes, explicit rounding
  modes, immutable price snapshots, fixed/percentage promotions, tax rates, and
  refund allocation.
- A provider-neutral principal/session/tenant vocabulary, server authorization
  decision inputs, local fixture users and sessions, and compiler-generated
  enforcement hooks.
- Golden package manifests, adapters, templates, fixtures, package tests,
  compiler output, generated role journeys, and two-profile evidence for each
  family.

### Deferred

- Real payment credentials, card data, settlement, webhooks, chargebacks,
  accounting ledgers, invoices, subscriptions, and money movement.
- Live OIDC discovery, Keycloak, passkeys, external tenant management, and
  persistent production session stores.
- Casbin, OpenFGA, Stripe, `big.js`, `dinero.js`, or `openid-client` runtime
  integration. They remain Candidate or Provider-study inputs until separately
  accepted with version, notice, SBOM, vulnerability, local-fake, outage, and
  removal evidence.
- Arbitrary promotion scripts, formulas, provider callbacks, currency format
  callbacks, client trust, or Graph-supplied URLs and credentials.

## Architecture

```text
Published Application Graph
  ├─ PolicyModel roles and resource/action rules
  ├─ DomainModel price, promotion, snapshot, principal and session bindings
  ├─ FlowModel validated order/approval transitions
  └─ locked Golden package selections
             |
             v
Compiler
  ├─ generated Nest API guards and local identity fake
  ├─ generated money/pricing service and persistence fragments
  ├─ generated Next UI projections and role simulator
  └─ role journeys, API/flow tests, documentation and artifacts
```

The compiler consumes only a Published Graph plus its immutable composition
lock. It validates package dependencies, inputs, target slots, and digests
before generating any output. Neither package reads an untrusted client price,
role header, external URL, executable callback, or provider secret.

## Capability contracts

### `commerce.money-pricing@1.0.0`

The package receives validated bindings for a saleable entity, order entity,
order-line entity, currency field, customer role, merchant role, and one or
more declared promotion rules. It produces:

- a typed `MoneyAmount` representation `{ minor: bigint-string, currency }`;
- a server-side price calculation command and immutable line/order snapshots;
- deterministic percentage/fixed promotion, tax, and refund allocation;
- API, persistence, page-projection, test-fixture, and audit contribution
  slots; and
- declared interfaces `money.price-quote/v1`, `money.price-snapshot/v1`, and
  `money.refund-allocation/v1`.

Amounts are serialized as decimal strings in Graph and JSON artifacts. Floating
point values, mixed currencies, negative submitted quantities, unsupported
rounding modes, expired promotions, unbounded discounts, and a request-supplied
unit price fail validation before state mutation. The first runtime accepts only
the existing simulated-payment boundary after a price snapshot has been stored.

Restaurant binds menu modifiers, item price, table session, and cashier flows.
Ecommerce binds catalog variants, cart/order, shopper/merchant roles, and
checkout flows. Both lock the same package version.

### `core.identity-policy@1.0.0`

The package receives validated bindings for principal, session, optional tenant,
the default anonymous/customer role, and declared protected resources/actions.
It produces:

- a credential-free `PrincipalContext` with opaque principal/session IDs,
  tenant ID, authenticated state, and declared roles;
- local fixture identities and expiring generated-app sessions for deterministic
  development and browser role simulation;
- a server-side, deny-by-default authorization decision interface;
- API guard, policy projection, audit-context, page-navigation, and journey
  contribution slots; and
- declared interfaces `identity.principal-context/v1` and
  `authorization.decision/v1`.

The local fake never represents real authentication. Existing test-only
role-simulation headers remain unavailable in production compilation modes.
The generated server resolves an approved fixture session, then decides one
declared resource/action pair. Missing/expired session, tenant mismatch,
undeclared role, unknown resource/action, or deny decision fails closed and
records only safe audit metadata.

Expense Approval binds employee, manager, and finance roles. Ecommerce binds
shopper and merchant roles. Both lock the same package version and use different
policy matrices.

## Package and compiler boundaries

Both packages follow the physical package contract:

```text
packages/capabilities/<component-key>/<version>/
  component.json
  adapter.json
  templates/
  fixtures/
  tests/
```

Every source/template/fixture contribution declares a digest and an allowed
output slot. The Composer validates all paths, dependencies, bindings, output
collisions, and manifests. The Compiler owns target layout and merges only
declared contribution types. A package cannot write arbitrary generated files
or alter a Graph.

`core.identity-context@1.0.0` remains replayable for historical Published
Graphs. New Draft recipes may select the new identity package only after its
contract and fixtures are accepted; no historical lock is modified.

## Delivery slices

1. Freeze the two contracts and add negative schema/composition tests.
2. Release the Money package with pure deterministic calculation, snapshots,
   compiler contributions, and Restaurant/Ecommerce journeys.
3. Release the Identity package with local fake, server decision boundary,
   policy projections, and Expense/Ecommerce journeys.
4. Add Workbench visibility: package readiness, locked family selection, price
   and policy impact summaries, and generated role-journey inspection. The UI
   projects Graph data only; it does not edit raw package or provider state.
5. After both slices are independently accepted, create separate source-study
   decisions for a pinned decimal dependency, OIDC adapter, Casbin adapter, and
   real payment provider. None is implied by this design.

## Acceptance evidence

Money is accepted only when:

- Restaurant and Ecommerce use the same exact Golden lock but compile distinct
  price/promotion/tax bindings and generated UI/schema/workflow outputs.
- Generated journeys reject client price tampering, floating-point amounts,
  invalid promotion input, inconsistent currency, and duplicate/refund
  allocation errors without state changes.
- A snapshot remains stable after a later catalog price change, and every price
  mutation produces audit evidence.

Identity is accepted only when:

- Expense Approval and Ecommerce use the same exact Golden lock but compile
  distinct declared roles and authorization matrices.
- Generated journeys prove allowed and denied actions, expired session,
  tenant mismatch, unknown action, and missing identity all fail closed.
- The generated app exposes only safe principal context and no fixture secret,
  provider credential, raw authorization rule, or role-simulation bypass.

Both releases additionally require package/Graph/compiler/worker tests,
generated-app browser journeys in isolated Compose projects, cleanup evidence,
third-party notice and source-study verification, and one guarded real OpenAI
Graph-Diff acceptance run per affected Profile. Raw prompts, responses, and
credentials are never persisted.

## Alternatives rejected

- **Directly integrate a payment or identity platform now:** fast-looking but
  would impose provider data formats, credentials, deployment terms, and
  implementation details on Graph semantics.
- **Implement a Restaurant-only price or login feature:** improves one demo but
  does not unlock the portfolio or prove reusable composition.
- **Adopt every researched dependency at once:** creates incompatible runtime
  seams and weakens supply-chain evidence. One candidate per contract seam is
  selected only after a separate source study.
