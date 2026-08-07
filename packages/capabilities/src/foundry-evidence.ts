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

/** Runtime-enforced immutability: freezes an object and every nested value. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    return Object.freeze(value);
  }
  return value;
}

/**
 * Shared first-party policy fields for the declared registry: the repo
 * licence is MIT (LICENSE), every current family is first-party owned by
 * the factory platform, and the deprecation and compatibility policy is
 * uniform across families. Digests are the literal reviewed values — the
 * coverage self-check test in foundry-evidence.test.ts enforces that each
 * still matches its current asset. Records are deep-frozen so a caller can
 * never rewrite registry state at runtime (QA-1).
 */
function declareFamily(
  key: string,
  version: string,
  manifestDigest: string,
): FoundryFamilyEvidenceV1 {
  return deepFreeze({
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
  });
}

/** One declared evidence record per current capability family (27). */
export const declaredFoundryFamilyEvidence: readonly FoundryFamilyEvidenceV1[] =
  Object.freeze([
    declareFamily(
      "core.audit",
      "1.0.2",
      "sha256:e1bddb2e6f5874f29be6e64a363ed14be5f913e5723f0e21612584c1a1f65b52",
    ),
    declareFamily(
      "core.crud",
      "1.0.1",
      "sha256:1a15e681745571572da2491f32db38224ccf8948fb51d14abe312dd3f722e97a",
    ),
    declareFamily(
      "core.notification",
      "1.1.1",
      "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
    ),
    declareFamily(
      "core.workflow",
      "1.0.1",
      "sha256:f6a10ca009bbb14952c2a6767458582ade9b526376e476c39927edde546a7a7e",
    ),
    declareFamily(
      "core.identity-context",
      "1.0.0",
      "sha256:c2fc92f426d6e3995565681e55a8d7d5a5c8379c30ce4b9d2ecb0b538c2b8ca1",
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
      "sha256:591b260f53f2fa0b8e838cb8b9ab350819aa720326b49c1a67f99990ae61df0d",
    ),
    declareFamily(
      "core.files-media",
      "1.0.0",
      "sha256:a90d13d99503659593a4fd9292b30015acc81b3b599c064266bf7333537c2539",
    ),
    declareFamily(
      "core.search",
      "1.0.0",
      "sha256:1f2c1968afdb43ee52993fc6d6e7e297c2b7b7aa43777564fae6d6fb774c26c4",
    ),
    declareFamily(
      "core.scheduling",
      "1.0.0",
      "sha256:26b31d8dfefb61c9c5446c3c1e87c5bfd5688b3bb0897a31d422f4d74ef61f44",
    ),
    declareFamily(
      "core.approvals",
      "1.0.0",
      "sha256:26a2e7ccc3f59a97879e6797370d23b629499810403061c7026f7c0e365684be",
    ),
    declareFamily(
      "commerce.catalog",
      "1.2.0",
      "sha256:9819588b9b59c13a80a561c91ee1f14ebf73bbde16c3504f2de52e41934a8fcc",
    ),
    declareFamily(
      "commerce.cart",
      "1.0.1",
      "sha256:02209db2f89a645d72e5e413fcf0dfce65bce0c030174e9704ad08831f1ad094",
    ),
    declareFamily(
      "commerce.line-configuration",
      "1.1.2",
      "sha256:c1913c2b949728d859d363812476200ed57d57d992c7f6cd8d6b3ec90c9a2872",
    ),
    declareFamily(
      "commerce.money-pricing",
      "1.1.0",
      "sha256:09c15dd80f6bf8f15f37f7bd9f334f1a65c63e875fc0c6a7e4655a283b0d3a23",
    ),
    declareFamily(
      "commerce.inventory",
      "1.1.1",
      "sha256:a6abfec1b2f2ff7d12c776a2efa706cab4267766ae309f3f3fbfa597c3fde34e",
    ),
    declareFamily(
      "commerce.inventory-ledger",
      "1.0.0",
      "sha256:611d7b77c806ffbaea4fbe262a7df4a459bb0f7a1d9e1b95150d8053744e4cbb",
    ),
    declareFamily(
      "commerce.order",
      "1.2.0",
      "sha256:c8f5451b3144daac59ad589cb4e8483b5014c6c9cd98a4bc3e7b23577cb56f77",
    ),
    declareFamily(
      "commerce.order-operations",
      "1.1.0",
      "sha256:652fe4c0e6695a92b2622c934af56b8175374bdecdb3bac3834d90a2c00b3a71",
    ),
    declareFamily(
      "commerce.simulated-payment",
      "1.0.1",
      "sha256:5ca3c620bc4565ef1da0fa115d6e5a298450a94ce954bde05e40c58b26740edc",
    ),
    declareFamily(
      "restaurant.table-session",
      "1.1.0",
      "sha256:9dff8a3a0348e30d19d2f2e62ce4dabab82885e2db80053791a6b6d30d3fdbf2",
    ),
    declareFamily(
      "restaurant.menu",
      "1.0.0",
      "sha256:1efb3891dba96a724ac2e07050d4d0d0ce34648bb0745c48799c85c2b486bf30",
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
