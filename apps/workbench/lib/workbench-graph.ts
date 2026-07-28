import type { ApplicationGraphV1 } from "@factory/graph";

export const workbenchGraph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "ops-workspace",
    workspaceId: "factory",
    name: "Ops workspace",
  },
  page: {
    pages: [
      {
        id: "request-intake",
        route: "/requests",
        title: "Request intake",
        blocks: [
          {
            id: "request-hero",
            type: "hero",
            entity: "request",
            props: { heading: "Move work through the right decision." },
          },
        ],
      },
    ],
    navigation: [
      {
        id: "requests",
        label: "Requests",
        pageId: "request-intake",
        icon: "inbox",
      },
    ],
  },
  domain: {
    entities: [
      {
        key: "request",
        label: "Request",
        fields: [
          { key: "title", type: "string", required: true },
          {
            key: "status",
            type: "enum",
            required: true,
            values: ["draft", "submitted", "approved"],
          },
        ],
        indexes: [{ fields: ["status"] }],
      },
    ],
    relations: [],
  },
  policy: {
    roles: ["employee", "manager"],
    permissions: [
      { role: "employee", resource: "request", actions: ["create", "read"] },
      { role: "manager", resource: "request", actions: ["read", "approve"] },
    ],
  },
  flow: {
    flows: [
      {
        id: "request-review",
        entity: "request",
        initialState: "draft",
        states: ["draft", "submitted", "approved"],
        events: ["submit", "approve"],
        transitions: [
          {
            from: "draft",
            event: "submit",
            to: "submitted",
            roles: ["employee"],
          },
          {
            from: "submitted",
            event: "approve",
            to: "approved",
            roles: ["manager"],
          },
        ],
      },
    ],
  },
  integration: { providers: [], capabilities: [] },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
};
