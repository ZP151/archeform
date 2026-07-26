# Composable Platform roadmap

## Product direction

Factory Pilot compiles a bounded business requirement into an Application
Definition, selects trusted component assets, composes a reproducible product,
and manages the resulting application lifecycle. It does not treat component
names or centralized rendering branches as reusable assets.

```text
Requirement -> Application Definition -> approved package locks
            -> Composition Plan -> generated application -> managed fleet
```

## Stage 0: VNext.0.1 baseline verification

Reassess the existing live-model schema compatibility repair and retain the
local Executor stop/cleanup evidence. This is a regression baseline, not a
new product architecture.

**Exit gate:** fixture and guarded real-model evidence show that structured
requirements remain bounded and no credential or raw model payload enters
state, output, logs, screenshots, or reports.

## Stage 1: Composable Internal Approval Suite MVP

Replace fixed catalog labels and the centralized generated-application renderer
on the new path with independently versioned first-party component packages,
a Golden Registry, and a declarative Composer. Prove the same package locks can
generate leave approval and expense approval applications from validated
inputs.

**Exit gate:**

- Every first package has a version, digest, schemas, declared dependencies,
  declarative adapter, fixtures, tests, and verification evidence.
- Registry indexes real packages only; no implicit code or centralized renderer
  fallback exists in the composable generation path.
- Composer emits a component lock and output manifest, rejects unsafe or
  incompatible contributions fail closed, and preserves current approval and
  evidence boundaries.
- Local Executor can generate, run, stop, and prove cleanup for both leave and
  expense applications.

**ADR decisions before implementation:** component contract representation,
digest rules, output slots and merge policy, package lifecycle states, and
migration/rollback boundaries.

## Stage 2: Trusted Registry and supply chain

Add source provenance, approved-license policy, SBOM, reproducible artifact
checks, signing, verification dates, candidate-to-Golden promotion, and
deprecation policy. External candidate discovery remains quarantined until a
separate ingestion ADR is accepted.

**Exit gate:** a component can be promoted, verified, revoked, and replaced
without silently changing existing application locks.

## Stage 3: Additional bounded application profiles

Add independent profiles for work orders, appointments, and data management.
Each owns its allowed Application Definition constraints, component mapping,
fixtures, and role-aware smoke tests.

**Exit gate:** a new profile can be added without weakening the approval-suite
contract or introducing arbitrary model-written code.

## Stage 4: Generated Application Fleet Management

Track generated application versions, environments, health, logs, controlled
upgrades, rollback, and lifecycle evidence. Generated applications remain
separate products governed by their immutable component locks.

**Exit gate:** an operator can inspect, upgrade, roll back, and retire an
application with an auditable link to its definition, locks, and output
manifest.

## Stage 5: Controlled cloud environments

Introduce Dev, UAT, and Production environments, IaC, external secrets,
deployment approvals, and supported cloud targets.

**Exit gate:** a dedicated ADR chooses target clouds, identity, secrets,
networking, data residency, and rollback policies. Cloud deployment is not
part of the Component Suite MVP.

## Decision checkpoints

| Checkpoint | Owner | Required before |
| --- | --- | --- |
| Component package and Composer ADR | Founder accepts Tech Lead proposal | Stage 1 contract freeze |
| Contract freeze | Integration | Parallel package implementation |
| Golden promotion policy ADR | Founder and Platform | Stage 2 implementation |
| Profile admission criteria | Product and Architecture | Each Stage 3 profile |
| Fleet domain model ADR | Founder and Platform | Stage 4 implementation |
| Cloud target ADR | Founder and Platform | Stage 5 implementation |
