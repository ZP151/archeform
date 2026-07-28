# Runtime Provider v1

A runtime provider compiles a Factory Pilot **Published Graph** into a
replaceable runtime projection. It cannot accept mutable Drafts, reverse-parse
an external application into Factory state, or change a Graph's semantics.

```ts
interface RuntimeProviderV1 {
  readonly key: string;
  readonly version: string;
  compile(input: unknown): Promise<ProviderCompilationResult>;
  teardown(result: ProviderCompilationResult): Promise<void>;
}
```

`compile` validates a non-empty `publishedRevisionId` and a semantically valid
Application Graph before it projects anything. Results include the provider
identity, version, immutable published revision identity, Graph hash, and
artifact references. `teardown` may only act on a result returned by the same
provider version.

`fixture-native` is the deterministic conformance provider. It exercises the
boundary without network access or an external runtime. Future Appwrite,
Medusa, and OpenFGA providers must pass the same fixture contract while
remaining optional and replaceable.
