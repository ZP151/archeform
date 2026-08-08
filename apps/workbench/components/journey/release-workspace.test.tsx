// @vitest-environment happy-dom

import type { DraftDiffV1 } from "@factory/graph";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReleaseJourneyController } from "../../lib/product-journey/use-release-journey";
import {
  beginRelease,
  compilationStarted,
  compilationSucceeded,
  previewStarted,
  previewStopped,
  publishingSucceeded,
  releaseFailed,
  verificationStarted,
  verificationSucceeded,
} from "../../lib/product-journey/release-model";
import { ReleaseWorkspace } from "./release-workspace";

function controllerFor(
  release: ReleaseJourneyController["release"],
  overrides: Partial<ReleaseJourneyController> = {},
): ReleaseJourneyController {
  return {
    release,
    busy: false,
    canPublish: false,
    canCompile: false,
    canVerify: false,
    canPreview: false,
    canCleanup: false,
    canApproveDraftDiff: false,
    canReset: false,
    approvalError: null,
    publishRelease: vi.fn(),
    compileRelease: vi.fn(),
    verifyRelease: vi.fn(),
    previewRelease: vi.fn(),
    cleanupRelease: vi.fn(),
    approveDraftDiff: vi.fn(),
    resetRelease: vi.fn(),
    ...overrides,
  };
}

function verifiedRelease() {
  let release = beginRelease({
    applicationGraphId: "expense-approval",
    draftRevisionId: "draft-expense-approval",
  });
  release = publishingSucceeded(release, "published-1");
  release = compilationStarted(release, "compilation-1");
  release = compilationSucceeded(release, "compilation-1");
  release = verificationStarted(release, "verify-1");
  return verificationSucceeded(release, [
    { stepId: "expense-create", status: "passed" },
    { stepId: "expense-read", status: "passed" },
    { stepId: "expense-submit", status: "passed" },
    { stepId: "expense-approve", status: "passed" },
    { stepId: "expense-reject", status: "passed" },
    { stepId: "expense-denied-submit", status: "failed" },
  ]);
}

/** A release failed during verification, bound to its started compilation. */
function failedDuringVerification(
  diagnosis: string,
  proposedDraftDiff?: typeof addBindingDiff,
) {
  let release = beginRelease({
    applicationGraphId: "expense-approval",
    draftRevisionId: "draft-expense-approval",
  });
  release = publishingSucceeded(release, "published-1");
  release = compilationStarted(release, "compilation-1");
  release = compilationSucceeded(release, "compilation-1");
  release = verificationStarted(release, "verify-1");
  return releaseFailed(release, diagnosis, proposedDraftDiff);
}

const addBindingDiff: DraftDiffV1 = {
  apiVersion: "factory.draft-diff/v1",
  baseDraftRevisionId: "draft-expense-approval",
  baseGraphHash: "sha256:" + "a".repeat(64),
  operations: [
    {
      op: "add-binding",
      capability: "core.identity-policy",
      graphSymbol: "graph.domain.expense",
    },
  ],
  affectedPaths: ["/domain/expense"],
  rationaleCode: "binding-missing-identity-policy",
  summary: "Bind the identity policy so role journeys are session-scoped.",
};

describe("ReleaseWorkspace", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onViewEvidence: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("React", React);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    onViewEvidence = vi.fn();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(controller: ReleaseJourneyController) {
    act(() => {
      root.render(
        <ReleaseWorkspace
          controller={controller}
          onViewEvidence={onViewEvidence}
        />,
      );
    });
  }

  function text(): string {
    return container.textContent ?? "";
  }

  it("renders an empty state when no release is in flight", () => {
    render(controllerFor(null));
    expect(text()).toContain("Compose a product to release it");
  });

  it("renders the publishing action with a clearly labelled local-preview note", () => {
    const release = beginRelease({
      applicationGraphId: "expense-approval",
      draftRevisionId: "draft-expense-approval",
    });
    render(
      controllerFor(release, { canPublish: true, publishRelease: vi.fn() }),
    );

    expect(text()).toContain(
      "Local preview release over the immutable Draft lifecycle (not a deployment).",
    );
    expect(text()).toContain("Publish Draft");
    // No evidence is invented before verification ran.
    expect(text()).not.toContain("passed");
  });

  it("shows the five-phase rail with the active phase running", () => {
    const release = beginRelease({
      applicationGraphId: "expense-approval",
      draftRevisionId: "draft-expense-approval",
    });
    render(controllerFor(release, { canPublish: true }));

    for (const label of [
      "Publish",
      "Compile",
      "Verify",
      "Preview",
      "Cleanup",
    ]) {
      expect(text()).toContain(label);
    }
  });

  it("shows evidence count-first without rendering the full timeline beneath the workspace", () => {
    const release = verifiedRelease();
    const controller = controllerFor(release, {
      canPreview: true,
      previewRelease: vi.fn(),
    });
    render(controller);

    // The count-first summary carries the honest step counts...
    expect(text()).toContain("6 steps · 5 passed · 1 failed");
    // ...and opens the Activity sheet, which owns the full release timeline.
    const viewButton = container.querySelector(".release-link-button");
    expect(viewButton).not.toBeNull();
    act(() => (viewButton as HTMLButtonElement).click());
    expect(onViewEvidence).toHaveBeenCalledTimes(1);
    // The workspace itself never renders the timeline list.
    expect(container.querySelector(".release-timeline")).toBeNull();
  });

  it("renders the preview card with the runtime URL and cleanup control", () => {
    const release = previewStarted(
      verifiedRelease(),
      "preview-1",
      "http://127.0.0.1:3000",
    );
    const cleanupRelease = vi.fn();
    render(controllerFor(release, { canCleanup: true, cleanupRelease }));

    expect(container.querySelector(".release-preview-url")?.textContent).toBe(
      "http://127.0.0.1:3000",
    );
    const link = container.querySelector<HTMLAnchorElement>(
      'a[href="http://127.0.0.1:3000"]',
    );
    expect(link).not.toBeNull();
    expect(link?.target).toBe("_blank");
    act(() => {
      (
        Array.from(container.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Stop and clean up"),
        ) as HTMLButtonElement
      ).click();
    });
    expect(cleanupRelease).toHaveBeenCalledTimes(1);
  });

  it("marks the failing phase on the rail when verification fails", () => {
    const release = failedDuringVerification("verification.failed");
    render(controllerFor(release, { canReset: true }));

    expect(text()).toContain("Release stopped");
    expect(text()).toContain("verification.failed");
    expect(container.querySelectorAll(".release-phase-failed")).toHaveLength(1);
  });

  it("renders the reviewable Draft Diff and the approval control, with the never-applied note", () => {
    const release = failedDuringVerification(
      "binding.missing_identity_policy",
      addBindingDiff,
    );
    const approveDraftDiff = vi.fn();
    render(
      controllerFor(release, {
        canApproveDraftDiff: true,
        canReset: true,
        approveDraftDiff,
      }),
    );

    expect(text()).toContain("Reviewable Draft Diff");
    expect(text()).toContain("Bind the identity policy");
    expect(text()).toContain(
      "Add binding: core.identity-policy on graph.domain.expense",
    );
    expect(text()).toContain("never applies a diff automatically");
    act(() => {
      (
        Array.from(container.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Approve Draft Diff"),
        ) as HTMLButtonElement
      ).click();
    });
    expect(approveDraftDiff).toHaveBeenCalledTimes(1);
  });

  it("surfaces a bounded approval refusal", () => {
    const release = failedDuringVerification(
      "binding.missing_identity_policy",
      addBindingDiff,
    );
    render(
      controllerFor(release, {
        approvalError: "release.conflict",
        canApproveDraftDiff: true,
      }),
    );

    expect(text()).toContain("Approval refused");
    expect(text()).toContain("release.conflict");
  });

  it("renders the cleaned-up terminal state with a restart control", () => {
    const release = previewStopped(
      previewStarted(verifiedRelease(), "preview-1", "http://127.0.0.1:3000"),
    );
    const resetRelease = vi.fn();
    render(controllerFor(release, { canReset: true, resetRelease }));

    expect(text()).toContain("Preview stopped and cleaned up.");
    act(() => {
      (
        Array.from(container.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Release again"),
        ) as HTMLButtonElement
      ).click();
    });
    expect(resetRelease).toHaveBeenCalledTimes(1);
  });
});
