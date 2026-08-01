# Identity policy cross-profile acceptance

**Date:** 2026-08-01
**Package:** `core.identity-policy@1.0.0`

## Scope

This acceptance slice verifies the Factory-owned local identity and policy
package across the Expense Approval and Simple Ecommerce published Graph
profiles. It does not claim production identity-provider, OpenFGA, or external
authorization-provider support.

## Package boundary

The locked Golden package supplies local fixture-principal resolution and a
deny-by-default decision boundary. It is selected by the two affected Profiles
through their immutable capability locks. The portfolio summary projects only
the package key, version, Golden lifecycle, affected Profile count, verification
state, and generated-target readiness. It intentionally excludes package source
locations, contribution bodies, session identifiers, policy rules, provider
metadata, credentials, and AI request or response data.

## Generated runtime evidence

Two newly compiled, isolated local generated applications completed their
role-aware browser journeys:

| Profile          | Allowed journey                                                      | Denied journey                                |
| ---------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| Expense Approval | An employee created and submitted an expense; a manager approved it. | The employee was denied an approval mutation. |
| Simple Ecommerce | A shopper submitted and paid for an order; a merchant fulfilled it.  | The shopper was denied a fulfilment mutation. |

Both generated applications resolved a local fixture principal before the
declared event action was evaluated. The isolated preview resources were then
stopped and their application containers, networks, and volumes were confirmed
removed.

## Verification record

Focused Control Plane and Workbench source-free projection tests passed. The
full repository test, typecheck, lint, production build, third-party notice,
source-study, and whitespace gates also passed for this slice.

## Guarded real-model check

One guarded Graph-Diff request was accepted for an affected mutable Expense
Approval Draft. The resulting Draft was published and its immutable compilation
succeeded. The provider read its key only from the local process environment.
Only success outcome metadata is recorded; no prompt, response, credential, or
raw Graph Diff is retained in this document.

## Residual scope

Local fixture identity is an acceptance boundary for generated prototypes, not
production authentication. OIDC, organization tenancy, fine-grained external
authorization, provider delivery, and cloud secret handling remain separate
platform slices.
