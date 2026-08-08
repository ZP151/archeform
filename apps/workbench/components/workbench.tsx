"use client";

import type { ApplicationGraphV1 } from "@factory/graph";

import { useWorkbenchController } from "../hooks/use-workbench-controller";
import { WorkbenchShell } from "./shell/workbench-shell";
import { WorkbenchHome } from "./workbench-home";
import { ProductStudio } from "./journey/product-studio";
import { FlowStudio } from "./flow-studio";
import { RoleSimulator } from "./journey/role-simulator";
import { DomainCanvas } from "./canvases/domain-canvas";
import { PolicyCanvas } from "./canvases/policy-canvas";
import { AiCanvas } from "./canvases/ai-canvas";
import { CodeCanvas } from "./canvases/code-canvas";
import { ReleaseWorkspace } from "./journey/release-workspace";

/** The transient example prompts offered by the Home composer popover. */
export const EXAMPLE_PROMPTS: readonly string[] = [
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
  "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.",
];

type Props = {
  readonly initialGraph: ApplicationGraphV1;
  readonly controlPlaneUrl: string;
};

/**
 * The workbench composition root: one controller owns server state and
 * commands; the shell owns chrome; the canvas board renders the active
 * surface. The Flow surface pairs the flow studio with the role simulator
 * so composed decisions and their journey sit side by side.
 */
export function Workbench({ initialGraph, controlPlaneUrl }: Props) {
  const controller = useWorkbenchController({ initialGraph, controlPlaneUrl });
  const { state, graph, journey, flowDiagram } = controller;

  const surface = (() => {
    switch (state.activeSurface) {
      case "home":
        return (
          <WorkbenchHome
            applications={controller.applications}
            compilingKey={controller.compilingApplicationKey}
            loading={controller.applicationsLoading}
            onCompile={controller.compileApplication}
            onOpen={controller.openApplication}
            commandFocusToken={state.commandFocusToken}
            journey={{
              stage: journey.state.stage,
              busy: journey.busy,
              error: journey.state.error,
              brief: journey.briefDraft,
              onBriefChange: journey.setBriefDraft,
              onInterpret: () => {
                void journey.submitBrief();
              },
              examplePrompts: EXAMPLE_PROMPTS,
              onApplyExample: (brief) => journey.setBriefDraft(brief),
              requirement: journey.state.interpretation?.spec ?? null,
              blueprintTitle: journey.blueprintTitle,
              openQuestions: journey.openQuestions,
              answers: journey.answers,
              onAnswerChange: (key, answer) => journey.setAnswer(key, answer),
              onContinue: () => {
                void journey.answerQuestions();
              },
              planAlternatives: journey.planAlternatives,
              chosenKey: journey.state.selectedAlternativeKey,
              onChoose: (key) => {
                void journey.chooseAlternative(key);
              },
              diffChecksum: journey.state.diffChecksum,
              onApply: () => {
                void controller.applyComposedProduct();
              },
            }}
          />
        );
      case "page":
        return (
          <ProductStudio
            page={graph.page}
            experience={graph.experience}
            entityKeys={graph.domain.entities.map((entity) => entity.key)}
            onPageModelChange={controller.changePageModel}
            onExperienceModelChange={controller.changeExperienceModel}
          />
        );
      case "domain":
        return (
          <DomainCanvas
            graph={graph}
            onDomainChange={controller.changeDomainModel}
          />
        );
      case "flow":
        return (
          <div className="flow-simulation-layout">
            <FlowStudio
              diagram={flowDiagram}
              flow={graph.flow}
              roles={graph.policy.roles}
              capabilities={graph.integration.capabilities}
              onFlowChange={controller.changeFlowModel}
            />
            <RoleSimulator graph={graph} />
          </div>
        );
      case "policy":
        return (
          <PolicyCanvas
            graph={graph}
            onPolicyChange={controller.changePolicyModel}
          />
        );
      case "ai":
        return (
          <AiCanvas
            disabled={
              !controller.remoteDraft ||
              controller.connectionState === "proposing"
            }
            onPropose={controller.proposeWithAi}
            proposal={controller.aiProposal}
          />
        );
      case "code":
        return (
          <CodeCanvas
            canExport={Boolean(
              controller.remoteDraft && controller.publishedRevision,
            )}
            compilation={controller.compilation}
            exchangeStatus={controller.exchangeStatus}
            graph={graph}
            onExportPublishedGraph={controller.exportPublishedGraph}
            onImportPublishedGraph={controller.importPublishedGraph}
            onOpenPreview={controller.openPreview}
            onStartPreview={controller.startPreview}
            onStopPreview={controller.stopPreview}
            publishedRevision={controller.publishedRevision}
            previewRun={controller.previewRun}
          />
        );
      case "release":
        return (
          <ReleaseWorkspace
            controller={controller.release}
            onViewEvidence={controller.toggleActivity}
          />
        );
    }
  })();

  return <WorkbenchShell controller={controller}>{surface}</WorkbenchShell>;
}
