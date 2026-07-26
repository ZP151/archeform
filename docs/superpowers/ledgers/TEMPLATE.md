# Task Ledger: <task-id>

- **State:** planned
- **Owner:** pm
- **Single write owner:** <role or agent>
- **Specialization:** frontend | backend | platform | integration
- **Contract owner:** <role or agent; required for API, data, or shared-template changes>
- **Contract status:** frozen | unfrozen | not applicable
- **Contract artifact:** <versioned path, identifier, or not applicable>
- **Allowed write paths:** <explicit paths>
- **Read-only parallel work:** <explicit scope or none>
- **Approved ADR:** <docs/adr/... or not required>
- **Plan:** <docs/superpowers/plans/...>

## Outcome

<One observable product or governance outcome.>

## Non-goals

- <Explicitly excluded work.>

## Safety invariants

- <Threat-model or workflow boundary that cannot be bypassed.>

## Dependencies

- <Required decision, artifact, or prior task; use none when independent.>

## Acceptance criteria

1. <observable requirement>

## Coordination

Frontend and backend tasks may proceed in parallel only with a `frozen` Contract status, the same versioned Contract artifact, a named Contract owner, and disjoint Allowed write paths. A contract change stops parallel work. An unfrozen shared contract is owned by `integration` and remains serialized.

## Implementation evidence

- **Changed paths:** <exact paths>
- **RED:** <command and expected failing output>
- **GREEN:** <command and passing output>
- **Residual risks:** <known gaps or none>

## Task review

- <P0/P1/P2 findings and remediation, or clean verdict>

## QA

- <behavioral commands, output, and gaps>

## Release review

- <findings or clean verdict>

## PM decision

- <date, accepted/rejected decision, and evidence>
