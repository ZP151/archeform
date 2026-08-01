import type { FactoryProfile } from "./assets/index.js";

export type ProfileCapabilityReadinessV1 =
  "available" | "partial" | "planned" | "provider-required";

export type ProfileGeneratedTargetV1 =
  "simulator" | "web" | "api" | "database" | "tests" | "docs";

export interface ProfileReadinessCapabilityV1 {
  readonly key: string;
  readonly status: ProfileCapabilityReadinessV1;
}

export interface ProfileReadinessV1 {
  readonly apiVersion: "factory.profile-readiness/v1";
  readonly profile: FactoryProfile;
  readonly label: string;
  readonly generatedTargets: readonly ProfileGeneratedTargetV1[];
  readonly capabilities: readonly ProfileReadinessCapabilityV1[];
}

export interface ProfileReadinessSourceV1 {
  readonly profile: FactoryProfile;
  readonly label: string;
  readonly availableCapabilities: readonly string[];
}

const generatedTargets: readonly ProfileGeneratedTargetV1[] = Object.freeze([
  "simulator",
  "web",
  "api",
  "database",
  "tests",
  "docs",
]);

const additionalReadiness: Readonly<
  Record<FactoryProfile, readonly ProfileReadinessCapabilityV1[]>
> = {
  "expense-approval": [],
  "restaurant-ordering": [
    { key: "commerce.transaction", status: "partial" },
    { key: "commerce.order-amendment", status: "partial" },
    { key: "identity.member", status: "provider-required" },
    { key: "payment.provider", status: "provider-required" },
    { key: "restaurant.printing", status: "provider-required" },
    { key: "realtime.events", status: "provider-required" },
    { key: "delivery.dispatch", status: "planned" },
  ],
  "simple-ecommerce": [
    { key: "commerce.transaction", status: "partial" },
    { key: "commerce.order-amendment", status: "partial" },
    { key: "identity.member", status: "provider-required" },
    { key: "payment.provider", status: "provider-required" },
  ],
  "retail-counter": [
    { key: "commerce.transaction", status: "partial" },
    { key: "commerce.order-amendment", status: "partial" },
    { key: "payment.provider", status: "provider-required" },
    { key: "retail.receipt-printing", status: "provider-required" },
  ],
  "grocery-pickup": [
    { key: "commerce.transaction", status: "partial" },
    { key: "commerce.order-amendment", status: "partial" },
    { key: "payment.provider", status: "provider-required" },
    { key: "fulfilment.route", status: "planned" },
  ],
};

/**
 * Builds the source-free, read-only maturity projection shown by Factory.
 * Registered Profile recipes are the sole authority for `available`; the
 * small profile-specific extension list makes gaps explicit without implying
 * that a third-party Provider or unregistered package is runnable.
 */
export function createProfileReadiness(
  sources: readonly ProfileReadinessSourceV1[],
): readonly ProfileReadinessV1[] {
  return Object.freeze(
    sources.map((source) => {
      const capabilityStatus = new Map<string, ProfileCapabilityReadinessV1>();
      for (const key of source.availableCapabilities) {
        capabilityStatus.set(key, "available");
      }
      for (const capability of additionalReadiness[source.profile]) {
        if (capabilityStatus.has(capability.key)) {
          throw new Error(
            `Profile readiness duplicates capability '${capability.key}' for '${source.profile}'.`,
          );
        }
        capabilityStatus.set(capability.key, capability.status);
      }

      return Object.freeze({
        apiVersion: "factory.profile-readiness/v1" as const,
        profile: source.profile,
        label: source.label,
        generatedTargets,
        capabilities: Object.freeze(
          [...capabilityStatus.entries()].map(([key, status]) =>
            Object.freeze({ key, status }),
          ),
        ),
      });
    }),
  );
}
