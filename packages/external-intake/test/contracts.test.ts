import { describe, expect, it } from "vitest";

import {
  canonicalRecordDigest,
  digestBytes,
  parseCandidateCapability,
  parseEvidenceBundle,
  parseExternalSourceAcquisition,
  parseIntakeRequest,
  parsePromotionDecision,
  parseSourceSnapshot,
} from "../src/index.js";

const digest = `sha256:${"a".repeat(64)}`;
const otherDigest = `sha256:${"b".repeat(64)}`;
const rootProvenance = {
  createdAt: "2026-07-31T00:00:00.000Z",
  producerVersion: "0.1.0",
  parentDigests: [] as string[],
};

const validRequest = {
  apiVersion: "factory.external-intake-request/v1",
  ...rootProvenance,
  source: {
    canonicalRepositoryUrl: "https://github.com/example/project.git",
    requestedRef: "v1.2.3",
    expectedCommit: "a".repeat(40),
    portfolioRecord: "example-project",
  },
  classification: "source-study",
  requestedModules: [{ path: "src/rules.ts", symbol: "applyRules" }],
  allowNetworkRetrieval: true,
};

const validCandidate = {
  apiVersion: "factory.candidate-capability/v1",
  ...rootProvenance,
  parentDigests: [digest, otherDigest],
  id: "example-rules",
  version: "1.0.0",
  status: "quarantined",
  sourceSnapshotDigest: digest,
  evidenceDigest: otherDigest,
  proposedFactoryKey: "commerce.example-rules",
  proposedClassification: "source-fragment",
  selectedModules: [
    {
      path: "src/rules.ts",
      symbol: "applyRules",
      digest,
      purpose: "reference",
    },
  ],
  allowedOutputs: ["manifest", "fixture", "adapter", "conformance-plan"],
  prohibited: [
    "capability-selection",
    "graph-mutation",
    "golden-registration",
    "compilation",
    "source-execution",
  ],
  candidateManifestDigest: digest,
  fixtureDigest: otherDigest,
};

const validAcquisition = {
  apiVersion: "factory.external-source-acquisition/v1",
  ...rootProvenance,
  parentDigests: [digest, otherDigest],
  sourceRequestDigest: digest,
  source: {
    canonicalRepositoryUrl: "https://github.com/example/project.git",
    requestedRef: "v1.2.3",
    resolvedCommit: "c".repeat(40),
  },
  snapshot: {
    recordDigest: otherDigest,
    archiveDigest: digest,
    treeDigest: otherDigest,
    entryCount: 2,
    declaredBytes: 512,
  },
  licence: {
    primaryPaths: ["LICENSE"],
    textDigests: [digest],
  },
  notices: [{ path: "NOTICE", digest: otherDigest, required: true }],
  provenance: [
    {
      url: "https://github.com/example/project/archive/cccccccccccccccccccccccccccccccccccccccc.tar.gz",
      retrievedAt: "2026-07-31T00:00:00.000Z",
      digest,
    },
  ],
  manualStatus: "unreviewed",
  acquisitionState: "acquired",
};

describe("external intake contracts", () => {
  it("requires creation, producer, and parent provenance on every persistent record", () => {
    const request = { ...validRequest };
    const snapshot = {
      apiVersion: "factory.external-source-snapshot/v1",
      ...rootProvenance,
      parentDigests: [digest],
      repositoryUrl: "https://github.com/example/project.git",
      requestedRef: "v1.2.3",
      resolvedCommit: "c".repeat(40),
      retrievedAt: "2026-07-31T00:00:00.000Z",
      archiveDigest: digest,
      treeDigest: otherDigest,
      includedPaths: ["LICENSE"],
      excludedPaths: [],
      originEvidence: [
        {
          url: "https://github.com/example/project/blob/v1.2.3/LICENSE",
          retrievedAt: "2026-07-31T00:00:00.000Z",
          digest,
        },
      ],
    };
    const scans = ["licence", "secret", "sast", "dependency"].map((kind) => ({
      kind,
      tool: `${kind}-scanner`,
      toolVersion: "1.0.0",
      rulesetDigest: digest,
      resultDigest: otherDigest,
      status: "pass",
    }));
    const evidence = {
      apiVersion: "factory.external-evidence/v1",
      ...rootProvenance,
      parentDigests: [digest],
      snapshotDigest: digest,
      licence: {
        primaryPaths: ["LICENSE"],
        textDigests: [otherDigest],
        manualStatus: "unreviewed",
      },
      notices: [],
      sbom: { format: "CycloneDX", digest, components: 0 },
      scans,
      ast: {
        parser: "fixture-parser",
        parserVersion: "1.0.0",
        inventoryDigest: digest,
      },
    };
    const candidate = {
      ...validCandidate,
      ...rootProvenance,
      parentDigests: [digest, otherDigest],
    };
    const promotion = {
      apiVersion: "factory.external-capability-promotion/v1",
      ...rootProvenance,
      parentDigests: [digest],
      candidateDigest: digest,
      decision: "rejected",
      reviewedBy: ["licence-reviewer"],
      reviewedAt: "2026-07-31T00:00:00.000Z",
      sourceCopy: [],
      licenceDecision: "incompatible",
      replacementPath: "packages/capabilities/assets/example/1.0.0",
    };

    expect(parseIntakeRequest(request)).toEqual(request);
    expect(parseSourceSnapshot(snapshot)).toEqual(snapshot);
    expect(parseEvidenceBundle(evidence)).toEqual(evidence);
    expect(parseExternalSourceAcquisition(validAcquisition)).toEqual(
      validAcquisition,
    );
    expect(parseCandidateCapability(candidate)).toEqual(candidate);
    expect(parsePromotionDecision(promotion)).toEqual(promotion);

    for (const field of ["createdAt", "producerVersion", "parentDigests"]) {
      const missing = structuredClone(request) as Record<string, unknown>;
      delete missing[field];
      expect(() => parseIntakeRequest(missing)).toThrow();

      const acquisitionMissing = structuredClone(validAcquisition) as Record<
        string,
        unknown
      >;
      delete acquisitionMissing[field];
      expect(() =>
        parseExternalSourceAcquisition(acquisitionMissing),
      ).toThrow();
    }
  });

  it("requires acquisition request and snapshot identities as parent records", () => {
    expect(parseExternalSourceAcquisition(validAcquisition)).toEqual(
      validAcquisition,
    );

    for (const missingParent of [digest, otherDigest]) {
      expect(() =>
        parseExternalSourceAcquisition({
          ...validAcquisition,
          parentDigests: validAcquisition.parentDigests.filter(
            (parent) => parent !== missingParent,
          ),
        }),
      ).toThrow(/parent/i);
    }
  });

  it("requires literal unreviewed status and an explicit acquisition state", () => {
    for (const manualStatus of ["approved", "rejected"]) {
      expect(() =>
        parseExternalSourceAcquisition({
          ...validAcquisition,
          manualStatus,
        }),
      ).toThrow();
    }
    for (const acquisitionState of [undefined, "pending", "scanned"]) {
      expect(() =>
        parseExternalSourceAcquisition({
          ...validAcquisition,
          acquisitionState,
        }),
      ).toThrow();
    }
    expect(
      parseExternalSourceAcquisition({
        ...validAcquisition,
        acquisitionState: "blocked",
        failureCode: "missing-licence",
      }),
    ).toMatchObject({
      acquisitionState: "blocked",
      failureCode: "missing-licence",
      manualStatus: "unreviewed",
    });
  });

  it.each([
    ["Candidate identity", { candidateManifestDigest: digest }],
    ["Golden identity", { goldenAsset: { key: "commerce.example" } }],
    ["EvidenceBundle identity", { snapshotDigest: otherDigest }],
    ["SBOM identity", { sbom: { format: "CycloneDX", digest } }],
    ["scanner identity", { tool: "fixture-scanner", toolVersion: "1.0.0" }],
    ["scan-result identity", { rulesetDigest: digest, resultDigest: digest }],
    ["scan collection", { scans: [] }],
    ["AST identity", { ast: { parser: "fixture-parser" } }],
    ["selection identity", { compositionSelections: [] }],
    ["compilation identity", { outputSlots: [] }],
  ])("rejects %s fields", (_description, prohibitedFields) => {
    expect(() =>
      parseExternalSourceAcquisition({
        ...validAcquisition,
        ...prohibitedFields,
      }),
    ).toThrow();
  });

  it("rejects scanner claims nested in acquisition licence evidence", () => {
    expect(() =>
      parseExternalSourceAcquisition({
        ...validAcquisition,
        licence: {
          ...validAcquisition.licence,
          scannerExpression: "MIT",
        },
      }),
    ).toThrow();
  });

  it("keeps Candidate records outside the Golden capability contract", () => {
    const candidate = parseCandidateCapability(validCandidate);

    expect(candidate.apiVersion).toBe("factory.candidate-capability/v1");
    expect(candidate).not.toHaveProperty("outputSlots");
    expect(candidate).not.toHaveProperty("lifecycle");
    expect(candidate).not.toHaveProperty("packageRoot");
    expect(() =>
      parseCandidateCapability({
        ...validCandidate,
        apiVersion: "factory.capability/v1",
      }),
    ).toThrow();
    expect(() =>
      parseCandidateCapability({ ...validCandidate, outputSlots: [] }),
    ).toThrow();
  });

  it("requires explicit Candidate isolation from selection, Golden, Graph, and compiler paths", () => {
    for (const required of [
      "capability-selection",
      "golden-registration",
      "graph-mutation",
      "compilation",
    ]) {
      expect(() =>
        parseCandidateCapability({
          ...validCandidate,
          prohibited: validCandidate.prohibited.filter(
            (prohibition) => prohibition !== required,
          ),
        }),
      ).toThrow(/prohibit/i);
    }
  });

  it("rejects unknown and sensitive fields at every schema depth", () => {
    expect(() =>
      parseIntakeRequest({ ...validRequest, command: "run-source" }),
    ).toThrow();
    expect(() =>
      parseIntakeRequest({
        ...validRequest,
        source: { ...validRequest.source, credential: "redacted" },
      }),
    ).toThrow();
    expect(() =>
      parseCandidateCapability({
        ...validCandidate,
        selectedModules: [
          {
            ...validCandidate.selectedModules[0],
            sourceBody: "external bytes",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseCandidateCapability({ ...validCandidate, rawPrompt: "private" }),
    ).toThrow();
  });

  it.each(["main", "master", "HEAD", "refs/heads/main", "pull/12/head"])(
    "rejects floating or pull reference %s",
    (requestedRef) => {
      expect(() =>
        parseIntakeRequest({
          ...validRequest,
          source: { ...validRequest.source, requestedRef },
        }),
      ).toThrow();
    },
  );

  it.each([
    "http://github.com/example/project.git",
    "https://user@github.com/example/project.git",
    "https://github.com/example/project",
    "https://github.com/example/project.git?ref=v1.2.3",
    "https://example.com/example/project.git",
  ])("rejects noncanonical repository URL %s", (canonicalRepositoryUrl) => {
    expect(() =>
      parseIntakeRequest({
        ...validRequest,
        source: { ...validRequest.source, canonicalRepositoryUrl },
      }),
    ).toThrow();
  });

  it("rejects unsafe and duplicate requested module paths", () => {
    for (const path of ["../source.ts", "/source.ts", "src\\source.ts", "."]) {
      expect(() =>
        parseIntakeRequest({
          ...validRequest,
          requestedModules: [{ path }],
        }),
      ).toThrow();
    }

    expect(() =>
      parseIntakeRequest({
        ...validRequest,
        requestedModules: [
          { path: "src/rules.ts", symbol: "applyRules" },
          { path: "src/rules.ts", symbol: "applyRules" },
        ],
      }),
    ).toThrow();
  });

  it.each([
    "src/file.ts:alternate-stream",
    "src/file?.ts",
    "src/file*.ts",
    "src/file|name.ts",
    'src/file"name.ts',
    "src/file<name.ts",
    "src/file>name.ts",
    "src/\u0001file.ts",
  ])("rejects Windows-invalid or ADS path %s", (path) => {
    expect(() =>
      parseIntakeRequest({
        ...validRequest,
        requestedModules: [{ path }],
      }),
    ).toThrow(/path/i);
  });

  it("strictly validates snapshot timestamps, paths, commits, and digests", () => {
    const snapshot = {
      apiVersion: "factory.external-source-snapshot/v1",
      ...rootProvenance,
      parentDigests: [digest],
      repositoryUrl: "https://github.com/example/project.git",
      requestedRef: "v1.2.3",
      resolvedCommit: "c".repeat(40),
      retrievedAt: "2026-07-31T00:00:00.000Z",
      archiveDigest: digest,
      treeDigest: otherDigest,
      includedPaths: ["LICENSE", "src/rules.ts"],
      excludedPaths: ["vendor"],
      originEvidence: [
        {
          url: "https://github.com/example/project/blob/v1.2.3/LICENSE",
          retrievedAt: "2026-07-31T00:00:00.000Z",
          digest,
        },
      ],
    };

    expect(parseSourceSnapshot(snapshot)).toEqual(snapshot);
    expect(() =>
      parseSourceSnapshot({ ...snapshot, retrievedAt: "not-a-timestamp" }),
    ).toThrow();
    expect(() =>
      parseSourceSnapshot({ ...snapshot, resolvedCommit: "C".repeat(40) }),
    ).toThrow();
    expect(() =>
      parseSourceSnapshot({
        ...snapshot,
        includedPaths: ["src/rules.ts", "src/rules.ts"],
      }),
    ).toThrow();
    expect(() =>
      parseSourceSnapshot({
        ...snapshot,
        archiveDigest: `sha256:${"A".repeat(64)}`,
      }),
    ).toThrow();
  });

  it("requires exactly one scan for every evidence kind", () => {
    const scans = ["licence", "secret", "sast", "dependency"].map((kind) => ({
      kind,
      tool: `${kind}-scanner`,
      toolVersion: "1.0.0",
      rulesetDigest: digest,
      resultDigest: otherDigest,
      status: "pass",
    }));
    const evidence = {
      apiVersion: "factory.external-evidence/v1",
      ...rootProvenance,
      parentDigests: [digest],
      snapshotDigest: digest,
      licence: {
        primaryPaths: ["LICENSE"],
        textDigests: [otherDigest],
        manualStatus: "unreviewed",
      },
      notices: [],
      sbom: { format: "CycloneDX", digest, components: 0 },
      scans,
      ast: {
        parser: "fixture-parser",
        parserVersion: "1.0.0",
        inventoryDigest: digest,
      },
    };

    expect(parseEvidenceBundle(evidence)).toEqual(evidence);
    expect(() =>
      parseEvidenceBundle({
        ...evidence,
        sbom: { ...evidence.sbom, components: Number.POSITIVE_INFINITY },
      }),
    ).toThrow();
    for (const missingKind of ["licence", "secret", "sast", "dependency"]) {
      expect(() =>
        parseEvidenceBundle({
          ...evidence,
          scans: scans.filter(({ kind }) => kind !== missingKind),
        }),
      ).toThrow(/scan/i);
    }
    expect(() =>
      parseEvidenceBundle({
        ...evidence,
        scans: [...scans.slice(1), scans[1]],
      }),
    ).toThrow(/scan/i);
  });

  it("keeps promotion evidence strict and separate from Candidate parsing", () => {
    const decision = {
      apiVersion: "factory.external-capability-promotion/v1",
      ...rootProvenance,
      parentDigests: [digest],
      candidateDigest: digest,
      decision: "rejected",
      reviewedBy: ["licence-reviewer"],
      reviewedAt: "2026-07-31T00:00:00.000Z",
      sourceCopy: [],
      licenceDecision: "incompatible",
      replacementPath: "packages/capabilities/assets/example/1.0.0",
    };

    expect(parsePromotionDecision(decision)).toEqual(decision);
    expect(() =>
      parseCandidateCapability({
        ...validCandidate,
        goldenAsset: {
          key: "example",
          version: "1.0.0",
          manifestDigest: digest,
        },
      }),
    ).toThrow();
  });
});

describe("canonical digests", () => {
  it("hashes canonical records independently of object key order", () => {
    expect(canonicalRecordDigest({ b: 2, a: [true, null, "x"] })).toBe(
      canonicalRecordDigest({ a: [true, null, "x"], b: 2 }),
    );
    expect(canonicalRecordDigest({ a: 1 })).toBe(
      "sha256:015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
    );
  });

  it("hashes raw bytes without text normalization", () => {
    expect(digestBytes(new Uint8Array([0, 10, 13, 255]))).toBe(
      "sha256:59208500d52950f5d532bd32a3a48f922fd48a63e231761bd465aeb56a0f21ef",
    );
    expect(digestBytes(new TextEncoder().encode("a\r\n"))).not.toBe(
      digestBytes(new TextEncoder().encode("a\n")),
    );
  });

  it.each([
    { value: undefined },
    { value: Number.NaN },
    { value: Number.POSITIVE_INFINITY },
    { value: 1n },
  ])("rejects non-JSON canonical value $value", ({ value }) => {
    expect(() => canonicalRecordDigest(value)).toThrow();
  });
});
