import { z } from "zod";

import {
  CompositionError,
  digestJson,
  graphKeySchema,
  parseStrict,
  sha256DigestSchema,
} from "./composition-shared.js";
import type { Sha256Digest } from "./product-intent.js";

const typedSha256DigestSchema = sha256DigestSchema as z.ZodType<Sha256Digest>;

export const draftPreviewSnapshotSchema = z
  .object({
    apiVersion: z.literal("factory.draft-preview-snapshot/v1"),
    id: graphKeySchema,
    workspaceId: graphKeySchema,
    applicationGraphId: graphKeySchema,
    draftRevisionId: graphKeySchema,
    graphVersion: z.literal("factory.application-graph/v2"),
    graphChecksum: typedSha256DigestSchema,
    snapshotChecksum: typedSha256DigestSchema,
    disposition: z.literal("preview-only"),
    state: z.enum(["ready", "rendering", "active", "disposed", "expired"]),
    createdAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type DraftPreviewSnapshotV1 = z.infer<typeof draftPreviewSnapshotSchema>;

const boundSnapshotSchema = draftPreviewSnapshotSchema.omit({
  snapshotChecksum: true,
  state: true,
  createdAt: true,
  expiresAt: true,
});

export function hashDraftPreviewSnapshot(input: unknown): Sha256Digest {
  const snapshot = parseStrict(draftPreviewSnapshotSchema, input);
  return digestJson(
    boundSnapshotSchema.parse({
      apiVersion: snapshot.apiVersion,
      id: snapshot.id,
      workspaceId: snapshot.workspaceId,
      applicationGraphId: snapshot.applicationGraphId,
      draftRevisionId: snapshot.draftRevisionId,
      graphVersion: snapshot.graphVersion,
      graphChecksum: snapshot.graphChecksum,
      disposition: snapshot.disposition,
    }),
  ) as Sha256Digest;
}

export function assertDraftPreviewSnapshot(
  input: unknown,
): DraftPreviewSnapshotV1 {
  const snapshot = parseStrict(draftPreviewSnapshotSchema, input);
  if (Date.parse(snapshot.createdAt) >= Date.parse(snapshot.expiresAt)) {
    throw new CompositionError(
      "Draft Preview Snapshot expiresAt must be after createdAt.",
    );
  }
  if (hashDraftPreviewSnapshot(snapshot) !== snapshot.snapshotChecksum) {
    throw new CompositionError(
      "Draft Preview Snapshot checksum does not match its immutable binding.",
    );
  }
  return snapshot;
}

const boundTransitionCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("start-rendering"),
      occurredAt: z.string().datetime({ offset: true }),
      currentDraftRevisionId: graphKeySchema,
      currentGraphChecksum: sha256DigestSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("activate"),
      occurredAt: z.string().datetime({ offset: true }),
      currentDraftRevisionId: graphKeySchema,
      currentGraphChecksum: sha256DigestSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("dispose"),
      occurredAt: z.string().datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      kind: z.literal("expire"),
      occurredAt: z.string().datetime({ offset: true }),
    })
    .strict(),
  ...(["deploy", "export", "publish", "create-compilation"] as const).map(
    (kind) =>
      z
        .object({
          kind: z.literal(kind),
          occurredAt: z.string().datetime({ offset: true }),
        })
        .strict(),
  ),
]);

export type DraftPreviewSnapshotTransitionCommand =
  | {
      kind: "start-rendering" | "activate";
      occurredAt: string;
      currentDraftRevisionId: string;
      currentGraphChecksum: Sha256Digest;
    }
  | { kind: "dispose" | "expire"; occurredAt: string }
  | {
      kind: "deploy" | "export" | "publish" | "create-compilation";
      occurredAt: string;
    };

export type DraftPreviewSnapshotTransitionResult = {
  snapshot: DraftPreviewSnapshotV1;
  event: {
    kind: "draft-preview-snapshot-transition";
    snapshotId: string;
    from: DraftPreviewSnapshotV1["state"];
    to: DraftPreviewSnapshotV1["state"];
    occurredAt: string;
  };
};

const terminalStates = new Set<DraftPreviewSnapshotV1["state"]>([
  "disposed",
  "expired",
]);

export function transitionDraftPreviewSnapshot(
  snapshotInput: unknown,
  commandInput: DraftPreviewSnapshotTransitionCommand,
): DraftPreviewSnapshotTransitionResult {
  const snapshot = assertDraftPreviewSnapshot(snapshotInput);
  const command = parseStrict(
    boundTransitionCommandSchema,
    commandInput,
  ) as DraftPreviewSnapshotTransitionCommand;
  if (terminalStates.has(snapshot.state)) {
    throw new CompositionError(
      `Draft Preview Snapshot state '${snapshot.state}' is terminal.`,
    );
  }
  if (
    command.kind === "deploy" ||
    command.kind === "export" ||
    command.kind === "publish" ||
    command.kind === "create-compilation"
  ) {
    throw new CompositionError(
      `Draft Preview Snapshot is preview-only and cannot perform '${command.kind}'.`,
    );
  }
  const occurredAt = Date.parse(command.occurredAt);
  if (occurredAt < Date.parse(snapshot.createdAt)) {
    throw new CompositionError(
      "Draft Preview Snapshot transition cannot precede snapshot creation.",
    );
  }
  let nextState: DraftPreviewSnapshotV1["state"];
  if (command.kind === "start-rendering") {
    if (snapshot.state !== "ready") {
      throw new CompositionError(
        `Draft Preview Snapshot cannot transition from '${snapshot.state}' to rendering.`,
      );
    }
    if (command.currentDraftRevisionId !== snapshot.draftRevisionId) {
      throw new CompositionError(
        "Draft Preview Snapshot is stale relative to the current Draft revision.",
      );
    }
    if (command.currentGraphChecksum !== snapshot.graphChecksum) {
      throw new CompositionError(
        "Draft Preview Snapshot Graph checksum does not match the current Draft.",
      );
    }
    if (occurredAt >= Date.parse(snapshot.expiresAt)) {
      throw new CompositionError(
        "Draft Preview Snapshot has expired and cannot start rendering.",
      );
    }
    nextState = "rendering";
  } else if (command.kind === "activate") {
    if (snapshot.state !== "rendering") {
      throw new CompositionError(
        `Draft Preview Snapshot cannot transition from '${snapshot.state}' to active.`,
      );
    }
    if (command.currentDraftRevisionId !== snapshot.draftRevisionId) {
      throw new CompositionError(
        "Draft Preview Snapshot is stale relative to the current Draft revision.",
      );
    }
    if (command.currentGraphChecksum !== snapshot.graphChecksum) {
      throw new CompositionError(
        "Draft Preview Snapshot Graph checksum does not match the current Draft.",
      );
    }
    if (occurredAt >= Date.parse(snapshot.expiresAt)) {
      throw new CompositionError(
        "Draft Preview Snapshot has expired and cannot activate.",
      );
    }
    nextState = "active";
  } else if (command.kind === "dispose") {
    nextState = "disposed";
  } else {
    if (occurredAt < Date.parse(snapshot.expiresAt)) {
      throw new CompositionError(
        "Draft Preview Snapshot is not expired at the transition time.",
      );
    }
    nextState = "expired";
  }

  return {
    snapshot: { ...snapshot, state: nextState },
    event: {
      kind: "draft-preview-snapshot-transition",
      snapshotId: snapshot.id,
      from: snapshot.state,
      to: nextState,
      occurredAt: command.occurredAt,
    },
  };
}
