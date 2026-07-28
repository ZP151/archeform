# Factory Console UI Sources

This notice records the bounded, verified sources used by the Factory Pilot
control console. It is not a generated-application dependency list.

## Runtime dependencies

| Package | Exact version | License | Upstream |
| --- | --- | --- | --- |
| `@primer/react` | `38.34.0` | MIT | https://github.com/primer/react |
| `@primer/primitives` | `11.9.0` | MIT | https://github.com/primer/react |
| `@xyflow/react` | `12.11.2` | MIT | https://github.com/xyflow/xyflow |

The authoritative resolved integrity values are in
`apps/console-next/package-lock.json`. Factory-owned wrappers are the only
product-page import boundary for these dependencies.

## Reference-only source

Temporal UI was inspected at commit
`99a9ff718c09ec9574f35067bc14d960ed4ff5bb` from
https://github.com/temporalio/ui under its MIT license. Its current source is
Svelte and is used solely to inform run-history and evidence-inspector
interaction design.

Temporal UI source code is not copied into the Factory Console runtime.

## Explicit exclusions

- Backstage and Appsmith source code, dependencies, brands, and trademarks are
  not imported.
- Primer, React Flow, and Temporal code are not added to generated application
  packages by this Console decision.
- No external source is fetched by the Factory runtime, Composer, or Executor.
