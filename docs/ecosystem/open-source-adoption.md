# Open-source adoption register

## Purpose

This register turns the Application Graph ecosystem decision into an executable
adoption policy. Factory Pilot can use mature open-source software, reuse
legally compatible code after a focused source study, and integrate providers
through contracts. It does not vendor whole products or delegate ownership of
business semantics to third parties.

`ApplicationGraphV1` remains the only product source of truth. Every library,
provider, snapshot, or copied fragment must map to a bounded Graph input or
output and must pass the intake gates below.

## Adoption classes

| Class | What may enter the repository | What must not happen |
| --- | --- | --- |
| **Direct dependency** | A pinned package dependency, a Factory adapter, tests, and its notice. | Library data becomes a stored Graph or bypasses Draft -> Publish -> Compilation. |
| **Provider contract** | A versioned TypeScript contract, fixture provider, conformance tests, and optional provider adapter. | A provider SDK/service becomes required for v1 or defines Factory business semantics. |
| **Source study** | An immutable upstream commit record and, only after approval, the identified compatible fragment with notices. | Entire repositories, unreviewed examples, or excluded licence areas are copied. |
| **Reference only** | Design notes and independently written Factory code. | Source, generated output, packages, assets, or runtime are copied or embedded. |

## Approved ecosystem map

| Project | Class | Factory role | First delivery slice | Source rule |
| --- | --- | --- | --- | --- |
| [Puck](https://github.com/puckeditor/puck) | Direct dependency | Page Studio canvas. Factory maps `PageModel` to a Puck document and back. | Current Graph Studio | Pin `@puckeditor/core`; retain its MIT notice. Do not persist Puck data as the Graph. |
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | Direct dependency | Flow, relation, lineage, and dependency canvases. | Current Graph Studio | Pin `@xyflow/react`; adapters accept only declared FlowModel nodes, events, guards, and effects. |
| [XState](https://github.com/statelyai/xstate) | Direct dependency | Compiler target for declared state machines and generated flow handlers. | Compiler core | Pin `xstate`; compile FlowModel only, never arbitrary actions or executable code from an editor. |
| [Prisma](https://github.com/prisma/prisma) | Direct dependency | DomainModel to PostgreSQL schema, migrations, seed data, and typed access. | Compiler core | Pin Prisma packages; generate project-local schema and migrations from Published Graphs only. |
| [node-casbin](https://github.com/apache/casbin-node-casbin) | Direct dependency | PolicyModel to Casbin model/policy and generated NestJS guards. | Compiler core | Pin `casbin`; compile roles/resources/actions from PolicyModel, not free-form policy files. |
| [Blockly](https://github.com/RaspberryPiFoundation/blockly) | Provider contract | Optional visual Flow authoring adapter. | After Flow Studio acceptance | Use only when blocks serialize into a restricted Factory Flow DSL; no JavaScript/Python code generation or execution. |
| [bpmn-js](https://github.com/bpmn-io/bpmn-js) | Provider contract | Optional BPMN import/export and diagram adapter. | After Flow Studio acceptance | BPMN is translated to declared FlowModel elements; unsupported constructs fail closed. |
| [GrapesJS](https://github.com/GrapesJS/grapesjs) | Provider contract | Possible non-React page/asset import adapter. | Deferred | It may not replace PageModel or introduce arbitrary script/style execution. |
| [Appwrite](https://github.com/appwrite/appwrite) | Provider contract | Future backend/runtime provider. | Deferred after native Nest/Prisma output works | Factory owns the Graph mapping and provider metadata. No v1 dependency or reverse parsing of Appwrite applications. |
| [OpenFGA](https://github.com/openfga/openfga) | Provider contract | Later fine-grained authorization provider. | Provider-contract milestone | Define contract and conformance fixtures first; the Casbin compiler remains the v1 baseline. |
| [Amplication](https://github.com/amplication/amplication) | Source study | Study generator, plugin, template, and Git-sync patterns. | Ecosystem study milestone | Never consume `ee/`. A copied fragment requires a separate immutable-commit source-study record and confirmed compatible licence. |
| [Medusa](https://github.com/medusajs/medusa) | Provider contract and source study | Later commerce provider; inspiration for bounded catalog/cart/order integrations. | After Simple Ecommerce independent acceptance | v1 implements Factory-owned minimal commerce capabilities. Do not make Medusa a dependency until a provider contract and conformance suite pass. |
| [Vendure](https://github.com/vendurehq/vendure) | Reference only | Commerce architecture and plugin-boundary study. | Read-only research | GPLv3 source, packages, generated output, and runtime are excluded unless Factory Pilot is intentionally relicensed GPLv3. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Source study | Candidate component primitives for the Factory Workbench and generated-app design systems. | Workbench design-system slice | Each selected component requires an exact version/source record, compatible notice, accessibility test, and Factory-owned wrapper. |

The listed Puck, React Flow, XState, node-casbin, OpenFGA, Blockly, Amplication,
Medusa, and Vendure repositories are maintained public projects whose stated
roles and licence information must be rechecked at the exact adopted release
or commit. Puck documents that it is a React/Next-compatible visual editor
that leaves data ownership with the host, which matches the Factory adapter
boundary. [Puck repository](https://github.com/puckeditor/puck) React Flow is
an MIT-licensed node-based UI library, and XState is an MIT-licensed
TypeScript state-machine solution; both fit direct, bounded use. [React Flow
repository](https://github.com/xyflow/xyflow) [XState
repository](https://github.com/statelyai/xstate) Casbin and OpenFGA publish
Apache-2.0 licences. [node-casbin repository](https://github.com/apache/casbin-node-casbin)
[OpenFGA repository](https://github.com/openfga/openfga) Blockly publishes an
Apache-2.0 licence and is therefore a candidate editor adapter rather than a
code generator. [Blockly repository](https://github.com/RaspberryPiFoundation/blockly)

## Source intake gate

Before any external code or provider is introduced, create a record at:

```text
docs/ecosystem/source-studies/<publisher>-<repository>-<commit>.md
```

The record must include all of the following:

1. Canonical repository URL, immutable commit SHA, retrieval date, and the
   licence text or authoritative licence URL at that commit.
2. Exact source paths and line ranges inspected or copied; an empty list means
   the study is reference-only.
3. The Factory interface that owns the integration, input/output schemas, and
   why a published package alone is insufficient when source copying is
   proposed.
4. A licence compatibility decision, notice obligations, security scan result,
   dependency/SBOM impact, and upstream attribution location.
5. Focused tests showing the adapter or copied fragment cannot mutate a
   Published Revision, introduce arbitrary executable effects, or leak
   credentials/AI payloads.
6. A removal or replacement path, so the external project cannot become a
   hidden platform dependency.

An intake is rejected when the commit cannot be fixed, licensing is unclear or
incompatible, a provider alters Factory-owned semantics, a source fragment is
larger than the stated purpose, or an adapter lets user-controlled code, URLs,
secrets, SQL, or provider configuration run without Graph validation.

## Ecosystem directory topology

The repository should add the following only as each intake passes its gate:

```text
ecosystem/
  sources/<publisher>/<repository>/<commit>/
  adapters/<provider>/<version>/
  contracts/<capability>/<version>/
  fixtures/<provider>/<version>/
  candidates/<package>/<digest>/
  evidence/<package>/<digest>/
docs/ecosystem/source-studies/<publisher>-<repository>-<commit>.md
docs/third-party-notices.md
```

`ecosystem/sources` is an immutable research snapshot, never an import path for
the Factory runtime. `adapters`, `contracts`, and `fixtures` are Factory-owned
code and contracts. `candidates` and `evidence` remain quarantined until their
reviewed package can become an approved capability or provider.

## Delivery order and acceptance gates

1. **Direct Graph toolchain.** Keep Puck, React Flow, XState, Prisma, and
   Casbin as pinned dependencies with adapters/compiler tests and third-party
   notices. Acceptance: Page/Flow round trips, deterministic Prisma/Casbin/
   XState output, and no external format in persisted Graph data.
2. **Native three-profile proof.** Deliver Expense Approval, Restaurant
   Ordering, and Simple Ecommerce from Factory-owned capabilities. Acceptance:
   each Published Graph independently produces a simulator, Web/API/database,
   policy, flow, tests, and docs bundle.
3. **Authoring adapters.** Evaluate Blockly, bpmn-js, and GrapesJS with
   contract-only prototypes. Acceptance: unsupported constructs fail closed;
   round trips preserve Graph semantics; no generated arbitrary code runs.
4. **Provider contracts.** Add OpenFGA and Appwrite contracts with fixture
   providers. Acceptance: Factory can swap fixtures without a Graph change and
   no provider is required to compile native targets.
5. **Source studies.** Create the Amplication study, then a Medusa provider
   study/contract. Acceptance: exact commits and licence evidence, selected
   patterns documented, and no prohibited directories or source reaches the
   runtime.
6. **Optional runtime providers.** Activate a provider only behind a dedicated
   profile and its own acceptance suite. Vendure stays excluded unless a future
   relicensing decision explicitly changes this policy.

## Non-negotiable protections

- No whole-repository copy, Git submodule, or vendored external application in
  `apps/` or `packages/`.
- No licence, provider, or UI project may replace Factory's Graph as the source
  of truth.
- No external editor output may invoke arbitrary code, database queries,
  network calls, URLs, webhooks, or credentials.
- No source reuse happens without the source-study record, tests, and notices.
- No real-model credential, raw prompt, or raw response enters an ecosystem
  snapshot, fixture, report, runtime state, or generated artifact.
