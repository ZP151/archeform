# Authoring reviewed product definitions

This is an internal authoring workflow. Ordinary users still describe their
business need through the existing consumer flow; they do not edit this data,
run the validator or manage Draft/Publish/Compilation steps.

The reviewed catalogue is
`packages/adapters/src/requirements/definitions/product-definitions.v1.json`.
Its five entries supply canonical requirements/blueprints and selection
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

## Publication Review recipe

The first additional row is `publication-review`, composed through
`approval-correction/v1` and `none/v1`. Its primary `submission` entity uses
required `articleTitle` text, required `contentBody` long text, required `channel`
enum (`blog`, `newsletter`, `social`, `documentation`), and optional
`editorialNotes` long text. Author/editor/auditor fill the existing three role
slots. The secondary author directory and six page intents reuse the family
composition; no custom projector, generated runtime, form or stylesheet is added.

Start from the checked-in row for the envelope structure, then review the new
job's actual demands. Keep field, actor, page and workflow references consistent
between canonical data and provider guidance; recalculate the canonical
requirement checksum. Preserve fixed execution expectations and supply correction
and failure cases. The existing generic adapter derives selection admission.

Reuse `e2e/helpers/approval-definition-batch.ts` for the real business journey:
declare field controls, selected enum, correction values and actual page labels.
The shared runner drives Describe through immutable delivery and the common
correction helper verifies retry, concurrency, same-record return/resubmit,
history, persistence and responsive presentation. Build packages before
Playwright collection; built workspace dependencies retain native ESM format.
Use `docs/acceptance/definition-batch-one.md` for current acceptance and limits.

Current catalogue assertions explicitly name five keys. Historical compatibility
still compares the original four keys against the unchanged
`definition-data-baseline.json`; never regenerate that baseline to admit a row.
CLI membership alone does not establish a finished business product.

Publication's actual admission found a shared presentation gap: legacy summary
selection recognized Expense/Purchase field keys only. ADR-0066 defines a
conditional generic projection using one unique required short-string business
field as title and up to two non-status enum summaries in declaration order.
List and decision history share it. This is one reusable platform extension,
with no per-product field-name branch. Definitions without an unambiguous title
remain a presentation gap; do not count them as complete because Details exists.
The family hero remains available while record photos are optional for this
product. Existing Expense/Purchase media requirements remain unchanged.
