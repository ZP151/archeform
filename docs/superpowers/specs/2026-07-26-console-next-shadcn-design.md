# Console Next shadcn design

## Decision

Build **Factory Pilot Console Next** as a shadcn-derived, locally runnable
replacement preview for the current `apps/web` browser workspace. The current
static workspace remains operational and read-only as the rollback console
until Console Next is independently accepted.

This slice improves the Factory Pilot control console first. It does not
change generated application UI packages, component locks, the Composer,
Registry selection policy, application-definition contracts, control-plane
HTTP API, roles, Executor topology, or cloud behavior.

## Product boundary

Console Next preserves the complete existing user journey:

```text
Local connection -> Brief -> Application definition -> Build plan
                 -> Build and preview -> Stop -> immutable evidence
```

It binds to `127.0.0.1:5173`, uses the existing local capability header, and
uses no browser-side model credential. It calls only the current Factory API.
The browser must retain role-free control-plane behavior; it never receives a
generated application's session or secret.

## Source and dependency boundary

- Intake source is only `shadcn-ui/ui` commit
  `7774cd7dcee1e98d0815aa6e829f33a7fc952fdf`, retained below
  `packages/vendor/shadcn-ui/<commit>/` with its MIT notice.
- Intake is a single quarantined development action. After intake, Console
  Next, the Registry, Composer, generated products, and tests resolve only
  repository-contained source and exact checked-in locks; they do not call the
  shadcn CLI, a URL registry, Git, npm, or a package manager to obtain UI
  source at runtime.
- `apps/console-next/` uses the accepted Next.js 15.5.21 / React 19.2.7
  profile and a checked-in exact lockfile. Its local primitive copies retain
  MIT notices.
- The initial controlled primitive set is: Accordion, Alert Dialog, Badge,
  Button, Card, Dialog, Dropdown Menu, Input, Label, Select, Separator,
  Sheet, Skeleton, Table, Tabs, Textarea, Sonner, and Tooltip.

## Console architecture

`apps/console-next/` owns presentation state, accessibility, responsive layout
and API calls. It is not a component package and cannot contribute to a
generated application's output slots.

The Console Next UI maps existing responsibilities without changing backend
semantics:

| Existing responsibility | Console Next presentation |
| --- | --- |
| Connection capability | Sheet or dialog with masked Input and local-only guidance |
| Product/version lineage | Responsive Sheet navigation, Tabs, Badge status |
| Four generation stages | Tabs/step navigation and accessible stage panels |
| Structured editor | Card sections, Input, Textarea, Select, alert validation |
| Plan/evidence inspection | Table, Badge, Accordion, Tooltip |
| Queue/run/stop | Dialog confirmation, Sonner feedback, Skeleton polling state |
| Diagnostics | Collapsed Accordion; never the primary workflow |

The existing static console has no new workflow capability. A separate local
start command selects Console Next for testing; rollback returns to
`apps/web` without data migration.

## Failure handling

- Missing local capability, API errors, stale Executor heartbeat, and failed
  runs produce bounded user-facing messages without raw response payloads.
- A missing or invalid local UI dependency lock prevents Console Next startup;
  it never falls back to a remote download.
- The build blocks if the fixed upstream commit, license notice, source index,
  dependency closure, or required local primitive copy cannot be verified.
- Candidate source never becomes a generated application dependency or a
  Golden component as a result of this preview slice.

## Acceptance evidence

Console Next is accepted only when all of the following are true:

1. The upstream source snapshot, candidate index, MIT notice, dependency
   closure, and exact lockfile are locally present and integrity checked.
2. The new console serves on `127.0.0.1:5173`; `apps/web` remains runnable as
   rollback at an explicitly selected local command.
3. Browser E2E proves Brief -> Definition -> Approval -> Plan -> Run -> Stop
   through Console Next against the unchanged fixture-backed API.
4. Console Next preserves local capability handling, API Origin behavior,
   immutable-version selection, retry/stop behavior, artifact access, and
   bounded diagnostic behavior.
5. Accessibility checks cover keyboard navigation, focus-visible controls,
   labelled inputs, dialog focus containment, and status announcements.
6. Required checks include Console Next typecheck/build, browser E2E, existing
   agent/API/Executor tests, static-console syntax, and `git diff --check`.
7. A read-only reviewer finds no unresolved P0/P1 issue; QA confirms rollback,
   no runtime source download, and no secret/raw brief/raw evidence leak.

## Explicit non-goals

- No `ui.*@2.0.0` generated-application package or new-plan selection.
- No candidate-to-Golden promotion, external registry, cloud deployment,
  user-account system, source publication, or runtime third-party download.
- No change to Stage 1 component schemas, adapters, locks, API contracts,
  role model, or Compose topology.

## Rollback

Disable the Console Next start path and serve `apps/web` on the existing local
origin. Preserve source intake evidence, candidate index, lockfile, and test
evidence; do not modify historical plans, locks, runs, or generated output.
