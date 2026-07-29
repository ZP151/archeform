# Factory Pilot roadmap

## Foundation

- Establish the TypeScript monorepo and local Docker Compose services.
- Define `ApplicationGraphV1`, validation, drafts, publishing, and immutable
  compilation records.

## Graph Studio

- Add Page, Domain, Flow, Policy, AI, Code, and revision-timeline workspaces.
- Prove Puck and React Flow round trips without making either library the source
  of truth.

## Guided application creation

- Let a business user choose an accepted application outcome, name it, set its
  experience mode, review its bounded Graph shape, and create a new mutable
  Draft without editing Graph JSON.
- Use a left-side three-step creation drawer; it must never publish, compile,
  invoke a model, or bypass the Control Plane Graph validation boundary.
- Continue from the new Draft in Page, Domain, Flow, Policy, AI, and Code
  Studio before the user explicitly publishes it.
- Add constrained capability composition before Draft creation. Profile recipes
  expose only verified optional capabilities and deterministically remove their
  declared Graph projections when the user turns them off.

## Compiler and capabilities

- Compile published Graphs into the simulator, generated Web/API/database,
  policy, flow handlers, tests, and docs.
- Provide CRUD, audit, notification, workflow, catalog, cart, order, inventory,
  and simulated-payment capabilities.

## Independent profiles

- Expense Approval: submit, approve/reject, and audit.
- Restaurant Ordering: menu, cart, payment simulation, and kitchen status.
- Simple Ecommerce: catalog, checkout, inventory update, payment simulation,
  and order lifecycle.

## Ecosystem

Factory Pilot adopts external open-source projects through explicit roles, not
as competing sources of business truth. The adoption register is maintained in
[`ecosystem/open-source-adoption.md`](ecosystem/open-source-adoption.md).

### Direct dependencies

- Puck supplies the Page Studio canvas.
- React Flow supplies Flow, relation, dependency, and lineage canvases.
- XState executes compiled FlowModel state machines.
- Prisma supplies generated PostgreSQL schemas, migrations, and typed access.
- node-casbin supplies generated policy enforcement.

### Controlled future adapters

- Blockly and bpmn-js may become authoring adapters once their output is
  constrained to the Factory FlowModel.
- Appwrite, Medusa, and OpenFGA are runtime providers behind versioned
  contracts; none is a v1 runtime dependency.

### Study-only references

- Amplication is studied for generator, plugin, and Git-sync patterns under a
  source-study record. Its `ee/` tree is excluded.
- Vendure is a read-only commerce architecture reference. Its GPLv3 code is
  never copied or embedded unless Factory Pilot is deliberately relicensed.

Every new dependency, snapshot, or copied source fragment must pass the
license, provenance, security, and adapter-boundary gates before it reaches a
Factory package. Graph-first Git export/import, provider contracts, and
third-party notices precede optional provider runtime integration.
