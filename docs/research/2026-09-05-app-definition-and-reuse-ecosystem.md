# App Definition and Reuse Ecosystem Research

Date: 2026-09-05.
Status: public-source research and engineering recommendations; no adoption.

## Decision investigated

Which existing products, standards, and components can reduce an ordinary
person's effort from an imprecise request to a complete, responsive, usable,
hosted application? Can Archeform build hundreds to thousands of detailed
product definitions without maintaining hundreds of unrelated application
stacks or making users manage development iterations?

The founder's correction is the governing product intent. The previous
technical-evaluator and repeated-user-editing emphasis is superseded by
`docs/iterations/2026-09-05-consumer-app-generation-reset.md`.

Research used official documentation, public repositories, current license
files, and one published research preprint. No package, source, account,
provider, model run, deployment, or paid service was installed or activated.
License descriptions are triage facts, not blanket reuse approval. Branch-tip
observations are not immutable version pins; adoption must select an exact
published version or source commit and applicable paths.

## What already exists locally

Read-only inspection on the root checkout at `48d5c5fb` found:

| Inventory                         | Verified quantity | Meaning                                                                                                                                                                                       |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External portfolio source records | 43                | `ecosystem/portfolio/2026-07-30-external-business-logic.json`, `sources.length`; research references, not installed modules.                                                                  |
| Portfolio scenario records        | 108               | Same file, `scenarios.length`; current file count, not the older prose claim of 122 and not deployable templates.                                                                             |
| Current capability asset entries  | 27                | Explicit `currentCapabilityAssets` array in `packages/capabilities/src/assets/index.ts`; versions in the historical array are excluded.                                                       |
| Enumerated profile recipes        | 5                 | Expense approval, restaurant ordering, simple ecommerce, retail counter, grocery pickup in `packages/capabilities/test/profile-catalog.test.ts`; not five equally complete consumer products. |
| Official Home template entries    | 1                 | `TemplateService.listCuratedTemplates()` returns one Restaurant definition; the template key and response type are fixed to it.                                                               |
| Managed deployment workflow       | Not implemented   | Current delivery policy explicitly defers managed deployment; local preview and repository release do not supply a hosted application.                                                        |

Existing useful foundations include typed requirement interpretation,
clarification/default handling, deterministic composition planning, dependency
closure, Graph, immutable lifecycle, UI registries, and generated verification.
The main gap is the connected product path from a broad intent to an eligible
complete blueprint, through automatic completion and hosted delivery.

## Market observations

| Primary source                                                                      | Observed fact                                                                                                         | Archeform inference                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Replit custom templates](https://docs.replit.com/teams/custom-templates)           | Enterprise templates fork prepared files/configuration and can skip the planning phase.                               | Preparing implementation assets before a user arrives can reduce per-request planning; this is not evidence that arbitrary app requests need no validation.                                                    |
| [Base44 building an app](https://docs.base44.com/Getting-Started/Quick-start-guide) | Its documented product includes automatic hosting and shareable apps.                                                 | Hosting belongs in the product outcome, not in a developer setup guide. Base44 remains a product-pattern reference only, with no copied source, assets, prompts, or branding.                                  |
| [v0 full-stack apps](https://v0.app/docs/full-stack-apps)                           | It documents frontend/backend/database integration and an incremental workflow.                                       | A differentiated Archeform goal is to internalize routine completion and correction rather than require users to request each technical layer. This is our product hypothesis, not a measured competitive win. |
| [Prompt-to-product benchmark, v2](https://arxiv.org/abs/2512.18080v2)               | A study used 96 prompts and 288 artifacts and distinguished usability, perceived completeness, appearance, and trust. | Evaluate real user tasks and first-result usefulness; attractive screenshots are insufficient. Its historical platform ranking is not a current performance claim.                                             |

These sources support feasibility and relevant product patterns, not demand
size, purchase intent, or a measured first-pass success rate for Archeform.

## Business definition sources

All observations below were checked on 2026-09-05. Confidence is high for cited
document/license facts; estimated integration effort is an engineering judgment.
Definition extraction means independently authored entities, roles, rules,
journeys, and acceptance cases with source references. It does not mean copying
documentation wholesale or inferring an unobserved backend as proven behavior.

| Source and license evidence                                                                                                                                                                                                                                                  | Definition value                                                                                                                                                                                       | Proposed use and integration cost                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Cal.diy](https://github.com/calcom/cal.diy), [MIT license](https://raw.githubusercontent.com/calcom/cal.diy/main/LICENSE), [event types](https://cal.com/help/event-types/event-types)                                                                                      | Service/event type, resource availability, slots, booking, cancellation/rescheduling, team assignment. Cal.com documentation is a separate evidence source, not proof of feature parity with the fork. | High-priority scheduling definition study. The community fork is not the Cal.com production repository. Whole-runtime integration is medium/high cost; source fragments require an exact study.                                                               |
| [Twenty](https://github.com/twentyhq/twenty), [objects](https://docs.twenty.com/user-guide/data-model/capabilities/objects)                                                                                                                                                  | People, companies, deals, custom fields, table/kanban/calendar views, ownership and permissions.                                                                                                       | High-priority record-workspace semantics. Main product is AGPLv3 with commercial enterprise material and separately licensed named packages; no blanket MIT claim. Whole product integration is high cost despite TypeScript/Nest overlap.                    |
| [Medusa commerce modules](https://docs.medusajs.com/resources/commerce-modules), [root license](https://raw.githubusercontent.com/medusajs/medusa/develop/LICENSE), [enterprise exclusions](https://raw.githubusercontent.com/medusajs/medusa/develop/ENTERPRISE-LICENSE.md) | Product/variant, pricing, cart, order, inventory, fulfillment, payment, promotion and channel boundaries.                                                                                              | High-priority commerce definition source and possible narrow provider later. Current core is MIT except identified enterprise material, including RBAC/SSO paths. Importing the whole runtime would add another commerce authority and high integration cost. |
| [Saleor](https://github.com/saleor/saleor), [BSD-3-Clause license](https://github.com/saleor/saleor/blob/main/LICENSE)                                                                                                                                                       | Multichannel catalog, checkout, stock, fulfillment and extension boundaries.                                                                                                                           | Cross-check Medusa-derived semantics so the Graph does not mirror one vendor. Python runtime integration is high cost; companion repos need separate license checks.                                                                                          |
| [Chatwoot](https://github.com/chatwoot/chatwoot), [license](https://github.com/chatwoot/chatwoot/blob/develop/LICENSE)                                                                                                                                                       | Contact, inbox, conversation, assignment, status, notes, attachments and service roles.                                                                                                                | High-value support/service definitions. Non-enterprise code is MIT; enterprise paths are separately licensed. Rails/Vue integration is high cost; a provider is a later option.                                                                               |
| [Payload](https://github.com/payloadcms/payload), [collections](https://payloadcms.com/docs/configuration/collections)                                                                                                                                                       | Fields, relations, APIs, access control, uploads, hooks, versions and admin views.                                                                                                                     | Strong MIT TypeScript/Next configuration study. Possible constrained generated target only after comparison with existing Nest/Prisma adapters; medium/high cost and metadata-authority overlap.                                                              |
| [ERPNext](https://github.com/frappe/erpnext), [sales order](https://docs.frappe.io/erpnext/sales-order)                                                                                                                                                                      | Quote, order, delivery, invoice and payment lifecycle; stock and operational roles.                                                                                                                    | Domain reference for operations/procurement. GPL-3.0 product source is not admitted for embedding by this study; Python/Frappe stack and full accounting scope make whole integration high cost.                                                              |
| [Directus current license](https://raw.githubusercontent.com/directus/directus/main/license), [data model](https://docs.directus.io/app/data-model)                                                                                                                          | Collections, fields, relations, role/policy conditions, record layouts.                                                                                                                                | Reference only. Current main carries MSCL-1.0-GPL with a competing-use restriction and a later GPL grant; the earlier BSL description is historical. Do not select it as an embedded platform dependency on this evidence.                                    |

## Assembly and delivery candidates

| Candidate and primary evidence                                                                                                    | Effort it could remove                                                             | Recommendation and limit                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Puck](https://github.com/puckeditor/puck)                                                                                        | Existing page editing and component rendering adapter.                             | Keep the already-installed adapter; do not treat it as a new adoption or put its editor into the ordinary user's mandatory path. Its own data model must not replace Graph. MIT.                                                             |
| [shadcn registry](https://ui.shadcn.com/docs/registry/getting-started), [source](https://github.com/shadcn-ui/ui)                 | Prepared responsive blocks, pages, hooks and style/dependency manifests.           | First search existing Archeform assets. Then propose only a named missing asset with source provenance; MIT source distribution is not blanket approval for every community registry or premium kit. It does not provide business semantics. |
| [JSON Forms](https://jsonforms.io/), [source](https://github.com/eclipsesource/jsonforms)                                         | Schema-driven forms and conditional field layouts.                                 | Small proof-of-value candidate behind a Graph adapter. MIT. Measure custom renderer work and duplicate validation against existing forms before adopting; default Material renderers do not automatically fit the current design system.     |
| [Refine](https://github.com/refinedev/refine), [docs](https://refine.dev/docs/)                                                   | Record list/detail/edit, data provider and admin routing plumbing.                 | MIT; compare with current generated assets for one record-workspace target. Do not adopt a second universal app metadata model or make admin layouts every consumer app's shell.                                                             |
| [Better Auth](https://github.com/better-auth/better-auth), [Next integration](https://better-auth.com/docs/integrations/next)     | Sessions, sign-in and common account wiring.                                       | MIT candidate for a separately designed generated-app auth adapter. Establish app/platform identity separation first; no automatic auth replacement. External OAuth still requires provider setup.                                           |
| [Activepieces](https://github.com/activepieces/activepieces), [docs](https://www.activepieces.com/docs)                           | Connector and automation integration work.                                         | Community Edition MIT, enterprise commercial. Prefer a bounded provider adapter. Do not assume embedding/enterprise features, credential sharing, or white-label scope is included.                                                          |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev), [self-hosting](https://trigger.dev/docs/self-hosting/overview)       | Long-running app jobs and failure/retry visibility.                                | Apache-2.0; optional provider/reference. Existing BullMQ compilation remains; adding another queue/runtime is a separate decision, not required for the first consumer generation slice.                                                     |
| [Coolify](https://github.com/coollabsio/coolify), [API](https://coolify.io/docs/api-reference/api/applications/list-applications) | Builds, routing, health and deployment operations on prepared infrastructure.      | Apache-2.0 deployment-provider candidate. App generation may call a platform-managed provider; ordinary users should not install Coolify or manage VPSs. Requires explicit tenant, credential, persistence and operations decisions.         |
| [Vercel deployments](https://vercel.com/docs/deployments/overview), [REST API](https://vercel.com/docs/rest-api)                  | Managed frontend/Next deployment and preview URLs.                                 | Alternative provider candidate, not a universal fit for persistent Nest workers or arbitrary Compose stacks. Evaluate the actual generated runtime topology; do not silently replace it.                                                     |
| [Wasp Open SaaS](https://github.com/wasp-lang/open-saas)                                                                          | Example of integrated auth, payments, email, storage, jobs and deployment starter. | MIT reference/source study. Its Wasp framework would introduce a new application compiler/runtime model, so do not import the whole starter into Next/Nest by default.                                                                       |

Do not adopt all candidates. The first priority is existing assets, then one
measured form/record composition experiment if it saves work, and one deployment
adapter decision. Business-definition research can proceed without runtime
adoption or importing source through the blocked Candidate path.

## Standards help describe parts, not the complete product

[JSON Schema](https://json-schema.org/understanding-json-schema/reference)
describes/validates data shape;
[OpenAPI](https://www.openapis.org/what-is-openapi) describes APIs;
[Serverless Workflow](https://www.cncf.io/projects/serverless-workflow/)
provides a workflow DSL ecosystem. These can inform adapters and extraction.
None of the reviewed standards alone supplies a complete app's user intent,
responsive experience, permissions, business invariants, operating defaults,
deployment policy and acceptance journeys. No new schema/runtime is adopted.

## Recommended proof of value

1. Normalize a small batch from the existing 108 scenario records into detailed
   independent definitions. Mark each requirement as observed, inferred, or
   unknown and identify its exact existing or missing executable capability.
2. Demonstrate one appointment, one approval/intake, and one ordering app from
   rough descriptions through the same low-effort entry flow. No developer
   editor or manual code repair is part of the success path. These are distinct
   business semantics, not three themes for the Restaurant template.
3. Benchmark existing form/record assets against one candidate on identical
   generated Graph data. Compare implementation saved, bundle/runtime impact,
   accessibility, binding correctness, and maintenance; reject the addition if
   it creates more adaptation than it removes.
4. After the necessary architecture decision and credentials are authorized,
   prove one isolated hosted app with persistent data and working permissions.
   The provider remains invisible to the ordinary user. A local preview cannot
   satisfy this result.

The reset document specifies the proposed timing and first-pass success
targets. No source in this study proves that arbitrary complete applications
can be built perfectly in minutes. The practical hypothesis is that validated
definitions, prepared components, cached builds and managed runtime provisioning
can make that outcome measurable for a growing supported request distribution.
