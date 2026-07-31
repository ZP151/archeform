# Live External Source Acquisition Design

## Status

Accepted for planning by the Factory controller on 2026-08-01.

## Purpose

Turn the accepted fixture-only External Capability Intake into a real,
quarantine-first acquisition lane for fixed public GitHub sources. The lane
must make large-scale ecosystem research actionable without treating an
upstream repository, a Candidate record, or downloaded source as a Factory
capability or as Application Graph input.

This is an acceleration capability for the Profile portfolio. It does not make
manually implementing a Restaurant application the product strategy. Its job
is to prepare verified, attributable inputs from which Factory-owned generic
capabilities can be designed, adapted, and tested.

## Current state

The repository already has the non-network foundations:

- `GitHubFixedSourceClient` resolves a canonical public GitHub repository and
  exact tag or full commit to an immutable 40-character commit;
- `acquireSourceEvidence` writes a snapshot, primary licence, required notices,
  provenance and redacted receipt into a content-addressed quarantine;
- evidence, scanner, module-inventory, Candidate and promotion-packet
  contracts are strict and isolated from Graph, Golden asset and compiler
  boundaries; and
- the Intake CLI currently only validates and records fixture batch requests.

No current CLI, Control Plane, Worker, Docker service or Workbench operation
invokes the live source client. No real source archive has crossed the accepted
boundary, and no installed scanner executes against an acquired archive.

## Decision

Add a CLI-only **acquisition phase** before scanning or Candidate creation:

```text
fixed Portfolio request file
  -> exact GitHub tag/SHA resolution
  -> immutable archive/tree/licence/notice acquisition
  -> content-addressed quarantine records and redacted receipts
  -> source-study metadata packet
```

The CLI command is:

```text
factory-intake batch acquire --file <local-batch.json>
```

It accepts only the existing strict
`factory.external-intake-batch/v1` request shape. Each item must already use a
canonical `https://github.com/<owner>/<repository>.git` URL, an exact tag or
full SHA, `allowNetworkRetrieval: true`, and a declared direct-dependency,
source-study or provider classification. The command processes independent
items sequentially so a bad repository cannot make an unrelated request look
acquired.

The command constructs `GitHubFixedSourceClient` internally and calls
`acquireSourceEvidence` for each validated item. It writes only opaque IDs,
digests, result counts and terminal statuses to stdout. Repository URLs,
requested references, resolved commits, source paths, licence text, archive
bytes, tree listings, scanner findings, raw source and credentials never appear
in command output.

The initial source-study packet is metadata only. It records the source
request, resolved commit, archive/tree digests, licence and notice digests,
classification, requested module count and acquisition status. It cannot
contain source text, an extracted path, a command, an executable reference,
Graph data, Candidate data, provider credentials, a Golden package identity or
copy instructions.

## Ownership and boundaries

`@factory/external-intake` owns acquisition policy and immutable records.
`@factory/intake-cli` owns only local request-file reading, internal source
client construction, sequential batch orchestration and redacted output.

The acquisition phase does not import `@factory/graph`,
`@factory/capabilities`, `@factory/compiler`, `apps/control-plane`,
`apps/compiler-worker`, Docker Compose or Workbench code. Those packages stay
unable to read the quarantine or select Candidate identities.

Acquisition does not unpack an archive to a working directory. A later,
separate materialization design must establish safe extraction limits and
installed scanner identities before a real source can enter SBOM, secret,
SAST, dependency or module-inventory processing.

## Explicit non-goals

- GitHub repository search, ranking or automatic discovery;
- source archive extraction, execution, builds, package installation, hooks,
  migrations, containers or sample applications;
- scanner execution, Candidate creation, Candidate conformance or promotion;
- automatic source copying, Generated application imports or Golden
  registration;
- Graph, Draft, Published revision, Compiler, Provider, Workbench, Control
  Plane or Worker mutation;
- authenticated GitHub requests, provider accounts, secrets or any external
  commercial API.

## How this supports rapid reuse

The source acquisition lane removes repeated manual provenance work for a
large, fixed candidate portfolio. A single batch can establish immutable
evidence for source studies such as Medusa, FloCafe, InvenTree and
TastyIgniter. After the later materialization and scanning slices, an agent can
generate a source-study packet that identifies an exact, licence-compatible
upstream utility or architecture seam. A Factory-owned adapter or a narrow,
attributed source port then receives its own fixtures, conformance suite,
package manifest and removal path.

Direct dependencies remain the fastest lane for generic technology such as
Radix, TanStack Table, BullMQ, Socket.IO, OpenTelemetry and FullCalendar. A
provider adapter remains the correct lane for Keycloak, Stripe, Adyen,
OpenFGA, routing and booking services. Neither lane changes the Graph's
ownership of business semantics.

## Acceptance criteria

- A mocked real-client CLI route exercises fixed-ref resolution and acquisition
  rather than a preflight-only API stub.
- Two independent requests show one acquired and one blocked terminal result;
  the good acquisition remains intact after the bad request fails.
- The store contains only request, snapshot, acquisition, licence/notice bytes
  and receipts for an acquired source. It contains no Candidate, promotion,
  Graph, Golden lock, compiler or generated-runtime record.
- CLI output contains only redacted status/count/digest data and cannot expose
  a URL, ref, resolved commit, source path, source text or credential-shaped
  string.
- The source-study metadata packet is deterministic for the same acquisition
  records and rejects any sensitive, executable or product-bound field.
- A guarded public smoke run resolves at most two pre-approved portfolio
  sources, records only permitted metadata/digests, and deletes only the exact
  smoke-run quarantine directory after verification.
- Existing fixture-only commands and Candidate/Golden isolation regressions
  remain green.

## Follow-on sequence

1. Implement and accept this acquisition-only slice.
2. Design a safe archive materialization and real pinned scanner slice.
3. Generate non-executable source-study packets from scanned inventory.
4. Select a small number of source-study findings for Factory-owned adapters,
   direct dependencies or narrowly attributed ports.
5. Promote only independently verified Factory packages into the reusable
   Profile capability portfolio.
