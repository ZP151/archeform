import { z } from "zod";

import { canonicalRecordDigest, type Sha256Digest } from "./canonical.js";
import {
  assertNoSensitiveIntakeKeys,
  parseExternalIntakeBatch,
  type ExternalIntakeBatchV1,
} from "./contracts.js";

export const capabilityFamilyKeys = [
  "identity",
  "catalog",
  "commerce-transaction",
  "inventory",
  "availability",
  "queue",
  "payment",
  "fulfillment",
  "notification",
  "document",
  "search",
  "analytics",
  "integration",
] as const;

const discoveryProfileKeys = [
  "expense-approval",
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const;
const discoverySourceKinds = [
  "repository",
  "package",
  "template",
  "provider",
] as const;
const discoverySourceHosts = [
  "github",
  "npm",
  "artifact-hub",
  "official-provider",
] as const;
const discoveryReuseModes = [
  "direct-dependency",
  "provider-adapter",
  "selective-source-copy",
  "reference-only",
] as const;
const discoveryGateCategories = [
  "floating-reference",
  "missing-integrity",
  "license",
  "host-mode",
] as const;

export type CapabilityFamilyKey = (typeof capabilityFamilyKeys)[number];
export type DiscoveryProfileHintV1 = (typeof discoveryProfileKeys)[number];
export type DiscoverySourceKindV1 = (typeof discoverySourceKinds)[number];
export type DiscoverySourceHostV1 = (typeof discoverySourceHosts)[number];
export type DiscoveryReuseModeV1 = (typeof discoveryReuseModes)[number];
export type DiscoveryGateCategoryV1 = (typeof discoveryGateCategories)[number];
export type DiscoveryStatusV1 = "eligible" | "blocked" | "reference-only";

const opaqueIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9-]*$/u);
const isoTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u)
  .refine((value) => new Date(value).toISOString() === value);
const sha256Schema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/u)
  .transform((value) => value as Sha256Digest);
const canonicalIdentifierSchema = z
  .string()
  .min(4)
  .max(256)
  .regex(/^[a-z][a-z0-9-]*:[A-Za-z0-9@._/-]+$/u);
const referenceSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._@/-]+$/u);
const licenseSchema = z.string().min(1).max(128).nullable();

const discoveryInputSchema = z
  .object({
    apiVersion: z.literal("factory.discovery-record-input/v1"),
    id: opaqueIdSchema,
    discoveredAt: isoTimestampSchema,
    sourceKind: z.enum(discoverySourceKinds),
    sourceHost: z.enum(discoverySourceHosts),
    immutableReference: z
      .object({
        canonicalIdentifier: canonicalIdentifierSchema,
        resolvedVersionOrCommit: referenceSchema,
        integrity: sha256Schema.optional(),
      })
      .strict(),
    declaredLicense: licenseSchema,
    familyHints: z
      .array(z.enum(capabilityFamilyKeys))
      .max(capabilityFamilyKeys.length)
      .refine((values) => new Set(values).size === values.length),
    profileHints: z
      .array(z.enum(discoveryProfileKeys))
      .max(discoveryProfileKeys.length)
      .refine((values) => new Set(values).size === values.length),
    reuseMode: z.enum(discoveryReuseModes),
  })
  .strict();

const triageSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    status: z.enum(["eligible", "blocked", "reference-only"]),
    gateCategories: z.array(z.enum(discoveryGateCategories)),
  })
  .strict();

const discoveryRecordSchema = z
  .object({
    ...discoveryInputSchema.shape,
    apiVersion: z.literal("factory.discovery-record/v1"),
    triage: triageSchema,
    metadataDigest: sha256Schema,
  })
  .strict();

export type DiscoveryRecordInputV1 = z.input<typeof discoveryInputSchema>;
export type DiscoveryRecordV1 = z.infer<typeof discoveryRecordSchema>;

export interface DiscoveryTriageResultV1 {
  readonly apiVersion: "factory.discovery-triage/v1";
  readonly byId: Readonly<Record<string, DiscoveryRecordV1>>;
  readonly records: readonly DiscoveryRecordV1[];
}

function isFixedReference(value: string): boolean {
  if (/^[a-f0-9]{40}$/u.test(value)) return true;
  if (/^(?:head|main|master|develop|development|trunk|latest)$/iu.test(value)) {
    return false;
  }
  return (
    /\d/u.test(value) &&
    !value.startsWith("refs/") &&
    !value.includes("..") &&
    !value.endsWith("/")
  );
}

function canonicalIdentifierMatchesHost(
  host: DiscoverySourceHostV1,
  identifier: string,
): boolean {
  switch (host) {
    case "github":
      return /^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(identifier);
    case "npm":
      return /^npm:(?:@[a-z0-9-]+\/)?[a-z0-9-]+$/u.test(identifier);
    case "artifact-hub":
      return /^artifact-hub:[A-Za-z0-9@._/-]+$/u.test(identifier);
    case "official-provider":
      return /^provider:[a-z0-9-]+$/u.test(identifier);
  }
}

function reuseModeMatchesSource(
  input: z.output<typeof discoveryInputSchema>,
): boolean {
  const { sourceKind, sourceHost, reuseMode } = input;
  if (reuseMode === "reference-only") return true;
  if (reuseMode === "selective-source-copy") {
    return sourceKind === "repository" && sourceHost === "github";
  }
  if (reuseMode === "direct-dependency") {
    return sourceKind === "package" && sourceHost === "npm";
  }
  return sourceKind === "provider" && sourceHost === "official-provider";
}

function allowedLicense(value: string | null): boolean {
  return (
    value !== null &&
    [
      "MIT",
      "Apache-2.0",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "ISC",
      "MPL-2.0",
    ].includes(value)
  );
}

function gateCategories(
  input: z.output<typeof discoveryInputSchema>,
): readonly DiscoveryGateCategoryV1[] {
  const gates: DiscoveryGateCategoryV1[] = [];
  if (!isFixedReference(input.immutableReference.resolvedVersionOrCommit)) {
    gates.push("floating-reference");
  }
  if (
    input.sourceKind === "package" &&
    input.immutableReference.integrity === undefined
  )
    gates.push("missing-integrity");
  if (!allowedLicense(input.declaredLicense)) gates.push("license");
  if (
    !canonicalIdentifierMatchesHost(
      input.sourceHost,
      input.immutableReference.canonicalIdentifier,
    ) ||
    !reuseModeMatchesSource(input)
  ) {
    gates.push("host-mode");
  }
  return Object.freeze(gates);
}

function scoreDiscovery(
  input: z.output<typeof discoveryInputSchema>,
  gates: readonly DiscoveryGateCategoryV1[],
): number {
  if (gates.length > 0) return 0;
  if (input.reuseMode === "reference-only") return 10;
  return Math.max(
    0,
    70 +
      Math.min(input.familyHints.length, 3) * 5 +
      Math.min(input.profileHints.length, 3) * 5 +
      (input.immutableReference.integrity === undefined ? 0 : 5),
  );
}

function freezeRecord(record: DiscoveryRecordV1): DiscoveryRecordV1 {
  return Object.freeze({
    ...record,
    immutableReference: Object.freeze({ ...record.immutableReference }),
    familyHints: Object.freeze([...record.familyHints]),
    profileHints: Object.freeze([...record.profileHints]),
    triage: Object.freeze({
      ...record.triage,
      gateCategories: Object.freeze([...record.triage.gateCategories]),
    }),
  }) as unknown as DiscoveryRecordV1;
}

export function createDiscoveryRecord(
  input: DiscoveryRecordInputV1,
): DiscoveryRecordV1 {
  assertNoSensitiveIntakeKeys(input);
  const parsed = discoveryInputSchema.parse(input);
  const gates = gateCategories(parsed);
  const status: DiscoveryStatusV1 =
    gates.length > 0
      ? "blocked"
      : parsed.reuseMode === "reference-only"
        ? "reference-only"
        : "eligible";
  const immutableReference = { ...parsed.immutableReference };
  const digestInput = {
    ...parsed,
    immutableReference,
    familyHints: [...parsed.familyHints],
    profileHints: [...parsed.profileHints],
  };
  return freezeRecord({
    ...parsed,
    apiVersion: "factory.discovery-record/v1",
    immutableReference,
    familyHints: [...parsed.familyHints],
    profileHints: [...parsed.profileHints],
    triage: {
      score: scoreDiscovery(parsed, gates),
      status,
      gateCategories: [...gates],
    },
    metadataDigest: canonicalRecordDigest(digestInput),
  });
}

export function parseDiscoveryRecord(input: unknown): DiscoveryRecordV1 {
  const parsed = discoveryRecordSchema.parse(input);
  const {
    triage: _triage,
    metadataDigest: _metadataDigest,
    ...recordInput
  } = parsed;
  const expected = createDiscoveryRecord({
    ...recordInput,
    apiVersion: "factory.discovery-record-input/v1",
  });
  if (
    expected.metadataDigest !== parsed.metadataDigest ||
    expected.triage.score !== parsed.triage.score ||
    expected.triage.status !== parsed.triage.status ||
    expected.triage.gateCategories.join("\0") !==
      parsed.triage.gateCategories.join("\0")
  ) {
    throw new Error("Discovery record triage or digest is not canonical.");
  }
  return expected;
}

export function triageDiscoveryRecords(
  inputs: readonly DiscoveryRecordInputV1[],
): DiscoveryTriageResultV1 {
  const records = inputs.map((input) => createDiscoveryRecord(input));
  const byId = Object.create(null) as Record<string, DiscoveryRecordV1>;
  for (const record of records) {
    if (byId[record.id] !== undefined) {
      throw new Error("Discovery record IDs must be unique.");
    }
    byId[record.id] = record;
  }
  return Object.freeze({
    apiVersion: "factory.discovery-triage/v1",
    byId: Object.freeze(byId),
    records: Object.freeze(records),
  });
}

function githubRepositoryUrl(identifier: string): string {
  const repository = identifier.slice("github:".length);
  return `https://github.com/${repository}.git`;
}

function intakeEligible(record: DiscoveryRecordV1): boolean {
  return (
    record.triage.status === "eligible" &&
    record.sourceKind === "repository" &&
    record.sourceHost === "github" &&
    record.reuseMode === "selective-source-copy" &&
    /^[a-f0-9]{40}$/u.test(record.immutableReference.resolvedVersionOrCommit)
  );
}

export function createDiscoveryIntakeBatch(
  sourceRecords: readonly DiscoveryRecordV1[],
  provenance: { readonly createdAt: string; readonly producerVersion: string },
): ExternalIntakeBatchV1 {
  const identities = new Set<string>();
  for (const sourceRecord of sourceRecords) {
    const record = parseDiscoveryRecord(sourceRecord);
    const identity = `${record.sourceHost}\0${record.immutableReference.canonicalIdentifier}\0${record.immutableReference.resolvedVersionOrCommit}`;
    if (identities.has(identity)) {
      throw new Error("Discovery canonical identity is duplicated.");
    }
    identities.add(identity);
  }
  const items = sourceRecords
    .map((record) => parseDiscoveryRecord(record))
    .filter(intakeEligible)
    .sort(
      (left, right) =>
        right.triage.score - left.triage.score ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 1_000)
    .map((record) => ({
      id: record.id,
      request: {
        apiVersion: "factory.external-intake-request/v1" as const,
        createdAt: provenance.createdAt,
        producerVersion: provenance.producerVersion,
        parentDigests: [],
        source: {
          canonicalRepositoryUrl: githubRepositoryUrl(
            record.immutableReference.canonicalIdentifier,
          ),
          requestedRef: record.immutableReference.resolvedVersionOrCommit,
          expectedCommit: record.immutableReference.resolvedVersionOrCommit,
          portfolioRecord: record.id,
        },
        classification: "source-study" as const,
        requestedModules: [],
        allowNetworkRetrieval: true as const,
      },
    }));
  if (items.length === 0) {
    throw new Error(
      "Discovery Intake batch requires an eligible fixed GitHub repository.",
    );
  }
  return parseExternalIntakeBatch({
    apiVersion: "factory.external-intake-batch/v1",
    items,
  });
}
