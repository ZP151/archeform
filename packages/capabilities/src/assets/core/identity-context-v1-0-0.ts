import type { CapabilityAssetV1 } from "../contract.js";

export const identityContextAssetV1_0_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.identity-context",
    version: "1.0.0",
    category: "core",
    name: "Identity context",
    description:
      "Resolves a provider-neutral principal and session into a declared role context.",
    packageRoot: "packages/capabilities/assets/core.identity-context/1.0.0",
    manifestDigest:
      "sha256:6d717ecf2dc70db0096cf75d3241f55462402d7e0822c52e66c80677d20b5ec5",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["identity.context.resolve", "identity.context.validate"],
    inputSchema: [
      { key: "principalEntity", type: "domain.entity", required: true },
      { key: "sessionEntity", type: "domain.entity", required: true },
      { key: "defaultRole", type: "policy.role", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "api.service",
      "database.schema",
      "policy.rule",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.identity-context.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
      },
    ],
    parameters: [
      { key: "principalEntity", type: "graph-symbol", required: true },
      { key: "sessionEntity", type: "graph-symbol", required: true },
      { key: "defaultRole", type: "graph-symbol", required: true },
    ],
    graphContributions: [
      {
        id: "principal-context-entities",
        model: "domain",
        collection: "entities",
        operation: "extend",
        parameterRefs: ["principalEntity", "sessionEntity"],
        digest:
          "sha256:f75862ece08b6e8a0c3160ea752e3f2532a53fe09f68888ac5d26a9a61576a98",
      },
    ],
    executableContributions: [
      {
        id: "principal-context-service",
        outputSlot: "api.service",
        namespace: "packages/core.identity-context/api/services/",
        source: "templates/api/principal-context.service.ts.tpl",
        target:
          "api/src/services/{{principalEntity}}-principal-context.service.ts",
        parameterRefs: ["principalEntity", "sessionEntity", "defaultRole"],
        targetRuntimeInterfaceVersion: "factory.api-service/v1",
        orderingRequirements: [],
        mergeProtocol: "replace-file",
        digest:
          "sha256:17c07575f55ad8a760bb3b75c75a3f992c2d7906af028caa0efed9699be5ae6c",
      },
    ],
    provides: [{ interfaceKey: "core.principal-context", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:a21ce291cbb396b86c829e498ddd5d8046ba52689cc9c434325b3d162db5a008",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:557907a4a9f1ab43f603a0f7956164b136c8820a02207d7756629960958a38dc",
      status: "verified",
    },
  },
};
