import { describe, expect, it } from "vitest";

import {
  assertValidApplicationGraph,
  GraphSemanticError,
  validateApplicationGraph,
} from "../src/browser.js";

const graphWithBrokenNavigation = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "browser-safe-graph",
    workspaceId: "local-workspace",
    name: "Browser-safe graph",
  },
  page: {
    pages: [{ id: "home", route: "/", title: "Home", blocks: [] }],
    navigation: [{ id: "missing", label: "Missing", pageId: "not-a-page" }],
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
} as const;

describe("browser Graph entrypoint", () => {
  it("exposes semantic validation without Node-only hashing", () => {
    expect(validateApplicationGraph(graphWithBrokenNavigation)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "page.navigation.target_missing" }),
      ]),
    );
    expect(() =>
      assertValidApplicationGraph(graphWithBrokenNavigation),
    ).toThrow(GraphSemanticError);
  });
});
