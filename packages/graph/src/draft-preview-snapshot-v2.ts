import { z } from "zod";

import {
  CompositionError,
  digestJson,
  graphKeySchema,
  parseStrict,
  sha256DigestSchema,
} from "./composition-shared.js";
import type { Sha256Digest } from "./product-intent.js";

export type DraftPreviewSnapshotV2 = {
  apiVersion: "factory.draft-preview-snapshot/v2";
  id: string;
  workspaceId: string;
  applicationGraphId: string;
  draftRevisionId: string;
  graphVersion: "factory.application-graph/v3";
  graphChecksum: Sha256Digest;
  snapshotChecksum: Sha256Digest;
  disposition: "preview-only";
  state: "ready" | "rendering" | "active" | "disposed" | "expired";
  createdAt: string;
  expiresAt: string;
};

type StrictBoundaryCopyResult = { ok: true; value: unknown } | { ok: false };

function isCanonicalArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < length &&
    String(index) === key
  );
}

function copyStrictBoundaryInput(input: unknown): StrictBoundaryCopyResult {
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) return { ok: false };
    for (const key of Reflect.ownKeys(input)) {
      if (key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        !isCanonicalArrayIndex(key, input.length) ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        return { ok: false };
      }
    }
    const copy: unknown[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !("value" in descriptor)
      ) {
        return { ok: false };
      }
      const nested = copyStrictBoundaryInput(descriptor.value);
      if (!nested.ok) return nested;
      copy.push(nested.value);
    }
    return { ok: true, value: copy };
  }
  if (input !== null && typeof input === "object") {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false };
    }
    const copy: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        return { ok: false };
      }
      const nested = copyStrictBoundaryInput(descriptor.value);
      if (!nested.ok) return nested;
      copy[key] = nested.value;
    }
    return { ok: true, value: copy };
  }
  return { ok: true, value: input };
}

const strictBoundarySchema = z.unknown().transform((input, context) => {
  const copied = copyStrictBoundaryInput(input);
  if (!copied.ok) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Input must contain only plain own records and arrays.",
    });
    return z.NEVER;
  }
  return copied.value;
});

const typedSha256DigestSchema = sha256DigestSchema as z.ZodType<Sha256Digest>;

const rawDraftPreviewSnapshotV2Schema = z
  .object({
    apiVersion: z.literal("factory.draft-preview-snapshot/v2"),
    id: graphKeySchema,
    workspaceId: graphKeySchema,
    applicationGraphId: graphKeySchema,
    draftRevisionId: graphKeySchema,
    graphVersion: z.literal("factory.application-graph/v3"),
    graphChecksum: typedSha256DigestSchema,
    snapshotChecksum: typedSha256DigestSchema,
    disposition: z.literal("preview-only"),
    state: z.enum(["ready", "rendering", "active", "disposed", "expired"]),
    createdAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const draftPreviewSnapshotV2Schema = strictBoundarySchema.pipe(
  rawDraftPreviewSnapshotV2Schema,
) as z.ZodType<DraftPreviewSnapshotV2>;

const boundSnapshotSchema = rawDraftPreviewSnapshotV2Schema.omit({
  snapshotChecksum: true,
  state: true,
  createdAt: true,
  expiresAt: true,
});

export function hashDraftPreviewSnapshotV2(input: unknown): Sha256Digest {
  const snapshot = parseStrict(draftPreviewSnapshotV2Schema, input);
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

export function assertDraftPreviewSnapshotV2(
  input: unknown,
): DraftPreviewSnapshotV2 {
  const snapshot = parseStrict(draftPreviewSnapshotV2Schema, input);
  if (Date.parse(snapshot.createdAt) >= Date.parse(snapshot.expiresAt)) {
    throw new CompositionError(
      "Draft Preview Snapshot expiresAt must be after createdAt.",
    );
  }
  if (hashDraftPreviewSnapshotV2(snapshot) !== snapshot.snapshotChecksum) {
    throw new CompositionError(
      "Draft Preview Snapshot checksum does not match its immutable binding.",
    );
  }
  return snapshot;
}

const rawTransitionCommandSchema = z.discriminatedUnion("kind", [
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

const transitionCommandSchema = strictBoundarySchema.pipe(
  rawTransitionCommandSchema,
);

export type DraftPreviewSnapshotV2TransitionCommand =
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

export type DraftPreviewSnapshotV2TransitionResult = {
  snapshot: DraftPreviewSnapshotV2;
  event: {
    kind: "draft-preview-snapshot-transition";
    snapshotId: string;
    from: DraftPreviewSnapshotV2["state"];
    to: DraftPreviewSnapshotV2["state"];
    occurredAt: string;
  };
};

const terminalStates = new Set<DraftPreviewSnapshotV2["state"]>([
  "disposed",
  "expired",
]);

export function transitionDraftPreviewSnapshotV2(
  snapshotInput: unknown,
  commandInput: DraftPreviewSnapshotV2TransitionCommand,
): DraftPreviewSnapshotV2TransitionResult {
  const snapshot = assertDraftPreviewSnapshotV2(snapshotInput);
  const command = parseStrict(
    transitionCommandSchema,
    commandInput,
  ) as DraftPreviewSnapshotV2TransitionCommand;
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

  let nextState: DraftPreviewSnapshotV2["state"];
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
