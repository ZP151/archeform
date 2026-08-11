# Technology Governance

## Purpose and authority

This document is Archeform's current technology-decision authority. Product
requirements describe outcomes; they do not authorize a runtime, dependency,
data contract, provider, security boundary, or deployment choice. Product
designs, plans, research, and generated proposals cannot silently supersede
this authority or the current threat model in `docs/threat-model.md`.

| Role      | Authority                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| PM        | Detects governance triggers, records live state, and authorizes implementation only after the required decision gates.      |
| Tech Lead | Investigates one concrete trigger, writes only a proposed ADR, and recommends `keep`, `experiment`, `migrate`, or `reject`. |
| Founder   | Explicitly accepts or rejects a proposed ADR. No other role can approve a profile or stable-contract transition.            |
| Engineer  | Implements only an accepted decision and only within PM-assigned paths.                                                     |

A Tech Lead recommendation is not approval. Explicit founder acceptance must be
recorded by PM before implementation of a proposed technology transition.

## Current accepted Golden profile

The current accepted Golden profile is the repository's TypeScript application
platform and its immutable lifecycle:

- Node.js 22 (the root manifest requires `>=22.11.0 <23`; tracked Dockerfiles
  use `node:22-alpine`, a floating major tag and not an exact patch pin) and
  pnpm 9;
- Next.js 15 and React 19 for `apps/workbench`, with Puck 0.22 and XYFlow 12 as
  visual-editor adapters;
- NestJS 10 for `apps/control-plane`, Prisma 6 over PostgreSQL 16 for durable
  lifecycle state, and BullMQ 5 with Redis 7 for compilation work;
- the TypeScript compiler and generated Next.js/React application templates in
  `packages/compiler`;
- Docker Compose for the isolated local control-plane, compiler-worker,
  Workbench, PostgreSQL, Redis, and generated-preview topology;
- `factory.application-graph/v1` as the currently implemented serialized Graph
  contract.

The authoritative concrete facts are the tracked manifests, `pnpm-lock.yaml`,
Dockerfiles, and `infra/docker-compose.yml`. Manifest ranges express supported
versions; the lockfile records exact resolved package versions. This document
does not invent a pin that those artifacts do not carry.

Supported semver ranges come from manifests, exact resolved versions come from
the lockfile, and image tags are floating-major constraints rather than exact
pins. This table is the executable Golden-profile authority; the gate parses
every row and compares its values bidirectionally with the named artifacts.

<!-- d0-golden-profile:start -->

| Kind       | Row ID                              | Artifact / importer               | Coordinate                              | Supported manifest value | Exact lockfile resolution | Floating-major image tag | Expected count |
| ---------- | ----------------------------------- | --------------------------------- | --------------------------------------- | ------------------------ | ------------------------- | ------------------------ | -------------- |
| manifest   | root-node-engine                    | `package.json`                    | `engines.node`                          | `>=22.11.0 <23`          | —                         | —                        | —              |
| manifest   | root-package-manager                | `package.json`                    | `packageManager`                        | `pnpm@9.0.0`             | —                         | —                        | —              |
| package    | root-typescript                     | `.`                               | `devDependencies:typescript`            | `^5.7.2`                 | `5.9.3`                   | —                        | —              |
| package    | workbench-puck                      | `apps/workbench`                  | `dependencies:@puckeditor/core`         | `^0.22.3`                | `0.22.3`                  | —                        | —              |
| package    | workbench-xyflow                    | `apps/workbench`                  | `dependencies:@xyflow/react`            | `^12.3.6`                | `12.11.2`                 | —                        | —              |
| package    | workbench-next                      | `apps/workbench`                  | `dependencies:next`                     | `^15.1.0`                | `15.5.22`                 | —                        | —              |
| package    | workbench-react                     | `apps/workbench`                  | `dependencies:react`                    | `^19.0.0`                | `19.2.8`                  | —                        | —              |
| package    | workbench-react-dom                 | `apps/workbench`                  | `dependencies:react-dom`                | `^19.0.0`                | `19.2.8`                  | —                        | —              |
| package    | control-plane-nest-common           | `apps/control-plane`              | `dependencies:@nestjs/common`           | `^10.4.15`               | `10.4.22`                 | —                        | —              |
| package    | control-plane-nest-core             | `apps/control-plane`              | `dependencies:@nestjs/core`             | `^10.4.15`               | `10.4.22`                 | —                        | —              |
| package    | control-plane-nest-platform-express | `apps/control-plane`              | `dependencies:@nestjs/platform-express` | `^10.4.15`               | `10.4.22`                 | —                        | —              |
| package    | control-plane-prisma-client         | `apps/control-plane`              | `dependencies:@prisma/client`           | `^6.1.0`                 | `6.19.3`                  | —                        | —              |
| package    | control-plane-bullmq                | `apps/control-plane`              | `dependencies:bullmq`                   | `^5.34.10`               | `5.81.2`                  | —                        | —              |
| package    | control-plane-prisma-cli            | `apps/control-plane`              | `devDependencies:prisma`                | `^6.1.0`                 | `6.19.3`                  | —                        | —              |
| package    | compiler-worker-bullmq              | `apps/compiler-worker`            | `dependencies:bullmq`                   | `^5.34.10`               | `5.81.2`                  | —                        | —              |
| package    | compiler-worker-ioredis             | `apps/compiler-worker`            | `dependencies:ioredis`                  | `^5.4.2`                 | `5.11.1`                  | —                        | —              |
| dockerfile | workbench-node-image                | `apps/workbench/Dockerfile`       | `FROM`                                  | —                        | —                         | `node:22-alpine`         | `2`            |
| dockerfile | control-plane-node-image            | `apps/control-plane/Dockerfile`   | `FROM`                                  | —                        | —                         | `node:22-alpine`         | `2`            |
| dockerfile | compiler-worker-node-image          | `apps/compiler-worker/Dockerfile` | `FROM`                                  | —                        | —                         | `node:22-alpine`         | `2`            |
| compose    | compose-postgres-image              | `infra/docker-compose.yml`        | `postgres`                              | —                        | —                         | `postgres:16-alpine`     | —              |
| compose    | compose-redis-image                 | `infra/docker-compose.yml`        | `redis`                                 | —                        | —                         | `redis:7-alpine`         | —              |

<!-- d0-golden-profile:end -->

The root tool declaration is `pnpm@9.0.0`. All build and runtime stages in the
three tracked Dockerfiles use the floating-major `node:22-alpine` image tag.
Compose similarly uses the floating-major `postgres:16-alpine` and
`redis:7-alpine` image tags. These image tags constrain a major line; they are
not exact patch or digest pins.

The lifecycle is mutable Draft -> immutable Published Graph -> immutable
Compilation. Compilers never consume a mutable Draft. Environment-only model
credentials remain server-boundary inputs and never enter Graphs, persistence,
generated artifacts, logs, evidence, or browser bundles.

## Accepted decisions and implementation state

A proposed profile is not part of the current accepted Golden profile. It must
remain isolated behind a proposed ADR until the founder explicitly accepts or
rejects it and PM records that decision.

ADR-0009 is founder-accepted. It keeps the current Golden runtime profile and
authorizes an additive `factory.application-graph/v2` shared data contract, but
acceptance of the decision is not evidence that V2 is implemented or frozen.
`factory.application-graph/v1` remains the currently implemented contract. The
PM ledger is the sole authority for current task state, V2 implementation
authorization, review, acceptance, commit, and push handoffs; this document
does not restate that live state.

## Exhaustive dispatch triggers

PM dispatches the Tech Lead before implementation for any change to:

- a runtime, framework, package, or supported version;
- a database, ORM, queue, provider, or Compose topology;
- a stable Graph, API, schema, identifier, serialization, or compatibility
  contract;
- a security, credential, tenant, or data boundary;
- a compiler target, generated template, deployment, or operability contract;
- any current-to-proposed Golden profile transition.

Routine implementation wholly inside an accepted profile and frozen contract
does not need a new ADR. Uncertainty about whether a trigger applies is itself
a reason to stop and dispatch the Tech Lead.

## ADR decision gate

A proposed ADR must include:

1. the current accepted profile and the proposed profile or contract;
2. exact versions or a precise versioned serialization identifier, with the
   manifests and lockfiles that govern them;
3. alternatives and a `keep`, `experiment`, `migrate`, or `reject`
   recommendation;
4. API, data, adapter, catalog, license, supply-chain, security, and
   operability effects;
5. migration, rollback, abort conditions, irreversible steps, and ownership;
6. measurable verification commands and the ledger evidence location.

The Tech Lead stops after proposing. Founder acceptance or rejection is an
explicit separate event. PM records the decision and may authorize work only
after acceptance; inference from plan prose, implementation intent, or task
ordering is forbidden.

## Frozen contracts and parallel work

Before frontend and backend writers run in parallel, PM records a contract
owner, versioned request/response or event shape, errors, actor and
authentication semantics, compatibility rule, artifact path, and `frozen`
status. Parallel paths must be disjoint. A shared-contract change stops both
writers and returns the work to serialized integration ownership.

Generated templates, shared Graph/API contracts, Compose topology, migrations,
and end-to-end smoke paths remain serialized integration work even when their
consumers can later proceed in parallel.
