# MVP Threat Model

| Threat | v0 control |
|---|---|
| Prompt injection attempts command execution or code download | Input can produce only fixed schema; no shell or network execution channel exists |
| Component supply-chain poisoning | Only repository-owned `golden` manifests are allowed; versions and digests enter the BOM |
| Path traversal overwrites the workspace | Run IDs are constrained and the resolved output must remain under the configured `runs` root |
| Unauthorized generation or execution | IR and plan require explicit approval; the state machine blocks skipped stages |
| Secret leakage through requirements or logs | v0 rejects common credential assignments and persists only a requirement checksum after IR creation; generated configuration is demonstrative only |
| Docker or cloud lateral movement | v0 does not call Docker, IaC, or cloud APIs; a later runner must have no production credentials |

## VNext local-preview controls

- The model adapter receives a bounded requirement and returns only a strict `factory/v1` application definition. It has no tool, source-write, registry, Docker, shell, cloud, or runtime-selection channel.
- `OPENAI_API_KEY`, the raw requirement, full provider response, and command lines are excluded from persisted state, generated output, and evidence. Only a raw-brief checksum, local validated definition, and minimal provenance are retained.
- The control plane does not start Docker or call the Executor. It writes a contained immutable queue request after both approvals.
- The separately started Executor checks path containment and request/lock/render-manifest checksums before fixed-array Compose execution. It rejects malformed, tampered, unapproved, expired, duplicate, and non-loopback requests.
- Preview ports bind only to `127.0.0.1`; build/smoke failure, explicit stop, and 30-minute expiry run fixed teardown. The worker has no cloud or production credentials.

Before production use, add identity, RBAC, append-only audit storage, SBOM and vulnerability scanning, artifact signing, dependency locks, egress policy, per-run quotas, and human deployment gates.
