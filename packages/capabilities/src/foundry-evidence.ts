import type {
  FoundryAdmissionEvidenceV1,
  FoundryProfileLockEvidenceV1,
} from "./foundry-admission.js";

/**
 * A declared Foundry family evidence record binds a current capability
 * family (key, version, manifest digest) to the evidence collected for it:
 * licence and provenance state, owner and deprecation policy, and the
 * isolated-verifier profile locks. The registry is a deliberate literal —
 * the digest is written by hand from the reviewed asset, never read back
 * from the asset object — so bumping an asset version without updating the
 * evidence record fails the coverage self-check, and stale evidence can
 * never masquerade as current.
 *
 * `profileLocks` start empty: no family may claim two-Profile proof until
 * an independent verifier records it (Task 6). The matrix therefore reports
 * an honest eligible count of zero until real evidence lands.
 */
export interface FoundryFamilyEvidenceV1 {
  readonly key: string;
  readonly version: string;
  readonly manifestDigest: string;
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

/** Projects a family evidence record onto the admission evidence shape. */
export function familyEvidenceToAdmissionEvidence(
  record: FoundryFamilyEvidenceV1,
): FoundryAdmissionEvidenceV1 {
  return {
    licence: record.licence,
    provenance: record.provenance,
    sourceStudy: record.sourceStudy,
    owner: record.owner,
    deprecationPolicy: record.deprecationPolicy,
    compatibilityDeclaration: record.compatibilityDeclaration,
    digestVerified: record.digestVerified,
    fixtureDigest: record.fixtureDigest,
    contractTestDigest: record.contractTestDigest,
    profileLocks: record.profileLocks,
  };
}

/**
 * Shared first-party policy fields for the declared registry: the repo
 * licence is MIT (LICENSE), every current family is first-party owned by
 * the factory platform, and the deprecation and compatibility policy is
 * uniform across families. Digests are the literal reviewed values — the
 * coverage self-check test in foundry-evidence.test.ts enforces that each
 * still matches its current asset.
 */
function declareFamily(
  key: string,
  version: string,
  manifestDigest: string,
): FoundryFamilyEvidenceV1 {
  return {
    key,
    version,
    manifestDigest,
    licence: "MIT",
    provenance: "first-party",
    owner: "factory-platform",
    deprecationPolicy: "two-minor-version notice",
    compatibilityDeclaration: "API-compatible within the major version",
    digestVerified: true,
    profileLocks: [],
  };
}

/** One declared evidence record per current capability family (23). */
export const declaredFoundryFamilyEvidence: readonly FoundryFamilyEvidenceV1[] =
  Object.freeze([
    declareFamily(
      "core.audit",
      "1.0.2",
      "sha256:e3b0137460e6c1b2a156b97a972623db656ce294c54c8913b4c3c43155828e7a",
    ),
    declareFamily(
      "core.crud",
      "1.0.1",
      "sha256:ac6197b00e529f519f1b062c9189a368eb9b94be125444a7c2f90cec46200f26",
    ),
    declareFamily(
      "core.notification",
      "1.1.1",
      "sha256:9258e7686b55c69dcafdc8d4d4e7484da527dae56134b25629855cca3df8b8d4",
    ),
    declareFamily(
      "core.workflow",
      "1.0.1",
      "sha256:8de6fdf5675c757d775ab5d563a738896f48473a0bbaa3d250790bccea5fcff0",
    ),
    declareFamily(
      "core.identity-context",
      "1.0.0",
      "sha256:6d717ecf2dc70db0096cf75d3241f55462402d7e0822c52e66c80677d20b5ec5",
    ),
    declareFamily(
      "core.identity-policy",
      "1.0.0",
      "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
    ),
    declareFamily(
      "core.policy-declarations",
      "1.0.0",
      "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
    ),
    declareFamily(
      "core.location-context",
      "1.0.0",
      "sha256:82cf5bf06758c6cac3f144dd15f177ae1582bca4cee1f6ce313ec3a65090ac84",
    ),
    declareFamily(
      "commerce.catalog",
      "1.2.0",
      "sha256:653150e5a08eb78a97ca36128e2c24e59e3550e275038e16b4b92fc15268b70d",
    ),
    declareFamily(
      "commerce.cart",
      "1.0.1",
      "sha256:de18db11d81d3a90938e43eb48b641d48ee2fe991541d64d2cf4cc1e29b6c207",
    ),
    declareFamily(
      "commerce.line-configuration",
      "1.1.2",
      "sha256:4a31deb44d3b53a0d929154b4ac64ffeaac9e571126118811c269e1880293075",
    ),
    declareFamily(
      "commerce.money-pricing",
      "1.1.0",
      "sha256:09c15dd80f6bf8f15f37f7bd9f334f1a65c63e875fc0c6a7e4655a283b0d3a23",
    ),
    declareFamily(
      "commerce.inventory",
      "1.1.1",
      "sha256:5ce03072bff9c17e79686807af1e912c41f772e89e30ec8d91ff77e248e05d40",
    ),
    declareFamily(
      "commerce.inventory-ledger",
      "1.0.0",
      "sha256:eaf32edcc1aedd8f79f6c44a27c72ba9781cb654061c25f82f9b52601047ff7e",
    ),
    declareFamily(
      "commerce.order",
      "1.2.0",
      "sha256:505cf0f6435f1ad88d1b7fe2fae890483739d6acdc58339f7e11609824b1a34f",
    ),
    declareFamily(
      "commerce.order-operations",
      "1.1.0",
      "sha256:652fe4c0e6695a92b2622c934af56b8175374bdecdb3bac3834d90a2c00b3a71",
    ),
    declareFamily(
      "commerce.simulated-payment",
      "1.0.1",
      "sha256:7e09745d72204d8930020217f379424962dc9ab24d4c4017d7a6a5d3623e81f9",
    ),
    declareFamily(
      "restaurant.table-session",
      "1.1.0",
      "sha256:9dff8a3a0348e30d19d2f2e62ce4dabab82885e2db80053791a6b6d30d3fdbf2",
    ),
    declareFamily(
      "restaurant.menu",
      "1.0.0",
      "sha256:0f02482633421d04ef987e5239ad717f1b1b207d5ad6319e1d5f3604e7313fcd",
    ),
    declareFamily(
      "restaurant.ordering",
      "1.1.0",
      "sha256:9f6af7bff7e06ac630a80ae781955c13145666f38492632a04eabe092dd8cf30",
    ),
    declareFamily(
      "restaurant.kitchen",
      "1.1.0",
      "sha256:a1a925c3519fc135be3c1290aa85b1914025ba64440128abfe7cc9c7567702c7",
    ),
    declareFamily(
      "restaurant.cashier",
      "1.1.0",
      "sha256:c95c35b2069c9c331d8b7cb591ec0472c72acf59fddfdb65c1550e05283fd6ba",
    ),
    declareFamily(
      "restaurant.reporting",
      "1.1.0",
      "sha256:400fb6c041e1f2f4191c779be37af2144ba7c8d8be5675dc16191d676fa7d221",
    ),
  ]);
