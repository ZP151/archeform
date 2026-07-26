# Factory Pilot product workspace

This directory contains the dependency-free browser workspace for the VNext
requirement-to-product flow. It uses native browser APIs and has no frontend
build or installation step.

## Start the workspace

From the repository root, start the control plane with a local capability:

```powershell
$env:FACTORY_API_TOKEN = "<local-random-value>"
$env:OPENAI_API_KEY = "<local-openai-key>"
python -m apps.api.server
```

The OpenAI key is read by the server only. Never enter it in the browser. For
deterministic local development without a paid model call, configure the API's
fixture provider as documented in `apps/api/README.md`.

Serve this directory on the frozen local origin:

```powershell
python -m http.server 5173 --directory apps/web
```

Open `http://127.0.0.1:5173`, expand **Local connection**, and enter only the
`FACTORY_API_TOKEN` value as the **Local session capability**. The token stays
in the current page and is lost on reload.

Run the separate Executor when a queued build should become a live preview:

```powershell
python -m apps.executor.worker
```

The workspace supports the complete bounded flow:

1. Generate a structured approval-application definition from a brief.
2. Edit roles, the primary record, fields, page labels, assumptions, and open
   questions; save edits as immutable child versions.
3. Approve one application definition, create or retry its build plan as a
   separate recoverable action, and inspect the explained Golden choices
   before approving that plan.
4. Queue a local build, follow Executor state and smoke evidence, download
   authenticated artifacts, open the loopback preview, and stop it. Every run
   remains selectable; failed, stopped, and expired runs can be retried without
   losing their prior evidence.

Raw diagnostic JSON is available only in the collapsed evidence panel. The
normal workflow does not require reading or editing JSON.

## Browser regression

The regression test starts fixture-backed API and static servers, launches an
installed local Chrome or Edge browser, and exercises the complete workspace
without a model key or Docker:

```powershell
node tests/web/workspace-e2e.mjs
```

Set `FACTORY_PLAYWRIGHT_PATH` when Playwright is installed outside the bundled
Codex runtime, and `FACTORY_BROWSER_PATH` when Chrome or Edge is in a
non-standard location.
