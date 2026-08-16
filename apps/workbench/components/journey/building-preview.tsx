"use client";

import type { ExperienceModel, PageModel } from "@factory/graph";

import {
  ProductConversation,
  type WorkbenchHomeJourneyProps,
} from "../workbench-home";
import { ResponsivePreview } from "./responsive-preview";

function journeyLabel(journey: WorkbenchHomeJourneyProps): string {
  if (journey.busy && journey.stage === "brief") {
    return "Understanding the product";
  }
  switch (journey.stage) {
    case "brief":
    case "clarifying":
    case "failed":
      return "Understanding the product";
    case "planning":
      return "Shaping the plan";
    case "reviewing":
      return "Reviewing the change";
    case "applied":
      return "Draft ready";
  }
}

export function BuildingPreview({
  journey,
  commandFocusToken,
  page,
  experience,
  revision,
}: {
  readonly journey: WorkbenchHomeJourneyProps;
  readonly commandFocusToken: number;
  readonly page: PageModel["pages"][number] | null;
  readonly experience: ExperienceModel;
  readonly revision: string;
}) {
  return (
    <section className="builder-workspace" aria-label="Builder workspace">
      <section
        className="builder-conversation"
        aria-label="Product conversation"
      >
        <header className="builder-panel-heading">
          <span>Build</span>
          <strong>{journeyLabel(journey)}</strong>
        </header>
        <ProductConversation
          journey={journey}
          commandFocusToken={commandFocusToken}
        />
      </section>
      <section className="builder-preview" aria-label="Live preview">
        <header className="builder-panel-heading">
          <span>Live preview</span>
          <small>Draft {revision}</small>
        </header>
        {page === null ? (
          <div className="builder-preview-empty" role="status">
            The first page will appear as the product takes shape.
          </div>
        ) : (
          <ResponsivePreview page={page} experience={experience} />
        )}
      </section>
    </section>
  );
}
