# Golden Capability Assets Design

## Goal

Replace the capability catalog's implicit implementation ownership with
versioned, inspectable capability assets that a Factory Application Graph can
lock and a generated application can prove it consumed.

## Asset boundary

Each initial asset has two linked representations:

- A self-contained, canonical package directory in
  `packages/capabilities/assets/<key>/1.0.0/` containing `component.json`,
  `adapter.json`, a fixture, and contract evidence.
- A browser-safe TypeScript projection in `packages/capabilities/src/assets/`
  for Registry lookup and the two bounded optional disable adapters.

The Node-only verifier rejects a package unless its physical `component.json`
is a full canonical match for the Registry projection and its digest. The
physical `adapter.json` may declare only package-local, declarative
contributions; it never names or executes an external source path.

The manifest uses `factory.capability/v1` and declares a key, version,
package root, digest, Golden lifecycle, profile compatibility, effect names,
input schema, output slots, and verification locations. The package directory
is evidence, not a dynamic plugin loader: Factory never downloads or executes
an arbitrary adapter at composition time.

## Registry and composition

`@factory/capabilities` owns the initial Golden Registry. A profile recipe can
choose only assets already registered for that profile. Optional asset removal
is an adapter method owned by the asset itself; the centralized composer no
longer keeps a parallel operation-removal map.

Composition writes the selected assets and an explicit profile into
`ApplicationGraph.integration.assetLocks` and
`ApplicationGraph.integration.compositionProfile`. Every lock contains the
exact key, version, package root, digest, and `golden` lifecycle. The Control
Plane rejects a persisted Graph unless every lock exactly matches the local
Golden Registry, supports the declared profile, and covers every declared
Factory capability operation before it can become a Published Revision.

## Compilation evidence

The compiler writes `capability-lock.json` into every generated application.
It carries the application identifier, the Application Graph hash, and the
immutable selected asset locks. This makes generated code traceable back to
the Graph and capability package versions without persisting source code in
the Registry.

## Safety properties

- Unknown, tampered, or non-Golden asset locks fail closed at the Control Plane.
- The Graph schema rejects duplicate asset lock keys.
- A Golden lock is invalid without a composition profile.
- AI Graph Diffs cannot write asset locks or the composition profile; only the
  trusted composer selects packages.
- Asset integrity is verified from a canonical manifest payload by a
  Node-only verification entry point; the Workbench never imports Node crypto.
- Only the audit and notification assets expose optional disable adapters in
  this slice. Required assets cannot be removed through the guided workflow.
- Older manually authored Graphs without asset locks remain structurally valid;
  only Graphs that claim a Golden lock enter the Registry verification path.

## Explicit non-goals

This slice does not publish OCI/npm artifacts, ingest third-party code, allow
arbitrary extension scripts, or make every profile Graph projection wholly
asset-owned. Those require the future Trusted Registry and component-template
compiler slices.
