# Archeform UI Reuse and Delivery Policy

This policy separates UI asset creation, task delivery, iteration integration,
product publishing, and repository releases. The active PM ledger remains the
state authority.

## Reuse-first UI workflow

Before creating or copying UI source, search in this order:

1. approved `packages/ui-primitives`, `packages/ui-patterns`,
   `packages/workbench-ui`, and `packages/generated-ui` registry entries;
2. approved `packages/screen-recipes`, `packages/experience-recipes`, and
   `packages/product-recipes` assets;
3. existing `apps/workbench` components, Puck adapters, and
   `packages/compiler` generated-project templates that can be extracted
   without preserving obsolete architecture;
4. pinned, license-reviewed source-study candidates such as selected shadcn/ui
   Radix files;
5. a new first-party asset only when the preceding sources do not satisfy a
   distinct semantic or interaction contract.

Base44 is a product-flow and information-architecture reference only. Its
source, assets, prompts, branding, and private implementation are never copied.
Aceternity remains quarantined until each item has explicit provenance,
license, dependency, accessibility, motion, and removal evidence.

Every UI task brief and hand-off records:

- searched registries, recipes, templates, and source studies;
- reused keys and paths;
- parameters, tokens, slots, and bindings changed;
- candidates rejected and why;
- each new registry key and the functional gap that required it;
- focused interaction, accessibility, responsive, and visual evidence.

Color, typography, spacing, radius, density, and ordinary layout variation use
tokens or recipe parameters. They do not justify a duplicate component. A new
asset must own distinct semantics, interaction, state, accessibility, or slot
behavior and must include provenance and tests.

## Task commits and pushes

The controller, not a worker, owns normal Git mutations after review.

1. Start from the recorded base commit and preserve unrelated work.
2. Complete focused RED/GREEN evidence, task review, required QA, and ledger
   reconciliation.
3. Create one bounded English commit for the accepted task. Split only when a
   separately revertible documentation, dependency, or generated-artifact
   boundary materially improves recovery.
4. Push the active iteration branch after each accepted task and verify local
   HEAD equals its remote branch tip.

Do not commit failing work as accepted, combine unrelated tasks, force-push,
rewrite published history, or let a subagent independently push unreviewed
changes.

## Integration into `main`

Merge into `main` only when the iteration ledger is `accepted`, all required
task/QA/release reviews are clean, the working tree is clean, runtime cleanup is
proven, and the iteration branch is pushed.

The controller then:

1. fetches `origin` and verifies the recorded base and remote tips;
2. integrates through a reviewed pull request when repository tooling is
   available, otherwise through a normal non-fast-forward local merge;
3. never uses force, reset, history rewriting, or deletion to resolve the
   integration;
4. reruns the iteration release gate at the exact merged `main` commit;
5. pushes `main` and verifies local `main` equals `origin/main`.

An unexpected remote divergence or conflict outside the iteration's owned paths
stops integration for inspection; it does not authorize discarding either side.

## Product Publish and repository release

Product Publish is the Archeform lifecycle transition from a mutable Draft to
an immutable Published Revision. It is exercised inside product acceptance and
is not a Git operation.

A repository release may be created only from an accepted, pushed `main`
commit. Before Task 9 closes, PM records the release version and release notes
location in the ledger. The controller reruns frozen-install, typecheck, tests,
build, required Playwright/real-model acceptance, security/privacy checks, and
cleanup against that exact commit, then pushes an annotated Git tag and records
the release manifest/notes. It also creates a GitHub Release when authenticated
repository tooling is available. The release record links safe summaries and
digests, never credentials or raw model input or output.

This repository currently has no managed cloud-deployment workflow. A GitHub
Release, Git tag, or Archeform Product Publish must not be described as a cloud
deployment. Deployment, domains, fleet operations, and production rollback
remain deferred until a dedicated provider decision, implementation, and
acceptance slice exists.
