import type { ApplicationGraphV1 } from "@factory/graph";

export const localApplicationGraph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "expense-approval",
    workspaceId: "local-workspace",
    name: "Expense approval",
  },
  page: {
    pages: [],
    navigation: [],
  },
  domain: {
    entities: [],
    relations: [],
  },
  policy: {
    roles: [],
    permissions: [],
  },
  flow: {
    flows: [],
  },
  integration: {
    providers: [],
    capabilities: [],
  },
  experience: {
    theme: { mode: "light", tokens: {} },
    locales: ["en"],
  },
};
