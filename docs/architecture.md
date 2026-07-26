# Architecture Decision Record 001: Controlled Compilation, Not Free Execution

```text
Requirement text
  → deterministic normalizer / future schema-bound LLM adapter
  → Application IR
  → approval gate
  → deterministic Golden resolver
  → Component Plan + BOM
  → approval gate
  → isolated blueprint generator
  → evidence and events
```

## Invariants

- Requirement processing can produce only a strict Application IR; a future LLM must pass the same schema validation.
- The planner resolves only repository-owned Golden manifests and pins `key@version` in every plan.
- Output is always under `apps/api/runs/<run-id>/output`; absolute paths and `..` are prohibited.
- The v0 generator writes static template files only. It never composes user input into shell commands or accesses a network or cloud account.
- IR and plan have independent approval gates. Approval data is retained with the plan and run record.

## Planned substitution points

| v0 | Later replacement |
|---|---|
| JSON file and in-memory state | PostgreSQL and event tables |
| Rule-based English parser | LLM provider adapter with structured output |
| Repository manifest | Git, OCI, private package registry, and signed artifacts |
| Local blueprint generation | Isolated runner, CI, pull request, and deployment adapters |
| Mock RBAC | Enterprise OIDC and policy engine |

## VNext extension: controlled local preview

ADR 002 accepts a bounded local experiment. VNext will keep the control plane as constrained compiler and approval authority: it will accept a schema-bound model candidate only after local validation, persist structured definition versions, resolve only Golden component locks, and write owned output plus a checksum-recorded queue request. A separately started local Executor will be the only process allowed to run the approved Docker Compose output, exposing a loopback-only preview with smoke, stop, expiry, and teardown evidence after release evidence is accepted.
