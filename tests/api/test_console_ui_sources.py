from __future__ import annotations

import unittest
from pathlib import Path

from tools.console_ui_sources import verify_console_ui_sources


ROOT = Path(__file__).resolve().parents[2]
TOPOLOGY_CONTRACT = ROOT / "docs" / "contracts" / "factory-ui-asset-topology-v1.md"
CONSOLE_TOPOLOGY_CANDIDATE = ROOT / "packages" / "ui-kit" / "factory-ui-console" / "1.6.0"
LIVE_CONSOLE = ROOT / "apps" / "console-next" / "components" / "factory-ui"
GENERATED_SOURCE_ROOTS = (
    ROOT / "packages" / "ui-kit" / "factory-ui" / "1.0.0",
    ROOT / "packages" / "ui-kit" / "factory-ui" / "1.3.0",
    ROOT / "packages" / "ui-kit" / "factory-ui" / "1.4.0",
    *(ROOT / "packages" / "components" / key / version for version in ("2.1.0", "2.2.0", "2.3.0") for key in (
        "ui.app-shell", "ui.login-page", "ui.home-page", "ui.profile-page",
        "ui.system-settings-page", "ui.approval-form", "ui.my-requests", "ui.approval-queue",
    )),
)


class ConsoleUiSourcesTests(unittest.TestCase):
    def test_asset_topology_contract_separates_console_and_generated_distribution_ownership(self) -> None:
        contract = TOPOLOGY_CONTRACT.read_text(encoding="utf-8")
        candidate_css = (CONSOLE_TOPOLOGY_CANDIDATE / "factory-ui.css").read_text(encoding="utf-8")
        live_css = (LIVE_CONSOLE / "factory-ui.css").read_text(encoding="utf-8")

        for required in (
            "factory-ui-asset-topology/v1", "factory-ui-console@1.6.0", "factory-ui@1.4.0",
            "factory-ui.css", "tokens.css", "react/factory-ui.tsx",
            "console_generated_selector_present", "generated_console_reference_present",
            "console_candidate_copy_digest_mismatch", "historical_distribution_mutated",
        ):
            self.assertIn(required, contract)
        for forbidden in (".fp-", ".fp-app", "Generated approval-product distribution"):
            self.assertNotIn(forbidden, candidate_css)
            self.assertNotIn(forbidden, live_css)
        self.assertIn("prefers-reduced-motion: reduce", candidate_css)
        self.assertIn('[data-factory-ui="1.6.0"] *::before', candidate_css)
        self.assertIn(".lineage-dag, .lineage-dag * { box-sizing: border-box; }", candidate_css)
        for root in GENERATED_SOURCE_ROOTS:
            for source in root.rglob("*"):
                if source.is_file() and source.suffix in {".css", ".json", ".tsx", ".ts"}:
                    content = source.read_text(encoding="utf-8")
                    self.assertNotIn("factory-ui-console", content, source)
                    self.assertNotIn("apps/console-next", content, source)

    def test_console_ui_source_evidence_captures_exact_runtime_packages(self) -> None:
        evidence = verify_console_ui_sources(ROOT)

        self.assertEqual("factory-console-ui-sources/v1", evidence["schema_version"])
        self.assertEqual("38.34.0", evidence["runtime"]["@primer/react"]["version"])
        self.assertEqual("11.9.0", evidence["runtime"]["@primer/primitives"]["version"])
        self.assertEqual("12.11.2", evidence["runtime"]["@xyflow/react"]["version"])
        self.assertEqual("99a9ff718c09ec9574f35067bc14d960ed4ff5bb", evidence["references"]["temporal_ui"]["commit"])

    def test_console_uses_the_reference_brief_workspace_instead_of_a_node_deck(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")
        editor = (ROOT / "apps" / "console-next" / "components" / "definition-editor.tsx").read_text(encoding="utf-8")

        self.assertIn('data-factory-component="workflow-canvas"', workspace)
        self.assertIn('<FactoryStageRail stages={stageItems}', workspace)
        self.assertIn('className="brief-workbench"', workspace)
        self.assertNotIn('className="brief-context-panel"', workspace)
        self.assertIn('className="brief-presets"', workspace)
        self.assertNotIn('className="workflow-link"', workspace)
        self.assertNotIn('className="brief-command-deck"', workspace)
        self.assertNotIn('Start with the outcome.', workspace)
        self.assertNotIn('className="workspace-header"', workspace)
        self.assertIn('className="definition-editor-nav"', editor)
        self.assertIn('aria-label="Definition sections"', editor)
        self.assertIn('className="component-plan-groups"', workspace)
        self.assertNotIn('className="build-evidence-peek"', workspace)
        self.assertIn('id="build-evidence-trigger"', workspace)
        self.assertIn('Open build evidence, ${run.artifacts?.length ?? 0} artifacts', workspace)
        self.assertNotIn('Console settings', workspace)
        self.assertNotIn('Console help', workspace)
        self.assertIn('data-evidence-artifact', workspace)
        self.assertIn('data-evidence-filename', workspace)
        self.assertIn('label={`Download ${artifact.path}`}', workspace)
        self.assertNotIn('Local model boundary', workspace)
        self.assertNotIn('Definition signals', workspace)

    def test_console_keeps_compact_project_context_and_inspectable_evidence(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")
        css = (ROOT / "apps" / "console-next" / "app" / "globals.css").read_text(encoding="utf-8")

        self.assertIn('aria-label={project?.name || \'New product\'}', workspace)
        self.assertIn('title={project?.name || \'New product\'}', workspace)
        self.assertIn('className="evidence-artifact-row"', workspace)
        self.assertIn('data-evidence-filename', workspace)
        self.assertIn('.console-project-switcher span { overflow: hidden;', css)
        self.assertIn('.evidence-artifact-row', css)
        self.assertIn('data-factory-component="active-stage-workspace"', workspace)
        self.assertIn('.workflow-canvas > .factory-stage-rail { flex-wrap: nowrap; overflow-x: auto;', css)
        self.assertIn('.workflow-canvas .factory-stage { min-width: 148px;', css)
        self.assertNotIn('.workflow-canvas > .factory-stage-rail { flex-wrap: wrap;', css)
        self.assertNotIn('grid-template-columns: repeat(4, minmax(0, 1fr))', css)

    def test_console_keeps_decision_workspaces_aligned_to_the_lifecycle_width(self) -> None:
        css = (ROOT / "apps" / "console-next" / "app" / "globals.css").read_text(encoding="utf-8")

        self.assertIn(".decision-canvas, .build-workbench { width: 100%; }", css)
        self.assertNotIn(".build-evidence-peek", css)
        self.assertNotIn(".brief-context-panel", css)
        self.assertNotIn(".brief-context-list", css)
        self.assertNotIn(".brief-context-foot", css)
        self.assertIn("prefers-reduced-motion: reduce", css)

    def test_console_assigns_overlay_direction_by_interaction_intent(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")
        sheet = (ROOT / "apps" / "console-next" / "components" / "factory-ui" / "factory-ui.tsx").read_text(encoding="utf-8")

        self.assertIn("const openProducts = (restoreFocusId: string) =>", workspace)
        self.assertIn('id="open-products-topbar-trigger"', workspace)
        self.assertIn('id="open-command-menu-trigger"', workspace)
        self.assertIn("openProducts('open-products-trigger')", workspace)
        self.assertIn("openProducts('open-products-topbar-trigger')", workspace)
        self.assertIn("openProducts('open-command-menu-trigger')", workspace)
        self.assertIn('open={projectsOpen} onOpenChange={setProjectsOpen} restoreFocusId={projectsRestoreFocusId} side="left"', workspace)
        self.assertIn("{ id: 'open-products', label: 'Open products'", workspace)
        self.assertNotIn("execute: () => setProjectsOpen(true)", workspace)
        self.assertIn('open={lineageOpen} onOpenChange={setLineageOpen} restoreFocusId="open-lineage-trigger" side="floating" modal overlay="clear"', workspace)
        self.assertIn('open={confirmStop} onOpenChange={setConfirmStop}', workspace)
        self.assertIn('side="center" title="Stop this preview?"', workspace)
        self.assertIn('side="center" title="Command menu"', workspace)
        self.assertIn('open={evidenceOpen} onOpenChange={setEvidenceOpen}', workspace)
        self.assertIn("'floating' | 'center'", sheet)
        self.assertIn("const effectiveModal = modal ?? side !== 'floating';", sheet)
        self.assertIn("modal={effectiveModal}", sheet)
        self.assertIn("initialFocusId=\"command-menu-search\"", workspace)

    def test_console_command_search_exposes_combobox_active_descendant_semantics(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")

        self.assertIn('role="combobox"', workspace)
        self.assertIn('aria-controls="command-menu-options"', workspace)
        self.assertIn('aria-activedescendant={activeCommandId}', workspace)
        self.assertIn('aria-expanded={commandOpen}', workspace)
        self.assertIn('id="command-menu-options"', workspace)
        self.assertIn('id={`command-option-${item.id}`}', workspace)
        self.assertIn('const activeCommandId = matchingCommands.length', workspace)

    def test_console_accepts_pending_component_plan_at_the_approval_gate(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")

        self.assertIn("['draft', 'pending_approval'].includes(plan.status)", workspace)

    def test_lineage_keeps_every_component_ordered_and_exposes_safe_selection_details(self) -> None:
        """Fail if the Lineage view again hides approved packages or selection detail."""
        model = (ROOT / "apps" / "console-next" / "components" / "factory-ui" / "lineage-model.ts").read_text(encoding="utf-8")
        node = (ROOT / "apps" / "console-next" / "components" / "factory-ui" / "lineage-node.tsx").read_text(encoding="utf-8")
        dag = (ROOT / "apps" / "console-next" / "components" / "factory-ui" / "lineage-dag.tsx").read_text(encoding="utf-8")

        self.assertIn("key.startsWith('ui.') ? 0 : key.startsWith('backend.') ? 1 : key.startsWith('workflow.') ? 2 : key.startsWith('data.') ? 3 : key.startsWith('ops.') ? 4 : 5", model)
        self.assertIn("left.key.localeCompare(right.key)", model)
        self.assertIn("const assetColumn = index % 4", model)
        self.assertIn("const assetRow = Math.floor(index / 4)", model)
        self.assertIn("76 + assetColumn * 172", model)
        self.assertIn("168 + assetRow * 88", model)
        self.assertIn("type: 'smoothstep'", model)
        self.assertNotIn("more packages", model)
        self.assertIn("detail: string", node)
        self.assertIn("data-selected={isSelected ? 'true' : undefined}", node)
        self.assertIn('data-factory-component="lineage-selection"', dag)
        self.assertIn('role="status"', dag)
        self.assertIn("selected.data.detail", dag)
        self.assertIn('data-factory-ui="1.5.0"', dag)
        self.assertIn("ResizeObserver", dag)
        self.assertIn("refitLineage", dag)
        self.assertIn("fitView", dag)

    def test_console_hydrates_every_product_summary_for_the_product_switcher(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")

        self.assertIn("setProjects(summaries)", workspace)
        self.assertIn("type ProjectSummary = Pick<Project, 'id' | 'name'>", workspace)

    def test_console_owns_explicit_mutation_and_recovery_seams(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")

        self.assertIn("type Operation =", workspace)
        self.assertIn("'queue-run'", workspace)
        self.assertIn("operationRef", workspace)
        self.assertIn("runMutation", workspace)
        self.assertIn("Retry initial load", workspace)
        self.assertIn("Retry run status", workspace)
        self.assertIn("hasLocalBriefInput", workspace)
        self.assertIn("protectLocalBrief && hasLocalBriefInput.current", workspace)
        self.assertIn("loadProject(summaries[0].id, undefined, true)", workspace)
        self.assertIn("disabled={mutationActive} label={`Download ${artifact.path}`}", workspace)
        self.assertNotIn("busy ? 'Working'", workspace)

    def test_console_can_create_a_revision_from_an_approved_definition_after_asset_change(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")

        self.assertIn("['draft', 'approved'].includes(version.status)", workspace)
        self.assertIn("Create revision for new components", workspace)

    def test_console_surfaces_a_component_plan_incompatibility_as_a_replan_recovery(self) -> None:
        workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")
        client = (ROOT / "apps" / "console-next" / "lib" / "factory-api.ts").read_text(encoding="utf-8")

        self.assertIn("component_plan_incompatible", workspace)
        self.assertIn("Create a revision", workspace)
        self.assertIn("class FactoryApiError", client)
        self.assertIn("body?.error?.code", client)


if __name__ == "__main__":
    unittest.main()
