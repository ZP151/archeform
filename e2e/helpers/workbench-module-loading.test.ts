import { expect, test } from "@playwright/test";
import {
  approvalInterpretationFixture,
  purchaseRequestInterpretationFixture,
} from "../../apps/workbench/test/consumer-generation-fixture";
import { cleanRequestedPreview } from "../../apps/workbench/lib/product-journey/preview-cleanup";
import { normalizeReleaseDiagnosisCode } from "../../apps/workbench/lib/product-journey/release-diagnosis";
import { assertRequirementInterpretationResult } from "../../packages/adapters/dist/index.js";

test("shared Workbench fixtures execute through the E2E module boundary", async () => {
  // Authored fixture transports only; no provider or application is contacted.
  for (const fixture of [
    approvalInterpretationFixture,
    purchaseRequestInterpretationFixture,
  ]) {
    const result = assertRequirementInterpretationResult(await fixture());
    expect(result.interpretation.blueprint.actors.length).toBeGreaterThan(0);
  }
});

test("shared Workbench pure helpers remain callable in a Playwright worker", async () => {
  expect(normalizeReleaseDiagnosisCode("preview.failed")).toBe(
    "preview.failed",
  );
  expect(normalizeReleaseDiagnosisCode({})).toBe("verification.failed");
  const calls: string[] = [];
  // Only in-memory callbacks execute. This does not stop or inspect a resource.
  await cleanRequestedPreview({
    knownIdentity: {
      previewRunId: "module-test",
      composeProjectName: "module-test",
    },
    recoverIdentity: async () => {
      throw new Error("An existing identity must not be recovered.");
    },
    stopViaUi: async () => {
      calls.push("ui");
    },
    stopViaApi: async () => {
      calls.push("api");
    },
    assertAbsent: async () => {
      calls.push("absent");
    },
  });
  expect(calls).toEqual(["ui", "api", "absent"]);
});
