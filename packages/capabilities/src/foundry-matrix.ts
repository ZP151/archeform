import {
  currentCapabilityAssets,
  type CapabilityAssetV1,
} from "./assets/index.js";
import { evaluateFoundryAdmission } from "./foundry-admission.js";
import {
  declaredFoundryFamilyEvidence,
  familyEvidenceToAdmissionEvidence,
  type FoundryFamilyEvidenceV1,
} from "./foundry-evidence.js";

/**
 * The Foundry capability matrix is the deterministic promotion authority:
 * it reports exactly one row per current capability family and a verdict
 * computed purely from the asset manifest and its declared evidence record.
 * Aliases, historical versions, and retired families are never counted —
 * only the current asset list defines the rows. A family counts as eligible
 * only when its evidence is present, current, and passes admission; the
 * matrix never claims more than the evidence proves.
 */
export type FoundryMatrixResultV1 =
  | "eligible"
  | "partial"
  | "quarantined"
  | "rejected"
  | "missing-evidence"
  | "stale-evidence"
  | "duplicate-evidence";

export interface FoundryMatrixRowV1 {
  readonly key: string;
  readonly version: string;
  readonly manifestDigest: string;
  readonly result: FoundryMatrixResultV1;
  readonly reasonCodes: readonly string[];
}

export interface FoundryMatrixCountsV1 {
  readonly currentFamilies: number;
  readonly eligible: number;
  readonly partial: number;
  readonly quarantined: number;
  readonly rejected: number;
  readonly missingEvidence: number;
  readonly staleEvidence: number;
  readonly duplicateEvidence: number;
}

export interface FoundryMatrixV1 {
  readonly rows: readonly FoundryMatrixRowV1[];
  readonly counts: FoundryMatrixCountsV1;
}

function rowFor(
  asset: CapabilityAssetV1,
  evidenceRecords: readonly FoundryFamilyEvidenceV1[],
): FoundryMatrixRowV1 {
  const key = asset.manifest.key;
  const matches = evidenceRecords.filter((record) => record.key === key);

  if (matches.length === 0) {
    return {
      key,
      version: asset.manifest.version,
      manifestDigest: asset.manifest.manifestDigest,
      result: "missing-evidence",
      reasonCodes: ["missing-evidence-record"],
    };
  }
  if (matches.length > 1) {
    // Two records for the same family is an ambiguity the matrix cannot
    // resolve — the family is flagged and never counted as eligible.
    return {
      key,
      version: asset.manifest.version,
      manifestDigest: asset.manifest.manifestDigest,
      result: "duplicate-evidence",
      reasonCodes: ["duplicate-family-evidence"],
    };
  }

  const record = matches[0];
  if (
    record.version !== asset.manifest.version ||
    record.manifestDigest !== asset.manifest.manifestDigest
  ) {
    // The evidence binds a different version/digest than the current
    // family: it may describe history, but it cannot vouch for today.
    return {
      key,
      version: asset.manifest.version,
      manifestDigest: asset.manifest.manifestDigest,
      result: "stale-evidence",
      reasonCodes: ["stale-evidence-record"],
    };
  }

  const admission = evaluateFoundryAdmission(
    asset,
    familyEvidenceToAdmissionEvidence(record),
  );
  const reasonCodes = [...admission.reasonCodes];
  if (record.provenance !== "first-party" && !record.sourceStudy) {
    // Third-party provenance without a source study can never be promoted;
    // the admission boundary has no code for it, so the matrix adds one.
    reasonCodes.push("missing-source-study");
  }
  reasonCodes.sort();
  const result =
    admission.result === "eligible" &&
    reasonCodes.includes("missing-source-study")
      ? "quarantined"
      : admission.result;
  return {
    key,
    version: asset.manifest.version,
    manifestDigest: asset.manifest.manifestDigest,
    result,
    reasonCodes,
  };
}

/**
 * Builds the Foundry matrix over the current families (parameterized so
 * tests can inject synthetic assets and evidence records). Rows are sorted
 * by family key for stable output; counts always sum to the row count.
 */
export function buildFoundryMatrix(
  assets: readonly CapabilityAssetV1[] = currentCapabilityAssets,
  evidenceRecords: readonly FoundryFamilyEvidenceV1[] = declaredFoundryFamilyEvidence,
): FoundryMatrixV1 {
  const rows = assets
    .map((asset) => rowFor(asset, evidenceRecords))
    .sort((left, right) => left.key.localeCompare(right.key));

  const count = (result: FoundryMatrixResultV1) =>
    rows.filter((row) => row.result === result).length;

  return {
    rows,
    counts: {
      currentFamilies: rows.length,
      eligible: count("eligible"),
      partial: count("partial"),
      quarantined: count("quarantined"),
      rejected: count("rejected"),
      missingEvidence: count("missing-evidence"),
      staleEvidence: count("stale-evidence"),
      duplicateEvidence: count("duplicate-evidence"),
    },
  };
}
