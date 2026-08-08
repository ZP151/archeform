# Workbench action inventory

Task 7 (`refactor(workbench): focus the console on product creation`) rebuilt the
workbench as a thin composition root (`components/workbench.tsx`, 146 lines) over
a controller hook and explicit shell components. Every visible control is
cataloged below with its action, server/local effect, keyboard access, the test
that pins it, and its disposition.

Legend: **local** = client state only; **server** = control-plane request;
**display** = read-only presentation. Server paths are the control-plane routes
the workbench client calls.

## Icon rail (`components/shell/icon-rail.tsx`)

| Control | Action | Effect | Keyboard | Test | Disposition |
| --- | --- | --- | --- | --- | --- |
| Brand mark ("Factory Pilot home") | Navigate to Home | Local: `open home`; surfaces composer | Click / Enter | `workbench-shell.test.tsx` | Implemented |
| Rail destination ×7 (Home, Page, Domain, Flow, Policy, AI, Code) | Open that surface canvas | Local: `open <surface>` | Click / Enter; Arrow Up/Down + Home/End move focus within the rail | `workbench-shell.test.tsx` ("navigates every rail destination…") | Implemented; label span visible only in the active state (`.rail-item.is-active`) |
| Active rail label | Display current surface | Display | n/a | Viewport check (`e2e/viewport-focus.spec.ts`) | Implemented |

## Utility bar (`components/shell/utility-bar.tsx`)

| Control | Action | Effect | Keyboard | Test | Disposition |
| --- | --- | --- | --- | --- | --- |
| Project switcher (`select` "Switch application") | Open the chosen local application | Server: GET `/workspaces/local/application-graphs` then opens the application's Draft/Published revisions | Focus + arrows/Enter | `workbench-shell.test.tsx` (switching applications) | Implemented — a real select, not a placeholder |
| Revision picker ("Select revision") | Display current Draft revision id | Display | n/a | `workbench-shell.test.tsx` (revision shown) | Implemented; read-only |
| Lifecycle chip (Draft/Published/Offline) | Display lifecycle state | Display | n/a | `workbench-shell.test.tsx` (lifecycle text) | Implemented |
| Toggle inspector | Open/close the Inspector sheet | Local: `toggle-inspector`; updates `overlayStack` | Click / Enter; Escape closes the topmost overlay | `workbench-shell.test.tsx` (inspector focus/close), `workbench-model.test.ts` (stack order) | Implemented |
| History | Fetch + open the revision timeline | Server: GET `/application-graphs/graph-initial/draft-revisions` + `/published-revisions`; local `open-history` | Click / Enter; Escape | `workbench-shell.test.tsx` (history shows draft + published entries) | Implemented |
| Activity | Open the Activity sheet | Local: `toggle-activity`; sheet reads applications/portfolio/compilation | Click / Enter; Escape | `workbench-shell.test.tsx` (activity shows compilation evidence) | Implemented |
| Library | Open the Library drawer | Server: GET `/workspaces/local/portfolio-summary`; local `toggle-library` | Click / Enter; Escape | `workbench-shell.test.tsx` (library shows portfolio intelligence) | Implemented |
| Theme toggle | Switch light/dark theme | Local: `toggle-theme`; persists across surfaces | Click / Enter | `workbench-shell.test.tsx` (theme toggles), `workbench-model.test.ts` | Implemented |
| Publish draft | Create an immutable Published revision from the Draft | Server: POST `/application-graphs/graph-initial/published-revisions`; Draft must be bound and no lifecycle/compilation busy | Click / Enter; disabled otherwise | `workbench-shell.test.tsx` (publish round-trip, "Published" state) | Implemented — the immutable publication step |
| Compile (Published only) | Queue a compilation of the Published revision | Server: POST `/compilations`; shown only while lifecycle is Published | Click / Enter; disabled while compiling | `workbench-shell.test.tsx` (compile queue + "Compiling…" state) | Implemented |

## Workbench operations bar (`components/shell/workbench-shell.tsx`)

| Control | Action | Effect | Keyboard | Test | Disposition |
| --- | --- | --- | --- | --- | --- |
| Connection status ("Control Plane ready/unavailable/…") | Display connection state | Display; `role="status"` | n/a | `workbench-shell.test.tsx` (ready/unavailable) | Implemented |
| "Unsaved Draft" badge | Display Draft dirty state | Display | n/a | `workbench-shell.test.tsx` | Implemented |
| Save draft | Persist the edited Draft | Server: POST/PUT Draft revision (client `saveDraft`) | Click / Enter; only while dirty | `workbench-shell.test.tsx` (save round-trip) | Implemented |
| Operation error text | Display bounded failure detail | Display | n/a | `workbench-home.test.tsx` (error banner) | Implemented |

## Overlays (Inspector, History, Activity, Library)

| Control | Action | Effect | Keyboard | Test | Disposition |
| --- | --- | --- | --- | --- | --- |
| Overlay × close | Close the overlay, restore focus to its trigger | Local | Click / Enter; Escape | `workbench-shell.test.tsx` (focus restore per overlay) | Implemented |
| Inspector facts | Read-only facts from the open Graph/Draft/Compilation | Display | n/a | `workbench-shell.test.tsx` (unit-carrying fact values) | Implemented; no placeholder fields |
| History timeline entries | Display Draft snapshots + immutable Published revisions, newest first | Display; marks current Draft/Published | n/a | `workbench-shell.test.tsx` (timeline entries) | Implemented |
| Activity: artifact inspect | Show the generated source snapshot of one immutable artifact | Server: GET artifact content; shows digest + content in sheet | Click / Enter | `workbench-shell.test.tsx` (artifact snapshot) | Implemented; evidence is count-first, raw source one click away |
| Activity: "Open <name>" / "Compile <name>" on recent cards | Open an application / compile its Published revision | Server: open GETs revisions; compile POST `/compilations` | Click / Enter | `workbench-home.test.tsx` (recent products row), `workbench-shell.test.tsx` | Implemented |
| Library metric panels | Capability coverage, source intake, compilation health, supply, families, coverage, readiness | Display from GET `/workspaces/local/portfolio-summary` | n/a | `workbench-shell.test.tsx` (library panels) | Implemented — portfolio intelligence moved here from Home |

## Home creation journey (`components/workbench-home.tsx`, `journey/*`)

| Control | Action | Effect | Keyboard | Test | Disposition |
| --- | --- | --- | --- | --- | --- |
| Requirement brief textarea | Free-form requirement input | Local editing buffer; transient — never persisted as raw prose | Click; Ctrl+K (or Cmd+K) lands focus from anywhere | `requirement-composer.test.tsx`, `workbench-shell.test.tsx` (command-focus) | Implemented — the honest entry point |
| Character count | Display brief length | Display | n/a | `requirement-composer.test.tsx` | Implemented |
| Example prompts popover | Reveal example prompt buttons | Local | Click / Enter; aria-expanded | `requirement-composer.test.tsx` | Implemented — prompts, not profiles/templates |
| Example prompt button | Fill the brief from the example | Local | Click / Enter | `requirement-composer.test.tsx` | Implemented |
| Interpret requirement (primary action) | Transient interpretation of the brief into a RequirementSpec | Server: POST `/api/requirements/interpret`; response carries parsed intent, never verbatim prose | Click / Enter; disabled until non-empty brief, no busy | `workbench-home.test.tsx` (interpret round-trip, 2 alternatives) | Implemented |
| Clarification answers + Continue | Answer open questions, advance the journey | Local until Continue; then Server: plan generation | Click / Enter | `clarification-panel.test.tsx` | Implemented |
| Plan alternatives "Choose <label>" | Select the deterministic plan alternative (capability locks) | Server: plan generation; chosen key marks the immutable lock set | Click / Enter | `plan-review.test.tsx`, `workbench-home.test.tsx` | Implemented — model proposes semantics only; the deterministic planner locks capabilities |
| "Apply to Draft" | Apply the accepted plan Diff to the Draft | Server: creates the Draft revision; checksum-bound | Click / Enter | `graph-diff-review.test.tsx`, `workbench-home.test.tsx` | Implemented — Draft applies only from an accepted plan |

## Surface canvases (`components/canvases/*`, `components/journey/product-studio.tsx`)

| Control | Action | Effect | Keyboard | Test | Disposition |
| --- | --- | --- | --- | --- | --- |
| Puck Page Studio | Edit pages/blocks of the open Draft | Local Draft mutation (`propose-draft-change`); save persists | Standard editing + form controls | `product-studio.test.tsx` | Implemented (Task 5) |
| Page tree: "Add page", "Move <page> up/down" | Add/reorder pages | Local Draft mutation | Click / Enter | `page-tree.test.tsx`, `product-studio.test.tsx` | Implemented |
| DomainCanvas entity/field/relation editors | Edit the Domain | Local Draft mutation | Form controls | `domain-canvas` tests (via workbench suite) | Implemented |
| FlowStudio + RoleSimulator | Edit flows; simulate generated role journeys | Local mutation; simulation local | Form controls | `role-simulator.test.tsx` | Implemented (Task 6); RoleSimulator wired into the shell's Flow surface |
| PolicyCanvas matrix + Casbin preview | Edit policy matrix | Local Draft mutation | Form controls | workbench suite | Implemented |
| AiCanvas proposal composer | Propose a Draft change from a model proposal | Server: propose (transient); local Draft change | Textarea + button | workbench suite | Implemented — Discuss cannot mutate a Draft directly |
| CodeCanvas graph exchange + generated preview | Import/export Published Graph, preview generated output | Server: graph exchange endpoints, preview runs | Form controls | workbench suite | Implemented; compilation evidence lives in Activity |

## Keyboard summary

| Key | Effect |
| --- | --- |
| Arrow Up/Down, Home, End (in rail) | Move rail focus between destinations |
| Enter/Space | Activate focused button/select |
| Ctrl+K (Cmd+K on macOS) | Focus the requirement brief from anywhere (Home) |
| Escape | Close the topmost overlay (Inspector → History → Activity → Library stack order) |
| Tab | Standard focus order through rail, utility bar, canvas, overlays |

## Disposition of removed placeholders

The pre-Task-7 Home featured portfolio-intelligence panels and placeholder
controls. Those are gone or relocated per the plan: portfolio intelligence now
lives in the Library drawer; the "Select revision" picker is read-only display
of the real Draft revision; only implemented rail destinations render; Home is
the composer plus a compact recent-products row that appears only when local
application records exist.
