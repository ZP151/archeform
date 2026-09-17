import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { describe, expect, it } from "vitest";
import { calculatedInput } from "../../../packages/compiler/test/fixtures/approval-calculated-total.js";
import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";

function calculatedFixture() {
  const input = calculatedInput();
  const entity = input.graph.domain.entities.find((entry) =>
    entry.fields.some((field) => field.calculation),
  )!;
  const output = entity.fields.find((field) => field.calculation)!;
  const rule = output.calculation!;
  const seeds = input.graph.domain.seedData!.filter(
    (seed) => seed.entity === entity.key,
  );
  const refreshLock = () => {
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.compositionLock.packages,
    });
  };
  return { input, entity, output, rule, seeds, refreshLock };
}

describe("calculated request verification witnesses", () => {
  it.each([undefined, 123, " "])(
    "skips an incomplete business row (%s) and uses the next complete triple",
    (justification) => {
      const { input, entity, output, rule, seeds, refreshLock } =
        calculatedFixture();
      const complete = structuredClone(seeds[0]!);
      complete.id = "complete-business-witness";
      Object.assign(complete.values, {
        [rule.quantityFieldKey]: 2,
        [rule.unitPriceFieldKey]: 10.5,
        [output.key]: 21,
      });
      if (justification === undefined) delete seeds[0]!.values.justification;
      else seeds[0]!.values.justification = justification;
      input.graph.domain.seedData!.push(complete);
      refreshLock();
      const profile = deriveVerificationProfile(
        input.graph,
        input.compositionLock,
      );
      expect(
        JSON.parse(profile.journeys[entity.key + "-create"].body!).values,
      ).toMatchObject({
        [rule.quantityFieldKey]: 2,
        [rule.unitPriceFieldKey]: 10.5,
      });
      input.graph.domain.seedData!.pop();
      refreshLock();
      expect(() =>
        deriveVerificationProfile(input.graph, input.compositionLock),
      ).toThrow();
    },
  );

  it("uses one complete seed row and omits the derived field from all create/correction bodies", () => {
    const { input, entity, output, rule, seeds, refreshLock } =
      calculatedFixture();
    Object.assign(seeds[0]!.values, {
      [rule.quantityFieldKey]: 3,
      [rule.unitPriceFieldKey]: 0.07,
      [output.key]: 0.21,
    });
    input.graph.domain.seedData!.push({
      ...structuredClone(seeds[0]!),
      id: "second-calculation-witness",
      values: {
        ...seeds[0]!.values,
        [rule.quantityFieldKey]: 2,
        [rule.unitPriceFieldKey]: 10.5,
        [output.key]: 21,
      },
    });
    refreshLock();
    const before = JSON.stringify(input);
    const profile = deriveVerificationProfile(
      input.graph,
      input.compositionLock,
    );
    const bodies = Object.values(profile.journeys)
      .filter((journey) => journey.action.startsWith(entity.key + "."))
      .flatMap((journey) => [journey, ...(journey.chain ?? [])])
      .filter((step) => step.body !== undefined)
      .map((step) => JSON.parse(step.body!))
      .filter((body) => body.values);
    expect(bodies.length).toBeGreaterThan(3);
    for (const body of bodies) {
      expect(body.values).toMatchObject({
        [rule.quantityFieldKey]: 3,
        [rule.unitPriceFieldKey]: 0.07,
      });
      expect(body.values).not.toHaveProperty(output.key);
    }
    expect(profile.journeys[entity.key + "-update"].chain).toHaveLength(3);
    expect(JSON.stringify(input)).toBe(before);
    expect(
      deriveVerificationProfile(input.graph, input.compositionLock),
    ).toEqual(profile);
  });

  it.each(["missing-total", "wrong-total", "split-operands", "string-operand"])(
    "fails closed for %s instead of inventing a witness",
    (kind) => {
      const { input, output, rule, seeds } = calculatedFixture();
      if (kind === "missing-total") delete seeds[0]!.values[output.key];
      if (kind === "wrong-total") seeds[0]!.values[output.key] = 123;
      if (kind === "string-operand")
        seeds[0]!.values[rule.unitPriceFieldKey] = "125.5";
      if (kind === "split-operands") {
        const other = structuredClone(seeds[0]!);
        other.id = "split-calculation-witness";
        delete seeds[0]!.values[rule.quantityFieldKey];
        delete other.values[rule.unitPriceFieldKey];
        input.graph.domain.seedData!.push(other);
      }
      expect(() =>
        deriveVerificationProfile(input.graph, input.compositionLock),
      ).toThrow();
    },
  );

  it("does not silently downgrade a calculated request with an invalid immutable lock", () => {
    const { input } = calculatedFixture();
    input.compositionLock = {
      ...input.compositionLock,
      applicationGraphChecksum: "sha256:" + "0".repeat(64),
    };
    expect(() =>
      deriveVerificationProfile(input.graph, input.compositionLock),
    ).toThrow();
  });
});
