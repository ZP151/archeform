# Local Executor

The Executor is a separate, explicitly started process for approved Factory
Pilot VNext runs. The control plane writes an authenticated request below the
configured runs directory; the worker verifies the request, component lock,
render manifest, all rendered file digests, approvals, expiry, and path
containment before invoking Docker. The local Executor key is created beside
the control-plane state file and never appears in run state, generated output,
evidence, or logs.

Start it from the repository root:

```powershell
python -m apps.executor.worker
```

For a single queue scan:

```powershell
python -m apps.executor.worker --once
```

Use `--key-file` when the control plane uses a non-default state directory.
The worker rejects `DOCKER_HOST` and `DOCKER_CONTEXT`; previews can use only
the validated local Docker authority and an isolated per-run Docker config.

The worker uses fixed argument arrays for Compose startup, port inspection,
and teardown. It reports `queued`, `building`, `smoke_testing`, `ready`,
`failed`, or `stopped` evidence under the run output. Ready previews bind only
to `127.0.0.1`, expire after 30 minutes, and can be stopped through the
control-plane workspace. A signed exclusive claim prevents concurrent workers,
cleanup-needed state is retried until teardown succeeds, and a signed terminal
anchor prevents a finished run from restarting if output evidence is lost.
The process should be started without cloud or production credentials.
