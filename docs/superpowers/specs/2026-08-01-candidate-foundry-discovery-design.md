# Candidate Foundry Discovery Design

**Status:** Accepted for autonomous implementation on 2026-08-01.

## Purpose

Extend the accepted External Capability Intake boundary with a high-throughput
Candidate Foundry. It discovers and triages public repositories, packages,
templates, and Provider APIs into fixed-reference intake requests, then lets
the existing quarantine pipeline produce candidate artifacts. It is the scale
mechanism for profile capability supply; it does not make an external product
or source tree authoritative over the Factory Application Graph.

The first slice must make external discovery visible on the Workbench Home
without exposing source URLs, source paths, raw upstream metadata, credentials,
or source bytes. It must allow one bounded discovery run to produce batches of
up to 1,000 fixed-source requests and deterministic Candidate scaffolds.

## Existing constraints

- The Application Graph remains the product source of truth.
- Only Golden package locks can be selected by a Draft; only a Published
  Revision can compile.
- `packages/external-intake` remains quarantine-only and is never imported by
  the Graph, capability registry, compiler, generated application, Control
  Plane runtime, or Worker runtime.
- Source code is never copied into `packages/` by discovery or scaffolding.
  A Candidate scaffold is declarative, remains in `ecosystem/intake`, and
  cannot compile.
- Credentials remain process-local. Optional GitHub credentials may reach only
  GitHub's metadata API host and must never be persisted or returned.
- Every discovered source is immutable before acquisition: an eligible request
  contains a resolved commit SHA or exact registry version and integrity.

## Product outcome

```text
Public discovery adapters
  -> Discovery Index (quarantine metadata only)
  -> deterministic triage and profile-family mapping
  -> fixed-source batch request
  -> existing External Intake evidence pipeline
  -> Candidate manifest / fixture / adapter / conformance scaffold
  -> review-only Golden eligibility
```

The Workbench Home receives only an aggregate **Capability Supply Queue**:

- candidates by reusable family;
- discovery, quarantined, conformance-passed, blocked, and reference-only
  counts;
- required evidence-gate categories;
- profiles affected by each family; and
- a safe next action label.

It never receives a repository URL, module path, source line, raw license text,
scan output, upstream description, source code, prompt, response, or secret.

## Reuse modes

Each triaged record has exactly one non-promoting reuse mode.

| Mode | Intended result | Required evidence | Never allowed |
| --- | --- | --- | --- |
| `direct-dependency` | Version-pinned Factory wrapper around a small library | integrity, license/notice, SBOM, advisory result, Factory wrapper fixture | Graph ownership, dynamic download, user-selected package URL |
| `template-adapter` | Factory-owned output-slot adapter for a static template | fixed commit, declared parameter schema, dry-run fixture, snapshot | template actions, scripts, remote includes, arbitrary output paths |
| `provider-adapter` | Factory-owned contract plus local fake | API or SDK digest, term classification, scope/data map, fake fixture | provider-defined canonical domain, live credential in Graph, automatic activation |
| `selective-source-port` | A later named, small Factory-owned implementation | fixed commit, exact path/range ledger, compatible license decision, notices, tests, removal path | whole repository, ORM, migration, UI shell, source body in Candidate scaffold |
| `reference-only` | Profile vocabulary and independent acceptance scenarios | fixed public reference and policy classification | dependency, copied code, runtime, generated output |

## Discovery Index contract

The discovery index is an immutable, file-backed quarantine artifact. It is
owned by `@factory/external-intake` and accessed only through the local
`@factory/intake-cli` command surface.

```ts
type DiscoveryRecordV1 = {
  apiVersion: "factory.discovery-record/v1";
  id: string;
  discoveredAt: string;
  sourceKind: "repository" | "package" | "template" | "provider";
  sourceHost: "github" | "npm" | "artifact-hub" | "official-provider";
  immutableReference: {
    canonicalIdentifier: string;
    resolvedVersionOrCommit: string;
    integrity?: `sha256:${string}`;
  };
  declaredLicense: string | null;
  familyHints: readonly CapabilityFamilyKey[];
  profileHints: readonly FactoryProfile[];
  reuseMode: ReuseMode;
  triage: {
    score: number;
    status: "eligible" | "blocked" | "reference-only";
    gateCategories: readonly DiscoveryGateCategory[];
  };
  metadataDigest: `sha256:${string}`;
};

type CapabilityFamilyKey =
  | "identity"
  | "catalog"
  | "commerce-transaction"
  | "inventory"
  | "availability"
  | "queue"
  | "payment"
  | "fulfillment"
  | "notification"
  | "document"
  | "search"
  | "analytics"
  | "integration";

type DiscoveryGateCategory =
  | "immutable-reference"
  | "license-notice"
  | "sbom"
  | "security-scan"
  | "module-boundary"
  | "fixture"
  | "provider-contract";
```

`canonicalIdentifier` is permitted in the quarantine store but cannot be
included in public summaries. It is never a filesystem path, command, URL
selected by a Graph, or generated-application input.

## Triage and batching

Triage is deterministic and explainable. A record earns points only from
normalised local inputs:

- domain leverage (0–30): number of Factory profile families served;
- Graph-boundary fit (0–25): whether the record has a bounded adapter shape;
- reproducibility (0–15): immutable version/commit and integrity evidence;
- maintenance signal (0–10): release/activity metadata;
- supply-chain signal (0–10): provenance/SBOM/advisory metadata; and
- license/removal fit (0–10): explicit claim plus a practical replacement
  boundary.

Hard blockers take precedence over score: missing immutable reference, unknown
or excluded license class, missing source identity, unsafe requested module,
unresolved high-severity advisory, dynamic source behavior for a proposed
source port, or an attempt to declare a runtime capability.

An eligible record becomes an `IntakeRequestV1` only after immutable-reference
validation. Batch creation sorts records by score descending then `id`, rejects
duplicate canonical identities, caps a batch at 1,000 items, and retains a
receipt for every excluded record. A failure in one record must not prevent
another eligible record from entering quarantine.

## Candidate scaffold

After the existing acquisition, evidence, AST inventory, and Candidate
conformance stages succeed, the Foundry creates exactly these quarantined
artifacts:

```text
ecosystem/intake/candidates/<candidate-id>/<candidate-version>/
  candidate.json
  fixture.json
  adapter.json
  conformance-plan.json
  source-port-plan.json        # only for selective-source-port
```

`source-port-plan.json` contains only source snapshot digest, exact module
identity, selected path/range reference, intended Factory capability key,
notice destination, and removal-test requirement. It does not contain source
text or executable contribution content. Golden promotion still requires an
independent Factory-owned implementation and the existing promotion record.

## Initial discovery adapters

### GitHub public repository discovery

The first live adapter queries GitHub's public repository metadata API for a
fixed Factory-owned query bank grouped by capability family. It reads only
repository identity, declared license, topics, primary language, archive state,
default/ref metadata, release metadata, and timestamps. It resolves an exact
tag or commit before emitting an intake request.

An optional `FACTORY_GITHUB_READ_TOKEN` is restricted to `api.github.com` as
implemented by the existing source client. It is not required for fixtures and
is never written to discovery, intake, CLI output, Workbench state, or logs.

### Fixture adapter

Tests use a local discovery adapter with fixed metadata fixtures. It proves
ranking, blockers, public-summary redaction, batch caps, duplicate handling,
and Candidate scaffold determinism without network access.

Registry, Artifact Hub, and official Provider discovery adapters use the same
contract later; they are deliberately not part of the first implementation
slice.

## Workbench and Control Plane projection

`@factory/portfolio-public` owns a safe `CapabilitySupplySummaryV1`. The
Control Plane projects it from a local aggregate and the Workbench Home renders
it below Profile readiness. The payload contains counts, Factory family keys,
affected Profile keys, maturity stage, gate category, and safe action label.

The initial action labels are fixed strings:

- `evidence required`;
- `source boundary required`;
- `conformance required`;
- `provider fake required`;
- `eligible for review`;
- `reference only`.

The Home is read-only in this slice. It must not trigger retrieval, source
copying, promotion, Provider configuration, or a Graph mutation.

## Error handling and observability

- Discovery requests fail closed if a result cannot be normalised to the
  contract or lacks an immutable reference.
- One invalid result produces a redacted blocked receipt and does not abort the
  batch.
- Discovery output is canonicalised before hashing; rerunning the same fixture
  produces the same record and summary digests.
- CLI output exposes opaque IDs, count summaries, gate categories, and receipts
  only. It rejects credential-shaped user options and raw source-content fields.
- Workbench parsing rejects unknown stages, family keys, or action labels.

## Acceptance criteria

1. A fixture discovery run maps public metadata to deterministic Discovery
   Records, including one eligible, one reference-only, and one blocked record.
2. Triage rejects a floating ref, missing license evidence, forbidden reuse
   mode, duplicate canonical identity, and a record with a source-path escape.
3. Batch creation yields at most 1,000 sorted immutable intake requests and
   records independent blocked siblings without losing eligible siblings.
4. A verified Candidate produces deterministic declarative scaffold files;
   none contains upstream source text, a package path, runtime code, a Graph
   mutation capability, a credential, or a raw URL in public projection.
5. Candidate and discovery records cannot appear in a Draft, composition lock,
   compiler input, generated application, Provider runtime, or Golden catalog.
6. The Control Plane and Workbench show only the safe capability supply
   aggregate and reject malformed or source-shaped payloads.
7. Focused External Intake, Intake CLI, Portfolio Public, Control Plane, and
   Workbench tests pass. The full workspace regression passes before release.

## Out of scope

- Automatic Golden promotion, source copying, dependency installation, or
  external Provider activation.
- Npm, Artifact Hub, and Provider API discovery adapters.
- Direct editing of Candidate artifacts in the Workbench.
- New generated-app runtime behavior; this is a supply-chain and Home
  visibility slice.
- A claim that any of the 122 planned profile recipes is production-ready.

## Delivery sequence

1. Add the Discovery Record, triage, batching, and safe-summary contracts with
   focused fixture tests.
2. Add the fixture and GitHub discovery adapters to Intake CLI, including
   bounded batch output and redacted receipts.
3. Extend Candidate scaffolding with the declarative source-port plan and
   verify source-free output.
4. Project the safe aggregate through Portfolio Public, the Control Plane, and
   the Workbench Home.
5. Verify the release boundary and full workspace regression; then separately
   plan individual capability-family promotion slices.
