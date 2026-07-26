# Factory Pilot

Factory Pilot is an MVP for a composable software factory for internal business applications. It compiles a requirement into a reviewable Application IR, resolves a traceable plan using trusted internal components, and produces a local project blueprint.

The first Golden Path is deliberately narrow: **CRUD, role-based access, single-level approval, and audit logging**. The reference scenario is leave approval, not one-click production delivery for arbitrary requirements.

## Verified MVP flow

```text
Requirement → Application IR (human approval)
            → Golden component plan (human approval)
            → Controlled local generation → blueprint, BOM, and evidence
```

The parser can produce only schema-shaped IR. The resolver can choose only version-pinned `golden` manifests. The current generator accepts no user command, external Git URL, container image, or cloud credential.

## Quick start

See [apps/api/README.md](apps/api/README.md). Start the API and open the local demo console at `http://127.0.0.1:5173`.

## Repository layout

- `apps/api/`: local control-plane API, IR normalization, planning, and controlled blueprint generator.
- `apps/web/`: zero-build-dependency demo console.
- `packages/catalog/`: version-pinned trusted component manifests.
- `docs/`: product contract, architecture, threat model, market validation, and autonomous operating loop.
- `apps/api/runs/`: isolated outputs for generated blueprints; ignored by Git.

## Current boundary

This is not a production deployment platform. It does not run Docker, shell commands, cloud resources, or third-party templates. Those capabilities require later work on approvals, credential isolation, artifact signing, CI, and deployment adapters.

## Quality gate

Run before every change is accepted:

```powershell
python -m unittest discover -s tests/api -v
node --check apps/web/app.js
git diff --check
```

The MVP scope and acceptance criteria are in [docs/mvp.md](docs/mvp.md). The agent self-cycle is in [docs/autonomous-loop.md](docs/autonomous-loop.md).
