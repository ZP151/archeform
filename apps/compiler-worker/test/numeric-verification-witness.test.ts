import { describe, it, expect } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import {
  numericInput,
  positive,
} from "../../../packages/compiler/test/fixtures/approval-numeric-domain.js";
import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
describe("numeric verification witnesses", () => {
  it("uses an explicit authoritative witness instead of hardcoded create or correction amounts", () => {
    const fixture = numericInput();
    const field = fixture.graph.domain.entities[0]!.fields.find(
      (f) => f.key === "fee",
    )!;
    field.numericDomain = {
      ...positive,
      minimum: { value: 500, inclusive: true },
      maximum: { value: 501, inclusive: false },
    };
    fixture.graph.domain.seedData![0]!.values.fee = 500.5;
    fixture.compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(fixture.graph),
      selections: fixture.compositionLock.packages,
    });
    const profile = deriveVerificationProfile(
      fixture.graph,
      fixture.compositionLock,
    );
    const bodies: Record<string, any>[] = [];
    const visit = (value: unknown) => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (
            parsed &&
            typeof parsed === "object" &&
            ("fee" in parsed || parsed.values?.fee !== undefined)
          )
            bodies.push(parsed);
        } catch {}
      } else if (value && typeof value === "object")
        Object.values(value).forEach(visit);
    };
    visit(profile);
    expect(bodies.length).toBeGreaterThan(1);
    for (const body of bodies) expect(body.values?.fee ?? body.fee).toBe(500.5);
  });
});
