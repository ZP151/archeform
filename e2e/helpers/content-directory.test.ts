import { expect, test } from "@playwright/test";
import {
  assertConsumerCompilation,
  consumerDeliveryLabel,
  consumerEntryActions,
  ownedConsumerPreview,
  verifiedConsumerEvidence,
  compilationObservation,
  assertCompilationSucceeded,
  reconcileConsumerPreviewAttempt,
  type OwnedPreview,
} from "./content-directory";

const hash = "sha256:" + "a".repeat(64);
const published = {
  id: "published-1",
  graphHash: hash,
  compositionLockHash: hash,
};
const compilation = {
  id: "compilation-1",
  publishedRevisionId: "published-1",
  inputGraphHash: hash,
};

test("shared delivery observer identifies Work Orders and retains existing family labels", () => {
  expect(consumerDeliveryLabel("facilities-service-desk")).toBe("Work Orders");
  expect(consumerDeliveryLabel("appointment-booking-v2")).toBe("Appointment");
  expect(consumerDeliveryLabel("knowledge-resource-directory")).toBe(
    "Directory",
  );
  expect(consumerDeliveryLabel("supplies-stockroom")).toBe("Inventory");
  expect(() => consumerDeliveryLabel("appointment-booking-v1")).toThrow(
    "Unsupported consumer acceptance definition.",
  );
  expect(() => consumerDeliveryLabel("unknown")).toThrow(
    "Unsupported consumer acceptance definition.",
  );
});
test("consumer compilation rejects a different Published revision or immutable input", () => {
  expect(() => assertConsumerCompilation(published, compilation)).not.toThrow();
  for (const changed of [
    { ...compilation, publishedRevisionId: "published-other" },
    { ...compilation, inputGraphHash: "sha256:" + "b".repeat(64) },
    { ...compilation, id: "" },
  ])
    expect(() => assertConsumerCompilation(published, changed)).toThrow(
      "Consumer Compilation identity mismatch.",
    );
  expect(() =>
    assertConsumerCompilation(
      { ...published, compositionLockHash: null },
      compilation,
    ),
  ).toThrow("Consumer Compilation identity mismatch.");
});

const verification = {
  verificationRunId: "verification-1",
  compilationId: "compilation-1",
  status: "succeeded",
  stepIds: ["business-job"],
  evidence: {
    apiVersion: "factory.verification-evidence/v1",
    verificationRunId: "verification-1",
    compilationDigest: hash,
    steps: [
      {
        stepId: "business-job",
        kind: "role-journey",
        status: "passed",
        summary: "Business job passed.",
      },
    ],
    cleanup: { succeeded: true, summary: "Removed owned resources." },
    artifactDigests: [],
    completedAt: "2026-09-24T00:00:00.000Z",
  },
};
test("consumer verification requires exact run ownership and nonempty all-passed evidence", () => {
  expect(
    verifiedConsumerEvidence(verification, "compilation-1", "verification-1"),
  ).toBe(1);
  for (const changed of [
    { ...verification, compilationId: "compilation-other" },
    { ...verification, status: "running" },
    { ...verification, verificationRunId: "verification-other" },
    { ...verification, stepIds: ["different-job"] },
    {
      ...verification,
      evidence: {
        ...verification.evidence,
        verificationRunId: "verification-other",
      },
    },
    { ...verification, evidence: { ...verification.evidence, steps: [] } },
    {
      ...verification,
      evidence: {
        ...verification.evidence,
        steps: [{ ...verification.evidence.steps[0], status: "skipped" }],
      },
    },
    {
      ...verification,
      evidence: {
        ...verification.evidence,
        cleanup: { succeeded: false, summary: "Cleanup failed." },
      },
    },
  ])
    expect(() =>
      verifiedConsumerEvidence(changed, "compilation-1", "verification-1"),
    ).toThrow("Consumer verification was not authoritative and successful.");
});

test("preview ownership requires the exact compilation and derived Compose project", () => {
  const preview = {
    id: "preview-test",
    compilationId: "compilation-1",
    composeProjectName: "factory-preview-preview-test",
    status: "queued",
    apiPort: null,
    previewUrl: null,
  };
  expect(ownedConsumerPreview(preview, "compilation-1")).toEqual(preview);
  for (const changed of [
    { ...preview, compilationId: "compilation-other" },
    { ...preview, composeProjectName: "factory-preview-preview-other" },
    { ...preview, id: "../unowned" },
  ])
    expect(() => ownedConsumerPreview(changed, "compilation-1")).toThrow(
      "Consumer Preview ownership mismatch.",
    );
});

test("entry counts distinguish business, technical, navigation and retry actions and reject unknown telemetry", () => {
  expect(
    consumerEntryActions([
      "business",
      "technical",
      "technical",
      "navigation",
      "retry",
      "answer",
    ]),
  ).toEqual({
    businessSubmissions: 1,
    materialAnswerSubmissions: 1,
    technicalActions: 2,
    viewNavigation: 1,
    retries: 1,
    otherActions: 0,
  });
  expect(consumerEntryActions(["business", "other"]).otherActions).toBe(1);
  expect(() => consumerEntryActions(["private-text"])).toThrow(
    "Invalid bounded consumer action observation.",
  );
  expect(() => consumerEntryActions(Array(1001).fill("technical"))).toThrow(
    "Invalid bounded consumer action observation.",
  );
});

test("terminal compilation failure retains only its safe code and cannot pass", () => {
  const observation = compilationObservation({
    result: {
      status: "failed",
      failureCode: "private-text",
      detail: "private-text",
    },
  });
  expect(observation).toEqual({ status: "failed", failureCode: "unknown" });
  expect(() => assertCompilationSucceeded(observation)).toThrow(
    "Compilation did not succeed.",
  );
});

test("an empty lookup cannot clear a Preview attempt whose creation commits later", async () => {
  const latePreview: OwnedPreview = {
    id: "preview-late",
    compilationId: "compilation-1",
    composeProjectName: "factory-preview-preview-late",
    status: "queued",
    apiPort: null,
    previewUrl: null,
  };
  let commit!: () => void;
  let current: OwnedPreview | null = null;
  const creation = new Promise<void>((resolve) => {
    commit = resolve;
  }).then(() => {
    current = latePreview;
  });
  const remembered: OwnedPreview[] = [];
  const remember = (_id: string, preview?: OwnedPreview) => {
    if (preview) remembered.push(preview);
  };
  // The request started, but neither response headers nor a committed run exist yet.
  expect(
    reconcileConsumerPreviewAttempt("compilation-1", true, current, remember),
  ).toBe("cleanup-required");
  expect(remembered).toEqual([]);
  commit();
  await creation;
  expect(
    reconcileConsumerPreviewAttempt("compilation-1", true, current, remember),
  ).toBe("owned-preview-observed");
  expect(remembered).toEqual([latePreview]);
});

test("only an unattempted Preview may treat an empty lookup as no creation", () => {
  const remember = () => {
    throw new Error("Unexpected Preview ownership.");
  };
  expect(
    reconcileConsumerPreviewAttempt("compilation-1", false, null, remember),
  ).toBe("no-preview-attempted");
  expect(
    reconcileConsumerPreviewAttempt("compilation-1", true, null, remember),
  ).toBe("cleanup-required");
});
