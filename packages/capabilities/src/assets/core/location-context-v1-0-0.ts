import type { CapabilityAssetV1 } from "../contract.js";

export const locationContextAssetV1_0_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.location-context",
    version: "1.0.0",
    category: "core",
    name: "Location context",
    description:
      "Resolves an opaque session or validated manual code into a safe location context.",
    packageRoot: "packages/capabilities/assets/core.location-context/1.0.0",
    manifestDigest:
      "sha256:8bf0141b711f804f2301b1d0aeb0da3c8db807c9c181d78b5de6b59972a5e78d",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["location.context.resolve", "location.context.validate"],
    inputSchema: [
      { key: "locationEntity", type: "domain.entity", required: true },
      { key: "contextEntity", type: "domain.entity", required: true },
      { key: "locationCodeField", type: "domain.field", required: true },
      { key: "customerRole", type: "policy.role", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "api.service",
      "database.schema",
      "web.customer",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.location-context.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
      },
    ],
    parameters: [
      { key: "locationEntity", type: "graph-symbol", required: true },
      { key: "contextEntity", type: "graph-symbol", required: true },
      { key: "locationCodeField", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
    ],
    graphContributions: [
      {
        id: "location-context-entities",
        model: "domain",
        collection: "entities",
        operation: "extend",
        parameterRefs: ["locationEntity", "contextEntity"],
        digest:
          "sha256:daac4a73b708d2703a4a4e8b4b2912de92b5b6b87bd5773586cb38aeebb326b4",
      },
    ],
    executableContributions: [
      {
        id: "location-context-service",
        outputSlot: "api.service",
        namespace: "packages/core.location-context/api/services/",
        source: "templates/api/location-context.service.ts.tpl",
        target:
          "api/src/services/{{contextEntity}}-location-context.service.ts",
        parameterRefs: [
          "locationEntity",
          "contextEntity",
          "locationCodeField",
          "customerRole",
        ],
        targetRuntimeInterfaceVersion: "factory.api-service/v1",
        orderingRequirements: [],
        mergeProtocol: "replace-file",
        digest:
          "sha256:07d9366ca26238982302b30e574e31d790a3cbbb3442ed48713353074879bdfe",
      },
    ],
    provides: [{ interfaceKey: "core.location-context", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
