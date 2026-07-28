# Factory UI Kit v1

## Status

Frozen on 2026-07-27. Contract owner: `integration`.

## Canonical asset identity

```text
packages/ui-kit/factory-ui/1.0.0/
  factory-ui.manifest.json
  tokens.css
  factory-ui.css
  react/
  fixtures/
  tests/
```

The manifest must contain `key`, `version`, `digest`, SPDX license, component
inventory, stable semantic prop schema, CSS asset digests, fixture references,
and verification evidence. The canonical asset is the sole source from which
the Console and generated-app distributions are copied.

## Required primitive inventory

`app-shell`, `button`, `input`, `textarea`, `select`, `label`, `badge`,
`card`, `tabs`, `table`, `dialog`, `accordion`, `notice`, and `empty-state`.

Each rendered root carries `data-factory-ui="1.0.0"` and a stable
`data-factory-component` key. Styling must come from the declared canonical
CSS assets; utility-class compilation is not an implicit runtime dependency.

## Distribution contract

| Distribution | Target | Lifecycle | Rule |
| --- | --- | --- | --- |
| Console | `apps/console-next/components/factory-ui/` | controlled runtime copy | File digest and CSS digest must match canonical manifest. |
| Generated-app candidate | `packages/components/ui.* /2.0.0/` | candidate | Manifest/adapter/fixture/trust sidecar must point to canonical identity. |

The candidate distribution is not selectable for a new Composition Plan until
the Registry has current Golden trust evidence. The Composer copies selected
packages into generated output; generated output never imports the Console.

## Slot contract

- `ui.app-shell`: `frontend/app-shell`
- `ui.login-page`: `frontend/routes/login`
- `ui.home-page`: `frontend/routes/home`
- `ui.profile-page`: `frontend/routes/profile`
- `ui.system-settings-page`: `frontend/routes/settings`
- `ui.approval-form`: `frontend/features/approval-form`
- `ui.my-requests`: `frontend/features/my-requests`
- `ui.approval-queue`: `frontend/features/approval-queue`

Adapters may bind validated inputs to their declared template only. They may
not select primitives, load URLs, write outside their slot, or modify the
Composer-owned application assembly.
