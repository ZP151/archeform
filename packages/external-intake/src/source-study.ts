import { z } from "zod";

import {
  assertNoSensitiveIntakeKeys,
  intakeContractPrimitives,
  parseExternalSourceAcquisition,
  parseIntakeRequest,
  parseSourceSnapshot,
  type ExternalSourceAcquisitionV1,
  type IntakeRequestV1,
  type SourceSnapshotV1,
} from "./contracts.js";
import { ExternalIntakeStore, type StoredRecordRef } from "./store.js";

export interface ExternalSourceStudyV1 {
  readonly apiVersion: "factory.external-source-study/v1";
  readonly acquisitionDigest: `sha256:${string}`;
  readonly snapshotDigest: `sha256:${string}`;
  readonly classification: "direct-dependency" | "source-study" | "provider";
  readonly licence: {
    readonly primaryPathCount: number;
    readonly noticeCount: number;
  };
  readonly requestedModuleCount: number;
  readonly status: "acquired-unreviewed";
}

export interface ExternalSourceStudyParentsV1 {
  readonly request: StoredRecordRef;
  readonly snapshot: StoredRecordRef;
  readonly acquisition: StoredRecordRef;
}

const sourceStudyRecordRefSchema = z
  .object({
    kind: z.enum(["request", "snapshot", "acquisition"]),
    digest: intakeContractPrimitives.sha256DigestSchema,
  })
  .strict();

const sourceStudyParentsSchema = z
  .object({
    request: sourceStudyRecordRefSchema.extend({ kind: z.literal("request") }),
    snapshot: sourceStudyRecordRefSchema.extend({
      kind: z.literal("snapshot"),
    }),
    acquisition: sourceStudyRecordRefSchema.extend({
      kind: z.literal("acquisition"),
    }),
  })
  .strict();

function parseExternalSourceStudyParents(
  input: unknown,
): ExternalSourceStudyParentsV1 {
  assertNoSensitiveIntakeKeys(input);
  return sourceStudyParentsSchema.parse(input);
}

function readParent(
  store: ExternalIntakeStore,
  ref: StoredRecordRef,
  kind: "request" | "snapshot" | "acquisition",
): IntakeRequestV1 | SourceSnapshotV1 | ExternalSourceAcquisitionV1 {
  if (ref.kind !== kind) {
    throw new Error("Source study parent record kind is invalid.");
  }
  try {
    const record = store.getRecord(ref);
    switch (kind) {
      case "request":
        return parseIntakeRequest(record);
      case "snapshot":
        return parseSourceSnapshot(record);
      case "acquisition":
        return parseExternalSourceAcquisition(record);
    }
  } catch {
    throw new Error("Source study parent record is absent or invalid.");
  }
}

function hasExactParents(
  acquisition: ExternalSourceAcquisitionV1,
  request: StoredRecordRef,
  snapshot: StoredRecordRef,
): boolean {
  return (
    acquisition.sourceRequestDigest === request.digest &&
    acquisition.snapshot.recordDigest === snapshot.digest &&
    acquisition.parentDigests.length === 2 &&
    acquisition.parentDigests.includes(request.digest) &&
    acquisition.parentDigests.includes(snapshot.digest)
  );
}

export function createExternalSourceStudy(
  input: unknown,
  store: ExternalIntakeStore,
): ExternalSourceStudyV1 {
  const parents = parseExternalSourceStudyParents(input);
  const request = readParent(
    store,
    parents.request,
    "request",
  ) as IntakeRequestV1;
  const snapshot = readParent(
    store,
    parents.snapshot,
    "snapshot",
  ) as SourceSnapshotV1;
  const acquisition = readParent(
    store,
    parents.acquisition,
    "acquisition",
  ) as ExternalSourceAcquisitionV1;

  if (
    !hasExactParents(acquisition, parents.request, parents.snapshot) ||
    snapshot.parentDigests.length !== 1 ||
    snapshot.parentDigests[0] !== parents.request.digest ||
    acquisition.acquisitionState !== "acquired" ||
    acquisition.manualStatus !== "unreviewed"
  ) {
    throw new Error("Source study parent relationship is invalid.");
  }

  return {
    apiVersion: "factory.external-source-study/v1",
    acquisitionDigest: parents.acquisition.digest,
    snapshotDigest: parents.snapshot.digest,
    classification: request.classification,
    licence: {
      primaryPathCount: acquisition.licence.primaryPaths.length,
      noticeCount: acquisition.notices.length,
    },
    requestedModuleCount: request.requestedModules.length,
    status: "acquired-unreviewed",
  };
}
