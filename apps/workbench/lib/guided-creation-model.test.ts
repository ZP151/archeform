import { describe, expect, it } from "vitest";

import {
  initialGuidedCreationState,
  transitionGuidedCreation,
} from "./guided-creation-model";

describe("guided creation state", () => {
  it("requires an outcome and a valid name before the review stage", () => {
    const opened = transitionGuidedCreation(initialGuidedCreationState, {
      type: "open",
    });
    const withProfile = transitionGuidedCreation(opened, {
      type: "select-profile",
      profile: "expense-approval",
    });
    const details = transitionGuidedCreation(withProfile, { type: "next" });
    const rejected = transitionGuidedCreation(details, { type: "next" });
    const named = transitionGuidedCreation(rejected, {
      type: "set-name",
      name: "Travel approvals",
    });
    const reviewed = transitionGuidedCreation(named, { type: "next" });

    expect(details.stage).toBe("details");
    expect(rejected.stage).toBe("details");
    expect(rejected.error).toBe("Application name is required.");
    expect(reviewed).toMatchObject({
      stage: "review",
      input: {
        profile: "expense-approval",
        name: "Travel approvals",
        theme: "light",
      },
    });
  });

  it("retains selections while a draft creation attempt is pending or fails", () => {
    const reviewed = {
      open: true,
      stage: "review" as const,
      input: {
        profile: "simple-ecommerce" as const,
        name: "Storefront",
        theme: "dark" as const,
      },
      error: null,
      creating: false,
    };

    const creating = transitionGuidedCreation(reviewed, { type: "create" });
    const failed = transitionGuidedCreation(creating, {
      type: "create-failed",
      message: "The local Control Plane is unavailable.",
    });

    expect(creating.creating).toBe(true);
    expect(failed).toMatchObject({
      open: true,
      stage: "review",
      creating: false,
      input: reviewed.input,
      error: "The local Control Plane is unavailable.",
    });
  });
});

