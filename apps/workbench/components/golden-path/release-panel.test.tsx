// @vitest-environment happy-dom

import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";

import type { DraftDiffV1 } from "@factory/graph";

import type { PersistedDraft } from "../../lib/golden-path/journey-model";
import {
  beginRelease,
  compilationStarted,
  compilationSucceeded,
  previewStarted,
  publishingSucceeded,
  releaseFailed,
  verificationStarted,
  verificationSucceeded,
} from "../../lib/golden-path/release-model";
import { ReleasePanel } from "./release-panel";
import { renderComponent } from "./render-helper";

const persisted: PersistedDraft = {
  applicationGraphId: "graph-expense",
  draftRevisionId: "draft-2",
  revisionNumber: 2,
  graph: { metadata: { id: "graph-expense" } } as never,
};

const proposedDraftDiff: DraftDiffV1 = {
  apiVersion: "factory.draft-diff/v1",
  baseDraftRevisionId: "draft-2",
  baseGraphHash: "sha256:" + "a".repeat(64),
  operations: [
    {
      op: "change-constraint",
      entity: "expense",
      field: "amount",
      constraint: "type",
      value: "number",
    },
  ],
  affectedPaths: ["domain/entities/expense"],
  rationaleCode: "verifier.proposed",
  summary: "Amount must be a number.",
};

function happyRelease() {
  let release = beginRelease({
    applicationGraphId: "graph-expense",
    draftRevisionId: "draft-2",
  });
  release = publishingSucceeded(release, "published-1");
  release = compilationStarted(release, "compilation-1");
  release = compilationSucceeded(release, "compilation-1");
  release = verificationStarted(release, "verification-run-1");
  release = verificationSucceeded(release, [
    { stepId: "isolated-boot", status: "succeeded" },
    { stepId: "employee-submit", status: "succeeded" },
  ]);
  release = previewStarted(release, "preview-1", "http://127.0.0.1:43101");
  return release;
}

function click(container: HTMLElement, label: string): void {
  const element = container.querySelector(
    `[aria-label="${label}"]`,
  ) as HTMLElement | null;
  expect(element, `Expected element '${label}'`).not.toBeNull();
  act(() => element!.click());
}

describe("ReleasePanel", () => {
  it("requires an applied Draft before the one-action release", () => {
    const onPublishAndRelease = vi.fn();
    const container = renderComponent(
      <ReleasePanel
        persistedDraft={null}
        release={null}
        busy={false}
        error={null}
        onPublishAndRelease={onPublishAndRelease}
        onStopPreview={vi.fn()}
        onApproveDraftDiff={vi.fn()}
      />,
    );
    const release = container.querySelector(
      '[aria-label="Publish and release"]',
    ) as HTMLButtonElement;
    expect(release.disabled).toBe(true);
    act(() => release.click());
    expect(onPublishAndRelease).not.toHaveBeenCalled();
  });

  it("starts the one-action release pipeline", () => {
    const onPublishAndRelease = vi.fn();
    const container = renderComponent(
      <ReleasePanel
        persistedDraft={persisted}
        release={null}
        busy={false}
        error={null}
        onPublishAndRelease={onPublishAndRelease}
        onStopPreview={vi.fn()}
        onApproveDraftDiff={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("draft-2");
    click(container, "Publish and release");
    expect(onPublishAndRelease).toHaveBeenCalledOnce();
  });

  it("shows the preview surface and stops the preview", () => {
    const onStopPreview = vi.fn();
    const container = renderComponent(
      <ReleasePanel
        persistedDraft={persisted}
        release={happyRelease()}
        busy={false}
        error={null}
        onPublishAndRelease={vi.fn()}
        onStopPreview={onStopPreview}
        onApproveDraftDiff={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("http://127.0.0.1:43101");
    expect(container.textContent).toContain("2");
    const open = container.querySelector('[aria-label="Open preview"]');
    expect(open?.getAttribute("href")).toBe("http://127.0.0.1:43101");
    click(container, "Stop preview");
    expect(onStopPreview).toHaveBeenCalledOnce();
  });

  it("labels the release as a local preview, never a deployment", () => {
    const container = renderComponent(
      <ReleasePanel
        persistedDraft={persisted}
        release={happyRelease()}
        busy={false}
        error={null}
        onPublishAndRelease={vi.fn()}
        onStopPreview={vi.fn()}
        onApproveDraftDiff={vi.fn()}
      />,
    );
    expect(container.textContent).toMatch(/local preview/i);
    expect(container.textContent).toMatch(/not a deployment/i);
    expect(container.textContent).not.toMatch(/production/i);
  });

  it("surfaces a failed verification with its reviewable Draft Diff", () => {
    const onApproveDraftDiff = vi.fn();
    let release = beginRelease({
      applicationGraphId: "graph-expense",
      draftRevisionId: "draft-2",
    });
    release = publishingSucceeded(release, "published-1");
    release = compilationStarted(release, "compilation-1");
    release = compilationSucceeded(release, "compilation-1");
    release = verificationStarted(release, "verification-run-1");
    release = releaseFailed(
      release,
      "verify.expense_threshold_exceeded",
      proposedDraftDiff,
    );
    const container = renderComponent(
      <ReleasePanel
        persistedDraft={persisted}
        release={release}
        busy={false}
        error={null}
        onPublishAndRelease={vi.fn()}
        onStopPreview={vi.fn()}
        onApproveDraftDiff={onApproveDraftDiff}
      />,
    );
    expect(container.textContent).toContain(
      "verify.expense_threshold_exceeded",
    );
    click(container, "Approve and apply the Draft Diff");
    expect(onApproveDraftDiff).toHaveBeenCalledOnce();
  });

  it("renders the bounded evidence timeline", () => {
    const container = renderComponent(
      <ReleasePanel
        persistedDraft={persisted}
        release={happyRelease()}
        busy={false}
        error={null}
        onPublishAndRelease={vi.fn()}
        onStopPreview={vi.fn()}
        onApproveDraftDiff={vi.fn()}
      />,
    );
    const timeline = container.querySelector(
      '[aria-label="Release evidence timeline"]',
    );
    expect(timeline?.textContent).toContain("publish");
    expect(timeline?.textContent).toContain("compile");
    expect(timeline?.textContent).toContain("verify");
    expect(timeline?.textContent).toContain("boot");
  });
});
