# Application Graph platform

## Source of truth

`ApplicationGraphV1` is Factory Pilot's stable business representation. It
contains Page, Domain, Policy, Flow, Integration, and Experience models.
Editors import and export Graph fragments; generated source is a compilation
artifact, not a replacement source of truth.

## Lifecycle

1. A workspace owns a mutable Draft and its ordered draft revisions.
2. Publishing validates and hashes the selected Draft revision.
3. The immutable Published Revision is the only compilation input.
4. A Compilation records target outputs, validation results, artifacts, and
   generated application isolation metadata.

## Adapter boundary

Puck owns no Factory data and maps PageModel data into and out of Graph
fragments. React Flow does the same for FlowModel, relationship and lineage
visualization. AI submits schema-validated Graph Diffs that can only alter a
Draft. Git export/import remains Graph-first and never parses arbitrary source
as an application definition.

## Graph-first Git exchange

The Control Plane exports only a verified immutable Published Revision as a
`factory.published-graph-exchange/v1` JSON document. Its payload contains the
Graph, the published revision number, and the SHA-256 Graph digest. It excludes
generated source, compilation artifacts, provider metadata, credentials, raw
AI prompts, and raw AI responses.

Store that document in a Git repository as the durable, reviewable input to a
future Factory workspace. Import verifies the exchange shape and digest, then
creates a new mutable Draft; it never creates a Published Revision or attempts
to reverse-parse arbitrary source. The local Control Plane routes are:

```text
GET  /application-graphs/:applicationGraphId/published-revisions/:publishedRevisionId/export
POST /workspaces/local/application-graphs/import
```

The import body is `{ "exchange": <published-graph-exchange> }`. A Graph's
workspace ID must match the local v1 workspace, and its Graph key must be new.
These constraints make import fail closed instead of overwriting an existing
application.

The same boundary applies to every ecosystem project. A library can render,
edit, compile, enforce, or host a Graph projection, but it may not become the
stored business model, mutate a Published Revision, or execute an unrestricted
Graph effect. `docs/ecosystem/open-source-adoption.md` records the allowed role
and source-intake rules for each external project.

## Ecosystem adoption boundary

| Tier | Meaning | Examples |
| --- | --- | --- |
| Direct dependency | A pinned published package is invoked through a Factory-owned adapter or compiler boundary. | Puck, React Flow, XState, Prisma, node-casbin |
| Provider contract | Factory owns the Graph mapping; an external service is optional and replaceable. | Appwrite, Medusa, OpenFGA |
| Source study | An exact upstream commit is inspected for patterns or a separately approved, legally compatible fragment. | Amplication |
| Reference only | Architecture may be studied but source is not copied, linked, or embedded. | Vendure |

No whole-repository copy is an integration strategy. Before a source fragment
can be copied, the source-study record must name its repository, immutable
commit, file paths, licence, notice obligations, purpose, tests, and removal
path. The resulting Factory-owned code must not expose the upstream project's
runtime or data model as Factory's source of truth.

## Compilation targets

The initial compiler targets are a browser role simulator, Next.js web app,
NestJS REST API, Prisma/PostgreSQL schema and migrations, Casbin policy,
XState flows, tests, API reference, ERD, and permission matrix.
