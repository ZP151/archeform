# Compilation Preview Run acceptance

## Required lifecycle proof

A generated preview must be created only from a succeeded immutable
Compilation. The Workbench opens the returned loopback URL in a separate tab;
it does not embed the application or substitute the Workbench or Puck editor.
Stopping the run removes only that Factory-derived PreviewRun's containers,
volumes, networks, and copied preview directory.

The browser regression in `e2e/workbench.spec.ts` performs this bounded
journey for the Expense Approval profile:

1. Edit, save, publish, and compile a Draft.
2. Start a preview and retain only its Factory-issued PreviewRun ID.
3. Derive the Factory project identity from that ID, wait for `Preview ready`,
   and open the returned loopback URL in a separate tab.
4. Confirm the tab is a generated application, visit the declared
   `/expenses/new` PageModel route, and execute the employee submit and
   manager approve role journey.
5. Stop the preview and assert the named project has no containers, volumes,
   or networks and that its copied preview directory is absent.

The test requires an explicitly supplied `FACTORY_E2E_FACTORY_PROJECT`; it
does not default to or inspect an existing Compose project. Its cleanup checks
are scoped to the deterministic project derived from the PreviewRun ID.

## Isolated runtime acceptance — passed

The focused PreviewRun browser gate passed in a named, isolated Factory
project. It opened the generated application in a separate tab and verified a
same-origin employee record-creation request returned `201`. The form then
cleared, no generated-application error selector appeared, the employee
submitted the record, and the manager approved it.

The Workbench stopped the PreviewRun through its public control, then the test
proved ID-scoped cleanup: only the derived containers, network, volumes, and
copied preview directory were removed. No other Factory or user runtime was
selected, inspected, or changed.

No credentials, Graph content, prompts, model traffic, generated source,
subprocess output, or raw response bodies are retained in this record.

## Deterministic checks

The focused acceptance command for the isolated generated-preview employee and
manager journey passed. `pnpm exec playwright test e2e/workbench.spec.ts
--list` discovered the Workbench browser journeys, and `pnpm exec prettier
--check e2e/workbench.spec.ts` plus `git diff --check` passed after the
lifecycle assertions were added.

This acceptance is limited to the focused PreviewRun journey. Separate
Workbench revision-history and guided-creation timing failures are unrelated
to this runtime gate and are not accepted by this record.
