# Parameterized Capability Composition Design

## Decision

Factory Pilot will use a Graph-first composition model for its half-hour
prototype path. The Factory Application Graph remains the only product source
of truth. Capability packages, Puck, AI providers, generated source, and
runtime providers are adapters around that Graph.

The first proof is not another hand-built Restaurant feature. It is two
independently runnable applications, Restaurant Ordering and Simple Ecommerce,
that select the same versioned core-commerce packages with different validated
bindings. Restaurant-only behavior is then layered as additional packages,
not a compiler branch.

## Product outcome

A business user supplies an outcome in natural language. Factory proposes a
bounded Graph and a composition of approved packages. The user receives a
cohesive multi-page prototype without needing to arrange components, schemas,
or services manually. They may then edit visual presentation—theme tokens,
colour, typography, size, shape, spacing, layout, and approved component
properties—without changing the Graph's business semantics.

The resulting Published revision compiles to an isolated runnable Web
application, API, PostgreSQL schema and migrations, workflow handlers,
authorization policy, seed scenarios, tests, and documentation. A browser
simulator is an earlier projection of the same Graph; it is not a substitute
for the generated application.

```text
Requirement / visual edits / AI proposal
  -> Draft Application Graph
  -> approved package selection and parameter bindings
  -> validated PageModel, DomainModel, PolicyModel and FlowModel
  -> Publish immutable composition lock
  -> Simulator + independent Web/API/PostgreSQL/test bundle
  -> preview, deployment and lifecycle operations
```

## Why Graph-first composition

Three alternatives were evaluated:

| Approach | Result | Decision |
| --- | --- | --- |
| Puck-first page generation, then infer a backend | Fast visual output but loses domain, policy, flow, dependency, and deployment guarantees. | Reject. |
| Full starter Graph per profile with optional labels | Works for demonstrations but duplicates business logic and creates profile-specific compiler paths. | Retire by migration. |
| Graph-first packages with Puck as a PageModel adapter | Keeps business semantics, visual freedom, immutable provenance, and independently runnable generation together. | Adopt. |

## Composition contract v1

Every Golden package remains a physical, versioned, digest-verified asset at:

```text
packages/capabilities/assets/<package-key>/<version>/
  component.json
  adapter.json
  templates/
  fixtures/
  tests/
```

`factory.capability/v1` is extended with five declared concerns.

### Parameters

Each package declares named, typed parameters. A composition may bind only
declared values to Graph symbols or scalar configuration. Examples are an
entity name, identifier field, route key, role key, flow-state key, permission
resource, price field, and visual component variant.

Parameter values are canonicalized before they enter the immutable lock. A
binding cannot contain a source path, URL, executable code, secret, or an
undeclared Graph mutation.

### Closed composition-binding grammar

`factory.composition/v1` bindings are a constrained configuration channel, not
a transport for requirement text, page copy, source, commands, credentials, or
raw model material. A binding value is only one of:

- a finite number;
- a boolean; or
- an exact Factory Graph symbol object.

Free-form string values are deliberately excluded. Current Golden packages use
Graph symbols for route, entity, role, state, permission, and component
references; they do not require a free-text composition value. User-visible
labels, messages, descriptions, and page copy remain PageModel component props
and are validated as Draft page content rather than being package-selection
inputs. This distinction lets a user write `Make a reservation` on a page
without allowing the composition channel to store `process.env.SECRET`, an API
key, a SQL statement, a shell command, or a raw model prompt.

If a future package needs a literal finite choice, it must introduce a new
declared enum-parameter contract with a manifest-owned allowed-value set and
validation before every Draft write. It must not reopen arbitrary strings in
`factory.composition/v1`.

### Graph contributions

Packages declare additive contributions to Domain, Policy, Flow, Page,
Integration, fixtures, and journey tests. A contribution has an asset-local
identifier, output slot, declared parameter references, and a deterministic
merge operation. Contributions describe facts such as:

- `commerce.catalog` provides a product entity, category relation, browse
  route, and product-read permission;
- `commerce.cart` requires a catalog item interface and provides cart state,
  line quantity and note interactions, and checkout input;
- `core.audit` requires an auditable event surface and adds audit effects and
  evidence expectations.

Contributions may add a declared Graph object or extend an explicitly
extensible collection. They never replace an existing object silently.

### Executable target contributions

For every advertised target slot, a package owns a digest-verified template or
artifact contribution. Initial target slots are:

```text
web.component       web.route          web.navigation
api.router           api.service        database.schema
database.migration   flow.handler       policy.rule
test.fixture         test.journey       docs.section
```

Every contribution declares its safe generated namespace, target runtime
interface version, input contract, output digest, ordering requirements, and
merge protocol. The generic compiler loads these declarations; it must not use
profile names or hard-coded package version switches to locate behavior.

### Requirements and provides

Packages expose typed interfaces and effects, and require typed interfaces
from other packages. Resolution is exact and deterministic: a requirement has
one provider unless its contract explicitly permits a named multi-provider
merge. Conflicting route, entity, API, policy, migration, or template targets
fail before a Draft is created or a Published revision is compiled.

### Immutable composition lock

Publishing produces `factory.composition/v1` alongside the Published Graph:

```text
applicationGraphChecksum
packages: key, version, packageRoot, manifestDigest
canonicalParameters
resolvedContributionDigests
providedAndRequiredInterfaces
targetRuntimeInterfaceVersions
resolvedDependencyOrder
```

The Control Plane and Worker independently verify this lock. Compilation never
reads a mutable Draft, floating package version, external source, or model
selected path.

## Safety and failure rules

- Golden lifecycle, exact package identity, package-relative safe paths,
  content digests, and package-local fixtures/tests remain mandatory.
- A package may write only a declared target namespace. It cannot replace
  compiler roots, registries, Compose topology, or another package's files.
- A target collision, missing requirement, incompatible interface version,
  failed package verification, invalid parameter, unsigned/non-Golden package,
  or undeclared merge fails closed before generation.
- The model may propose a mutable Graph Diff and desired capability intent.
  It cannot provide package identities, free-text composition parameters,
  paths, URLs, arbitrary source, secrets, runtime commands, raw prompts,
  raw responses, or deployment targets.
- Raw model prompts, responses, and credentials remain process-local and are
  not stored in Graphs, locks, artifacts, tests, logs, screenshots, or reports.

## Puck PageModel adapter

Puck Core is a visual editor adapter, not the PageModel source of truth.

Factory supplies a Puck configuration created from selected `web.component`
packages and the current PageModel. It exposes only approved component types,
typed props, design-token controls, route references, responsive constraints,
and interaction bindings. Puck output is translated back to a candidate
PageModel change, validated against component schemas and route rules, then
saved only in the mutable Draft.

The route registry, navigation graph, role visibility, capability effects,
data binding, authorization, and published provenance remain Factory-owned.
A link can bind only to a declared route key; it cannot introduce arbitrary
URLs. A visual edit cannot create an API effect or change policy/flow/domain
objects.

Puck AI Cloud is not a required runtime dependency for v1. Factory's own AI
adapter proposes Graph Diffs and package intent. A future Puck AI provider may
generate PageModel candidates only after a separate privacy, credential, and
source-study decision.

## Half-hour prototype golden path

1. User describes outcome, actors, records, rules, and preferred experience.
2. Factory generates a Draft Graph proposal and a package composition proposal.
3. The user reviews a concise capability, data, route, and role summary; the
   default design system already produces a coherent visual baseline.
4. The user may edit pages visually or select an experience theme. Factory
   validates each Draft edit.
5. Publishing freezes Graph, package versions, parameter bindings, and
   contribution digests.
6. The Worker compiles a simulator and an isolated Web/API/PostgreSQL/test
   bundle, then returns bounded evidence and preview status.
7. The user runs role journeys, changes the Draft for a next version, and
   later promotes the same immutable artifact to governed environments.

The target is a real local prototype in roughly thirty minutes for supported
profiles and approved packages. It is not a claim that arbitrary integrations,
regulated requirements, real payment credentials, cloud production approval,
or data migration complete automatically in that time.

## Migration sequence

### Phase 1: Composition kernel

Add the composition schemas, parameter validator, contribution verifier,
dependency resolver, collision rules, canonical lock, and fail-closed tests.
Keep current full starter Graphs only as read-only migration fixtures. No new
Restaurant business capability is added in this phase.

### Phase 2: Shared commerce proof

Convert `core.crud`, `core.audit`, `core.notification`, `core.workflow`,
`commerce.catalog`, `commerce.cart`, `commerce.inventory`, `commerce.order`,
and `commerce.simulated-payment` to declared Graph and executable target
contributions. Compile Restaurant and Simple Ecommerce using identical shared
package versions with different bindings. Prove their package identity is the
same while their routes, labels, fields, roles, schema, and UI outputs differ.

### Phase 3: Puck and simulator

Add PageModel-to-Puck and Puck-to-candidate-PageModel round trips, visual token
editing, route-safe navigation, responsive preview, and role-aware simulator
journeys. Publishing remains explicit; no visual edit publishes or compiles
automatically.

### Phase 4: Remove Restaurant fork

Move table session, menu, ordering, kitchen, cashier, and reporting behavior
into parameterized assets. Remove `restaurant-ordering` compiler branches and
the monolithic profile validator. Preserve Restaurant and Ecommerce generated
journeys as regression proofs through the generic target loader.

### Phase 5: Broaden profiles through governed source studies

Create source studies before any external adoption. MIT Medusa is a possible
commerce-provider and modular-commerce reference; MIT TastyIgniter and MIT
Kasirku are Restaurant workflow/interaction references; BSD-3 Saleor is a
commerce architecture reference. These projects are not copied into Factory
and do not become Golden packages without a fixed commit, compatible notices,
isolated adapter decision, fixtures, verification evidence, and approval.
GPL/AGPL sources remain reference-only or excluded according to their terms.

## Acceptance evidence

Composition v1 is accepted only when all of the following are true:

- A package has physical, versioned Graph and target contributions, parameter
  schema, dependencies, fixtures, tests, verification evidence, and a digest.
- Invalid parameter values, missing providers, target collisions, tampered
  content, undeclared writes, non-Golden lifecycle, and incompatible interface
  versions are rejected before any output is generated.
- Restaurant and Ecommerce lock the same shared package versions, have
  different canonical bindings, and compile to different validated schema,
  route, UI, API, and journey artifacts.
- The compiler contains no Restaurant-profile target branch for migrated
  behavior; packages provide all migrated target contributions.
- Puck round trips retain only approved PageModel changes and reject arbitrary
  routes, effects, source, URLs, and undeclared props.
- Each Profile's immutable Published Graph generates a runnable Node 22
  Web/API/PostgreSQL bundle, simulator, tests, documentation, and exact
  preview cleanup evidence.

## Non-goals

- No arbitrary package marketplace, external package download, runtime plugin
  execution, source reverse parsing, or free-form code generation.
- No automatic production cloud deployment, real payment processing, or
  ungoverned third-party connection in the half-hour prototype claim.
- No fallback to profile-specific compiler code after a behavior is migrated
  into a package contribution.
