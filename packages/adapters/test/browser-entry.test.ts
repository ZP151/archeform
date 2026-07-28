import { describe, expect, it } from "vitest";

import {
  flowModelToReactFlow,
  pageModelToPuckDocument,
} from "../src/browser.js";

describe("browser adapter entry", () => {
  it("projects Page and Flow models without importing server-only adapter contracts", () => {
    expect(
      pageModelToPuckDocument({
        pages: [{ id: "home", route: "/", title: "Home", blocks: [] }],
        navigation: [{ id: "home", label: "Home", pageId: "home" }],
      }),
    ).toMatchObject({ adapter: "puck", version: 1 });

    expect(
      flowModelToReactFlow({
        flows: [{
          id: "request-flow",
          entity: "request",
          initialState: "draft",
          states: ["draft", "submitted"],
          events: ["submit"],
          transitions: [{ from: "draft", event: "submit", to: "submitted" }],
        }],
      }).edges,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: expect.objectContaining({ event: "submit" }) }),
      ]),
    );
  });
});
