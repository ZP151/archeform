import { readFileSync } from "node:fs";
import { assertProductBlueprint, assertRequirementSpec } from "@factory/graph";
import { composeInventoryInput } from "./inventory-operations.js";
export function customerRequestsBlueprint() {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        "../../../graph/test/fixtures/customer-requests-blueprint.json",
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
export function customerRequestsInput() {
  const { spec, blueprint } = customerRequestsBlueprint();
  return composeInventoryInput(spec, blueprint);
}

export function roleCustomerRequestsInput(staff: string, customer: string) {
  const { spec, blueprint } = customerRequestsBlueprint();
  const rename = (role: string) =>
    role === "staff" ? staff : role === "customer" ? customer : role;
  for (const actor of blueprint.actors) actor.key = rename(actor.key);
  for (const flow of blueprint.workflows)
    for (const transition of flow.transitions)
      transition.actorKey = rename(transition.actorKey);
  for (const journey of blueprint.acceptanceJourneys)
    for (const step of journey.steps) step.actorKey = rename(step.actorKey);
  return composeInventoryInput(spec, assertProductBlueprint(blueprint));
}
