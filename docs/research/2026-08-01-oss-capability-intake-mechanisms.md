# Scalable OSS capability intake mechanisms

**Research date:** 2026-08-01
**Decision investigated:** how Factory Pilot can discover and evaluate large
numbers of reusable open-source packages, templates, and provider APIs without
making each business scenario a hand-authored one-off or allowing an external
product to replace the Application Graph.

## Executive finding

The shortest route to a catalogue supporting hundreds of business scenarios is
not copying complete vertical repositories into generated applications. It is a
batch **Candidate Foundry** that turns public-package and repository metadata
into quarantined, reproducible candidate records, then promotes only one of
four deliberately narrow integration forms:

1. **Pinned dependency** for a library with a bounded Factory adapter.
2. **Provider adapter** for an independently hosted API/service, with a local
   conformance fake before any live account is involved.
3. **Selective source port** of named compatible files after a source study,
   notices, tests, and an independently owned Factory boundary are recorded.
4. **Reference-only** scenario and vocabulary evidence, with no source,
   package, runtime, or generated output copied.

This fits the existing `packages/external-intake` implementation better than a
new registry: it already accepts batches of up to 1,000 fixed-source requests,
resolves immutable commits, retains digest-linked snapshots/evidence/SBOMs,
and keeps candidates quarantined until a later promotion decision. The missing
product slice is therefore **discovery and triage automation**, not a second
manual certification process.

## Scope and non-goals

This is public-source desk research. It does not approve any package, source
port, provider account, network credential, or live deployment. It also does
not change Factory policy: the Application Graph remains canonical; only a
Published Revision may compile; credentials and raw AI content remain outside
Graph, intake, evidence, and generated artifacts.

`ecosystem/intake` is a quarantine boundary, not a package manager or an
automatic code-import directory. A candidate can produce a manifest, fixture,
adapter proposal, and conformance plan, but cannot select Golden packages,
mutate a Graph, or compile a product.

## Observed public evidence

| Source | Observed fact | Confidence | Candidate Foundry decision affected |
| --- | --- | --- | --- |
| [GitHub template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) | GitHub templates create a new repository with the template's directory structure, branches, and files; resulting histories are unrelated. | High — official documentation | Treat templates as immutable source candidates, not reusable package dependencies or authoritative product models. A template must be resolved to a commit and compiled through Factory rather than copied into every product. |
| [GitHub public repository REST endpoint](https://docs.github.com/en/rest/repos/repos) | GitHub exposes public repository metadata through REST without authentication for public resources. | High — official documentation | A scheduled discovery adapter can ingest metadata and URLs without a privileged token; retrieval and source study still require the exact public repository and immutable commit. |
| [Backstage Software Templates](https://backstage.io/docs/features/software-templates/) and [discovery guidance](https://backstage.io/docs/features/software-templates/adding-templates/) | Backstage templates load code skeletons, parameterise variables, publish to Git providers, and may be discovered with provider integrations such as GitHub Discovery. | High — official documentation | Borrow the separation of **catalogue/discovery**, **parameter schema**, and **dry-run task**, but do not execute arbitrary Backstage actions. Translate safe template metadata to a Factory candidate/conformance plan instead. |
| [Amplication plugin concepts](https://docs.amplication.com/concepts), [plugin templating](https://docs.amplication.com/plugin-development/guides/plugins-code-techniques-and-examples), and [Smart Git Sync](https://docs.amplication.com/day-zero/smart-git-sync) | Amplication plugins hook into generation and can use static template files with replacement values; Smart Git Sync uses dedicated branches for managed changes. | High — official documentation | Reuse the pattern of versioned generator extensions and reviewable generated-output branches. Factory must retain the stricter rule that an adapter only receives a Published Graph projection and cannot supply arbitrary generator code. |
| [npm package provenance](https://docs.npmjs.com/viewing-package-provenance/) and [trusted publishing](https://docs.npmjs.com/trusted-publishers/) | npm can expose build environment, source commit, workflow, and transparency-log provenance; `npm audit signatures` checks registry signatures/provenance. Trusted publishing uses scoped, short-lived credentials. | High — official documentation | Score npm candidates using exact package/version/integrity plus provenance/signature evidence. Missing provenance is a risk signal, not proof of maliciousness; such candidates remain quarantined or reference-only. |
| [deps.dev](https://docs.deps.dev/) | Google Open Source Insights indexes Cargo, Go, Maven, npm, NuGet, PyPI, RubyGems, major Git hosts, and OSV advisories; it offers an API and BigQuery data. | High — official documentation | Use a discovery/enrichment adapter to batch fetch dependency graph, version, license and advisory context across ecosystems instead of implementing registry-specific queries for every candidate. |
| [OSV API](https://google.github.io/osv.dev/api/) and [OSV data sources](https://google.github.io/osv.dev/data/) | OSV supports batch queries for package versions and commits; it aggregates data from multiple advisory sources and publishes update lists. | High — official documentation | Run OSV batch scans as a mandatory, recorded enrichment stage. A critical/unfixed policy can block a candidate automatically; the raw third-party response should be reduced to a safe finding summary and digest. |
| [OpenSSF Scorecard](https://www.scorecard.dev/) | Scorecard can inspect public repositories from a CLI and can run continuously through GitHub Actions. | High — official project documentation | Add repository-health evidence (branch protection, pinned dependencies, CI and related practices) as a ranking input, never as a replacement for license/security review. |
| [GitHub dependency graph](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-graph-data) and [dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review) | GitHub builds graphs from manifests/lock files or submitted dependency snapshots; dependency review can fail a change for vulnerable dependencies and can apply license allow/deny lists. | High — official documentation | Candidate promotion must generate/retain a lockfile/SBOM and run an equivalent policy gate. The Foundry should reject unpinned ranges for generated-runtime dependencies. |
| [GitHub artifact attestations API](https://docs.github.com/en/rest/repos/attestations) and [Sigstore verification](https://docs.sigstore.dev/cosign/verifying/verify/) | Public GitHub repositories can expose artifact attestations by subject digest; Sigstore verification binds signatures to artifact digests and verified identities. | High — official documentation | Prefer release artifacts/images with verifiable provenance. Store the attestation/signature verification result and subject digest; do not treat a GitHub release tag alone as sufficient. |
| [SPDX 3.0.1](https://spdx.dev/wp-content/uploads/sites/31/2024/12/SPDX-3.0.1-1.pdf) | SPDX defines an SBOM as a collection of SPDX elements that describes a package. | High — official specification | Keep CycloneDX (already used by External Intake) and support SPDX import/export at the evidence boundary; normalise to Factory-safe evidence summaries rather than persisting uncontrolled package metadata. |
| [Artifact Hub](https://artifacthub.io/docs/) and its [package API](https://artifacthub.io/docs/api/) | Artifact Hub discovers/publishes cloud-native packages and exposes search, package details, templates, values schemas, and package security reports via an API. | High — official documentation | Add an infrastructure/runtime discovery adapter for Helm, containers, Backstage plugins, and related package types. They must compile to declared Runtime Provider intent, never become unrestricted deployment scripts. |

## Integration classification: choose the fastest safe path

| Intake path | When it is fast and appropriate | Evidence before candidate creation | What may enter Factory | Hard boundary |
| --- | --- | --- | --- | --- |
| **Direct dependency** | Small, maintained library whose API is called only behind a Factory-owned editor/compiler/runtime adapter. Examples: UI primitive, QR renderer, charting, state-machine library. | Exact package version, integrity/lock entry, declared license and notices, dependency graph/SBOM, OSV result, published API compatibility test. | Pinned manifest dependency, wrapper/adapter, notice, fixtures/tests. | Library data/configuration never becomes the Graph; no unpinned `latest`, runtime download, or user-selected package URL. |
| **Template-to-compiler pattern** | A source template supplies structure or presentation after it has been converted to declared Factory slots and parameters. | Immutable commit, named template paths, license/notice inventory, parameter schema, dry-run fixture and generated-file snapshot. | Factory-owned template adapter, allowed output-slot map and regression fixtures. | No arbitrary template script/action, shell command, URL, secret, SQL, or dynamic remote include. |
| **Provider adapter** | Commodity function has a stable external API: identity, search, notification, payment simulation, delivery, maps, printing, analytics. | OpenAPI/SDK version or API-doc digest, terms/license classification, required scopes/data map, local fake and removal path. | Factory contract, fixture provider, adapter, provider metadata that references a Published Revision. | Provider never owns canonical domain/policy/flow facts; credentials and raw webhooks are not Graph/intake records. |
| **Selective source port** | A small, isolated implementation is materially faster than re-authoring and its exact source paths are under a compatible licence. | Immutable commit, exact paths/line ranges, licence/NOTICE decision, module inventory, SBOM/scans, attribution destination, independent test and replacement path. | Minimal attributed Factory-owned implementation and notices. | No whole application, ORM, UI shell, migrations, data model, runtime, enterprise directory, or unreviewed dependency tree. |
| **Reference only** | The upstream is GPL/AGPL/proprietary/mixed or its value is mainly domain vocabulary, acceptance scenarios, or architecture comparison. | Immutable source/doc reference and legal classification. | Research record and independently authored fixtures. | No source, package, image, API client, assets, generated output, or runtime. |

**Inference:** Selective ports are a speed multiplier only for isolated paths.
Copying a complete business application appears fast but creates an unbounded
second domain model, dependency graph, upgrade surface, and licence obligation.
For a 100-profile catalogue, the fastest compounding route is to batch produce
many Candidate records and reuse their *contracts, fixtures, and narrow
adapters*, while only porting code where the path-level benefit is proved.

## Candidate Foundry operating model

```text
Public discovery feeds
  GitHub / package registries / Artifact Hub / OpenAPI directories
                 |
                 v
Discovery index (metadata only; no execution)
  topic, language, licence claim, release activity, package/API identifiers
                 |
                 v
Ranked candidate batches (up to 1,000 fixed-source requests)
                 |
                 v
Existing External Intake quarantine
  resolve immutable ref -> snapshot -> notices -> SBOM -> scans -> AST inventory
                 |
                 v
Candidate artifact set
  Factory manifest proposal + local fixture + adapter proposal + conformance plan
                 |
                 v
Automated policy gate / focused source study / promotion decision
                 |
                 v
Golden capability, optional provider, or rejected/reference-only record
```

### Batch discovery sources

| Source lane | What a discovery job collects | Initial search facets | Candidate types it should produce |
| --- | --- | --- | --- |
| GitHub public repositories and releases | Canonical repository URL, default branch/release tag, license claim, topics, language, activity/release links, issue/security-policy locations. | `topic:restaurant`, `topic:commerce`, `topic:booking`, `topic:inventory`, `topic:crm`, `topic:helpdesk`, `topic:workflow`, `topic:pos`, `topic:marketplace`, plus `template` and `backstage-plugin`. | Source-study, reference-only, template-to-compiler. |
| npm / other supported package registries | Package/version, integrity, license field, repository link, provenance status, dependency metadata and release timestamp. | UI/design primitives, payment/client SDKs, document/export, notifications, calendar, QR, map, state, chart, test and SDK categories. | Direct-dependency or provider-adapter candidates. |
| deps.dev + OSV | Transitive dependency graph, license/advisory context, package/repository version links, batch vulnerability results. | Enrich every package/repository candidate instead of using it as an unbounded free-text recommender. | Evidence/risk records only; it does not promote code. |
| Backstage template locations / GitHub template repositories | `template.yaml`/template metadata, input schema, declared actions and skeleton path. | Project scaffolds, service/API templates, design-system blocks, CI/deployment skeletons. | Template-to-compiler candidates after declarative-action reduction. |
| Artifact Hub | Package type, publisher status, version, values schema, changelog, security report and image/chart metadata. | PostgreSQL/Redis/observability, IAM, ingress, secrets, runtime providers, Helm/Argo/Backstage packages. | Runtime-provider/infra adapter candidates, never business Graph capabilities. |
| Official provider API/SDK portals | API version, OpenAPI where published, terms, authentication method, event/webhook model and sandbox availability. | Identity, email/SMS, search, payments, maps, delivery, printing, analytics and commerce connectors. | Provider-adapter candidates only. |

### Mechanical ranking, not subjective one-off certification

Discovery should assign candidates a transparent **triage score** rather than
declare them usable. Suggested components, each recorded with a timestamp and
source URL/digest:

- **Domain leverage (0–30):** number of profile families that can use the
  proposed Factory capability; for example `availability.hold` spans restaurant,
  bookings, clinics, rentals and appointments.
- **Boundary fit (0–25):** can the dependency, template, or provider be
  consumed through a small declared Graph projection?
- **Reproducibility (0–15):** immutable release/commit, integrity/digest,
  lockable dependencies, documented API or OpenAPI artifact.
- **Maintenance evidence (0–10):** tagged release cadence, non-archived state,
  security policy, CI/release provenance or Scorecard evidence.
- **Supply-chain evidence (0–10):** signed/provenanced package or artifact,
  SBOM, OSV clean/understood finding state.
- **Licence/removal fit (0–10):** explicit compatible licence/notice burden or
  clean provider contract with an implementation-independent fake.

Hard blockers override the score: unknown/mixed unreviewed licence; mutable
ref; forbidden enterprise/AGPL/GPL path; unresolved critical vulnerability;
no lock/integrity; candidate would execute scripts or change Factory Graph
semantics; or required credentials/PII cannot be isolated.

## Concrete Candidate Foundry decisions

1. **Build one discovery index and feed the existing quarantine intake.** It
   should store safe metadata and ranking explanations, then emit only
   `factory.external-intake-batch/v1` requests with canonical public GitHub
   URLs and fixed refs. Do not give discovery a write path to capability,
   compiler, or Graph tables.
2. **Create profile-family maps, not 100 app clones.** Map candidates to
   reusable family capabilities: party/identity, catalog, quote/cart,
   transaction/order, inventory, availability, queue, workflow/task, payment
   attempt, fulfilment, notification, document, CRM/support, reporting, and
   integrations. A profile becomes a validated Graph composition of these
   capabilities plus bounded experience templates.
3. **Generate candidate artifacts automatically.** For every non-blocked
   intake, produce a proposed Factory key, classification, selected module
   paths, allowed output slots, local fake/fixture outline, and conformance
   plan. This automates the repetitive work while preserving a later focused
   decision for code adoption.
4. **Use source studies as exceptions, not the main catalogue engine.** The
   Foundry can batch snapshot and inventory repositories, but a source port
   still needs named paths and attribution. This satisfies the current policy
   and prevents a licence-compatible repository from silently becoming a
   replacement platform.
5. **Promote by capability family in vertical slices.** First intake batches
   should target the cross-profile missing seams: availability/reservation,
   queue/dispatch, loyalty event ledger, payment/refund provider contract,
   realtime work queue, support case, document generation, and analytics
   projection. The Restaurant profile can then validate these alongside
   Ecommerce, Grocery Pickup and Retail Counter rather than becoming another
   isolated application.
6. **Use provider fakes before vendor activation.** A provider candidate must
   pass Factory's contract against a local fake from a Published Revision. This
   allows a simulated payment, delivery, email, identity, or search experience
   in a 30-minute prototype without live commercial dependencies.

## Recommended first automated batches

| Batch | Scope | Expected outcome | No-go condition |
| --- | --- | --- | --- |
| A — experience/editor primitives | Form, table, upload, calendar, map, chart, rich text, QR/receipt, responsive layout packages. | 30–80 direct-dependency candidates classified by UI/output slot and license/provenance risk. | Any package that owns persisted PageModel/Graph data or executes user-provided code. |
| B — business capability sources | Public repos/templates for reservation, queue, order/fulfilment, inventory, support/CRM, appointment, document and reporting. | 100–300 reference/source-study candidates grouped by Factory family and feature vocabulary. | Whole-suite copy proposal, GPL/AGPL/commercial path without a separate legal decision. |
| C — provider contracts | Official API/SDK sources for identity, email/SMS, payments, delivery, maps, search, storage, realtime, analytics and printing. | 30–60 provider records with fake-fixture plans and PII/credential maps. | Provider schema/data model becomes canonical or the initial profile requires a live account. |
| D — infrastructure/runtime | Artifact Hub packages and official container/provider docs for databases, cache, observability, deploy and operator systems. | 40–100 runtime-provider candidates with allowed environment/secret/config surfaces. | Helm/YAML/scripts can directly mutate infrastructure from a Draft or user supplied URL. |

These numbers are candidate records, not Golden packages. Batching 200 sources
is useful precisely because the pipeline can reject most automatically and
leave a small number of high-leverage contracts for deeper work.

## Promotion evidence required by path

| Requirement | Dependency | Template | Provider | Source port |
| --- | ---: | ---: | ---: | ---: |
| Fixed package version/commit/image digest | Required | Required | Required for SDK/image/docs snapshot | Required |
| SPDX/CycloneDX SBOM and dependency scan | Required | Required if dependencies exist | SDK/adapter only | Required |
| Licence/NOTICE decision | Required | Required | Terms/API classification | Required |
| Local conformance fixture | Required | Required | Required | Required |
| Published-Revision-only test | Required | Required | Required | Required |
| Immutable generated-output snapshot | If compiler-affecting | Required | If compiler-affecting | Required |
| Removal/replacement path | Required | Required | Required | Required |
| Attribution/third-party notice | Required | Required | If SDK/doc requires | Required |

## Product implications and next decision

**Observed:** Factory already has the core quarantine contracts and source
evidence lifecycle. **Inference:** a Candidate Foundry can quickly grow the
portfolio without relaxing the Graph boundary if its first feature is a
metadata-only discovery index, batch request producer, and candidate triage
workbench—not automatic copying.

The next product decision is whether the first Foundry slice should optimise
for **(A) high-leverage permissively licensed direct dependencies and UI
templates**, **(B) cross-profile business vocabulary/reference batches**, or
**(C) provider contracts with local fakes**. A is fastest for visible prototype
quality, B yields the largest long-term scenario catalogue, and C most quickly
makes generated products operational. A practical sequence is A and B in
parallel discovery, followed by C only for the most requested capability
families.
