# Market Hypothesis and Validation Plan

## Positioning

Factory Pilot serves enterprise engineering teams that already have Git, cloud, and CI/CD. It compiles business requirements into reviewable, traceable, reproducible Application IR and internal approved-component graphs. The first deliverable is a generated project blueprint and a reviewable plan, not direct production release.

The product is distinct from prompt-to-app tools and closed low-code runtimes: teams retain their own code, components, cloud, and pipelines while architecture rules and quality evidence become executable policy.

## Competitive boundary

- [AWS App Studio](https://docs.aws.amazon.com/appstudio/latest/userguide/generative-ai.html) builds AWS-hosted enterprise applications from natural language. It is not a governance layer for a company's existing cross-stack components.
- [Replit Agent](https://docs.replit.com/learn/build-with-agent) plans, writes, and debugs web applications. It does not center enterprise Golden Path versions, compliance evidence, or approvals.
- [Backstage Catalog](https://backstage.io/docs/features/software-catalog/) and [Templates](https://backstage.io/docs/features/software-templates/) are strong future integration targets, but they do not understand requirements, create an IR, or solve constrained component selection.
- [Humanitec Platform Orchestrator](https://developer.humanitec.com/platform-orchestrator/docs/platform-orchestrator/overview/) orchestrates declared workloads and environment resources. It does not decide which components a business requirement should become.
- [GitLab Duo Agent Platform](https://docs.gitlab.com/user/duo_agent_platform/) automates SDLC work around existing issues, code, and pipelines. It can become a later execution and verification channel.

The MVP does not replace these products. It tests the upstream layer from requirement to governed composition.

## Initial market segment

Prioritize 20–100-person engineering organizations with Azure or AWS, GitHub or GitLab, and repeated delivery of approval, ticketing, inspection, or supplier-onboarding applications. Avoid individuals who only need a UI prototype and first engagements that demand complex transactional or highly regulated production systems. These organizations are multi-user customers; the present founder-only constraint applies only to product implementation.

## Autonomous research loop

The market agent performs public, repeatable desk research without requiring founder outreach. Each cycle searches official product documentation, public pricing and release notes, open-source repositories, public engineering posts, job descriptions, and developer-community discussions. It records source URL, publication date, extracted signal, confidence, and the product decision affected.

The cycle tests these public-research hypotheses:

1. Which vendors now advertise requirement-to-application generation, and where do their published capabilities stop?
2. Which platform-engineering roles and job postings mention Backstage, golden paths, templates, supply-chain governance, or internal developer platforms?
3. Which open-source projects have active adoption and maintained extension ecosystems relevant to component catalogs, policy, or deployment orchestration?
4. Which publicly documented product failures or migrations reveal lock-in, quality, security, or portability concerns with prompt-to-app approaches?
5. Which evidence changes the first buyer, wedge, or product metric enough to require a roadmap adjustment?

An external interview is optional future validation, not a founder task or a prerequisite for the MVP. The agent must distinguish observed public evidence from inference.

## Evidence log: 2026-07-25

| Observed public signal | Product decision |
|---|---|
| [AWS App Studio](https://docs.aws.amazon.com/appstudio/latest/userguide/generative-ai.html) generates data models, UI, workflows, and connectors from natural language; [published pricing](https://aws.amazon.com/appstudio/pricing/) starts at a low usage rate. [Replit Agent](https://docs.replit.com/learn/build-with-agent) also plans, writes, debugs, and deploys applications. | Do not position the product as generic prompt-to-app. Position it as a governed output: IR, approved BOM, approvals, and portable blueprint. |
| [GitLab Duo Agent Platform](https://docs.gitlab.com/user/duo_agent_platform/) supports custom agents while its approval and audit features continue to evolve. [GitLab's budget-guardrail announcement](https://about.gitlab.com/blog/gitlab-18-11-budget-guardrails-for-gitlab-credits/) describes the need for capped, controlled AI spending. | Treat approval and evidence as a first-class integration concern. Complement GitLab rather than replacing its coding, review, or CI agents. |
| [Backstage Catalog](https://backstage.io/docs/features/software-catalog/) and [Templates](https://backstage.io/docs/features/software-templates/) already provide a mature catalog and scaffolding substrate. [Humanitec](https://developer.humanitec.com/platform-orchestrator/docs/platform-orchestrator/overview/) and [Score](https://github.com/score-spec) cover workload-to-environment orchestration. | Keep Factory Pilot upstream: requirement to constrained IR to component/architecture decision graph. Plan export adapters instead of rebuilding an IDP or deployment runtime. |
| Crossplane's [package digest discussion](https://github.com/crossplane/crossplane/issues/5920) explains why OCI digests are preferred over mutable tags. | Promote the catalog from syntactic digest validation to resolved artifact provenance, SBOM, signature, policy result, and verification record before component installation exists. |
| Public platform-engineering listings mention Backstage and internal developer portals, including a [Platform Engineer role](https://jobs.techstars.com/companies/hackajob/jobs/85304385-platform-engineer) and a [Backstage-oriented role](https://www.hellowork.com/fr-fr/emplois/78990895.html). This is directional, not a TAM estimate. | Write for platform and architecture leads who already own templates, cloud guardrails, and CI/CD. Use a self-serve local demo and public technical material rather than founder-run interviews. |
| [Firebase Studio](https://firebase.google.com/docs/studio) documents restrictions on new workspace creation and migration guidance. | Emphasize portable Git artifacts and an open IR; avoid depending on a proprietary hosted runtime. |

### Current positioning

> A governed application compiler for teams with existing Git, cloud, and CI/CD: turn a recurring internal-workflow requirement into a reviewable IR, locked internal-component BOM, assumption report, and safe project blueprint without replacing the developer portal, CI, or cloud.

## Evidence log: 2026-07-25 (MVP scope check)

| Observed public signal | Product decision |
|---|---|
| [AWS App Studio](https://docs.aws.amazon.com/appstudio/) documents managed natural-language generation of requirements, user flows, data models, UI, workflows, and connectors. [Power Apps Plans](https://learn.microsoft.com/en-us/power-apps/maker/common/faq-plan-designer) similarly describes requirement-to-solution generation inside the Dataverse ecosystem. | Do not market Factory Pilot as generic requirement-to-app generation. The MVP must prove governed selection, reviewable evidence, and buyer-owned output. |
| [Firebase Studio](https://firebase.google.com/docs/studio) remains preview-oriented and documents workspace restrictions; its prototyping documentation warns that generated output requires validation before production use. | Keep an independently runnable generated Compose application as an MVP acceptance gate. The generated application must not depend on Factory Pilot at runtime. |
| [GitLab Duo Agent Platform](https://docs.gitlab.com/user/duo_agent_platform/) documents configurable custom and planner agents. | Position Factory Pilot upstream of coding and CI agents: it supplies the approved IR, component BOM, assumptions, and run evidence rather than attempting to replace SDLC agent platforms. |
| [Backstage Catalog](https://backstage.io/docs/features/software-catalog/) and [Software Templates](https://backstage.io/docs/features/software-templates/) provide source-controlled catalog and skeleton execution primitives. [Score](https://developer.humanitec.com/platform-orchestrator/docs/score/overview/) and [Humanitec](https://developer.humanitec.com/platform-orchestrator/docs/platform-orchestrator/overview/) target workload/environment translation. | Keep catalogs and orchestrators as future integration targets. Do not delay the MVP by rebuilding an IDP, component marketplace, or deployment engine. |
| [Argo CD releases](https://github.com/argoproj/argo-cd/releases) publish signed images and provenance information. | After MVP, expand Golden-component evidence beyond a syntactic version/digest to include immutable source/artifact references, SBOM, signature/provenance, policy result, and verification date. |

### Falsifiable MVP hypotheses

1. A reviewable IR, approved BOM, assumptions, and run evidence provide more governance value than a manually selected scaffold.
2. A generated application that starts independently of the control plane is meaningfully more portable than a managed prompt-to-app workspace.
3. Requirement-to-constrained-component selection is a useful upstream layer to catalogs, coding agents, CI, and deployment orchestrators.
4. A role-based approval workflow can demonstrate the first Golden Path through state transitions and protected audit history.

Public desk research supports these hypotheses as positioning inputs only. It does not demonstrate willingness to pay or replace future customer evidence.

## Evidence log: 2026-07-26 (Composable Internal Approval Suite)

**Scope:** public-source technical ecosystem research for the proposed component
package, Registry, and Composer boundary. Sources were observed on 2026-07-26.
These are design inputs for ADR 003, not an accepted architecture decision or
legal advice.

| Observed fact | Contract-relevant inference / product decision | Confidence |
|---|---|---|
| The [OCI Image Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md) permits non-container artifacts to use an OCI image manifest with an artifact-specific media type. The [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) defines a digest as a cryptographic-hash identifier, while a tag is a human-readable pointer to a manifest. | OCI is a viable future transport for component archives and their evidence. For the Stage 1 local-package boundary, lock every selection by component key, exact version, and deterministic digest; never use a tag or version alone as the immutable identity. Do not introduce a registry runtime before the Stage 2 supply-chain scope is approved. | High |
| OCI manifests can identify a `subject`, and OCI registries expose referrers associated with that subject digest. | Future SBOM, signature, and provenance artifacts should name the exact selected package digest as their subject. Registry verification must reject evidence bound to a different digest. | High |
| [Backstage Software Templates](https://backstage.io/docs/features/software-templates/writing-templates/) are YAML definitions that execute ordered actions and support custom actions. | Factory Pilot must not inherit a general-purpose template-action execution model: adapters should remain declarative, apply only to declared output slots, and leave ordering, merge policy, containment, and output-manifest creation to the Composer. | High |
| [SLSA provenance](https://slsa.dev/spec/v1.1/provenance) describes how artifacts were produced, including build definition and resolved dependencies. [GitHub Actions artifact attestations](https://docs.github.com/en/enterprise-cloud%40latest/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) support build provenance, signed SBOM attestations, and verification. | Reserve versioned evidence references in the component contract now: package digest, source revision, build/verification time, SBOM and provenance reference/digest, and verification result. Enforce the evidence at Golden promotion in Stage 2 rather than treating a local digest as provenance. | High |
| [SPDX](https://spdx.dev/use/specifications/) is an ISO/IEC 5962:2021 standard and publishes SPDX 3.0. [SPDX license guidance](https://spdx.dev/learn/handling-license-info/) supports machine-readable identifiers and `AND`, `OR`, and `WITH` expressions. | A component contract should record a validated SPDX license expression and SPDX license-list/schema version; a free-text license field is not sufficient for automated policy. | High |
| [GitHub licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) states that absent a license, default copyright prevents reproduction, distribution, and derivative works. GitHub's [license-policy documentation](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/configure-license-policies) evaluates direct and transitive dependencies against allowed licenses, although the feature is an Enterprise preview. | Public availability is not permission to ingest or compose. Treat absent, unknown, or malformed licensing as a hard block on candidate/Golden promotion, and record policy version, dependency-graph result, exceptions, and verification date. | High |
| [npm package metadata](https://docs.npmjs.com/files/package.json/) permits dependencies specified by tarball or Git URL, which can cause installation-time downloads. | The Stage 1 manifest and Composer should reject URL, Git, registry, and executable dependency declarations to preserve the first-party, Golden-only, no-runtime-download safety boundary. | High |

### ADR 003 decision inputs

1. Use a canonical package-root digest and exact component key/version for Stage
   1 identity; add repository identity only when a registry transport is
   authorized.
2. Freeze declarative adapters, declared output slots, and Composer-owned merge
   and containment rules as the shared contract; do not permit executable
   package adapters.
3. Keep external discovery, OCI registry transport, signing, SBOM/provenance
   verification, and candidate-to-Golden promotion in the Stage 2 supply-chain
   scope.
4. Reserve immutable, versioned evidence fields in `component.json` now, while
   enforcing their verification only after the relevant promotion policy is
   accepted.
5. Make license absence/unknown status a promotion block and require explicit
   SPDX-based policy exceptions for any later admission.
