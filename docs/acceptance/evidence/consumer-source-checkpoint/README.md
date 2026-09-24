# Consumer family source checkpoint

Date: 2026-09-24. Base: `7a85d6efd946ffd9d1a826771e0e12a187a85b92`.
Scope: an unfinished iteration-branch checkpoint for reviewed source, not accepted
product delivery, main integration, a repository release or hosted deployment.

## Included outcomes

- Retain material unanswered requirements and submitted context through recovery.
- Reuse automatic immutable lifecycle orchestration for supported families.
- Repair Appointment selection, administrator setup and customer/staff interfaces.
- Compose Work Orders with desktop dispatch, mobile execution, correction,
  reassignment, resolution, reopen and reasoned cancellation.
- Bind executable consumer cases and existing source checks into regression/CI.

These serial changes share Workbench, adapter, capability, compiler and case-helper
paths. One coherent source checkpoint keeps those dependencies together. Earlier
accepted source reviews remain applicable; no new product or release gate is
inferred from this grouping. The original checkout's evaluation work is excluded.

## Source verification

Independent read-only reconciliation maps every changed non-document path to its
latest accepted source review/QA identity. The portable
[source manifest](source-manifest.json) records current digests and ownership;
earlier manifests remain historical evidence of their serial handoffs. Detailed
local reconciliation remains under `generated/.consumer-source-delivery/` and is
not included in Git. The previously disclosed missing exact pre-Task4 capability
matcher snapshot remains a provenance limitation, not a reconstructed baseline.

The first combined `pnpm test` run passes 28/29 tasks and fails two compiler
export-boundary assertions, with 1,661 compiler cases passing and six skipped.
Its safe compiler log is preserved locally. The cause is an outdated explicit
allowlist: accepted Work Orders Task 1 already exposes its selector and profile
through the root facade. The focused correction registers exactly those two
names, retains the historical parent and exact equality, and additionally rejects
three Work Orders deep-import paths. Seven export tests pass. The regression
selection test first fails 11/12, then passes 12/12 after adding this suite to the
existing compatibility step. There is no runtime/export-contract change and no
extra approval stage. The independent scoped correction review closes P0/P1/P2
at 0/0/0. The complete corrected `pnpm test` run exits 0: all 29 tasks succeed,
with 1,663 compiler tests passing and six retained skips. The first failed run
remains preserved; the successful run does not erase it.

Full typecheck passes 29/29 tasks. Prior integrated definition regression passes
all eight steps. Prior consumer-case no-emit types, 18 pure helper tests and full
formatting pass. The new export selection does not establish a second executed
definition-lane result; preserve those scopes. Changed-file formatting and
whitespace checks pass; all 92 final source identities match their accepted
receipts before the controller's checkpoint.

Staging exposed Git line-ending normalization of two immutable Appointment source
manifests. Two exact `.gitattributes` exceptions reuse the existing evidence-byte
preservation convention. Root verifies each staged blob equals its unfiltered
original bytes; source files and historical evidence contents are unchanged.
This mechanical packaging correction needs no repeated functional test run.

## Gates still open

Actual Home recovery and automatic consumer-entry execution, generated database
and cross-role UI acceptance, applicable restart/concurrency/recovery checks,
actual screenshot inspection and owned-resource cleanup remain pending. The
recorded local Workbench startup rejection is not retried through another tool.
Historical residual resources are not inspected, removed or treated as resolved.

This checkpoint does not ship the Appointment default or increase delivered
Work Orders coverage. Working catalogue: twelve physical / eleven logical
definitions. Historical local baseline: ten definitions / six demonstrated
runtime families, with Appointment UI acceptance reopened. No hosted application
is established; the existing local compatible-update rehearsal remains narrower
than a hosted delivery proof. Main/release acceptance conditions remain unchanged.
