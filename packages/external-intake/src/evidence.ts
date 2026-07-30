import {
  canonicalJson,
  canonicalRecordDigest,
  digestBytes,
} from "./canonical.js";
import {
  parseEvidenceBundle,
  parseIntakeRequest,
  type EvidenceBundleV1,
  type IntakeReceiptV1,
  type IntakeRequestV1,
} from "./contracts.js";
import {
  sourceEvidenceUrl,
  type FixedSourceClient,
  type ResolvedSourceReferenceV1,
  type SourceTreeEntryV1,
} from "./source-client.js";
import {
  createSourceSnapshot,
  validateSourceTree,
  type ValidatedSourceTreeV1,
} from "./snapshot.js";
import { ExternalIntakeStore, type StoredRecordRef } from "./store.js";

const FULL_COMMIT = /^[a-f0-9]{40}$/u;
const LICENCE_BASENAME = /^(?:licen[cs]e|copying)(?:[._-].*)?$/iu;
const NOTICE_BASENAME = /^notice(?:[._-].*)?$/iu;

type BlobTreeEntry = Extract<SourceTreeEntryV1, { readonly type: "blob" }>;

class AcquisitionFailure extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

function acquisitionJobId(request: IntakeRequestV1): string {
  return `source-${canonicalRecordDigest(request).slice(7, 31)}`;
}

function basename(path: string): string {
  return path.split("/").at(-1) ?? "";
}

function validateResolvedReference(
  request: IntakeRequestV1,
  reference: ResolvedSourceReferenceV1,
): void {
  if (
    reference.apiVersion !== "factory.resolved-source-reference/v1" ||
    reference.repositoryUrl !== request.source.canonicalRepositoryUrl ||
    reference.requestedRef !== request.source.requestedRef ||
    !FULL_COMMIT.test(reference.resolvedCommit)
  ) {
    throw new AcquisitionFailure(
      "Resolved source reference does not match the Intake request.",
      "resolved-reference-invalid",
    );
  }
  const parsedTime = Date.parse(reference.retrievedAt);
  if (
    !Number.isFinite(parsedTime) ||
    new Date(parsedTime).toISOString() !== reference.retrievedAt
  ) {
    throw new AcquisitionFailure(
      "Resolved source retrieval time is invalid.",
      "resolved-reference-invalid",
    );
  }
  if (
    request.source.expectedCommit !== undefined &&
    request.source.expectedCommit !== reference.resolvedCommit
  ) {
    throw new AcquisitionFailure(
      "Resolved commit mismatch for expectedCommit.",
      "resolved-commit-mismatch",
    );
  }
}

function discoverEvidence(
  tree: ValidatedSourceTreeV1,
  reference: ResolvedSourceReferenceV1,
): { licence: BlobTreeEntry; notices: readonly BlobTreeEntry[] } {
  const licences = tree.blobEntries.filter(({ path }) =>
    LICENCE_BASENAME.test(basename(path)),
  );
  if (licences.length !== 1) {
    throw new AcquisitionFailure(
      licences.length === 0
        ? "A primary licence was not found."
        : "The primary licence is ambiguous.",
      licences.length === 0
        ? "primary-licence-missing"
        : "primary-licence-ambiguous",
    );
  }
  const byPath = new Map(tree.blobEntries.map((entry) => [entry.path, entry]));
  for (const path of reference.requiredNoticePaths) {
    if (!byPath.has(path)) {
      throw new AcquisitionFailure(
        "A declared required notice is missing.",
        "required-notice-missing",
      );
    }
  }
  const noticePaths = new Set([
    ...tree.blobEntries
      .filter(({ path }) => NOTICE_BASENAME.test(basename(path)))
      .map(({ path }) => path),
    ...reference.requiredNoticePaths,
  ]);
  const notices = [...noticePaths]
    .map((path) => byPath.get(path)!)
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return { licence: licences[0]!, notices };
}

async function readExactEvidence(
  client: FixedSourceClient,
  reference: ResolvedSourceReferenceV1,
  entries: readonly BlobTreeEntry[],
): Promise<ReadonlyMap<string, Uint8Array>> {
  const output = new Map<string, Uint8Array>();
  for (const entry of entries) {
    let bytes: Uint8Array;
    try {
      bytes = await client.fetchEvidence(reference, entry.path);
    } catch (error) {
      throw new AcquisitionFailure(
        `Source evidence is unreadable: ${(error as Error).message}`,
        "evidence-unreadable",
      );
    }
    if (!(bytes instanceof Uint8Array)) {
      throw new AcquisitionFailure(
        "Source evidence did not return raw bytes.",
        "evidence-unreadable",
      );
    }
    if (
      bytes.byteLength !== entry.size ||
      digestBytes(bytes) !== entry.blobDigest
    ) {
      throw new AcquisitionFailure(
        "Source evidence digest drifted from the fixed tree inventory.",
        "evidence-digest-drift",
      );
    }
    output.set(entry.path, bytes);
  }
  return output;
}

function provisionalEvidence(
  request: IntakeRequestV1,
  snapshot: StoredRecordRef,
  licence: BlobTreeEntry,
  notices: readonly BlobTreeEntry[],
  phaseDigest: `sha256:${string}`,
  createdAt: string,
): EvidenceBundleV1 {
  return parseEvidenceBundle({
    apiVersion: "factory.external-evidence/v1",
    createdAt,
    producerVersion: request.producerVersion,
    parentDigests: [snapshot.digest],
    snapshotDigest: snapshot.digest,
    licence: {
      primaryPaths: [licence.path],
      textDigests: [licence.blobDigest],
      manualStatus: "unreviewed",
    },
    notices: notices.map(({ path, blobDigest }) => ({
      path,
      digest: blobDigest,
      required: true,
    })),
    sbom: {
      format: "CycloneDX",
      digest: phaseDigest,
      components: 0,
    },
    scans: (["licence", "secret", "sast", "dependency"] as const).map(
      (kind) => ({
        kind,
        tool: `pending-${kind}`,
        toolVersion: request.producerVersion,
        rulesetDigest: phaseDigest,
        resultDigest: phaseDigest,
        status: "unavailable" as const,
      }),
    ),
    ast: {
      parser: "pending-inventory",
      parserVersion: request.producerVersion,
      inventoryDigest: phaseDigest,
    },
  });
}

function appendReceipt(
  store: ExternalIntakeStore,
  request: IntakeRequestV1,
  status: "evidenced" | "blocked",
  code: string,
  recordDigests: IntakeReceiptV1["recordDigests"],
  createdAt: string,
): void {
  store.appendReceipt(acquisitionJobId(request), {
    apiVersion: "factory.external-intake-receipt/v1",
    createdAt,
    producerVersion: request.producerVersion,
    parentDigests: [canonicalRecordDigest(request)],
    jobId: acquisitionJobId(request),
    sequence: 1,
    status,
    code,
    recordDigests,
  });
}

export async function acquireSourceEvidence(
  input: IntakeRequestV1,
  client: FixedSourceClient,
  store: ExternalIntakeStore,
): Promise<{ snapshot: StoredRecordRef; evidence: StoredRecordRef }> {
  const request = parseIntakeRequest(input);
  let createdAt = request.createdAt;
  const storedDigests: Array<`sha256:${string}`> = [];

  try {
    const reference = await client.resolve(request);
    validateResolvedReference(request, reference);
    createdAt = reference.retrievedAt;
    const archiveBytes = await client.fetchArchive(reference);
    if (!(archiveBytes instanceof Uint8Array)) {
      throw new AcquisitionFailure(
        "Source archive did not return raw bytes.",
        "archive-unreadable",
      );
    }
    const tree = validateSourceTree(await client.fetchTree(reference));
    const discovered = discoverEvidence(tree, reference);
    const evidenceEntries = [discovered.licence, ...discovered.notices].filter(
      (entry, index, entries) =>
        entries.findIndex(({ path }) => path === entry.path) === index,
    );
    const evidenceBytes = await readExactEvidence(
      client,
      reference,
      evidenceEntries,
    );

    const archiveRef = store.putBytes("snapshot", archiveBytes);
    storedDigests.push(archiveRef.digest);
    for (const entry of evidenceEntries) {
      const ref = store.putBytes("evidence", evidenceBytes.get(entry.path)!);
      if (!storedDigests.includes(ref.digest)) {
        storedDigests.push(ref.digest);
      }
    }

    const origins = [
      {
        url: reference.archiveUrl,
        retrievedAt: reference.retrievedAt,
        digest: archiveRef.digest,
      },
      {
        url: reference.treeUrl,
        retrievedAt: reference.retrievedAt,
        digest: tree.treeDigest,
      },
      ...evidenceEntries.map((entry) => ({
        url: sourceEvidenceUrl(reference, entry.path),
        retrievedAt: reference.retrievedAt,
        digest: entry.blobDigest,
      })),
    ];
    const snapshotRecord = createSourceSnapshot({
      request,
      reference,
      archiveBytes,
      tree,
      originEvidence: origins,
    });
    const snapshot = store.putRecord("snapshot", snapshotRecord);
    storedDigests.push(snapshot.digest);

    const phaseBytes = new TextEncoder().encode(
      canonicalJson({
        apiVersion: "factory.external-evidence-phase/v1",
        snapshotDigest: snapshot.digest,
        status: "pending-task-3",
      }),
    );
    const phaseRef = store.putBytes("evidence", phaseBytes);
    storedDigests.push(phaseRef.digest);
    const evidenceRecord = provisionalEvidence(
      request,
      snapshot,
      discovered.licence,
      discovered.notices,
      phaseRef.digest,
      reference.retrievedAt,
    );
    const evidence = store.putRecord("evidence", evidenceRecord);
    storedDigests.push(evidence.digest);
    appendReceipt(
      store,
      request,
      "evidenced",
      "source-evidence-acquired",
      [...new Set(storedDigests)],
      reference.retrievedAt,
    );
    return { snapshot, evidence };
  } catch (error) {
    const failure =
      error instanceof AcquisitionFailure
        ? error
        : new AcquisitionFailure(
            (error as Error).message || "Source acquisition failed.",
            "source-acquisition-failed",
          );
    appendReceipt(
      store,
      request,
      "blocked",
      failure.code,
      [...new Set(storedDigests)],
      createdAt,
    );
    throw failure;
  }
}
