"use client";

import type { ApplicationGraphV1 } from "@factory/graph";
import { useState } from "react";

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
import { BuildingPreview } from "./journey/building-preview";
import { resolveWorkbenchContext } from "../state/workbench-shell-machine";
import {
  TemplateDraftWorkspace,
  type TemplatePageSelection,
} from "./template-draft-workspace";
import { TemplatePageWorkspace } from "./template-page-workspace";
import { TemplateDataWorkspace } from "./template-data-workspace";
import { TemplateExperienceWorkspace } from "./template-experience-workspace";

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
  const [templateSelection, setTemplateSelection] =
    useState<TemplatePageSelection | null>(null);
  const { state, graph, journey, flowDiagram } = controller;
  const defaultTemplatePage =
    controller.templateDraft?.previews[0].surface.pages[0];
  const selectionIsCurrent = controller.templateDraft?.previews.some(
    ({ surface }) =>
      surface.surfaceKey === templateSelection?.surfaceKey &&
      surface.pages.some(({ id }) => id === templateSelection.pageId),
  );
  const activeTemplateSelection =
    selectionIsCurrent && templateSelection
      ? templateSelection
      : defaultTemplatePage
        ? {
            surfaceKey:
              controller.templateDraft!.previews[0].surface.surfaceKey,
            pageId: defaultTemplatePage.id,
          }
        : null;
  const journeyProps = {
    stage: journey.state.stage,
    busy: journey.busy,
    error: journey.state.error,
    failure: journey.state.failure,
    brief: journey.briefDraft,
    onBriefChange: journey.setBriefDraft,
    onInterpret: () => {
      void journey.submitBrief();
    },
    examplePrompts: EXAMPLE_PROMPTS,
    onApplyExample: (brief: string) => journey.setBriefDraft(brief),
    requirement: journey.state.interpretation?.spec ?? null,
    blueprintTitle: journey.blueprintTitle,
    openQuestions: journey.openQuestions,
    answers: journey.answers,
    onAnswerChange: (key: string, answer: string) =>
      journey.setAnswer(key, answer),
    onContinue: () => {
      void journey.answerQuestions();
    },
    planAlternatives: journey.planAlternatives,
    chosenKey: journey.state.selectedAlternativeKey,
    onChoose: (key: string) => {
      void journey.chooseAlternative(key);
    },
    diffChecksum: journey.state.diffChecksum,
    onApply: () => {
      void controller.applyComposedProduct();
    },
  };
  const context = resolveWorkbenchContext(
    state.activeSurface === "experience" ? "page" : state.activeSurface,
    journey.state.stage,
    journey.busy,
  );

  const surface = (() => {
    switch (state.activeSurface) {
      case "home":
        return controller.templateDraft ? (
          <TemplateDraftWorkspace
            instance={controller.templateDraft}
            selection={activeTemplateSelection!}
            busy={controller.templateBusy}
            error={controller.templateError}
            onRename={controller.renameTemplateDraft}
            onSelectionChange={setTemplateSelection}
            onEditPage={(selection) => {
              setTemplateSelection(selection);
              controller.navigate("page");
            }}
          />
        ) : context === "builder" ? (
          <BuildingPreview
            journey={journeyProps}
            commandFocusToken={state.commandFocusToken}
            page={graph.page.pages[0] ?? null}
            experience={graph.experience}
            revision={state.revision}
          />
        ) : (
          <WorkbenchHome
            applications={controller.applications}
            compilingKey={controller.compilingApplicationKey}
            loading={controller.applicationsLoading}
            onCompile={controller.compileApplication}
            onOpen={controller.openApplication}
            commandFocusToken={state.commandFocusToken}
            journey={journeyProps}
            curatedTemplates={controller.curatedTemplates}
            templatesLoading={controller.templatesLoading}
            templateBusy={controller.templateBusy}
            onStartTemplate={controller.startCuratedTemplate}
          />
        );
      case "page":
        return controller.templateDraft && activeTemplateSelection ? (
          <TemplatePageWorkspace
            instance={controller.templateDraft}
            selection={activeTemplateSelection}
            busy={controller.templateBusy}
            error={controller.templateError}
            onSave={controller.editTemplatePageTitle}
            onBack={controller.returnToTemplatePreview}
          />
        ) : (
          <ProductStudio
            page={graph.page}
            experience={graph.experience}
            entityKeys={graph.domain.entities.map((entity) => entity.key)}
            onPageModelChange={controller.changePageModel}
            onExperienceModelChange={controller.changeExperienceModel}
          />
        );
      case "domain":
        return controller.templateDraft ? (
          <TemplateDataWorkspace
            instance={controller.templateDraft}
            busy={controller.templateBusy}
            error={controller.templateError}
            onSave={controller.editTemplateDataField}
            onBack={controller.returnToTemplatePreview}
          />
        ) : (
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
      case "experience":
        return controller.templateDraft ? (
          <TemplateExperienceWorkspace
            instance={controller.templateDraft}
            busy={controller.templateBusy}
            error={controller.templateError}
            onSave={controller.editTemplateExperienceTheme}
            onBack={controller.returnToTemplatePreview}
          />
        ) : (
          <ProductStudio
            page={graph.page}
            experience={graph.experience}
            entityKeys={graph.domain.entities.map((entity) => entity.key)}
            onPageModelChange={controller.changePageModel}
            onExperienceModelChange={controller.changeExperienceModel}
          />
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
            artifactError={controller.artifactError}
            artifactLoading={controller.artifactLoading}
            artifactSnapshot={controller.artifactSnapshot}
            canExport={Boolean(
              controller.remoteDraft && controller.publishedRevision,
            )}
            compilation={controller.compilation}
            exchangeStatus={controller.exchangeStatus}
            graph={graph}
            onExportPublishedGraph={controller.exportPublishedGraph}
            onImportPublishedGraph={controller.importPublishedGraph}
            onInspectArtifact={controller.inspectArtifact}
            onDownloadSourceArchive={controller.downloadSourceArchive}
            onOpenPreview={controller.openPreview}
            onStartPreview={controller.startPreview}
            onStopPreview={controller.stopPreview}
            publishedRevision={controller.publishedRevision}
            previewRun={controller.previewRun}
            selectedArtifact={controller.selectedArtifact}
          />
        );
      case "release":
        return (
          <ReleaseWorkspace
            controller={controller.release}
            onViewEvidence={(trigger) => {
              controller.activityTriggerRef.current = trigger;
              controller.toggleActivity();
            }}
          />
        );
    }
  })();

  return <WorkbenchShell controller={controller}>{surface}</WorkbenchShell>;
}
