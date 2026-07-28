# Factory UI Asset Topology v1

- **Schema:** `factory-ui-asset-topology/v1`
- **Status:** frozen for CUI-08 candidate verification only.
- **Contract owner:** integration.

## Distribution ownership

| Distribution | Key/version | Canonical root | May map live Console files | Owns selectors |
| --- | --- | --- | --- | --- |
| Console candidate | `factory-ui-console@1.6.0` | `packages/ui-kit/factory-ui-console/1.6.0` | yes: exactly `factory-ui.css`, `tokens.css`, `react/factory-ui.tsx` | `.factory-`, `.lineage-`, `.react-flow`, Console-root `[data-factory-ui="1.6.0"]` |
| Generated successor | `factory-ui@1.4.0` | `packages/ui-kit/factory-ui/1.4.0` | no | `.fp-`, `.fp-app`, generated-root `[data-factory-ui="1.4.0"].fp-app` |

The live Console map is exactly:

```text
packages/ui-kit/factory-ui-console/1.6.0/factory-ui.css
  -> apps/console-next/components/factory-ui/factory-ui.css
packages/ui-kit/factory-ui-console/1.6.0/tokens.css
  -> apps/console-next/components/factory-ui/tokens.css
packages/ui-kit/factory-ui-console/1.6.0/react/factory-ui.tsx
  -> apps/console-next/components/factory-ui/factory-ui.tsx
```

Console CSS deny set: `.fp-`, `.fp-app`, and `Generated approval-product distribution`.
Generated source deny set: `factory-ui-console` and `apps/console-next`.

## Immutable roots and rejection

Console 1.4 and 1.5, generated `factory-ui` 1.0/1.3/1.4, generated 2.1/2.2/2.3 component families, Composer scaffold, generated locks, and generated outputs are immutable inputs. Only a separately governed generated-asset task may change generated CSS or package sidecars.

The verifier rejects `console_generated_selector_present`,
`generated_console_reference_present`, `console_candidate_copy_digest_mismatch`,
and `historical_distribution_mutated`. This contract cannot introduce runtime
selector rewriting, runtime asset resolution, candidate promotion, or
generated-app eligibility for Console 1.6.
