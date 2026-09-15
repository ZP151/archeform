import { describe, expect, it } from "vitest";
import { hashRequirementSpec } from "@factory/graph";
import {
  approvalInterpretationFixture,
  purchaseRequestInterpretationFixture,
} from "./consumer-generation-fixture";

describe("authored approval delivery fixtures", () => {
  it.each([
    ["expense", approvalInterpretationFixture],
    ["purchase", purchaseRequestInterpretationFixture],
  ] as const)(
    "projects the current %s correction definition",
    async (family, interpret) => {
      const requirementId = `${family}-correction-fixture`;
      const result = await interpret(requirementId);
      const { spec, blueprint } = result.interpretation;
      expect(spec.requirementId).toBe(requirementId);
      expect(blueprint.requirementChecksum).toBe(hashRequirementSpec(spec));
      expect(blueprint.workflows[0]!.states.map(({ key }) => key)).toEqual([
        "draft",
        "submitted",
        "approved",
        "returned",
      ]);
      expect(blueprint.workflows[0]!.transitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "update",
            from: "returned",
            to: "draft",
          }),
        ]),
      );
    },
  );
});
