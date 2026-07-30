# External capability intake design

Status: accepted 2026-07-31; acquisition-record amendment approved by the
Controller 2026-07-31.

## Purpose

Define a bulk, automated intake lane for public external sources that produces
quarantined **Candidate** evidence and, only after governed promotion, a
Factory-owned **Golden** capability asset or provider adapter. It operationalizes
the fixed-reference portfolio at
[external-business-logic-portfolio.md](../../research/2026-07-30-external-business-logic-portfolio.md)
without making upstream code, a provider, or a scan result authoritative over
the Application Graph.

This design extends the existing source-study and capability-package controls;
it does not change the Application Graph schema, capability registry, compiler,
or a profile. The existing Graph rule remains decisive: Drafts may select only
known Golden asset identities, and only a Published Revision compiles.
[Application Graph platform](../../architecture/application-graph-platform.md)

## Decision

Use a two-registry, quarantine-first model:

```text
fixed public reference
  -> immutable source snapshot + truthful acquisition record
  -> deterministic scan bundle + AST inventory + EvidenceBundle
  -> Candidate registry (not importable, not selectable, not compiled)
  -> human promotion decision + Factory-owned implementation/adaptation
  -> Golden registry (digest-verified, selectable by Draft, compilable only after Publish)
```

Bulk automation may fetch, hash, scan, classify, and propose manifests. It may
not copy a source fragment into `packages/`, add a dependency, modify a Factory
Graph, accept a licence, waive a finding, promote a Candidate, or create a
Golden lock. Those actions require a reviewed, committed Factory change.

## Goals and non-goals

### Goals

- Reproduce a fixed tag or commit, including resolved commit SHA, retrieval
  time, origin URL, tree digest, and exact licence/notice paths.
- Process many portfolio records under one deterministic, resumable job while
  keeping each source's evidence and failure independent.
- Build a complete evidence bundle: licence/provenance/notices; SBOM;
  dependency, secret, licence, and SAST reports; and AST/module inventory.
- Propose bounded Candidate manifests, fixtures, and declarative adapter
  skeletons without allowing generated material to reach a Factory runtime.
- Run Candidate conformance in a network-isolated, throw-away environment.
- Make promotion requirements, source-copy limits, operator decisions, and
  Golden immutability auditable.

### Non-goals

- No automatic legal compatibility judgement, dependency installation,
  provider-account creation, deployment, real payment/identity access, or
  upstream contribution.
- No whole-repository vendoring, Git submodules, copied application assets,
  migrations, sample data, credentials, or external-service configuration.
- No reverse parsing of upstream applications into a Factory Application Graph.
- No runtime execution of downloaded source, generated source, arbitrary
  package scripts, or discovered examples.
- No change to the current `factory.capability/v1` Golden asset contract in
  this intake phase. Candidate data is separate and cannot be represented as a
  capability selection or asset lock.

## Ownership boundary

| Concern                   | Factory owns                                                                                   | Intake system may observe or generate                                               | It must never own or do                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Product semantics         | `ApplicationGraphV1`, profile validators, PolicyModel, FlowModel, Published Revision hash      | Mapping proposal from a reviewed source feature to a candidate capability interface | Persist upstream models as Graphs; mutate Draft/Published data; execute upstream workflow logic |
| Capability implementation | Factory-authored package, manifest, templates, fixtures, adapter, tests, notices, removal path | Candidate manifest/skeleton outside runtime paths                                   | Copy/vend a fragment or register a candidate as Golden                                          |
| Source evidence           | Snapshot address, SHA-256 digests, licence/notice text locations, scan versions/results        | Retrieve public source bytes into quarantine                                        | Treat a branch/ref, a repository badge, or scanner guess as immutable provenance                |
| Provider integration      | Factory contract, fixture provider, conformance suite, Published-Graph projection              | Document endpoints/data mapping without credentials                                 | Call providers during scan, provision accounts, or let provider schemas define Factory data     |
| Promotion                 | Named reviewer decision committed with exact evidence references                               | Gate status and machine-readable promotion packet                                   | Auto-promote or silently waive warnings/failures                                                |

The intake worker is an offline analysis tool. It has no Control Plane route
that accepts an Application Graph, no credentials beyond public retrieval, no
write access to `apps/` or `packages/`, and no path from its Candidate registry
to the compiler. This retains the existing rule that direct dependencies,
providers, source studies, and reference-only projects are different adoption
classes. [Open-source adoption register](../../ecosystem/open-source-adoption.md)

## Storage and data model

All paths below are design targets. They are deliberately outside product
runtime import paths; access is by opaque intake ID and digest, never a
user-supplied filesystem path.

```text
ecosystem/
  intake/
    jobs/<job-id>/job.json
    sources/<publisher>/<repository>/<commit-sha>/source.tar.zst
    evidence/<source-digest>/
      acquisition.json
      provenance.json
      licence.json
      notices.json
      sbom.cdx.json
      scans/{licence,secrets,sast,dependencies}.json
      ast/module-inventory.json
      receipt.json
    candidates/<candidate-id>/<candidate-version>/
      candidate.json
      fixture.json
      adapter.json
      conformance-plan.json
      conformance-result.json
  promoted/<candidate-id>/<promotion-digest>.json
docs/ecosystem/source-studies/<publisher>-<repository>-<commit>.md
docs/third-party-notices.md
```

`ecosystem/intake/**` is an analysis quarantine and is ignored by product
build/runtime resolution. `ecosystem/promoted/**` is evidence only. A promoted
Factory asset is independently authored and remains under the existing
`packages/capabilities/assets/<key>/<version>/` Golden package layout.

### Core records

The following pseudo-types specify the persistent interface. Hashes are
lower-case `sha256:<64 hex>` values. Every record has a schema version,
canonical JSON digest, creation time, producer version, and parent digests.

```ts
type IntakeRequestV1 = {
  apiVersion: "factory.external-intake-request/v1";
  source: {
    canonicalRepositoryUrl: string;
    requestedRef: string; // tag or full commit; branches are invalid
    expectedCommit?: string;
    portfolioRecord?: string;
  };
  classification: "direct-dependency" | "source-study" | "provider";
  requestedModules: readonly { path: string; symbol?: string }[];
  allowNetworkRetrieval: true;
};

type SourceSnapshotV1 = {
  apiVersion: "factory.external-source-snapshot/v1";
  repositoryUrl: string;
  requestedRef: string;
  resolvedCommit: string; // exactly 40 lower-case hex characters
  retrievedAt: string;
  archiveDigest: string;
  treeDigest: string;
  includedPaths: readonly string[];
  excludedPaths: readonly string[];
  originEvidence: readonly {
    url: string;
    retrievedAt: string;
    digest: string;
  }[];
};

type ExternalSourceAcquisitionV1 = {
  apiVersion: "factory.external-source-acquisition/v1";
  sourceRequestDigest: string;
  source: {
    canonicalRepositoryUrl: string;
    requestedRef: string;
    resolvedCommit: string;
  };
  snapshot: {
    recordDigest: string;
    archiveDigest: string;
    treeDigest: string;
    entryCount: number;
    declaredBytes: number;
  };
  licence: {
    primaryPaths: readonly string[];
    textDigests: readonly string[];
  };
  notices: readonly { path: string; digest: string; required: boolean }[];
  provenance: readonly {
    url: string;
    retrievedAt: string;
    digest: string;
  }[];
  manualStatus: "unreviewed";
  acquisitionState: "acquired" | "blocked";
  failureCode?: string;
};

type EvidenceBundleV1 = {
  apiVersion: "factory.external-evidence/v1";
  snapshotDigest: string;
  licence: {
    primaryPaths: readonly string[];
    textDigests: readonly string[];
    scannerExpression?: string;
    manualStatus: "unreviewed" | "approved" | "rejected";
  };
  notices: readonly { path: string; digest: string; required: boolean }[];
  sbom: { format: "CycloneDX"; digest: string; components: number };
  scans: readonly {
    kind: "licence" | "secret" | "sast" | "dependency";
    tool: string;
    toolVersion: string;
    rulesetDigest: string;
    resultDigest: string;
    status: "pass" | "fail" | "unavailable";
  }[];
  ast: { parser: string; parserVersion: string; inventoryDigest: string };
};

type CandidateCapabilityV1 = {
  apiVersion: "factory.candidate-capability/v1";
  id: string;
  version: string;
  status: "quarantined" | "conformance-passed" | "blocked" | "rejected";
  sourceSnapshotDigest: string;
  evidenceDigest: string;
  proposedFactoryKey: string;
  proposedClassification: "dependency" | "source-fragment" | "provider-adapter";
  selectedModules: readonly {
    path: string;
    symbol?: string;
    digest: string;
    purpose: "reference" | "proposed-copy" | "adapter-contract";
  }[];
  allowedOutputs: readonly (
    "manifest" | "fixture" | "adapter" | "conformance-plan"
  )[];
  prohibited: readonly string[];
  candidateManifestDigest: string;
  fixtureDigest: string;
  adapterDigest?: string;
  conformanceResultDigest?: string;
};

type PromotionDecisionV1 = {
  apiVersion: "factory.external-capability-promotion/v1";
  candidateDigest: string;
  decision: "promoted" | "rejected";
  reviewedBy: readonly string[];
  reviewedAt: string;
  sourceCopy: readonly {
    path: string;
    lineRanges: readonly string[];
    purpose: string;
  }[];
  licenceDecision: "compatible" | "incompatible";
  noticesDestination?: string;
  replacementPath: string;
  goldenAsset?: { key: string; version: string; manifestDigest: string };
};
```

`ExternalSourceAcquisitionV1` is a distinct persistent record. It is never a
Candidate and never an `EvidenceBundleV1`. Task 2 may assert only fixed-source
acquisition, snapshot/tree, licence/notice, provenance, the literal
`manualStatus: "unreviewed"`, and its explicit acquisition state. Its strict
schema rejects SBOM, scanner, scan-result, and AST identities or fields. Task 3
consumes the acquisition record with pinned scanner and inventory outputs to
create the first truthful `EvidenceBundleV1`.

Source bytes and scan reports are content-addressed. A job records only
references to them. Re-running a request with the same resolved commit,
archive/tree digests, scanner versions, and ruleset digests returns the same
evidence digest; a difference creates a new Candidate revision, never mutates
an old one.

## Candidate and Golden registries

| Property            | Candidate registry                                                                           | Golden registry                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Purpose             | Quarantined evidence and proposed capability boundary                                        | Approved, Factory-owned executable capability assets                                                        |
| Location            | `ecosystem/intake/candidates/**` only                                                        | Existing `packages/capabilities/assets/**` and Factory registry                                             |
| Source relationship | Snapshot digests and explicit proposed-copy paths                                            | Factory-authored manifest/template/fixture digests; attribution links to promotion evidence                 |
| Graph visibility    | None. Cannot appear in `integration.capabilities`, `assetLocks`, or `compositionSelections`. | A valid Golden lock may appear in a Draft selection; semantic validation and publication rules still apply. |
| Compiler visibility | None. Compiler rejects Candidate IDs, paths, and digests.                                    | Compiler accepts only exact registered Golden identities, then only from a Published Revision.              |
| Mutability          | New evidence revision replaces no historical candidate; status transitions append receipts.  | Version/digest immutable. Changes are a new Golden version and new review.                                  |
| Authority           | Tool output only; never a legal, product, or release decision.                               | Factory registry plus reviewed promotion; still not a Graph source of truth.                                |

Candidate manifests are intentionally not `factory.capability/v1`. They may
share field names for comparison but omit output source content and can never
be loaded through `verifyCapabilityAssetPackage`. The existing digest-verified
Golden package, declarative adapter, fixture, contract-test, safe package-path,
and target-prefix constraints remain the only execution boundary.

## Bulk intake pipeline

Each source proceeds independently; a failed source does not make a batch
partially promotable.

1. **Validate request and resolve reference.** Accept only canonical Git URLs
   from an allow-list of public hosts, exact tag names, or full commit hashes.
   Resolve a tag to one full commit SHA through official-host archive metadata.
   Reject branches, pull refs, floating releases, redirects outside the origin
   host, credentials in URLs, duplicate source IDs, and an `expectedCommit`
   mismatch.
2. **Acquire immutable snapshot.** Retrieve a source archive without Git hooks,
   package lifecycle scripts, containers, or repository code. Verify commit/ref
   correspondence; canonicalize paths; reject symlinks, absolute/traversal
   paths, special files, nested archives, and files beyond byte/count limits.
   Store archive and tree digests.
3. **Collect provenance, licence, and notices.** Locate exact `LICENSE`,
   `COPYING`, `NOTICE`, and declared third-party notice paths. Record byte
   digests and original URLs at the resolved commit. A scanner may suggest an
   SPDX expression, but only a reviewer can approve licence compatibility.
   Persist `factory.external-source-acquisition/v1` with
   `manualStatus: "unreviewed"` and an explicit acquisition state. Task 2 emits
   `{ snapshot, acquisition }`; it does not emit an EvidenceBundle or use a
   phase marker as an SBOM, scanner, scan result, or AST identity.
4. **Generate SBOM and scan bundle.** Build an SBOM from lockfiles/manifests
   without installation. Run pinned offline-capable licence, secret, SAST, and
   dependency scanners over snapshot bytes. Record tool/ruleset/report digests
   and disable scanner network calls after the logged acquisition step. Task 3
   combines these outputs with the accepted acquisition record and AST
   inventory to persist `EvidenceBundleV1`.
5. **Inventory AST/modules.** Parse allow-listed languages with pinned parsers;
   retain path, symbol, import/export edges, declared dependencies, size,
   notice markers, generated-file indication, and source digest. AST inventory
   is a locator, not a code transformer. Unsupported language, parse error,
   dynamic load/evaluation, or generated/binary source blocks a proposed-copy
   module.
6. **Emit Candidate artifacts.** Produce a declarative candidate manifest,
   minimal JSON fixture, adapter skeleton where appropriate, and conformance
   plan. Artifacts contain identifiers, schemas, effect names, and expected
   behaviours—not copied implementation bodies. The job must state why a
   published package is insufficient before it labels a module `proposed-copy`.
7. **Run isolated conformance.** Test only Factory-owned Candidate fixture and
   adapter projection in a fresh, network-denied sandbox with a read-only
   snapshot. Assert deterministic output, safe paths, schema rejection, no
   Graph mutation, no credentials/raw AI fields, and no filesystem/process
   access beyond the sandbox. Passing makes it `conformance-passed`, not Golden.
8. **Create promotion packet.** Assemble exact evidence/snapshot/candidate
   digests, path and line-range copy ledger, finding dispositions, notice text
   destination, test evidence, removal path, and required reviewers. The CLI
   can render this packet but cannot approve it.

## Fail-closed rules

The pipeline fails one source record closed, preserves the failure receipt, and
emits no Candidate capable of promotion when any of these apply:

- Ref cannot resolve to the requested exact SHA, archive/tree digests differ,
  or origin/provenance evidence is missing.
- Licence, notice, or attribution paths are absent, unreadable, ambiguous,
  modified after scan, or lack an approved human compatibility decision.
  Scanner classification alone never passes this gate.
- Licence is GPL, AGPL, SSPL, BSL, source-available, custom reciprocal, or
  otherwise excluded by current policy; this blocks source copying/embedding
  even if an AST scanner reports no security issue.
- Snapshot contains a secret finding, critical/high unresolved dependency or
  SAST finding, unsupported required scan, scanner failure, parser failure,
  dynamic execution, symlink/path escape, or prohibited generated/binary/vendor
  tree.
- Candidate declares copied content without exact snapshot path, source digest,
  purpose, and line ranges; selects more than configured file/line/byte limits;
  includes UI assets, migrations, seed/customer data, tests that execute
  upstream code, credentials, network/webhook/payment code, or a whole module
  when a smaller boundary is possible.
- Candidate differs from evidence digests; fixture/adapter has unsafe paths,
  undeclared parameters/effects, arbitrary URLs/code, or permits a Graph,
  policy, flow, or Published Revision mutation.
- Candidate/Golden identities or output targets collide, a required interface
  is absent, or a Candidate is referenced from Graph, compiler, package
  registry, dependency manifest, or generated application.

Only a **documented human promotion** may turn a `conformance-passed`
Candidate into a Golden asset. A waiver cannot be stored as a scan-status
override; it requires a new policy decision outside this design.

## CLI and API contract

The first delivery is a repository-local CLI plus file-backed worker queue;
there is no public Control Plane endpoint and no browser capability picker.

```text
factory intake batch submit --file portfolio-intake.json
factory intake status <job-id>
factory intake evidence <source-digest>
factory intake candidate show <candidate-id>@<version>
factory intake candidate test <candidate-id>@<version>
factory intake promotion packet <candidate-id>@<version> --out <path>
factory intake verify --job <job-id>
```

- `batch submit` validates each `IntakeRequestV1` but creates separate source
  work items. It accepts only a local JSON request file; it does not scrape
  arbitrary search results or accept an interactive URL.
- `status` exposes state, hashes, scanner/tool versions, counts, and failure
  codes. It never prints snapshot content, secrets, raw scanner matches, or
  unredacted source text.
- `evidence` returns metadata/digests and stable file references to authorized
  local reviewers. It does not serve executable archives to runtime callers.
- `candidate test` re-runs isolated Factory-owned conformance against immutable
  digests. It has no `--promote` option.
- `promotion packet` is read-only and has no approval flag. Promotion occurs
  by a reviewed commit that adds a `PromotionDecisionV1`, source-study record,
  notices, and independently authored Golden package.

If a later internal API is required, it mirrors these commands under
`/internal/external-intake/v1` with service authentication and strict request
schemas. It is job/evidence-only: it rejects Graph payloads, arbitrary paths,
credential fields, source bodies, and promotion commands.

## Promotion gates

| Gate                      | Required evidence                                                                                                             | Decision owner              | Result on failure                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------- |
| Fixed provenance          | Resolved SHA, archive/tree digests, origin URLs, retrieval receipt                                                            | Intake maintainer           | Candidate blocked                        |
| Licence and notices       | Primary licence bytes, notice inventory, exact copy ledger, reviewed compatibility, `docs/third-party-notices.md` destination | Licence/maintainer reviewer | Candidate rejected for source reuse      |
| Security and supply chain | SBOM, pinned tool/ruleset digests, licence/secret/SAST/dependency reports, resolved findings                                  | Security reviewer           | Candidate blocked; no waiver in registry |
| Module boundary           | AST inventory, selected paths/ranges, byte/line limits, no excluded folders, reason package is insufficient                   | Capability maintainer       | Candidate blocked                        |
| Factory design            | Factory interface, schema, parameters, Graph contributions, policy/flow constraints, provider removal path                    | Architecture owner          | Candidate blocked                        |
| Candidate conformance     | Isolated deterministic fixture/adapter tests, invalid-input tests, no Graph/runtime side effects                              | QA owner                    | Candidate remains quarantined            |
| Golden promotion          | Source study, promotion decision, notices, Factory-owned package, digest verification, compiler/profile regression evidence   | Code + release reviewer     | No Golden registration                   |

For a direct dependency, the same gates apply except `sourceCopy` is empty and
the promotion evidence pins the published package/version/integrity hash. For
a provider adapter, source copying is normally empty; its special gates add
provider fixture conformance, capability mapping, no credential persistence,
and proof that a native/fixture provider can replace it without a Graph change.

## Source-copy and vendoring rules

1. Snapshot bytes are research evidence, not a dependency or vendored tree.
2. A promotion may copy only paths and line ranges in the reviewed
   `PromotionDecisionV1`; omissions and wildcards are invalid.
3. Copied implementation must be the smallest practical fragment, retain all
   required notices, include an attribution pointer, have a Factory-owned test,
   and sit in a Factory-owned module. Whole repositories, submodules,
   generated code, UI assets, documentation examples, migrations, package
   manifests, and lockfiles are never copied by this intake.
4. The resulting Factory module may not expose an upstream runtime/data model
   as a Graph input/output or let upstream configuration bypass Factory
   validation, policy, audit, Draft/Publish, or compilation boundaries.
5. Any source change, upstream commit, new copy range, or upgraded direct
   dependency is a new intake and promotion; it cannot mutate a historical
   Golden asset.

## Migration phases

| Phase                           | Scope                                                                                                                                                    | Exit evidence                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 0. Foundation                   | Define versioned record schemas, canonical hashing, quarantine directories, source-host allow-list, job receipts, and a test-only local archive fixture. | Unit tests prove deterministic records; no runtime package imports intake paths.                                |
| 1. Evidence acquisition         | Implement fixed-ref resolver, archive/tree hashing, provenance/licence/notice capture, and source-study renderer.                                        | Amplication and Medusa existing studies reproduce as reference-only receipts without source copying.            |
| 2. Scanning and inventory       | Add SBOM plus offline licence/secret/SAST/dependency scans and AST inventory with pinned tool/ruleset versions.                                          | Deliberately unsafe fixtures fail closed for every scanner/parser/path rule.                                    |
| 3. Candidate lane               | Add Candidate registry, JSON fixture/adapter skeleton emission, conformance sandbox, status/report CLI, and compiler/Graph rejection tests.              | A permissive portfolio item becomes `conformance-passed` but cannot compile or be selected.                     |
| 4. Governed promotion           | Add promotion-packet verification, copy ledger, notices integration, Golden registration check, and release-review evidence.                             | One small Factory-owned asset reaches Golden through a reviewed commit; historical Candidate remains immutable. |
| 5. Provider/dependency variants | Add provider/dependency-specific conformance fixtures and upgrade/revocation workflow.                                                                   | A fixture provider and a real optional provider are swappable with no Graph semantic change.                    |

## Verification strategy

- Unit tests: canonical hashing, ref/SHA mismatch, path/symlink escape,
  Candidate-vs-Golden rejection, deterministic receipt creation, notice and
  copy-ledger completeness.
- Adversarial fixtures: branch ref, redirect, mutable tag, altered archive,
  dual licence, missing notice, GPL/AGPL/custom licence, injected secret,
  vulnerable lockfile, dynamic `eval`, shell/process launch, unsafe archive,
  parser failure, generated source, oversized fragment, and duplicate target.
- Conformance tests: a Candidate can produce only declarative artifacts;
  fixtures are stable; adapter projection cannot mutate a Draft/Published
  Graph, policy, flow, audit, compiler output, filesystem, or network.
- Integration tests: compiler rejects a Candidate lock and accepts only exact
  registered Golden digest/version after publication; a provider fixture can
  be swapped without changing a valid Graph.
- Release evidence: `prettier`, record-schema tests, scan fixture suite,
  source-study verification, third-party-notice verification, focused package/
  compiler/profile tests, and manual review of promotion paths/notices.

## Explicitly deferred work

Automated legal advice, GitHub/App Marketplace accounts, private-source intake,
binary decompilation, code transformation, broad package mirroring, continuous
upstream monitoring, automated pull requests, and actual provider deployment
are deferred. They expand the trust boundary and require separate security,
legal, and product decisions.
