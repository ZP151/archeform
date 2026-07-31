import { z } from "zod";

import type { CapabilityAssetV1 } from "../contract.js";

const orderRequestSchema = z
  .object({
    orderId: z.string().min(1),
    expectedVersion: z.number().int().nonnegative(),
    transition: z.enum(["submit", "confirm", "cancel", "fulfill"]),
    idempotencyKey: z.string().min(1),
    payloadDigest: z.string().regex(/^sha256:[a-f0-9]+$/),
  })
  .strict();

export type CommerceOrderTransactionRequestV1 = z.infer<
  typeof orderRequestSchema
>;

export interface CommerceOrderTransactionContextV1 {
  readonly orderId: string;
  readonly transition: CommerceOrderTransactionRequestV1["transition"];
}

export interface CommerceOrderTransactionCommandV1 {
  readonly scope: string;
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
  readonly aggregate: {
    readonly entity: "order";
    readonly id: string;
    readonly expectedVersion: number;
  };
  readonly transition: CommerceOrderTransactionRequestV1["transition"];
}

export interface CommerceOrderTransactionOperationAdapterV1 {
  parseRequest(request: unknown): CommerceOrderTransactionRequestV1;
  prepare(request: CommerceOrderTransactionRequestV1): {
    readonly command: CommerceOrderTransactionCommandV1;
    readonly context: CommerceOrderTransactionContextV1;
  };
}

export function createCommerceOrderTransactionOperationAdapter(): CommerceOrderTransactionOperationAdapterV1 {
  return Object.freeze({
    parseRequest(request: unknown) {
      return orderRequestSchema.parse(request);
    },
    prepare(request: CommerceOrderTransactionRequestV1) {
      return Object.freeze({
        command: Object.freeze({
          scope: `order:${request.orderId}`,
          idempotencyKey: request.idempotencyKey,
          payloadDigest: request.payloadDigest,
          aggregate: Object.freeze({
            entity: "order" as const,
            id: request.orderId,
            expectedVersion: request.expectedVersion,
          }),
          transition: request.transition,
        }),
        context: Object.freeze({
          orderId: request.orderId,
          transition: request.transition,
        }),
      });
    },
  });
}

export const orderAssetV1_3_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.order",
    version: "1.3.0",
    category: "commerce",
    name: "Order transaction operation adapter",
    description:
      "Parses declared order transition facts and prepares a bounded transaction command.",
    packageRoot: "packages/capabilities/assets/commerce.order/1.3.0",
    manifestDigest:
      "sha256:7fedfa9198621020abdf689988e4e171aadf38b2891f0fdf36fbec89221c4b7c",
    lifecycle: "golden",
    profiles: [
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ],
    effects: ["order.transaction.prepare"],
    inputSchema: [
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "orderFlow", type: "flow.flow", required: true },
      { key: "customerRole", type: "policy.role", required: true },
    ],
    outputSlots: ["api.runtime", "test.journey"],
    templates: [],
    parameters: [
      { key: "orderEntity", type: "graph-symbol", required: true },
      { key: "orderFlow", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
    ],
    executableContributions: [
      {
        id: "commerce-order-transaction-operation-adapter",
        outputSlot: "api.runtime",
        namespace: "packages/commerce.order/api/runtime/",
        source:
          "templates/api/commerce-order-transaction-operation-adapter.ts.tpl",
        target:
          "api/src/capabilities/commerce-order-transaction-operation-adapter.ts",
        parameterRefs: ["orderEntity", "orderFlow", "customerRole"],
        targetRuntimeInterfaceVersion:
          "factory.transaction-operation-adapter/v1",
        orderingRequirements: [],
        mergeProtocol: "replace-file",
        digest:
          "sha256:208a82af35ad833768eca7d0f1d5ac9708de59e04eb45b7efff92941efe9f313",
      },
      {
        id: "commerce-order-transaction-operation-journey",
        outputSlot: "test.journey",
        namespace: "packages/commerce.order/test/journeys/",
        source:
          "templates/test/commerce-order-transaction-operation.journey.ts.tpl",
        target:
          "api/test/journeys/commerce-order-transaction-operation.journey.ts",
        parameterRefs: ["orderEntity", "orderFlow", "customerRole"],
        targetRuntimeInterfaceVersion: "factory.journey/v1",
        orderingRequirements: ["commerce-order-transaction-operation-adapter"],
        mergeProtocol: "replace-file",
        digest:
          "sha256:21eeb6bb42a3404c7349c656998820262034a85e6353db526e2aa959baab17ca",
      },
    ],
    provides: [
      { interfaceKey: "commerce.order-event", version: "v1" },
      { interfaceKey: "factory.transaction-operation-adapter", version: "v1" },
    ],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:ac07b941951fd0350485b55a7aea01ee8dfa828a7d9f672549befd04889a31ef",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:52acf23c1076f9e226e18361bc1159fe4a191b0a8d73e4e9109a0f790da24ebf",
      status: "verified",
    },
  },
};
