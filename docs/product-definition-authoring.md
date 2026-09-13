# Authoring reviewed product definitions

This is an internal authoring workflow. Ordinary users still describe their
business need through the existing consumer flow; they do not edit this data,
run the validator or manage Draft/Publish/Compilation steps.

The reviewed catalogue is
`packages/adapters/src/requirements/definitions/product-definitions.v1.json`.
Its four entries supply canonical requirements/blueprints and selection
guidance. Fixed adapter family code owns validation, projection and execution
bindings. A definition cannot select a package, module, route or executable
template. The exact private data authority is accepted ADR-0065.

## Author a candidate

Start with a reviewed entry from the same supported family. Describe a real
business job and the fields, authority, correction and failure behavior it
requires. Keep the full strict catalogue envelope, including the versioned
entry, canonical checksum, selection guidance, journeys, execution expectations
and first-party provenance. Static reviewed guidance belongs in the data;
credentials and raw user/model prompts or responses never do.

Change only semantics the existing family can execute. Update canonical fields
and corresponding guide data together. Keep execution expectations equal to the
fixed family row; changing an expectation never enables a runtime capability.
A different title, role label, example or case key is not a distinct product.

| Family              | Current reusable boundary                                                              | Requirements that need another capability decision                         |
| ------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Restaurant Ordering | Accepted V3 ordering authority and bounded menu parameters                             | New authority, live payment or external integrations                       |
| Approval            | One-stage submit/approve/return with same-record correction and supported typed fields | Multiple reviewers, thresholds, private ownership or external provisioning |
| Team Task           | Exact Task V2 fields, state transitions and correction policy                          | New fields/states, private assignment, scheduling or additional actions    |

Build the adapters and validate the checked-in catalogue:

```powershell
pnpm --filter @factory/adapters build
node packages/adapters/dist/requirements/definition-batch-cli.js
```

To validate a local candidate in PowerShell, send its UTF-8 contents through
stdin. The validator itself accepts no candidate path and never writes files:

```powershell
Get-Content -Raw -Encoding utf8 candidate.json | node packages/adapters/dist/requirements/definition-batch-cli.js --stdin
```

Input is limited to 2 MiB and 100 definitions. Duplicate JSON members, malformed
UTF-8, unknown keys and unsupported semantics fail with bounded reason codes.
Unknown CLI arguments fail without echoing their values.

## Interpret the result

- `attempted`: entries in the parsed bounded batch.
- `valid`: entries passing the strict versioned data schema.
- `distinct`: family-valid, non-colliding semantic definitions.
- `admitted`: entries that also exactly match the trusted checked-in catalogue.

A valid new candidate can have `admitted: 0`. Validation does not register it.
The V1 reason vocabulary has no separate unregistered-candidate code, so a
family-valid candidate outside the catalogue uses
`definition.unsupported-semantics`; its nonzero `valid` and `distinct` counts
separate that case from a family validation failure. Review the candidate's
business demands before considering admission. A re-keyed cosmetic duplicate
submitted alongside its original is rejected for both entries.

Exit `0` means every entry is already admitted; exit `1` means a data/admission
failure; exit `2` means an invocation, trusted-file IO or internal failure.
Reports contain safe identifiers, computed fingerprints and reason counts,
without reflecting business payloads or instructions.

## Prove reuse before increasing coverage

The independent compiler authoring test demonstrates one supported Approval
field variation reaching generated Prisma and UI output with no runtime/UI
source changes. It does not count as a new admitted product or actual runtime
journey. Existing definitions must still match the immutable four-definition
baseline, including every emitted file and its order.

For a new runtime admission, use the next representative batch in
`docs/superpowers/plans/2026-09-13-product-definition-scale.md`. Prove the business
job, correction, failure, persistence and responsive UI for each changed
rule/presentation combination. Reuse unchanged evidence and the existing
contract-level review sequence; do not create an approval stage per field.
Record unsupported requirements as reusable platform gaps instead of silently
dropping them to make a candidate pass.
