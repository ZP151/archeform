# Post-v0.1 Local Restaurant Readiness

## Scope

`pnpm accept:local` is the supported local product acceptance for an invited
technical evaluator. It uses the shipped Maison Aurelia template and does not
require fixture mode, an AI provider credential, or a model request.

The acceptance runner:

1. validates the exact local toolchain and Docker prerequisites;
2. resolves and rejects the Compose configuration unless all four published
   ports bind exactly to `127.0.0.1`, then starts one run-owned project;
3. edits a mutable Draft and publishes an immutable revision;
4. compiles only that published revision and runs generated verification;
5. exercises the Restaurant V3 customer dish, cart, checkout, and order
   journey, requires generated verification to pass its role-specific merchant
   journey, and confirms that the live customer principal cannot invoke kitchen
   actions;
6. checks Workbench and generated-product accessibility at desktop and
   `390 x 844`;
7. stops the generated preview and removes the run-owned stack and volumes.

No cloud deployment, hosted service, production payment, repository release,
or `main` integration is part of this acceptance.

## Command

Run from a clean checkout on Node.js `22.11.0`, pnpm `9.0.0`, and Docker
Compose `>=2.24.4` (the minimum version supporting the acceptance-only
`!override` safety layer):

```powershell
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm run doctor
pnpm build
pnpm accept:local
```

## Evidence contract

The final command writes one bounded JSON summary. The summary may contain only:

- the schema version and safe run identity;
- resolved Node.js and pnpm versions;
- named steps and numeric exit statuses;
- desktop and narrow accessibility violation counts;
- the published Graph and generated Compose artifact digests; and
- exact cleanup counts for preview directories, containers, networks, and
  volumes.

Success requires every accessibility and cleanup count to be zero. Provider
keys, generated secrets, caller environment values, command stderr, request
bodies, raw prompts, and raw provider responses are neither recorded nor
printed.

## Latest supported-environment result

On 2026-09-02, the complete command passed on Node.js `22.11.0`, pnpm `9.0.0`,
and Docker Compose `5.3.1` with safe run identity
`factory-local-0caab8dec268bafa7499e5087c8762ba2dd7`.

- Doctor, pre-run preview guard, loopback-only resolved Compose configuration,
  Compose up, host readiness, Playwright, Compose down, post-run preview guard,
  and all three Docker cleanup queries exited `0`.
- Workbench desktop, Workbench `390 x 844`, generated desktop, and generated
  `390 x 844` accessibility violation counts were all `0`.
- Preview-directory, container, network, and volume cleanup counts were all
  `0`.
- The published revision digest was
  `sha256:7ed436226966027334c0626554efe15d75af589c1b65f8b0910cf9c5f07941ac`.
- The generated Compose artifact digest was
  `sha256:c17730ee23c6d3354dfbf870c9e9caa16506d86da787c028f27ab8e6a42a4e82`.

Restaurant V3 does not expose the archived V1 `/table/:token` or
`/merchant/cashier` routes. The acceptance follows the stable V3 target rather
than adding a compatibility path: the live preview proves the V3 customer and
customer-principal denial boundaries, while the real generated verification
queue proves `customer-journey`, `merchant-journey`, `shared-state`, and
`cleanup` before the preview starts.
