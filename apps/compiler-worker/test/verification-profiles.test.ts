import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";
import { hashApplicationGraph, parseApplicationGraph } from "@factory/graph";

import {
  validateIdempotencyJourney,
  validateRoleJourney,
} from "../src/verifier/role-journey.js";
import {
  resolveVerificationProfile,
  restaurantVerifierCashierSessionTokenDigest,
  restaurantVerifierDemoToken,
  restaurantVerifierMenuItemPrice,
  type VerificationProfile,
} from "../src/verifier/verification-profiles.js";
import { verificationStepKindSchema } from "@factory/graph";
import {
  acceptanceCompilation,
  acceptanceProfileKey,
} from "./fixtures/expense-approval.js";
import {
  simpleEcommerceCompilation,
  simpleEcommerceProfileKey,
} from "./fixtures/simple-ecommerce.js";
import {
  restaurantOrderingCompilation,
  restaurantOrderingProfileKey,
} from "./fixtures/restaurant-ordering.js";

const stepIdPattern = /^[a-z0-9-]{1,64}$/;
const allowedKinds = new Set([
  "migration",
  "health",
  "api",
  "role-journey",
  "authorization-denial",
  "idempotency",
]);

const profile: VerificationProfile =
  resolveVerificationProfile(acceptanceProfileKey);

describe("acceptance verification profile", () => {
  it("resolves the Expense Approval profile with a bounded ordered step plan", () => {
    expect(profile.profileKey).toBe(acceptanceProfileKey);
    expect(profile.stepPlan.length).toBeGreaterThanOrEqual(6);
    for (const entry of profile.stepPlan) {
      expect(stepIdPattern.test(entry.stepId)).toBe(true);
      expect(allowedKinds.has(entry.kind)).toBe(true);
      expect(verificationStepKindSchema.safeParse(entry.kind).success).toBe(
        true,
      );
    }
    // The plan is deterministic: the same lookup returns the same steps.
    expect(resolveVerificationProfile(acceptanceProfileKey).stepPlan).toEqual(
      profile.stepPlan,
    );
  });

  it("fails closed on any profile key that is not the acceptance profile", () => {
    expect(() => resolveVerificationProfile("unknown-profile")).toThrow();
  });

  it("declares fixture sessions for every journey in the profile", () => {
    const graph = acceptanceCompilation().graph;
    const roles = graph.policy.roles;
    for (const entry of profile.stepPlan) {
      if (entry.kind === "migration" || entry.kind === "health") continue;
      const journey = profile.journeys[entry.stepId];
      expect(journey).toBeDefined();
      expect(stepIdPattern.test(journey.journeyId)).toBe(true);
      expect(journey.sessionId).toBeDefined();
      // The session follows the compiler's fixture-session-<role> convention.
      const role = journey.sessionId.replace(/^fixture-session-/, "");
      expect(roles).toContain(role);
    }
  });

  it("resolves every journey action in the profile API registry", () => {
    for (const entry of profile.stepPlan) {
      const journey = profile.journeys[entry.stepId];
      if (journey === undefined) continue;
      if (entry.kind === "idempotency") {
        validateIdempotencyJourney(journey, profile.apiRegistry);
      } else {
        validateRoleJourney(journey, profile.apiRegistry);
      }
    }
  });

  it("orders the plan so the seeded record moves draft -> submitted -> approved", () => {
    const kinds = profile.stepPlan.map((entry) => entry.kind);
    const ids = profile.stepPlan.map((entry) => entry.stepId);
    const submitIndex = ids.indexOf("employee-submits-expense");
    const approveIndex = ids.indexOf("manager-approves-expense");
    const denyIndex = ids.indexOf("employee-denied-approval");
    expect(submitIndex).toBeGreaterThan(
      ids.indexOf("employee-creates-expense"),
    );
    expect(approveIndex).toBeGreaterThan(submitIndex);
    expect(denyIndex).toBeGreaterThan(approveIndex);
    expect(kinds[submitIndex]).toBe("idempotency");
    expect(kinds[approveIndex]).toBe("role-journey");
    expect(kinds[denyIndex]).toBe("authorization-denial");
  });
});

const ecommerceProfile: VerificationProfile = resolveVerificationProfile(
  simpleEcommerceProfileKey,
);

describe("simple ecommerce verification profile", () => {
  it("resolves the profile with a bounded ordered step plan", () => {
    expect(ecommerceProfile.profileKey).toBe(simpleEcommerceProfileKey);
    for (const entry of ecommerceProfile.stepPlan) {
      expect(stepIdPattern.test(entry.stepId)).toBe(true);
      expect(allowedKinds.has(entry.kind)).toBe(true);
      expect(verificationStepKindSchema.safeParse(entry.kind).success).toBe(
        true,
      );
    }
    expect(
      resolveVerificationProfile(simpleEcommerceProfileKey).stepPlan,
    ).toEqual(ecommerceProfile.stepPlan);
  });

  it("declares fixture sessions for every journey in the profile", () => {
    const graph = simpleEcommerceCompilation().graph;
    const roles = graph.policy.roles;
    for (const entry of ecommerceProfile.stepPlan) {
      if (entry.kind === "migration" || entry.kind === "health") continue;
      const journey = ecommerceProfile.journeys[entry.stepId];
      expect(journey).toBeDefined();
      expect(stepIdPattern.test(journey.journeyId)).toBe(true);
      expect(journey.sessionId).toBeDefined();
      const role = journey.sessionId.replace(/^fixture-session-/, "");
      expect(roles).toContain(role);
    }
  });

  it("resolves every journey action in the profile API registry", () => {
    for (const entry of ecommerceProfile.stepPlan) {
      const journey = ecommerceProfile.journeys[entry.stepId];
      if (journey === undefined) continue;
      if (entry.kind === "idempotency") {
        validateIdempotencyJourney(journey, ecommerceProfile.apiRegistry);
      } else {
        validateRoleJourney(journey, ecommerceProfile.apiRegistry);
      }
    }
  });

  it("orders the plan so the seeded record moves cart -> submitted -> paid -> fulfilled, denial last", () => {
    const ids = ecommerceProfile.stepPlan.map((entry) => entry.stepId);
    const kinds = ecommerceProfile.stepPlan.map((entry) => entry.kind);
    const addLineIndex = ids.indexOf("shopper-adds-cart-item");
    const submitIndex = ids.indexOf("shopper-submits-order");
    const payIndex = ids.indexOf("shopper-pays-order");
    const fulfilIndex = ids.indexOf("merchant-fulfils-order");
    const denyIndex = ids.indexOf("shopper-denied-cancel");
    expect(addLineIndex).toBeGreaterThan(ids.indexOf("shopper-creates-order"));
    expect(submitIndex).toBeGreaterThan(addLineIndex);
    expect(payIndex).toBeGreaterThan(submitIndex);
    expect(fulfilIndex).toBeGreaterThan(payIndex);
    expect(denyIndex).toBeGreaterThan(fulfilIndex);
    expect(kinds[addLineIndex]).toBe("role-journey");
    expect(kinds[submitIndex]).toBe("idempotency");
    expect(kinds[payIndex]).toBe("role-journey");
    expect(kinds[fulfilIndex]).toBe("role-journey");
    expect(kinds[denyIndex]).toBe("authorization-denial");
    // The merchant fulfils the paid order under the merchant fixture session.
    expect(ecommerceProfile.journeys["merchant-fulfils-order"].sessionId).toBe(
      "fixture-session-merchant",
    );
  });

  it("adds a cart line to the seeded order before the flow moves it", () => {
    // The order-operations runtime computes the payment due from the cart
    // lines and refuses an empty cart ("Order operations require at least
    // one cart item."), so the acceptance flow must stock the seeded
    // order-fixture-01 through the commerce line route before submit.
    const journey = ecommerceProfile.journeys["shopper-adds-cart-item"];
    expect(journey).toBeDefined();
    expect(journey.action).toBe("order.line-add");
    expect(journey.sessionId).toBe("fixture-session-shopper");
    expect(journey.body).toBe(
      JSON.stringify({
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      }),
    );
    const action = validateRoleJourney(journey, ecommerceProfile.apiRegistry);
    expect(action.method).toBe("POST");
    expect(action.route).toBe("/api/commerce/order/order-fixture-01/items");
    expect(action.expectedStatus).toBe(201);
  });
});

const restaurantProfile: VerificationProfile = resolveVerificationProfile(
  restaurantOrderingProfileKey,
);

describe("restaurant ordering verification profile", () => {
  it("resolves the profile with a bounded ordered step plan", () => {
    expect(restaurantProfile.profileKey).toBe(restaurantOrderingProfileKey);
    for (const entry of restaurantProfile.stepPlan) {
      expect(stepIdPattern.test(entry.stepId)).toBe(true);
      expect(allowedKinds.has(entry.kind)).toBe(true);
      expect(verificationStepKindSchema.safeParse(entry.kind).success).toBe(
        true,
      );
    }
    expect(
      resolveVerificationProfile(restaurantOrderingProfileKey).stepPlan,
    ).toEqual(restaurantProfile.stepPlan);
  });

  it("declares a graph role for every journey principal", () => {
    const graph = restaurantOrderingCompilation().graph;
    const roles = graph.policy.roles;
    for (const entry of restaurantProfile.stepPlan) {
      if (entry.kind === "migration" || entry.kind === "health") continue;
      const journey = restaurantProfile.journeys[entry.stepId];
      expect(journey).toBeDefined();
      expect(stepIdPattern.test(journey.journeyId)).toBe(true);
      expect(journey.principal).toBeDefined();
      expect(roles).toContain(journey.principal);
      // The Restaurant runtime is role-header bound, never session-bound.
      expect(journey.sessionId).toBeUndefined();
    }
  });

  it("resolves every journey action and validates its declared headers", () => {
    for (const entry of restaurantProfile.stepPlan) {
      const journey = restaurantProfile.journeys[entry.stepId];
      if (journey === undefined) continue;
      validateRoleJourney(journey, restaurantProfile.apiRegistry);
    }
  });

  it("declares an idempotency-key header on every mutation journey", () => {
    for (const entry of restaurantProfile.stepPlan) {
      if (entry.kind !== "role-journey") continue;
      const action = restaurantProfile.apiRegistry.find(
        (candidate) =>
          candidate.action === restaurantProfile.journeys[entry.stepId].action,
      );
      if (action?.method !== "POST") continue;
      const journey = restaurantProfile.journeys[entry.stepId];
      expect(
        journey.headers?.some(
          (header) => header.name === "x-factory-idempotency-key",
        ),
      ).toBe(true);
    }
  });

  it("binds the cashier payment to the merchant E2E digest and declared price", () => {
    const payment = restaurantProfile.journeys["cashier-pays-merchant-order"];
    const registryAction = restaurantProfile.apiRegistry.find(
      (candidate) => candidate.action === payment.action,
    );
    expect(registryAction?.route).toBe(
      "/api/restaurant/orders/merchant-e2e-cashier-order/payments",
    );
    const sessionToken = payment.headers?.find(
      (header) => header.name === "x-factory-table-session-token",
    );
    const expectedDigest = createHash("sha256")
      .update(`${restaurantVerifierDemoToken}:merchant-e2e:cashier`, "utf8")
      .digest("hex");
    expect(sessionToken?.value).toBe(expectedDigest);
    expect(sessionToken?.value).toBe(
      restaurantVerifierCashierSessionTokenDigest,
    );
    expect(JSON.parse(payment.body ?? "{}")).toMatchObject({
      amount: restaurantVerifierMenuItemPrice,
    });
  });

  it("orders the plan so the payment precedes the table seat and the denials come last", () => {
    const ids = restaurantProfile.stepPlan.map((entry) => entry.stepId);
    const kinds = restaurantProfile.stepPlan.map((entry) => entry.kind);
    const payIndex = ids.indexOf("cashier-pays-merchant-order");
    const seatIndex = ids.indexOf("merchant-seats-table");
    expect(payIndex).toBeGreaterThan(
      ids.indexOf("customer-resolves-demo-session"),
    );
    expect(seatIndex).toBeGreaterThan(payIndex);
    for (const denial of [
      "customer-denied-cancel",
      "kitchen-denied-payment",
      "customer-denied-reports",
    ]) {
      const index = ids.indexOf(denial);
      expect(index).toBeGreaterThan(seatIndex);
      expect(kinds[index]).toBe("authorization-denial");
    }
  });
});

describe("role journey header contract", () => {
  // A valid registry entry for the journey actions so only a bad header can
  // fail the validation.
  const registry = [
    {
      action: "order.pay",
      method: "POST" as const,
      route: "/api/order/order-fixture-01/events/pay",
      expectedStatus: 201,
    },
  ];

  it("fails closed on reserved principal header names", () => {
    expect(() =>
      validateRoleJourney(
        {
          journeyId: "reserved-header",
          action: "order.pay",
          principal: "customer",
          headers: [{ name: "x-factory-role", value: "manager" }],
        },
        registry,
      ),
    ).toThrow();
    expect(() =>
      validateRoleJourney(
        {
          journeyId: "reserved-header",
          action: "order.pay",
          principal: "customer",
          headers: [
            { name: "x-factory-fixture-session", value: "some-session" },
          ],
        },
        registry,
      ),
    ).toThrow();
  });

  it("fails closed on malformed or unbounded header names and values", () => {
    const base = {
      journeyId: "bad-header",
      action: "order.pay",
      principal: "customer",
    } as const;
    expect(() =>
      validateRoleJourney(
        { ...base, headers: [{ name: "X-Factory-Role", value: "ok" }] },
        registry,
      ),
    ).toThrow();
    expect(() =>
      validateRoleJourney(
        { ...base, headers: [{ name: "bad name!", value: "ok" }] },
        registry,
      ),
    ).toThrow();
    expect(() =>
      validateRoleJourney(
        {
          ...base,
          headers: [{ name: "x-factory-token", value: "not allowed value" }],
        },
        registry,
      ),
    ).toThrow();
  });

  it("fails closed on more than two headers and on duplicates", () => {
    const base = {
      journeyId: "too-many-headers",
      action: "order.pay",
      principal: "cashier",
    } as const;
    expect(() =>
      validateRoleJourney(
        {
          ...base,
          headers: [
            { name: "x-factory-token", value: "one" },
            { name: "x-factory-key", value: "two" },
            { name: "x-factory-other", value: "three" },
          ],
        },
        registry,
      ),
    ).toThrow();
    expect(() =>
      validateRoleJourney(
        {
          ...base,
          headers: [
            { name: "x-factory-key", value: "one" },
            { name: "x-factory-key", value: "two" },
          ],
        },
        registry,
      ),
    ).toThrow();
  });
});

describe("simple ecommerce fixture", () => {
  it("produces a deterministic immutable Published Graph", () => {
    const first = simpleEcommerceCompilation();
    const second = simpleEcommerceCompilation();
    expect(first.graph).toEqual(second.graph);
    expect(first.compositionLock).toEqual(second.compositionLock);
    (first.graph.domain as { seedData?: unknown }).seedData = [];
    expect(second.graph.domain.seedData).toHaveLength(2);
  });

  it("parses as a valid application graph bound to the profile", () => {
    const { graph, compositionLock } = simpleEcommerceCompilation();
    expect(parseApplicationGraph(graph).metadata.id).toBe(
      simpleEcommerceProfileKey,
    );
    // The lock is bound to the checksum of the graph without the selection
    // envelope — exactly how the fixture built it.
    expect(compositionLock.applicationGraphChecksum).toBe(
      hashApplicationGraph(graph),
    );
  });

  it("seeds the catalog product and the order fixture in the flow initial state", () => {
    const { graph } = simpleEcommerceCompilation();
    expect(
      graph.domain.seedData?.find((seed) => seed.id === "everyday-tote"),
    ).toMatchObject({ entity: "product" });
    const orderSeed = graph.domain.seedData?.find(
      (seed) => seed.id === "order-fixture-01",
    );
    expect(orderSeed?.entity).toBe("order");
    expect(orderSeed?.values).toMatchObject({ status: "cart", version: 0 });
    expect(
      graph.flow.flows.find((flow) => flow.entity === "order")?.initialState,
    ).toBe("cart");
  });
});

describe("restaurant ordering fixture", () => {
  it("produces a deterministic immutable Published Graph", () => {
    const first = restaurantOrderingCompilation();
    const second = restaurantOrderingCompilation();
    expect(first.graph).toEqual(second.graph);
    expect(first.compositionLock).toEqual(second.compositionLock);
    (first.graph.domain as { seedData?: unknown }).seedData = [];
    expect(second.graph.domain.seedData).toHaveLength(4);
  });

  it("parses as a valid application graph bound to the profile", () => {
    const { graph, compositionLock } = restaurantOrderingCompilation();
    expect(parseApplicationGraph(graph).metadata.id).toBe(
      restaurantOrderingProfileKey,
    );
    expect(compositionLock.applicationGraphChecksum).toBe(
      hashApplicationGraph(graph),
    );
  });

  it("seeds the restaurant fixtures the rendered seed requires", () => {
    const { graph } = restaurantOrderingCompilation();
    const entities = new Map(
      graph.domain.seedData?.map((seed) => [seed.id, seed]),
    );
    expect(entities.get("main-location")).toMatchObject({
      entity: "restaurant-location",
    });
    expect(entities.get("table-12")).toMatchObject({
      entity: "restaurant-table",
      values: { code: "T12" },
    });
    expect(entities.get("margherita-pizza")).toMatchObject({
      entity: "menu-item",
      values: { price: restaurantVerifierMenuItemPrice },
    });
    expect(entities.get("table-12-demo-session")).toMatchObject({
      entity: "table-session",
      values: { tableCode: "T12" },
    });
  });
});

describe("acceptance fixture", () => {
  it("produces a deterministic immutable Published Graph", () => {
    const first = acceptanceCompilation();
    const second = acceptanceCompilation();
    expect(first.graph).toEqual(second.graph);
    expect(first.compositionLock).toEqual(second.compositionLock);
    // Mutating one materialization never leaks into the next.
    (first.graph.domain as { seedData?: unknown }).seedData = [];
    expect(second.graph.domain.seedData).toHaveLength(1);
  });

  it("parses as a valid application graph", () => {
    const { graph } = acceptanceCompilation();
    expect(parseApplicationGraph(graph).metadata.id).toBe(acceptanceProfileKey);
  });

  it("carries a composition lock bound to the graph checksum", () => {
    const { graph, compositionLock } = acceptanceCompilation();
    expect(compositionLock.applicationGraphChecksum).toBe(
      hashApplicationGraph(graph),
    );
    expect(
      compositionLock.packages.some(
        (selection) => selection.lock.key === "core.identity-policy",
      ),
    ).toBe(true);
  });

  it("seeds the deterministic expense fixture record in the flow initial state", () => {
    const { graph } = acceptanceCompilation();
    const seed = graph.domain.seedData?.find(
      (candidate) => candidate.id === "expense-fixture-01",
    );
    expect(seed).toBeDefined();
    expect(seed?.entity).toBe("expense");
    expect(seed?.values.status).toBe("draft");
    const initialState = graph.flow.flows.find(
      (flow) => flow.id === "expense-review",
    )?.initialState;
    expect(initialState).toBe("draft");
  });
});
