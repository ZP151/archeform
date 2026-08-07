import type { CapabilityAssetV1 } from "./assets/index.js";

/**
 * Foundry admission is a pure data boundary: given a capability asset and
 * the evidence an independent verifier collected for it, it returns a
 * deterministic verdict bucket. No filesystem, no network, no randomness —
 * browser-safe by construction so any caller (planner, control plane,
 * matrix tooling) reaches the same verdict for the same inputs.
 *
 * Buckets are strict: `rejected` wins over `quarantined` wins over
 * `partial`; only the determining bucket's reason codes are returned, sorted
 * for stable output.
 */
export type FoundryAdmissionResultV1 =
  "eligible" | "partial" | "quarantined" | "rejected";

export interface FoundryProfileLockEvidenceV1 {
  readonly profile: string;
  readonly graphChecksum: string;
  readonly lockDigest: string;
  readonly verifierStatus: "passed" | "pending" | "failed";
}

export interface FoundryAdmissionEvidenceV1 {
  readonly licence: string;
  readonly provenance: string;
  /** Present only when provenance records a third-party derivation. */
  readonly sourceStudy?: string;
  readonly owner: string;
  readonly deprecationPolicy: string;
  readonly compatibilityDeclaration: string;
  readonly digestVerified: boolean;
  readonly fixtureDigest?: string;
  readonly contractTestDigest?: string;
  readonly profileLocks: readonly FoundryProfileLockEvidenceV1[];
}

export interface FoundryAdmissionVerdictV1 {
  readonly result: FoundryAdmissionResultV1;
  readonly reasonCodes: readonly string[];
}

const REJECTED: Readonly<
  Record<
    string,
    (asset: CapabilityAssetV1, evidence: FoundryAdmissionEvidenceV1) => boolean
  >
> = {
  "digest-mismatch": (_asset, evidence) => evidence.digestVerified === false,
  "verification-not-verified": (asset) =>
    asset.manifest.verification === undefined ||
    asset.manifest.verification.status !== "verified",
  "missing-fixture": (asset) => !asset.manifest.verification?.fixture,
  "missing-negative-test": (asset) =>
    !asset.manifest.verification?.contractTest,
  "missing-binding-contract": (asset) =>
    asset.manifest.bindingContract === undefined,
  "missing-output-slots": (asset) =>
    !asset.manifest.outputSlots || asset.manifest.outputSlots.length === 0,
};

const QUARANTINED: Readonly<
  Record<
    string,
    (asset: CapabilityAssetV1, evidence: FoundryAdmissionEvidenceV1) => boolean
  >
> = {
  "lifecycle-not-golden": (asset) => asset.manifest.lifecycle !== "golden",
  "missing-licence": (_asset, evidence) => !evidence.licence,
  "missing-provenance": (_asset, evidence) => !evidence.provenance,
  "missing-owner": (_asset, evidence) => !evidence.owner,
  "missing-deprecation-policy": (_asset, evidence) =>
    !evidence.deprecationPolicy,
  "missing-compatibility": (_asset, evidence) =>
    !evidence.compatibilityDeclaration,
  "fewer-than-two-profiles": (_asset, evidence) =>
    evidence.profileLocks.length < 2,
  "stale-verifier-evidence": (asset, evidence) =>
    evidence.profileLocks.some(
      (lock) => lock.lockDigest !== expectedFoundryLockDigest(asset),
    ),
  "failed-verifier-evidence": (_asset, evidence) =>
    evidence.profileLocks.some((lock) => lock.verifierStatus === "failed"),
};

const PARTIAL: Readonly<
  Record<
    string,
    (asset: CapabilityAssetV1, evidence: FoundryAdmissionEvidenceV1) => boolean
  >
> = {
  "missing-evidence-digests": (_asset, evidence) =>
    evidence.fixtureDigest === undefined ||
    evidence.contractTestDigest === undefined,
  "pending-verifier-evidence": (_asset, evidence) =>
    evidence.profileLocks.some((lock) => lock.verifierStatus === "pending"),
};

function reasonCodesFor(
  bucket: Readonly<
    Record<
      string,
      (
        asset: CapabilityAssetV1,
        evidence: FoundryAdmissionEvidenceV1,
      ) => boolean
    >
  >,
  asset: CapabilityAssetV1,
  evidence: FoundryAdmissionEvidenceV1,
): string[] {
  return Object.keys(bucket)
    .filter((code) => bucket[code](asset, evidence))
    .sort();
}

export function evaluateFoundryAdmission(
  asset: CapabilityAssetV1,
  evidence: FoundryAdmissionEvidenceV1,
): FoundryAdmissionVerdictV1 {
  const rejected = reasonCodesFor(REJECTED, asset, evidence);
  if (rejected.length > 0) {
    return { result: "rejected", reasonCodes: rejected };
  }
  const quarantined = reasonCodesFor(QUARANTINED, asset, evidence);
  if (quarantined.length > 0) {
    return { result: "quarantined", reasonCodes: quarantined };
  }
  const partial = reasonCodesFor(PARTIAL, asset, evidence);
  if (partial.length > 0) {
    return { result: "partial", reasonCodes: partial };
  }
  return { result: "eligible", reasonCodes: [] };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

// Compact browser-safe SHA-256 (FIPS 180-4) over a UTF-8 string. The
// capabilities package entry is browser-safe and must not depend on
// node:crypto; this is the same class of implementation already used by the
// browser composition boundary.
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Hex(content: string): string {
  const bytes = new TextEncoder().encode(content);
  const lengthBits = BigInt(bytes.length) * 8n;
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Number(lengthBits >> 32n));
  view.setUint32(padded.length - 4, Number(lengthBits & 0xffffffffn));

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3);
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const sum1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7));
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + K[i] + w[i]) >>> 0;
      const sum0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10));
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

/**
 * The immutable lock digest a verifier must record for this exact asset
 * version: a canonical hash over the lock identity fields. Evidence whose
 * profile locks carry any other digest is stale.
 */
export function expectedFoundryLockDigest(asset: CapabilityAssetV1): string {
  return `sha256:${sha256Hex(
    canonicalJson({
      key: asset.manifest.key,
      version: asset.manifest.version,
      packageRoot: asset.manifest.packageRoot,
      manifestDigest: asset.manifest.manifestDigest,
      lifecycle: asset.manifest.lifecycle,
    }),
  )}`;
}
