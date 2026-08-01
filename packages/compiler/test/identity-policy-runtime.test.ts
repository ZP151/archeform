import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

import { generateApplicationBundle } from "../src/index.js";

function publishedExpenseFiles(): Readonly<Record<string, string>> {
  const draft = composeDefaultCapabilityDraft({
    profile: "expense-approval",
  }).graph;
  const selections = draft.integration.compositionSelections!;
  const graph = structuredClone(draft);
  delete graph.integration.compositionSelections;

  return Object.fromEntries(
    generateApplicationBundle({
      publishedRevisionId: "identity-policy-runtime-expense-1",
      graph,
      compositionLock: createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(graph),
        selections,
      }),
    }).files.map((file) => [file.path, file.content]),
  );
}

describe("identity policy runtime compilation", () => {
  it("emits a session-bound deny-by-default API guard for a locked identity package", () => {
    const files = publishedExpenseFiles();

    expect(files["api/src/capabilities/core.identity-policy.ts"]).toContain(
      "authorizeDeclaredAction",
    );
    expect(files["api/src/main.ts"]).toContain("x-factory-fixture-session");
    expect(files["api/src/main.ts"]).toContain("resolveFixturePrincipal");
    expect(files["api/src/main.ts"]).toContain("authorizeDeclaredAction");
    expect(files["api/src/main.ts"]).not.toContain("x-factory-role");
  });
});
