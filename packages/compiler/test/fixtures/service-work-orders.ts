import { readFileSync } from "node:fs";
import { assertProductBlueprint, assertRequirementSpec } from "@factory/graph";
import { composeInventoryInput } from "./inventory-operations.js";
export function serviceWorkOrdersBlueprint() {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        "../../../graph/test/fixtures/service-work-orders-blueprint.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  return {
    spec: assertRequirementSpec(fixture.spec),
    blueprint: assertProductBlueprint(fixture.blueprint),
  };
}
export function serviceWorkOrdersInput() {
  const { spec, blueprint } = serviceWorkOrdersBlueprint();
  return composeInventoryInput(spec, blueprint);
}
