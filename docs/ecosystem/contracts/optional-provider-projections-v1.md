# Optional provider projections v1

`appwriteProvider`, `openFgaProvider`, and `medusaProvider` implement `RuntimeProviderV1` as
fixture-only contract projections. They accept a semantically valid Published
Graph and return its immutable identity and hash for conformance testing.

No contract imports an external SDK, provisions an external service, reads
credentials, emits network traffic, or reverse-parses a provider application.
Casbin remains the v1 authorization compiler, and the native Factory commerce
compiler remains the v1 commerce implementation.

Activating either provider requires a new provider-specific implementation,
fixture suite, operational design, credential model, and acceptance slice.
