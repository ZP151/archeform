import { z } from "zod";

import type { CapabilityAssetV1 } from "../contract.js";

const restaurantRequestSchema = z
  .object({
    orderId: z.string().min(1),
    expectedVersion: z.number().int().nonnegative(),
    transition: z.enum(["submit", "cancel", "complete"]),
    idempotencyKey: z.string().min(1),
    payloadDigest: z.string().regex(/^sha256:[a-f0-9]+$/),
    tableSession: z
      .object({ id: z.string().min(1), tableId: z.string().min(1) })
      .strict(),
    lines: z
      .array(
        z
          .object({
            menuItemId: z.string().min(1),
            quantity: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
    paymentEvidence: z
      .object({ kind: z.literal("simulated"), reference: z.string().min(1) })
      .strict(),
    cancellationReason: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.transition === "cancel" && !request.cancellationReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A cancellation reason is required for cancellation.",
        path: ["cancellationReason"],
      });
    }
  });

export type RestaurantOrderingTransactionRequestV1 = z.infer<
  typeof restaurantRequestSchema
>;

export interface RestaurantOrderingTransactionContextV1 {
  readonly tableSession: Readonly<{ id: string; tableId: string }>;
  readonly lines: readonly Readonly<{ menuItemId: string; quantity: number }>[];
  readonly paymentEvidence: Readonly<{
    kind: "simulated";
    reference: string;
  }>;
  readonly cancellationReason?: string;
}

export interface RestaurantOrderingTransactionOperationAdapterV1 {
  parseRequest(request: unknown): RestaurantOrderingTransactionRequestV1;
  prepare(request: RestaurantOrderingTransactionRequestV1): {
    readonly command: {
      readonly scope: string;
      readonly idempotencyKey: string;
      readonly payloadDigest: string;
      readonly aggregate: {
        readonly entity: "order";
        readonly id: string;
        readonly expectedVersion: number;
      };
      readonly transition: RestaurantOrderingTransactionRequestV1["transition"];
    };
    readonly context: RestaurantOrderingTransactionContextV1;
  };
}

export function createRestaurantOrderingTransactionOperationAdapter(): RestaurantOrderingTransactionOperationAdapterV1 {
  return Object.freeze({
    parseRequest(request: unknown) {
      try {
        return restaurantRequestSchema.parse(request);
      } catch (error) {
        if (
          error instanceof z.ZodError &&
          error.issues.some((issue) => issue.path[0] === "tableSession")
        ) {
          throw new Error("A declared table session is required.");
        }
        throw error;
      }
    },
    prepare(request: RestaurantOrderingTransactionRequestV1) {
      return Object.freeze({
        command: Object.freeze({
          scope: `restaurant-table-session:${request.tableSession.id}`,
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
          tableSession: Object.freeze({ ...request.tableSession }),
          lines: Object.freeze(
            request.lines.map(
              (line: RestaurantOrderingTransactionRequestV1["lines"][number]) =>
                Object.freeze({ ...line }),
            ),
          ),
          paymentEvidence: Object.freeze({ ...request.paymentEvidence }),
          ...(request.cancellationReason
            ? { cancellationReason: request.cancellationReason }
            : {}),
        }),
      });
    },
  });
}

export const restaurantOrderingAssetV1_2_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "restaurant.ordering",
    version: "1.2.0",
    category: "restaurant",
    name: "Restaurant transaction operation adapter",
    description:
      "Parses declared restaurant table, line, payment, and cancellation facts into a bounded transaction command.",
    packageRoot: "packages/capabilities/assets/restaurant.ordering/1.2.0",
    manifestDigest:
      "sha256:1f9ae2debb971122e998d9ea33b9774fdc1ad0be49bc540d46e47501fe3206b0",
    lifecycle: "golden",
    profiles: ["restaurant-ordering"],
    effects: ["restaurant.order.transaction.prepare"],
    inputSchema: [
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "orderLineEntity", type: "domain.entity", required: true },
      { key: "orderFlow", type: "flow.flow", required: true },
      { key: "tableSessionEntity", type: "domain.entity", required: true },
      { key: "customerRole", type: "policy.role", required: true },
    ],
    outputSlots: ["api.runtime", "test.journey"],
    templates: [],
    parameters: [
      { key: "orderEntity", type: "graph-symbol", required: true },
      { key: "orderLineEntity", type: "graph-symbol", required: true },
      { key: "orderFlow", type: "graph-symbol", required: true },
      { key: "tableSessionEntity", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
    ],
    executableContributions: [
      {
        id: "restaurant-ordering-transaction-operation-adapter",
        outputSlot: "api.runtime",
        namespace: "packages/restaurant.ordering/api/runtime/",
        source:
          "templates/api/restaurant-ordering-transaction-operation-adapter.ts.tpl",
        target:
          "api/src/capabilities/restaurant-ordering-transaction-operation-adapter.ts",
        parameterRefs: [
          "orderEntity",
          "orderLineEntity",
          "orderFlow",
          "tableSessionEntity",
          "customerRole",
        ],
        targetRuntimeInterfaceVersion:
          "factory.transaction-operation-adapter/v1",
        orderingRequirements: [],
        mergeProtocol: "replace-file",
        digest:
          "sha256:5e8edf8b1763e30686ab759ba820d9a2c8ec9b3b41d595536f3686bc1a3eeb58",
      },
      {
        id: "restaurant-ordering-transaction-operation-journey",
        outputSlot: "test.journey",
        namespace: "packages/restaurant.ordering/test/journeys/",
        source:
          "templates/test/restaurant-ordering-transaction-operation.journey.ts.tpl",
        target:
          "api/test/journeys/restaurant-ordering-transaction-operation.journey.ts",
        parameterRefs: [
          "orderEntity",
          "orderLineEntity",
          "orderFlow",
          "tableSessionEntity",
          "customerRole",
        ],
        targetRuntimeInterfaceVersion: "factory.journey/v1",
        orderingRequirements: [
          "restaurant-ordering-transaction-operation-adapter",
        ],
        mergeProtocol: "replace-file",
        digest:
          "sha256:8b8da53faf5ea1fb23d5d9a9bf98dbd3a5725bb31e74117b3a566e4b36b2d00c",
      },
    ],
    provides: [
      { interfaceKey: "factory.transaction-operation-adapter", version: "v1" },
    ],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:8100b3d4706a4dca85ac25396ede350234c0d47f4d2c5302a75a29f84a355cdd",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:66682fb5f4e7ed292de4c40cd5c3d5069b0a7ad365de796a9ef3985d5e211903",
      status: "verified",
    },
  },
};
