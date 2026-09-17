# Authoring reviewed product definitions

This is an internal authoring workflow. Ordinary users still describe their
business need through the existing consumer flow; they do not edit this data,
run the validator or manage Draft/Publish/Compilation steps.

The reviewed catalogue is
`packages/adapters/src/requirements/definitions/product-definitions.v1.json`.
Its six entries supply canonical requirements/blueprints and selection
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

| Family              | Current reusable boundary                                                                               | Requirements that need another capability decision                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Restaurant Ordering | Accepted V3 ordering authority and bounded menu parameters                                              | New authority, live payment or external integrations                                           |
| Approval            | One-stage correction, typed fields, explicit numeric bounds and the closed quantity-times-price profile | Multiple reviewers, conditional decision authority, private ownership or external provisioning |
| Team Task           | Exact Task V2 fields, state transitions and correction policy                                           | New fields/states, private assignment, scheduling or additional actions                        |

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
journey. Existing definitions must retain the immutable historical fixture
digests. The identifier repair allows only ADR-0068's six physical-name mappings
across the protected five-definition database outputs; its strict test-only
inverse recovers the original complete bundles. Numeric absence adds no further
change. Never recapture a baseline to admit a new row.

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

Current catalogue assertions explicitly name six keys. A separate current-six
snapshot freezes exact generated bytes before calculated-total work. Historical compatibility
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

## Explicit numeric rules

ADR-0069 adds an optional policy to Blueprint `number` and `currency` fields:

```json
{
  "key": "fee",
  "label": "Fee",
  "type": "currency",
  "required": true,
  "numericDomain": {
    "apiVersion": "factory.numeric-field-domain/v1",
    "minimum": { "value": 0, "inclusive": false }
  }
}
```

At least one finite lower or upper bound is required. Bound objects have exactly
`value` and `inclusive`; no other policy keys are accepted. Integers with a policy
must fit Int32 and have a nonempty discrete interval. Decimal fields preserve the
existing database representation; this policy introduces no rounding, currency
unit, scale, calculated total or default positivity. Unconstrained legacy fields
retain their existing behavior. Copy the same policy into reviewed provider-guide
data so selection and semantic fingerprints preserve the declared rule.

The first supported target is the exact Approval correction family, with exactly
one required short-text title candidate, one constrained numeric business field,
and one required date/datetime field. “One title candidate” does not mean a unique
database column. Cards and matched history show numeric then temporal summaries
using the existing assets. No enum or product-name branch is needed. Other family
or ambiguous presentation shapes fail closed; V1-to-V2 conversion and generic
Graph-diff AI authoring do not silently remove or add this policy.

Composition keeps the established number witness `12` and currency witness
`125.5`. A policy excluding that witness is rejected; authors cannot add a new
seed field to the Blueprint envelope. Explicit Graph seed data may supply another
valid witness, which the verifier uses. A successful authored runtime fixture is
shared capability evidence, not a new admitted definition; see
[numeric acceptance](acceptance/numeric-field-domains.md).

## Training Funding: reuse a numeric Approval profile

The sixth catalogue key, `training-funding-approval`, is a data-only product
addition on the accepted numeric capability. Its primary fields are courseTitle,
fee, sessionDate and justification; its employee/manager/finance labels map to the
existing requester/reviewer/auditor permissions. Keep the positive fee rule in
both canonical Blueprint and provider-guide data, preserve capability locks,
and retain material questions for payment, enrollment and private identity.
Catalogue provenance continues to use ADR-0065; ADR-0069 is its capability
authority, not a new provenance discriminator.

For the reusable E2E case, declare `visibleSummary` values for fee/date,
`retainedDetails` for justification, `invalidUpdates` for server denials,
`clientInvalidValue` for zero-fee no-fetch feedback, and `finalCorrectionFields`
for reason changes in the same returned-record save. The corrected field is
asserted in its configured summary or Details location; do not require duplicate
visible values merely to satisfy a test. The old Publication case retains its
enum summaries and original Details assertions.

Record catalogue membership and accepted journeys separately. A clean actual
Publish/Compilation/verification/preview and business/UI result is required by
[Training acceptance](acceptance/training-funding.md); a new JSON row or green
data CLI alone does not raise accepted product coverage.

## Server-owned quantity-times-price totals

ADR-0070 defines a closed calculation descriptor on one required `currency`
output field:

```json
{
  "apiVersion": "factory.quantity-unit-price-total/v1",
  "quantityFieldKey": "quantity",
  "unitPriceFieldKey": "unitPrice"
}
```

Use one required `number` quantity (integer at runtime), one required `currency`
unit price and explicit numeric domains for both. The output has no numeric
domain, default, uniqueness or reference. Keep one unambiguous required short
text identity and the exact Approval correction profile. Additional nonnumeric
details are supported; other numeric fields, multiple calculated rows, dates
invented to fit an older profile and arbitrary expressions are not.

The caller supplies operands only. The server derives and validates an exact
finite round-trippable decimal product, and persists price/total through canonical
decimal strings. The UI displays a labelled read-only preview and visible quantity,
price and total summaries. Corrections merge retained operands inside the existing
transaction. Do not author a mutable total input or weaken denial/rollback rules.

Generic domains do not imply positive prices. A specific definition must state
its intended bounds and clarify material requests outside them. No currency unit,
rounding, taxes, stock, payments or procurement execution is inferred. An exact
coherent seed row must include all required business fields; verifier requests
reuse that row and omit its calculated output. Reuse the shared capability's
actual precision/seed/rollback evidence when adding unchanged supported data.
The authored capability fixture itself is not a registered consumer product.
