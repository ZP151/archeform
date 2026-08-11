# Product Builder UI Ecosystem Study

Date: 2026-08-10
Status: Adopted as product and dependency guidance
Scope: public product patterns and first-party documentation only

## Research question

Which public product-builder patterns and UI ecosystems can shorten Archeform's
path from a natural-language requirement to a polished, editable,
runnable product without weakening Application Graph authority or importing
unclear licensing obligations?

## Decision summary

| Source        | Adopt now                                                                                                                                             | Adopt later                                                    | Reject or constrain                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Base44        | Prompt-first creation, live preview, contextual edit, business-facing Data/Users, code visibility, ZIP/Git, publish-oriented information architecture | Deeper operational dashboard ideas after restaurant closure    | Closed product: copy no source, assets, prompts, schemas, tokens, or brand                                       |
| shadcn/ui     | Pin and vendor the Radix-based open source components Archeform actually uses; run a private registry for primitives and business blocks              | Expand only through reviewed registry items                    | Do not ingest the public directory indiscriminately                                                              |
| Aceternity UI | Visual reference and isolated candidate intake only                                                                                                   | A candidate may graduate after item-level evidence             | No Pro/template redistribution; no item with ambiguous terms; avoid motion-heavy default product UI              |
| Figma MCP     | No runtime dependency                                                                                                                                 | Optional design import/export adapter after restaurant closure | Figma data never becomes Graph authority; account/catalog/beta constraints are unacceptable on the critical path |
| Google Stitch | Design exploration and `DESIGN.md` research                                                                                                           | Optional design-brief adapter if a stable contract emerges     | No runtime dependency; generated code does not bypass Archeform contracts or provenance                          |

## Base44: product-pattern reference, not a code source

Base44's public documentation demonstrates a coherent three-part working area:
AI chat, live preview, and application dashboard. Its documented journey also
includes visual editing, data and access management, file/code visibility,
ZIP export, GitHub synchronization, version history, and publishing.

These patterns support the Archeform journey:

```text
Apps -> Describe -> Building / Live Preview -> Edit -> Publish
```

Archeform should learn the information architecture, progressive disclosure,
and low-friction iteration loop. Archeform must implement them independently:
Base44 is a closed commercial product and is not a permitted source of code,
assets, hidden prompts, schemas, design tokens, or backend behavior.

Archeform-specific adaptations:

- Graph remains the hidden source of truth while Base44-style product surfaces
  use business language.
- Chat proposes validated Graph changes rather than directly mutating runtime
  source.
- Source remains derived output with controlled overlays.
- Publish always binds an immutable Graph revision before compilation.
- Activity and evidence remain redacted, bounded, and Advanced by default.

### Verified Base44 product anatomy

The following model separates facts documented by Base44 from Archeform's own
product inference.

| Plane                      | Publicly documented or screenshot-visible Base44 behavior                                                                                                                                   | Archeform inference                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace home             | Prompt entry, existing apps, recent work, search, templates, and a reusable workspace context                                                                                               | Make creation and resumption the home-page jobs; do not expose Graph setup here                                                                                    |
| App editor                 | Three primary areas: AI chat, live preview, and app dashboard; a top bar exposes Preview, Dashboard, Code/testing actions, and Publish                                                      | Keep one persistent creation context instead of sending the user through separate technical steps                                                                  |
| AI collaboration           | Default applies a request, Discuss explores before applying, and Edit targets visible elements; earlier work can be reverted                                                                | Archeform chat should produce reviewable Draft operations, retain checkpoints, and scope visual edits to selected Graph-backed blocks                              |
| Preview and visual editing | Preview behaves like the app, supports device checks, and permits selected-element changes to color, spacing, layout, classes, or AI-assisted restyling                                     | Treat the preview as the primary feedback surface and synchronize selection with Page, Data, Workflow, Experience, and Source context                              |
| App dashboard              | Data, access/users, analytics, integrations, security, code/functions, logs, settings, and publishing controls are separated from the creation canvas                                       | Put operational and technical configuration in an application-scoped management surface, not in the default build journey                                          |
| Data and identity          | Managed entities, record editing/import/export, authentication, roles, row/field access, and production/test data are available without requiring infrastructure setup                      | Default to business entities, users, roles, and scenarios; keep Prisma, SQL, Casbin, migrations, and runtime topology in Advanced                                  |
| Backend behavior           | Managed NoSQL entities, auth, TypeScript serverless functions, realtime subscriptions, automations, connectors, secrets, hosting, and logs                                                  | Do not copy the BaaS architecture; map the same user jobs to Graph contracts, generated NestJS/PostgreSQL applications, capability effects, and providers          |
| Code                       | Generated React/Vite/Tailwind/shadcn source is visible; code editing, request monitoring, GitHub connection, and local ejection are documented                                              | Keep complete source visibility, provenance, diff, ZIP, and Git while preserving Graph-first regeneration and controlled overlays                                  |
| Templates                  | Public and workspace templates can be browsed and copied into an independent workspace; installed copies can be renamed and edited, and later template changes do not alter existing copies | Start with curated first-party published Recipe/Graph revisions that instantiate independent Drafts with origin metadata, seed scenarios, and an immediate preview |
| Test and publish           | Role simulation, test data, security checks, preview, visibility, custom domains, sharing, and publish are grouped around release                                                           | Deliver only working controls; add deployment, domains, analytics, and fleet surfaces when their providers are implemented                                         |

### Information-architecture lesson

Base44's strongest pattern is progressive disclosure across three stable
contexts, not its exact sidebar labels:

```text
Workspace Home
  create from prompt | start from template | resume an app

Builder Workspace
  AI conversation | live preview | contextual visual edit | publish

App Management
  overview | data | users | workflows | integrations | security | code | logs | settings
```

Archeform will adopt these context boundaries and implement them with its own
navigation, components, contracts, and visual identity. The Builder remains
the primary surface. App Management is opened for an application and never
interrupts the default prompt-to-preview sequence.

The first iteration must not create inactive navigation for Base44 features
that Archeform has deferred. Marketing/SEO, marketplace commerce, Agents, MCP,
custom domains, production analytics, cloud operations, and fleet controls
remain absent until they have real backing behavior.

### Template-clone decision

Archeform v1 templates are curated first-party assets only. A template descriptor
binds a Published Graph revision, Product Recipe, Experience Recipe, capability
versions, seed scenarios, preview images, categories, and acceptance journeys.
Using a template creates a new application-owned Draft and Draft Preview
Snapshot. The clone keeps origin and version metadata, but it is independent:
future template releases never mutate or automatically merge into installed
applications. Secrets, credentials, provider accounts, and private evidence
are never cloned.

### Architectural effect on Archeform

The useful Base44 lesson is not a sidebar skin. Its functions form a transition
system in which context persists while the user moves from intent to preview,
targeted edit, management, and release. Archeform therefore treats these as
separate but linked product contexts:

- Workspace Home owns discovery, prompt/template creation, and resumption;
- Builder Workspace owns the continuing conversation, build activity, preview,
  selected-element editing, undo checkpoints, and Publish;
- App Management owns data, people/access, workflows, integrations, security,
  source, logs, and settings for one application;
- a shared application/revision selection links the contexts, while navigation
  and panels remain context-specific;
- every visible action has loading, success, empty, error, denied, and recovery
  behavior; deferred features do not appear as decorative navigation.

This means the current always-present icon rail, generic canvas, open Inspector,
technical lifecycle labels, and disconnected recent-product cards cannot be
fixed by colors alone. The Workbench needs context-owned shells, navigation,
controllers, styles, and data clients.

### Bulk UI assembly decision

Archeform will scale its visual and business surface through registries and
recipes rather than generating each page manually:

```text
ui-primitives -> ui-patterns -> workbench-ui / generated-ui
              -> screen-recipes -> experience-recipes -> product-recipes
```

Registry intake can be batched only when each asset has a stable version,
source/license record, schema, slots/nesting contract, bindings, responsive
variants, complete states, accessibility evidence, fixtures, interaction
tests, and screenshots. A screen recipe assembles several business blocks into
a coherent page; a product recipe selects compatible screens and capabilities.
The model chooses bounded recipes and parameters, while deterministic tooling
resolves source and rejects missing dependencies or invalid composition.

First-party sources:

- Base44 quick start and editor overview:
  https://docs.base44.com/Getting-Started/Quick-start-guide
- Base44 code editing and split preview:
  https://docs.base44.com/documentation/building-your-app/editing-code
- Base44 data management:
  https://docs.base44.com/Building-your-app/Managing-your-app-data
- Base44 access and role testing:
  https://docs.base44.com/Setting-up-your-app/Managing-access
- Base44 GitHub integration:
  https://docs.base44.com/developers/app-code/local-development/github
- Base44 AI chat and visual-edit modes:
  https://docs.base44.com/Building-your-app/AI-chat-modes
- Base44 application templates:
  https://docs.base44.com/Getting-Started/App-templates
- Base44 backend capabilities:
  https://docs.base44.com/developers/backend/overview/features
- Base44 automations:
  https://docs.base44.com/Building-your-app/Creating-automations
- Base44 integrations and connectors:
  https://docs.base44.com/Integrations/Using-integrations
- Base44 security overview:
  https://docs.base44.com/Setting-up-your-app/security-overview
- Base44 test-data environments:
  https://docs.base44.com/documentation/managing-app-data/testing-your-data
- Base44 analytics:
  https://docs.base44.com/documentation/performance-and-seo/app-analytics
- Base44 developer architecture:
  https://docs.base44.com/developers/app-code/overview/introduction

## shadcn/ui: approved primary source foundation

The shadcn/ui repository describes itself as open source and open code, and is
licensed under MIT. Its registry documentation explicitly supports distributing
custom components, hooks, pages, configuration, rules, and other files to
projects. That source-distribution model fits Archeform's requirement that a
generated application be standalone, inspectable, and exportable.

Adoption rules:

1. Pin the upstream release or commit for every intake batch.
2. Retain the MIT notice and a source-study/provenance record.
3. Copy only reviewed components that Archeform uses into
   `packages/ui-primitives`.
4. Normalize them behind Archeform tokens, accessibility rules, and component
   tests.
5. Publish Archeform-owned primitives and business blocks through a private
   registry manifest; the registry is distribution metadata, not Graph truth.
6. Generated projects receive only their selected source files and license
   notices.

First-party sources:

- Repository and MIT license: https://github.com/shadcn-ui/ui
- Registry introduction: https://ui.shadcn.com/docs/registry
- Registry schema: https://ui.shadcn.com/docs/registry/registry-json

## Aceternity UI: quarantine because redistribution rights differ

Aceternity presents free copy-paste components alongside paid blocks and
templates. Its Pro license permits use in end products but prohibits source
redistribution, marketplace distribution, and template creation. Its general
site terms also reserve intellectual-property rights unless otherwise stated.
Those conditions conflict with Archeform's generated-source distribution model
unless an individual candidate carries a separately verified permissive
license.

No Aceternity material is approved for the runtime or generated registry by
brand association alone. Every candidate requires:

- exact item URL, source origin, version or retrieval date, and digest;
- a license file that explicitly covers the candidate source and redistribution;
- separation from Pro, paid blocks, templates, branded assets, and unclear
  derivatives;
- dependency and bundle analysis;
- reduced-motion, keyboard, focus, contrast, and axe checks;
- proof that removal does not break a page recipe.

The default product style should not depend on animated backgrounds, parallax,
3D effects, or cursor-following motion. Restaurant interactions prioritize
clarity, tactility, imagery, and transaction feedback.

First-party sources:

- Components catalogue: https://ui.aceternity.com/components
- Pro license: https://ui.aceternity.com/licence
- Site terms: https://ui.aceternity.com/terms

## Figma MCP: valuable future adapter, wrong critical-path dependency

Figma's official MCP server can provide design context to agents, write native
Figma content, generate code from selected frames, extract variables and
components, and use Code Connect to map design-system components. The
documentation also states that the feature is beta/usage-bound and that only
catalogued clients can connect.

This is useful after Restaurant Product closure for optional workflows:

- import a design brief, tokens, component references, and selected frame
  hierarchy into a reviewable Graph Diff;
- export Archeform experience tokens and surface compositions to native Figma
  content;
- map Archeform primitives through Code Connect.

It is excluded now because the critical prompt-to-product path must remain
local, deterministic, and independent of Figma access. Figma frames, variables,
or code remain adapter input, never Application Graph authority.

First-party source:

- Figma MCP introduction:
  https://developers.figma.com/docs/figma-mcp-server/

## Google Stitch: design exploration, not product compilation

Google describes Stitch as an experimental AI UI tool that accepts natural
language and image input, generates UI and frontend code, supports rapid
variants, can transfer designs to Figma, and can export frontend code. More
recent public material describes interactive prototypes and a portable
`DESIGN.md` draft format.

Archeform may use Stitch outside runtime to explore Fine Dining compositions or
compare visual directions. Any selected design must be re-expressed as a
Archeform `ExperienceBriefV1`, experience recipe, approved UI blocks, and tests.
Stitch output cannot be copied directly into production without dependency,
license, provenance, accessibility, and Graph-binding review.

First-party sources:

- Google Developers introduction:
  https://developers.googleblog.com/en/stitch-a-new-way-to-design-uis/
- Google Labs product update:
  https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/
- Google Labs `DESIGN.md` announcement:
  https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/

## Resulting Archeform source policy

```text
Public product behaviour
  -> document as an independently implemented interaction pattern

Permissively licensed source
  -> pin -> scan -> test -> retain notice -> normalize -> internal registry

Commercial, mixed, or unclear source
  -> quarantine -> item-level legal and technical evidence -> explicit approval

Design-tool output
  -> reviewable adapter input -> Archeform Graph/Recipe -> deterministic compiler
```

The fastest defensible path is therefore not wholesale repository copying. It
is a small, pinned primitive base plus deep Archeform-owned business blocks and
recipes. This yields polished defaults while keeping generated source portable,
licensed, testable, and compatible with Graph recompilation.
