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

## Compilation targets

The initial compiler targets are a browser role simulator, Next.js web app,
NestJS REST API, Prisma/PostgreSQL schema and migrations, Casbin policy,
XState flows, tests, API reference, ERD, and permission matrix.
