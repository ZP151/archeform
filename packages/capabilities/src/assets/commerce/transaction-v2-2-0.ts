import type { CapabilityAssetV1 } from "../contract.js";

export type TransactionCommandV2 = Readonly<{
  flowId: string;
  event: string;
  aggregate: Readonly<{
    entity: string;
    id: string;
    expectedVersion: number;
    expectedState: string;
  }>;
  idempotency: Readonly<{
    scope: string;
    key: string;
    payloadDigest: string;
  }>;
}>;

export const commerceTransactionAssetV2_2_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.transaction",
    version: "2.2.0",
    category: "commerce",
    name: "Commerce Transaction Command V2 executor",
    description:
      "Executes lock-bound commerce commands with distinct Flow and event identities through exactly one Transaction V2 operation adapter.",
    packageRoot: "packages/capabilities/assets/commerce.transaction/2.2.0",
    manifestDigest:
      "sha256:012fb4c8c29672e0e85f9e802226e8d7df47eceef5512cc8aa17c283fd6e375d",
    lifecycle: "golden",
    profiles: ["simple-ecommerce", "retail-counter", "grocery-pickup"],
    effects: ["commerce.transaction.execute"],
    inputSchema: [
      { key: "aggregateEntity", type: "domain.entity", required: true },
      { key: "transactionFlow", type: "flow.flow", required: true },
      { key: "actorRole", type: "policy.role", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "database.migration",
      "test.journey",
    ],
    runtimeHandlers: ["transaction"],
    templates: [],
    parameters: [
      { key: "aggregateEntity", type: "graph-symbol", required: true },
      { key: "transactionFlow", type: "graph-symbol", required: true },
      { key: "actorRole", type: "graph-symbol", required: true },
    ],
    executableContributions: [],
    requires: [
      { interfaceKey: "commerce.stock-movement", version: "v1" },
      { interfaceKey: "commerce.order-event", version: "v1" },
      {
        interfaceKey: "factory.transaction-operation-adapter",
        version: "v2",
      },
    ],
    provides: [
      { interfaceKey: "commerce.transaction", version: "v2" },
      { interfaceKey: "factory.transaction-executor", version: "v2" },
    ],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:8518b5427ba2844f12aff73a8a9f201d84fd524670087b530881a832c7382cef",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:3341948c4b06f011ee45d125cb0efb5003753505da0676c42c6c51564d048be0",
      status: "verified",
    },
  },
};
