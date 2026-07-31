import { z } from "zod";

import {
  canonicalJson,
  canonicalRecordDigest,
  digestBytes,
  type Sha256Digest,
} from "./canonical.js";
import type {
  CandidateManifestV1,
  CandidateRegistryV1,
  StoredCandidateRefV1,
} from "./candidates.js";
import {
  parseEvidenceBundle,
  parseExternalSourceAcquisition,
  parseIntakeRequest,
  parseSourceSnapshot,
} from "./contracts.js";
import { SCAN_KIND_ORDER } from "./scans.js";
import { ExternalIntakeStore } from "./store.js";

const encoder = new TextEncoder();
const digestSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/u)
  .transform((value) => value as Sha256Digest);
const opaqueIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,127}$/u);
const versionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u);
const factoryKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u);
const safePathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (value) =>
      !value.includes("\\") &&
      !value.startsWith("/") &&
      !value.includes("\0") &&
      value
        .split("/")
        .every(
          (segment) =>
            segment.length > 0 &&
            segment !== "." &&
            segment !== ".." &&
            !/[<>:"|?*\u0000-\u001f]/u.test(segment) &&
            !/[. ]$/u.test(segment),
        ),
    "Promotion paths must be safe relative POSIX paths.",
  );
const targetSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u);
const scalarSchema = z
  .object({ type: z.enum(["string", "number", "integer", "boolean"]) })
  .strict();
const objectSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(scalarSchema),
    required: z.array(z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$-]{0,63}$/u)),
    additionalProperties: z.literal(false),
  })
  .strict();
const manifestSchema = z
  .object({
    apiVersion: z.literal("factory.candidate-manifest/v1"),
    id: opaqueIdSchema,
    version: versionSchema,
    proposedFactoryKey: factoryKeySchema,
    inputSchema: objectSchema,
    outputSchema: objectSchema,
    effects: z
      .array(z.string().regex(/^candidate\.(?:observe|project|validate)$/u))
      .max(64),
  })
  .strict();
const findingSchema = z
  .object({
    code: opaqueIdSchema,
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    count: z.number().int().positive().max(1_000_000),
    disposition: z.literal("pending-manual-review"),
  })
  .strict();
const findingGroupSchema = z
  .object({
    kind: z.enum(SCAN_KIND_ORDER),
    resultDigest: digestSchema,
    findings: z.array(findingSchema).max(10_000),
  })
  .strict();
const copyRangeSchema = z
  .object({
    path: safePathSchema,
    sourceDigest: digestSchema,
    lineRanges: z
      .array(
        z
          .object({
            start: z.number().int().positive(),
            end: z.number().int().positive(),
          })
          .strict()
          .refine(({ start, end }) => end >= start),
      )
      .min(1)
      .max(256),
    purpose: z.string().min(1).max(256),
  })
  .strict();
const sourceCopySchema = z.discriminatedUnion("mode", [
  z
    .object({ mode: z.literal("none"), ranges: z.array(z.never()).length(0) })
    .strict(),
  z
    .object({
      mode: z.literal("proposed-ranges"),
      ranges: z.array(copyRangeSchema).min(1).max(256),
    })
    .strict(),
]);
const reviewerRoleSchema = z.enum([
  "intake-maintainer",
  "licence-reviewer",
  "security-reviewer",
  "capability-maintainer",
  "architecture-owner",
  "qa-owner",
  "golden-owner",
]);
const reviewerSchema = z
  .object({
    role: reviewerRoleSchema,
    reviewer: z.string().regex(/^[a-z][a-z0-9-]{1,127}$/u),
    status: z.literal("assigned-not-reviewed"),
  })
  .strict();
const factorySchema = z
  .object({
    proposedFactoryKey: factoryKeySchema,
    version: versionSchema,
    packageRoot: safePathSchema,
    targets: z.array(targetSchema).min(1).max(64),
  })
  .strict();
const factoryInterfaceSchema = z
  .object({
    proposedFactoryKey: factoryKeySchema,
    version: versionSchema,
    manifestDigest: digestSchema,
    inputSchema: objectSchema,
    outputSchema: objectSchema,
    effects: z
      .array(z.string().regex(/^candidate\.(?:observe|project|validate)$/u))
      .max(64),
  })
  .strict();
const removalPlanSchema = z
  .object({
    packageRoot: safePathSchema,
    replacement: opaqueIdSchema,
    steps: z
      .array(
        z.enum(["remove-package", "remove-target-bindings", "run-regressions"]),
      )
      .length(3),
  })
  .strict();
const collisionEntrySchema = z
  .object({
    proposedFactoryKey: factoryKeySchema,
    version: versionSchema,
    packageRoot: safePathSchema,
    targets: z.array(targetSchema).min(1).max(64),
  })
  .strict();
const collisionInventoryDocumentSchema = z
  .object({
    apiVersion: z.literal("factory.external-collision-inventory/v1"),
    proposedFactoryKey: factoryKeySchema,
    version: versionSchema,
    packageRoot: safePathSchema,
    targets: z.array(targetSchema).min(1).max(64),
    entries: z.array(collisionEntrySchema).max(10_000),
  })
  .strict();
const collisionInventorySchema = z
  .object({
    digest: digestSchema,
    inventory: collisionInventoryDocumentSchema,
  })
  .strict();
const licenceReviewSchema = z
  .object({
    manualStatus: z.enum(["unreviewed", "approved", "rejected"]),
    reviewStatus: z.literal("pending-manual-review"),
  })
  .strict();
const findingDispositionsSchema = z.array(findingGroupSchema).length(4);
const noticesReviewSchema = z
  .object({
    destination: z.literal("docs/third-party-notices.md"),
    action: z.literal("pending-manual-review"),
  })
  .strict();
const reviewersSchema = z.array(reviewerSchema).length(7);

const promotionReviewInputSchema = z
  .object({
    apiVersion: z.literal("factory.external-promotion-review-input/v1"),
    candidate: z
      .object({
        id: opaqueIdSchema,
        version: versionSchema,
        digest: digestSchema,
      })
      .strict(),
    parents: z
      .object({
        requestDigest: digestSchema,
        snapshotDigest: digestSchema,
        acquisitionDigest: digestSchema,
        evidenceDigest: digestSchema,
        conformanceDigest: digestSchema,
      })
      .strict(),
    manifest: manifestSchema,
    factory: factorySchema,
    licence: licenceReviewSchema,
    findingDispositions: findingDispositionsSchema,
    sourceCopy: sourceCopySchema,
    notices: noticesReviewSchema,
    reviewers: reviewersSchema,
    factoryInterface: factoryInterfaceSchema,
    removalPlan: removalPlanSchema,
    collisionInventory: collisionInventorySchema,
  })
  .strict()
  .superRefine((review, context) => {
    if (
      canonicalJson(review.findingDispositions.map(({ kind }) => kind)) !==
      canonicalJson(SCAN_KIND_ORDER)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion scan groups must be complete and canonical.",
      });
    }
    if (
      canonicalJson(review.reviewers.map(({ role }) => role)) !==
      canonicalJson(REQUIRED_ROLES)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion reviewer assignments must be complete.",
      });
    }
  });

export type PromotionReviewInputV1 = z.infer<typeof promotionReviewInputSchema>;

const PROHIBITED_FIELDS = [
  "approval",
  "waiver",
  "source-copy-execution",
  "notice-modification",
  "golden-registration",
  "graph-input",
  "asset-lock-input",
  "composition-lock-input",
  "compiler-input",
  "runtime-activation",
  "provider-activation",
] as const;
const REQUIRED_ROLES = [
  "intake-maintainer",
  "licence-reviewer",
  "security-reviewer",
  "capability-maintainer",
  "architecture-owner",
  "qa-owner",
  "golden-owner",
] as const;

const promotionPacketSchema = z
  .object({
    apiVersion: z.literal("factory.external-capability-promotion-packet/v1"),
    decision: z.literal("pending-review"),
    candidate: z
      .object({
        id: opaqueIdSchema,
        version: versionSchema,
        digest: digestSchema,
        status: z.literal("conformance-passed"),
      })
      .strict(),
    source: z
      .object({
        repositoryUrl: z.string().refine((value) => {
          try {
            const url = new URL(value);
            return (
              url.protocol === "https:" &&
              url.hostname === "github.com" &&
              url.username === "" &&
              url.password === "" &&
              url.port === "" &&
              url.search === "" &&
              url.hash === "" &&
              /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/u.test(url.pathname) &&
              url.toString() === value
            );
          } catch {
            return false;
          }
        }),
        resolvedCommit: z.string().regex(/^[a-f0-9]{40}$/u),
        snapshotDigest: digestSchema,
      })
      .strict(),
    evidenceDigest: digestSchema,
    conformanceDigest: digestSchema,
    reviewInputDigest: digestSchema,
    parentDigests: z.array(digestSchema).length(6),
    licence: licenceReviewSchema,
    findingDispositions: findingDispositionsSchema,
    sourceCopy: sourceCopySchema,
    notices: noticesReviewSchema,
    reviewers: reviewersSchema,
    factory: factorySchema,
    factoryInterface: factoryInterfaceSchema,
    removalPlan: removalPlanSchema,
    collision: z
      .object({
        inventoryDigest: digestSchema,
        result: z.literal("no-collision-observed-in-inventory"),
        goldenOwnerAction: z.literal("pending-manual-review"),
      })
      .strict(),
    prohibitedFields: z
      .array(z.enum(PROHIBITED_FIELDS))
      .length(PROHIBITED_FIELDS.length),
  })
  .strict()
  .superRefine((packet, context) => {
    if (
      canonicalJson(packet.parentDigests) !==
      canonicalJson([...new Set(packet.parentDigests)].sort())
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion packet parent digests must be sorted and unique.",
      });
    }
    const requiredParents = [
      packet.candidate.digest,
      packet.source.snapshotDigest,
      packet.evidenceDigest,
      packet.conformanceDigest,
      packet.reviewInputDigest,
      packet.collision.inventoryDigest,
    ];
    if (
      requiredParents.some((digest) => !packet.parentDigests.includes(digest))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion packet parent digests are incomplete.",
      });
    }
    if (
      canonicalJson(packet.prohibitedFields) !==
      canonicalJson(PROHIBITED_FIELDS)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion packet prohibitions are code-owned.",
      });
    }
    if (
      canonicalJson(packet.reviewers.map(({ role }) => role)) !==
      canonicalJson(REQUIRED_ROLES)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion packet reviewer roles are incomplete.",
      });
    }
    if (
      canonicalJson(packet.findingDispositions.map(({ kind }) => kind)) !==
      canonicalJson(SCAN_KIND_ORDER)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion packet scan groups are incomplete.",
      });
    }
    if (
      packet.factory.proposedFactoryKey !==
        packet.factoryInterface.proposedFactoryKey ||
      packet.factory.version !== packet.factoryInterface.version ||
      packet.factory.packageRoot !== packet.removalPlan.packageRoot ||
      !exactSorted(packet.factory.targets)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion packet Factory bindings are incomplete.",
      });
    }
  });

export type PromotionPacketV1 = z.infer<typeof promotionPacketSchema>;

export interface PromotionPacketVerificationV1 {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly digest?: Sha256Digest;
  readonly packet?: PromotionPacketV1;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function assertReviewSafety(input: unknown): void {
  const forbiddenKeys = [
    "graph",
    "assetlock",
    "compositionlock",
    "compilerinput",
    "sourcebody",
    "sourceurl",
    "documentationurl",
    "executablecode",
    "credential",
    "password",
    "apikey",
    "token",
    "prompt",
    "response",
    "capabilitypackage",
    "goldenasset",
    "approval",
    "waiver",
    "licencedecision",
  ];
  const stack: unknown[] = [input];
  const seen = new WeakSet<object>();
  let nodes = 0;
  while (stack.length > 0) {
    const value = stack.pop();
    nodes += 1;
    if (nodes > 100_000) {
      throw new TypeError("Promotion review input exceeds inspection bounds.");
    }
    if (typeof value === "string") {
      if (
        value.length > 4_096 ||
        /(?:https?:\/\/|data:|file:)/iu.test(value) ||
        /\b(?:approved|accepted|resolved|promoted|waived|waiver)\b/iu.test(
          value,
        )
      ) {
        throw new TypeError(
          "Promotion review input contains forbidden decision or external data.",
        );
      }
      continue;
    }
    if (value === null || typeof value !== "object") continue;
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) stack.push(item);
      continue;
    }
    for (const [key, item] of Object.entries(value)) {
      const normalized = normalizeKey(key);
      if (forbiddenKeys.some((forbidden) => normalized.includes(forbidden))) {
        throw new TypeError(
          `Promotion review input contains forbidden field: ${key}.`,
        );
      }
      stack.push(item);
    }
  }
}

export function parsePromotionReviewInput(
  input: unknown,
): PromotionReviewInputV1 {
  assertReviewSafety(input);
  const encoded = encoder.encode(canonicalJson(input));
  if (encoded.byteLength > 1024 * 1024) {
    throw new TypeError("Promotion review input exceeds one MiB.");
  }
  return promotionReviewInputSchema.parse(input);
}

function exactSorted(values: readonly string[]): boolean {
  return canonicalJson(values) === canonicalJson([...new Set(values)].sort());
}

function scanSummary(
  snapshotDigest: Sha256Digest,
  treeDigest: Sha256Digest,
  scan: {
    readonly kind: (typeof SCAN_KIND_ORDER)[number];
    readonly tool: string;
    readonly toolVersion: string;
    readonly rulesetDigest: Sha256Digest;
    readonly status: "pass" | "fail" | "unavailable";
    readonly findings: readonly {
      readonly code: string;
      readonly severity: string;
      readonly count: number;
    }[];
    readonly scannerExpression?: string;
  },
): unknown {
  return {
    apiVersion: "factory.external-scan-summary/v1",
    snapshotDigest,
    treeDigest,
    kind: scan.kind,
    tool: scan.tool,
    toolVersion: scan.toolVersion,
    rulesetDigest: scan.rulesetDigest,
    status: scan.status,
    findings: scan.findings,
    ...(scan.scannerExpression === undefined
      ? {}
      : { scannerExpression: scan.scannerExpression }),
  };
}

function assertReviewBindings(
  review: PromotionReviewInputV1,
  manifest: CandidateManifestV1,
): void {
  if (
    canonicalJson(review.manifest) !== canonicalJson(manifest) ||
    review.factory.proposedFactoryKey !== manifest.proposedFactoryKey ||
    review.factory.version !== manifest.version ||
    review.factoryInterface.proposedFactoryKey !==
      manifest.proposedFactoryKey ||
    review.factoryInterface.version !== manifest.version ||
    canonicalJson(review.factoryInterface.inputSchema) !==
      canonicalJson(manifest.inputSchema) ||
    canonicalJson(review.factoryInterface.outputSchema) !==
      canonicalJson(manifest.outputSchema) ||
    canonicalJson(review.factoryInterface.effects) !==
      canonicalJson(manifest.effects) ||
    review.removalPlan.packageRoot !== review.factory.packageRoot ||
    !exactSorted(review.factory.targets)
  ) {
    throw new Error("Promotion review Factory bindings are incomplete.");
  }
  if (
    canonicalJson(review.reviewers.map(({ role }) => role)) !==
      canonicalJson(REQUIRED_ROLES) ||
    new Set(review.reviewers.map(({ reviewer }) => reviewer)).size !==
      review.reviewers.length
  ) {
    throw new Error("Promotion review requires every named reviewer role.");
  }
}

function assertCopyRanges(
  review: PromotionReviewInputV1,
  candidate: NonNullable<
    Awaited<ReturnType<CandidateRegistryV1["verify"]>>["candidate"]
  >,
): void {
  if (review.sourceCopy.mode === "none") return;
  const selected = new Map(
    candidate.selectedModules.map((module) => [module.path, module]),
  );
  const seen = new Set<string>();
  for (const range of review.sourceCopy.ranges) {
    const module = selected.get(range.path);
    if (
      module === undefined ||
      module.purpose !== "proposed-copy" ||
      module.digest !== range.sourceDigest ||
      seen.has(range.path) ||
      /(?:^|\/)(?:ui|migrations?|seed|data|tests?|runtime)(?:\/|$)/iu.test(
        range.path,
      )
    ) {
      throw new Error("Promotion source-copy range is not exact and safe.");
    }
    seen.add(range.path);
    let previousEnd = 0;
    for (const line of range.lineRanges) {
      if (line.start <= previousEnd) {
        throw new Error("Promotion source-copy line ranges overlap.");
      }
      previousEnd = line.end;
    }
  }
}

function assertCollisionInventory(review: PromotionReviewInputV1): void {
  const { inventory, digest } = review.collisionInventory;
  const orderedEntries = [...inventory.entries].sort((left, right) =>
    canonicalJson(left).localeCompare(canonicalJson(right), "en"),
  );
  if (
    canonicalRecordDigest(inventory) !== digest ||
    inventory.proposedFactoryKey !== review.factory.proposedFactoryKey ||
    inventory.version !== review.factory.version ||
    inventory.packageRoot !== review.factory.packageRoot ||
    canonicalJson(inventory.targets) !==
      canonicalJson(review.factory.targets) ||
    !exactSorted(inventory.targets) ||
    canonicalJson(inventory.entries) !== canonicalJson(orderedEntries) ||
    new Set(inventory.entries.map((entry) => canonicalJson(entry))).size !==
      inventory.entries.length ||
    inventory.entries.some(({ targets }) => !exactSorted(targets))
  ) {
    throw new Error("Promotion collision inventory binding is invalid.");
  }
  for (const entry of inventory.entries) {
    if (
      (entry.proposedFactoryKey === inventory.proposedFactoryKey &&
        entry.version === inventory.version) ||
      entry.packageRoot.toLowerCase() === inventory.packageRoot.toLowerCase() ||
      entry.targets.some((target) => inventory.targets.includes(target))
    ) {
      throw new Error("Promotion collision inventory contains a collision.");
    }
  }
}

export async function createPromotionPacket(
  candidateRef: StoredCandidateRefV1,
  reviewInput: PromotionReviewInputV1,
  registry: CandidateRegistryV1,
  store: ExternalIntakeStore,
): Promise<PromotionPacketV1> {
  const review = parsePromotionReviewInput(reviewInput);
  const verification = await registry.verify(candidateRef);
  const candidate = verification.candidate;
  if (
    !verification.valid ||
    candidate === undefined ||
    candidate.status !== "conformance-passed" ||
    candidateRef.status !== "conformance-passed" ||
    candidate.id !== candidateRef.id ||
    candidate.version !== candidateRef.version ||
    canonicalRecordDigest(candidate) !== candidateRef.digest ||
    review.candidate.id !== candidateRef.id ||
    review.candidate.version !== candidateRef.version ||
    review.candidate.digest !== candidateRef.digest ||
    candidate.conformanceResultDigest === undefined
  ) {
    throw new Error(
      "Promotion requires the exact verified conformance-passed Candidate.",
    );
  }

  const request = parseIntakeRequest(
    store.getRecord({
      kind: "request",
      digest: review.parents.requestDigest,
    }),
  );
  const snapshot = parseSourceSnapshot(
    store.getRecord({
      kind: "snapshot",
      digest: review.parents.snapshotDigest,
    }),
  );
  const acquisition = parseExternalSourceAcquisition(
    store.getRecord({
      kind: "acquisition",
      digest: review.parents.acquisitionDigest,
    }),
  );
  const evidence = parseEvidenceBundle(
    store.getRecord({
      kind: "evidence",
      digest: review.parents.evidenceDigest,
    }),
  );
  if (
    candidate.sourceSnapshotDigest !== review.parents.snapshotDigest ||
    candidate.evidenceDigest !== review.parents.evidenceDigest ||
    candidate.conformanceResultDigest !== review.parents.conformanceDigest ||
    !candidate.parentDigests.includes(review.parents.acquisitionDigest) ||
    !snapshot.parentDigests.includes(review.parents.requestDigest) ||
    acquisition.sourceRequestDigest !== review.parents.requestDigest ||
    acquisition.snapshot.recordDigest !== review.parents.snapshotDigest ||
    !acquisition.parentDigests.includes(review.parents.requestDigest) ||
    !acquisition.parentDigests.includes(review.parents.snapshotDigest) ||
    evidence.snapshotDigest !== review.parents.snapshotDigest ||
    !evidence.parentDigests.includes(review.parents.acquisitionDigest) ||
    request.source.canonicalRepositoryUrl !== snapshot.repositoryUrl ||
    request.source.canonicalRepositoryUrl !==
      acquisition.source.canonicalRepositoryUrl ||
    snapshot.resolvedCommit !== acquisition.source.resolvedCommit
  ) {
    throw new Error("Promotion immutable parent chain is incomplete.");
  }

  const manifest = manifestSchema.parse(review.manifest);
  if (
    canonicalRecordDigest(manifest) !== candidate.candidateManifestDigest ||
    manifest.id !== candidate.id ||
    manifest.version !== candidate.version ||
    manifest.proposedFactoryKey !== candidate.proposedFactoryKey ||
    review.factoryInterface.manifestDigest !== candidate.candidateManifestDigest
  ) {
    throw new Error("Promotion Candidate manifest binding is invalid.");
  }
  assertReviewBindings(review, manifest);

  if (
    review.licence.manualStatus !== evidence.licence.manualStatus ||
    evidence.licence.manualStatus === "rejected" ||
    evidence.notices.length === 0
  ) {
    throw new Error("Promotion licence or notice evidence is incomplete.");
  }

  for (const [index, kind] of SCAN_KIND_ORDER.entries()) {
    const group = review.findingDispositions[index];
    const scan = evidence.scans[index];
    if (
      group === undefined ||
      scan === undefined ||
      group.kind !== kind ||
      scan.kind !== kind ||
      group.resultDigest !== scan.resultDigest ||
      scan.status !== "pass" ||
      group.findings.some(
        ({ severity }) => severity === "high" || severity === "critical",
      ) ||
      (kind === "secret" && group.findings.length > 0) ||
      new Set(group.findings.map(({ code }) => code)).size !==
        group.findings.length
    ) {
      throw new Error("Promotion scan finding dispositions are invalid.");
    }
    const findings = group.findings.map(
      ({ disposition: _, ...finding }) => finding,
    );
    const expectedDigest = digestBytes(
      encoder.encode(
        canonicalJson(
          scanSummary(review.parents.snapshotDigest, snapshot.treeDigest, {
            ...scan,
            findings,
            ...(kind === "licence" &&
            evidence.licence.scannerExpression !== undefined
              ? { scannerExpression: evidence.licence.scannerExpression }
              : {}),
          }),
        ),
      ),
    );
    if (
      expectedDigest !== scan.resultDigest ||
      !evidence.parentDigests.includes(scan.resultDigest)
    ) {
      throw new Error("Promotion scan summary digest is invalid.");
    }
  }

  assertCopyRanges(review, candidate);
  assertCollisionInventory(review);
  const reviewInputDigest = canonicalRecordDigest(review);
  const packet = promotionPacketSchema.parse({
    apiVersion: "factory.external-capability-promotion-packet/v1",
    decision: "pending-review",
    candidate: {
      id: candidate.id,
      version: candidate.version,
      digest: candidateRef.digest,
      status: candidate.status,
    },
    source: {
      repositoryUrl: snapshot.repositoryUrl,
      resolvedCommit: snapshot.resolvedCommit,
      snapshotDigest: review.parents.snapshotDigest,
    },
    evidenceDigest: review.parents.evidenceDigest,
    conformanceDigest: review.parents.conformanceDigest,
    reviewInputDigest,
    parentDigests: [
      candidateRef.digest,
      review.parents.snapshotDigest,
      review.parents.evidenceDigest,
      review.parents.conformanceDigest,
      reviewInputDigest,
      review.collisionInventory.digest,
    ].sort(),
    licence: review.licence,
    findingDispositions: review.findingDispositions,
    sourceCopy: review.sourceCopy,
    notices: review.notices,
    reviewers: review.reviewers,
    factory: review.factory,
    factoryInterface: review.factoryInterface,
    removalPlan: review.removalPlan,
    collision: {
      inventoryDigest: review.collisionInventory.digest,
      result: "no-collision-observed-in-inventory",
      goldenOwnerAction: "pending-manual-review",
    },
    prohibitedFields: PROHIBITED_FIELDS,
  });
  const packetVerification = verifyPromotionPacket(packet);
  if (!packetVerification.valid) {
    throw new Error("Created PromotionPacket failed canonical verification.");
  }
  return packet;
}

export function verifyPromotionPacket(
  input: unknown,
): PromotionPacketVerificationV1 {
  try {
    const packet = promotionPacketSchema.parse(input);
    const digest = canonicalRecordDigest(packet);
    return { valid: true, issues: [], digest, packet };
  } catch (error) {
    const issues =
      error instanceof z.ZodError
        ? error.issues.map(({ message }) => message)
        : ["PromotionPacket is malformed."];
    return { valid: false, issues };
  }
}
