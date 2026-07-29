# Package-local Capability Templates Design

## Goal

Make every initial Golden capability package contribute a real, versioned
source asset to a generated application. The Compiler must consume only the
exact packages locked in a Published Application Graph; a lock must no longer
be provenance metadata alone.

## Boundary

Each package under `packages/capabilities/assets/<key>/<version>/` gains a
package-local template:

```text
component.json
adapter.json
templates/api/capability-module.ts.tpl
fixtures/
tests/
```

`component.json` remains canonical and gains a `templates` array. Every entry
declares an identifier, package-relative source path, generated target path,
output slot, and SHA-256 content digest. `adapter.json` repeats the same
declarative contribution; the Node verifier rejects a mismatch, an unsafe
path, an unknown output slot, a duplicate target, or a template digest that
does not match the package file.

The initial contribution is deliberately narrow: every selected package emits
one `api/src/capabilities/<asset-key>.ts` module. It exports immutable package
identity and the effect keys that the package provides. This proves a package
supplies generated source without letting an adapter execute arbitrary code.

## Compilation path

```text
Published Graph asset locks
  -> Golden Registry + physical package verification
  -> safe template interpolation
  -> generated capability modules
  -> generated capabilities/registry.ts
  -> generated ApplicationRuntime effect allow-list
  -> capability-template-lock.json evidence
```

The Compiler finds the monorepo root by walking upward to
`pnpm-workspace.yaml`; callers may provide a repository-root override only for
tests. It imports the Node-only capability package loader, never the browser
Registry implementation directly. `@factory/compiler` depends on
`@factory/capabilities` for the Node loader; compiler integration tests own
composition assertions, avoiding a reverse runtime or test dependency cycle.

Only these substitutions are supported by the v1 renderer:

```text
{{asset.key}}
{{asset.version}}
{{asset.effectsJson}}
{{graph.metadata.id}}
```

An unknown placeholder fails compilation. A template may target only its
declared output-slot prefix; this first slice permits `api.runtime` only at
`api/src/capabilities/`. Existing Graph compilers retain ownership of generic
Next, Nest, Prisma, Casbin, XState, tests, and documentation scaffolding.

## Runtime use

The Compiler creates `api/src/capabilities/registry.ts` from the selected
template modules. The generated Application Runtime imports the registry and
uses its `providedEffects` set before executing a declared flow effect. This
replaces the centralized hard-coded supported-effect list as the source of
package availability. Effect-specific runtime behavior remains in the existing
generated runtime during this slice; moving each handler body into its package
is a later, separately accepted migration.

`capability-template-lock.json` records the Graph hash and the exact selected
template identifiers, targets, output slots, and content digests. It is
generated alongside `capability-lock.json`.

## Failure behavior

- A Graph without Factory capabilities produces an empty generated registry and
  no package template modules. Any Graph that declares Factory capabilities
  without matching Golden locks fails closed before compilation.
- A missing, tampered, unsafe, non-Golden, profile-incompatible, or
  operation-incompatible package fails before any output bundle is returned.
- A template contribution may not overwrite an existing generated file or
  target a path outside its declared output-slot prefix.
- AI never provides package paths, templates, target paths, or template values;
  it can only propose mutable Graph changes already allowed by the Graph Diff
  contract.

## Verification

- Unit tests prove every initial package has a verified template declaration,
  physical content digest, safe target, and package-local adapter agreement.
- Compiler tests prove an Expense Graph emits selected package modules,
  generated registry, runtime reference, and template-lock evidence;
  disabled optional packages do not emit a module.
- Compiler tests reject an unresolved repository root, a tampered package, an
  unsafe contribution path, and an output collision.
- The isolated Docker browser journey proves a composed Draft publishes and
  compiles with generated template evidence visible in artifacts.

## Non-goals

- No arbitrary adapter execution, user-supplied templates, third-party package
  intake, or runtime plugin loading.
- No code reverse parsing or imports from generated source.
- No migration of effect handler bodies into package templates in this slice.
