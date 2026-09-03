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
 * `profileLocks` are declared only from real isolated-verifier evidence
 * (Batches 3–5): families locked by two or more of the three verified
 * Profile Graphs carry those locks; families without two-Profile proof
 * declare none. The verification digests mirror exactly the literals the
 * reviewed current assets record — a family whose asset records no digest
 * literal declares none, and stays out of the eligible set until the asset
 * records it.
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
 *
 * The optional evidence argument carries only what an independent verifier
 * recorded: the reviewed verification digests the current asset manifest
 * declares (mirrored verbatim — never invented here) and the profile locks
 * from the isolated verifier profile graphs. Families without two-Profile
 * proof declare none, so the matrix can never count them eligible.
 */
function declareFamily(
  key: string,
  version: string,
  manifestDigest: string,
  evidence: {
    readonly fixtureDigest?: string;
    readonly contractTestDigest?: string;
    readonly profileLocks?: readonly FoundryProfileLockEvidenceV1[];
  } = {},
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
    fixtureDigest: evidence.fixtureDigest,
    contractTestDigest: evidence.contractTestDigest,
    profileLocks: evidence.profileLocks ?? [],
  });
}

/** One declared evidence record per current capability family (27). */
export const declaredFoundryFamilyEvidence: readonly FoundryFamilyEvidenceV1[] =
  Object.freeze([
    declareFamily(
      "core.audit",
      "1.0.2",
      "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
      {
        fixtureDigest:
          "sha256:d5ccc2735f139c947853eba2e2658fa050254b42785ad529ed51116dd847e96f",
        contractTestDigest:
          "sha256:21335a5e618119a4db05444913cd73a8940ce758df5b42de89b2ac739c94c7bb",
        profileLocks: [
          {
            profile: "expense-approval",
            graphChecksum:
              "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
            lockDigest:
              "sha256:9cf4dcebe313e30e502a676b2fbacdb86933effb1e6fec787e4616ebe1063ebf",
            verifierStatus: "passed",
          },
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:9cf4dcebe313e30e502a676b2fbacdb86933effb1e6fec787e4616ebe1063ebf",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:9cf4dcebe313e30e502a676b2fbacdb86933effb1e6fec787e4616ebe1063ebf",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.crud",
      "1.0.1",
      "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
      {
        fixtureDigest:
          "sha256:43e83c12606bf900ae30fd02a6e3f77e61d2629f9cd7c75c5376d8d5d9d8de5a",
        contractTestDigest:
          "sha256:5c17c71d7ac9863cae94372dfe4ecf4536009c3f18923a118a0b7237f0b27f9b",
        profileLocks: [
          {
            profile: "expense-approval",
            graphChecksum:
              "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
            lockDigest:
              "sha256:398819ff35083e9d83cd8ad9930a615eaf5c60848b78646b4f2b84eb3bff6635",
            verifierStatus: "passed",
          },
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:398819ff35083e9d83cd8ad9930a615eaf5c60848b78646b4f2b84eb3bff6635",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:398819ff35083e9d83cd8ad9930a615eaf5c60848b78646b4f2b84eb3bff6635",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.notification",
      "1.1.1",
      "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
      {
        fixtureDigest:
          "sha256:60466a2c1fb5d4dba4900ecbc38d9ae5a79c106c5edd35a160fae3a690875d4e",
        contractTestDigest:
          "sha256:494d52acbf679f22246a7979f0436c0b3dcb65d0ca4f4e85b728b25166462cd9",
        profileLocks: [
          {
            profile: "expense-approval",
            graphChecksum:
              "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
            lockDigest:
              "sha256:af2ff7f0d9f761524b239664caf7cf34a1b613577e1bba5b4243750f5d1abfc2",
            verifierStatus: "passed",
          },
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:af2ff7f0d9f761524b239664caf7cf34a1b613577e1bba5b4243750f5d1abfc2",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.workflow",
      "1.0.1",
      "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
      {
        fixtureDigest:
          "sha256:aa7783202e6f8c2148561f4f93b8577ff5768438315f06abdb4a0242ea514255",
        contractTestDigest:
          "sha256:0dcf1aa4e43a556075472cfe8e640974240fde538dd226588efa43f14d86d67a",
        profileLocks: [
          {
            profile: "expense-approval",
            graphChecksum:
              "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
            lockDigest:
              "sha256:7cb0fa678431c81aaff88ece04bbe91cfbef4f75129d66a2ec22bcebc537dd76",
            verifierStatus: "passed",
          },
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:7cb0fa678431c81aaff88ece04bbe91cfbef4f75129d66a2ec22bcebc537dd76",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:7cb0fa678431c81aaff88ece04bbe91cfbef4f75129d66a2ec22bcebc537dd76",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.identity-context",
      "1.0.0",
      "sha256:c2fc92f426d6e3995565681e55a8d7d5a5c8379c30ce4b9d2ecb0b538c2b8ca1",
      {
        fixtureDigest:
          "sha256:a21ce291cbb396b86c829e498ddd5d8046ba52689cc9c434325b3d162db5a008",
        contractTestDigest:
          "sha256:557907a4a9f1ab43f603a0f7956164b136c8820a02207d7756629960958a38dc",
      },
    ),
    declareFamily(
      "core.identity-policy",
      "1.0.0",
      "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
      {
        fixtureDigest:
          "sha256:6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
        contractTestDigest:
          "sha256:6578b78b5b616050ca4e8cd7282d86d66df6a943f93ae0267c773fa4719b1176",
        profileLocks: [
          {
            profile: "expense-approval",
            graphChecksum:
              "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
            lockDigest:
              "sha256:e3b10f6596a5231b815150c316015340d64abea16a6acc49c713862b6a12b454",
            verifierStatus: "passed",
          },
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:e3b10f6596a5231b815150c316015340d64abea16a6acc49c713862b6a12b454",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.policy-declarations",
      "1.0.0",
      "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
      {
        fixtureDigest:
          "sha256:c8aab600ba976a92a0281d1a1458867f5d21af5046a85b1a38f713ef35e319d5",
        contractTestDigest:
          "sha256:d6cf25a56c4b66f4bf74fb2df76c13a8c6637f1e8b55b2f824e97a52325f9755",
        profileLocks: [
          {
            profile: "expense-approval",
            graphChecksum:
              "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
            lockDigest:
              "sha256:5025313a96ecf42d587a1ddf6509c88db0ea861547dc7909faef4db58df85c51",
            verifierStatus: "passed",
          },
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:5025313a96ecf42d587a1ddf6509c88db0ea861547dc7909faef4db58df85c51",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.location-context",
      "1.0.0",
      "sha256:591b260f53f2fa0b8e838cb8b9ab350819aa720326b49c1a67f99990ae61df0d",
      {
        fixtureDigest:
          "sha256:cdc1850c4b5f49bc7b2d9b1afb3c8a570b00037e99c277780b290c80744cb2f3",
        contractTestDigest:
          "sha256:b9a590e83f13b3ad20154ae686a20db98dc51982cee5fcd7e204909917d0032f",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:6411aea0d340977ae70b5abf68bd56fc101f5e70f972072ec4e217978f3bf62c",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:6411aea0d340977ae70b5abf68bd56fc101f5e70f972072ec4e217978f3bf62c",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.files-media",
      "1.0.0",
      "sha256:5c4fbf964825b8504efc91c965b68e63eb6c7e139201d333d806989f16d2e249",
      {
        // Batch 5: restaurant-ordering and simple-ecommerce both lock
        // core.files-media through typed bindings (menu-item.imageUrl /
        // product.imageUrl) — two isolated-verifier Profile Graphs, so the
        // family becomes eligible. The verification digests are the
        // reviewed literals of the on-disk fixture and contract test, and
        // the lock digests were re-derived for the new asset identity.
        fixtureDigest:
          "sha256:4098e8d30b623e735c584140580690ff00e84397b53f3fda228ee187fc695422",
        contractTestDigest:
          "sha256:5450abdaf2bbf487d8a92ce272b3890c36dd7a29a5654005dde09464923733e5",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:c9427c17d9085f2a93146af96345074081f8d51a1410c4b2eea392166a8f5d80",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:c9427c17d9085f2a93146af96345074081f8d51a1410c4b2eea392166a8f5d80",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "core.search",
      "1.0.0",
      "sha256:1f2c1968afdb43ee52993fc6d6e7e297c2b7b7aa43777564fae6d6fb774c26c4",
      {
        // Batch 5: simple-ecommerce locks core.search through the typed
        // binding (product.name); one Profile Graph only, so the family
        // stays quarantined until a second Profile locks it.
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:2e49fe5e99ee8fd9ffc4477e18ac744bcfce9c557776acf42f3e460255557649",
            verifierStatus: "passed",
          },
        ],
      },
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
      {
        // Batch 5: expense-approval locks core.approvals through the typed
        // binding (expense entity / manager role); one Profile Graph only,
        // so the family stays quarantined until a second Profile locks it.
        profileLocks: [
          {
            profile: "expense-approval",
            graphChecksum:
              "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
            lockDigest:
              "sha256:cf28a4370395bab4528b8ead538d90a847f3ea144b7b04968675ee4fdc77c368",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.catalog",
      "1.2.0",
      "sha256:9819588b9b59c13a80a561c91ee1f14ebf73bbde16c3504f2de52e41934a8fcc",
      {
        fixtureDigest:
          "sha256:efa900139bdfdb892cf04d1a55eb9b47b0f2b1653eaa3b78655a939964d6a1e2",
        contractTestDigest:
          "sha256:e5f2218889d101590173edc35bee32f7f697ad2c87c042a511f5a56cffc2bff9",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:9e8d418231b881c0afed2b31e673ed3b92fbd7b2ba27f91e2d24f34aab55687f",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:9e8d418231b881c0afed2b31e673ed3b92fbd7b2ba27f91e2d24f34aab55687f",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.cart",
      "1.0.1",
      "sha256:20b9900c018b5590bb6481b1c6fb30a0bece3fd1b42baa8ebfceb6a6bd5c5216",
      {
        fixtureDigest:
          "sha256:d67eabef3aa20729725939d0bcd03a7e7aa9ce58a76e8968f09bf2e8adfb512d",
        contractTestDigest:
          "sha256:01b2ad5e8635728d62061fb06bed09267295d9ea6d1beb29f114c3d9ab9e1fa7",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:d550242d29b89d73dde2f39563a324ce47213be5a0b2dc4b97320fe55265829f",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:d550242d29b89d73dde2f39563a324ce47213be5a0b2dc4b97320fe55265829f",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.line-configuration",
      "1.1.2",
      "sha256:c1913c2b949728d859d363812476200ed57d57d992c7f6cd8d6b3ec90c9a2872",
      {
        fixtureDigest:
          "sha256:5fe47a2349951bf1c244c8f4de820570225a92160fed0ab14e53a27c8bc4068b",
        contractTestDigest:
          "sha256:6a52f4e8ce2fc36bb0190219f518c259cfd03fb20c6f839446e41feea52d8df4",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:c3fe0bc03f074acda14a4011890ef185aab5431fe4a889a15e46f232ed8cced4",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:c3fe0bc03f074acda14a4011890ef185aab5431fe4a889a15e46f232ed8cced4",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.money-pricing",
      "1.1.0",
      "sha256:09c15dd80f6bf8f15f37f7bd9f334f1a65c63e875fc0c6a7e4655a283b0d3a23",
      {
        fixtureDigest:
          "sha256:3c576bc374e9c918d26aba99d0d1efa3b5e2314364a0fe938c31cb167453cc54",
        contractTestDigest:
          "sha256:72187588f8aa8a9c684d3819abe4b7e35ef0fb2dfd47d4a788f0a090914c8a70",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:23e3e52a2ea5231e9d3ec8f261a44c35ff3e52385f369534fa31c96212b32e7f",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:23e3e52a2ea5231e9d3ec8f261a44c35ff3e52385f369534fa31c96212b32e7f",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.inventory",
      "1.1.1",
      "sha256:a6abfec1b2f2ff7d12c776a2efa706cab4267766ae309f3f3fbfa597c3fde34e",
      {
        fixtureDigest:
          "sha256:ecd77b2a2e93b9babc143eafd3194997fae6a9f5cfceae29ea9c76c9ca732b86",
        contractTestDigest:
          "sha256:a423510a3392d53c7280897abc6ef9bd84e8f24d7bc3588b4a99f0a354ec734b",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:494c0b5df2d7742f4d70ef067754551f558f2c4122806fa789bd6c44535e77e7",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:494c0b5df2d7742f4d70ef067754551f558f2c4122806fa789bd6c44535e77e7",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.inventory-ledger",
      "1.0.0",
      "sha256:611d7b77c806ffbaea4fbe262a7df4a459bb0f7a1d9e1b95150d8053744e4cbb",
      {
        fixtureDigest:
          "sha256:582b408b9ada232cca271538f57202c5738717020815b901194b6faf3cd990b0",
        contractTestDigest:
          "sha256:1e39d52256eb44a7ea380a70bda290555ffb16b3d7d28e0a6ce1f4c842680d9a",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:11c9843be3b4c4a7e6a39d0b5b053a21d7f8473c15b344fd58b5a105a39d6eb8",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:11c9843be3b4c4a7e6a39d0b5b053a21d7f8473c15b344fd58b5a105a39d6eb8",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.order",
      "1.2.0",
      "sha256:c8f5451b3144daac59ad589cb4e8483b5014c6c9cd98a4bc3e7b23577cb56f77",
      {
        fixtureDigest:
          "sha256:30b991eacc460e246e0e8162bcf0d9067ec27a6871da96541351b82597621f1a",
        contractTestDigest:
          "sha256:ba4918dad55420aadea9e44d3a6a74c778c15cedb808110d60d18364f3913954",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:3ada55a896632b8d0c12e7db2514beb0eba847014abf89d10d629f6e7afd6cfa",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:3ada55a896632b8d0c12e7db2514beb0eba847014abf89d10d629f6e7afd6cfa",
            verifierStatus: "passed",
          },
        ],
      },
    ),
    declareFamily(
      "commerce.order-operations",
      "1.1.0",
      "sha256:652fe4c0e6695a92b2622c934af56b8175374bdecdb3bac3834d90a2c00b3a71",
      {
        fixtureDigest:
          "sha256:35d7e54ff29cfa3fdf902c6bfa0618d5c861a9d6e0a2abdb51387d8585b1f5a4",
        contractTestDigest:
          "sha256:11cf0672fde864eee65383abf2319b780405b3bc5145ce885d4a71b5e8a93a8d",
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum:
              "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
            lockDigest:
              "sha256:3ec9cdc5a66c7d57188f55f65a6f4c61988d5d85b8c419e0d75127d246cf188b",
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:3ec9cdc5a66c7d57188f55f65a6f4c61988d5d85b8c419e0d75127d246cf188b",
            verifierStatus: "passed",
          },
        ],
      },
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
      {
        // Batch 5: restaurant-ordering locks restaurant.menu through the
        // typed binding (menu-category / menu-item / menu-item inventory);
        // one Profile Graph only, so the family stays quarantined until a
        // second Profile locks it.
        profileLocks: [
          {
            profile: "restaurant-ordering",
            graphChecksum:
              "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
            lockDigest:
              "sha256:61ae3aef214ce874100d3d05442b62a1dc6f309d3c2883cec1bfc67ec20b7bb0",
            verifierStatus: "passed",
          },
        ],
      },
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
