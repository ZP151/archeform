import { describe, expect, it } from "vitest";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
} from "@factory/graph";
import { composeProductDraft } from "@factory/capabilities/node";
import {
  isAppointmentConsumerWorkspaceBlueprint,
  matchExactConsumerFamilyPlan,
  planProductAlternatives,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import {
  definitionSelectionCatalogue,
  definitionSelectionInstructions,
  definitionSelectionJsonSchemas,
  projectDefinitionSelection,
} from "../src/requirements/definition-selection-catalogue.js";
import { loadProductDefinitionData } from "../src/requirements/product-definition-data.js";
import { validateFamilyDefinition } from "../src/requirements/definition-family-registry.js";
import { generateApplicationBundle } from "../../compiler/src/index.js";

const historicalKey = "appointment-booking-v1";
const replacementKey = "appointment-booking-v2";

function project(definitionKey: string) {
  return projectDefinitionSelection({
    definitionKey,
    disposition: "supported-default",
    requirementId: "appointment-consumer-replacement",
    title: "Studio appointments",
    outcome: "Book a service and manage its appointments.",
    materialQuestions: [],
    businessParameters: null,
  });
}

function standard(definitionKey: string) {
  const { spec: requirement, blueprint } = project(definitionKey);
  const plan = planProductAlternatives({
    requirement,
    blueprint,
    baseDraft: createBlankApplicationDraft({
      applicationId: requirement.requirementId,
      workspaceId: "local-workspace",
      name: blueprint.title,
    }),
  }).find((alternative) => alternative.key === "standard")!.plan;
  return { requirement, blueprint, plan };
}

describe("Appointment consumer definition replacement", () => {
  it("counts one replacement among twelve physical rows, eleven active definitions and seven registered families", () => {
    const rows = loadProductDefinitionData().definitions;
    expect(rows).toHaveLength(12);
    expect(
      rows.filter((row) => row.definitionKey !== historicalKey),
    ).toHaveLength(11);
    expect(new Set(rows.map((row) => row.familyBinding.key)).size).toBe(7);
  });

  it("compiles a persisted V2 definition through the existing workspace, read and setup seams", () => {
    const { requirement, blueprint, plan } = standard(replacementKey);
    const baseDraft = createBlankApplicationDraft({
      applicationId: requirement.requirementId,
      workspaceId: "local-workspace",
      name: blueprint.title,
    });
    const graph = applyGraphDiffToDraft(
      baseDraft,
      composeProductDraft({ baseDraft, blueprint, plan }).diff,
    ).graph;
    const selections = graph.integration.compositionSelections!;
    delete graph.integration.compositionSelections;
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    });
    expect(selections).toHaveLength(7);
    expect(
      Object.keys(
        selections.find(({ lock }) => lock.key === "scheduling.appointment")!
          .bindings,
      ),
    ).toHaveLength(17);
    expect(plan.capabilityLocks).toEqual(
      standard(historicalKey).plan.capabilityLocks,
    );
    const input = JSON.parse(
      JSON.stringify({
        publishedRevisionId: "appointment-v2-source",
        graph,
        compositionLock,
      }),
    );
    const bundle = generateApplicationBundle(input);
    const files = new Map(
      bundle.files.map((file) => [file.path, file.content]),
    );
    expect(files.get("web/app/page-runtime.tsx")).toContain(
      "appointment-workspace-presentation@1.0.0",
    );
    expect([...files.keys()]).toContain("api/src/appointment-consumer-read.ts");
    expect([...files.keys()]).toContain(
      "api/src/appointment-administrator-setup.ts",
    );
  });

  it("rejects mixed versions, altered permissions and changed locks in the V2 definition", () => {
    const entry = loadProductDefinitionData().definitions.find(
      (row) => row.definitionKey === replacementKey,
    )!;
    const mutations: Array<(row: typeof entry) => void> = [
      (row) => {
        row.familyBinding.version = "appointment-booking/v3";
      },
      (row) => {
        row.familyBinding.version = "appointment-booking/v1";
      },
      (row) => {
        row.admissionExpectations.presentation.version = "1.0.0";
      },
      (row) => {
        row.admissionExpectations.compilerProfile = "appointment-booking@1.0.0";
      },
      (row) => {
        row.canonical.blueprint.actors[0].permissions.pop();
      },
      (row) => {
        row.canonical.blueprint.actors[1].permissions[1].actions.push("read");
      },
      (row) => {
        row.canonical.blueprint.actors[2].permissions.push({
          entityKey: "schedule",
          actions: ["read-availability"],
        });
      },
      (row) => {
        row.admissionExpectations.capabilityLocks[0].manifestDigest = `sha256:${"0".repeat(64)}`;
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(entry);
      mutate(changed);
      expect(validateFamilyDefinition(changed)).not.toEqual([]);
    }
  });
  it("retains explicit historical projection without adding V2 permissions", () => {
    const { blueprint } = project(historicalKey);
    expect(isAppointmentConsumerWorkspaceBlueprint(blueprint)).toBe(false);
    expect(
      blueprint.actors.flatMap((actor) =>
        actor.permissions.flatMap((permission) => permission.actions),
      ),
    ).not.toContain("read-availability");
    expect(
      definitionSelectionCatalogue.find(
        (entry) => entry.definitionKey === historicalKey,
      ),
    ).toBeDefined();
  });

  it("registers V2 as an explicit replacement with the accepted profile coordinates", () => {
    const rows = loadProductDefinitionData().definitions.filter(
      (entry) => entry.familyBinding.key === "appointment",
    );
    expect(rows.map((entry) => entry.definitionKey)).toEqual([
      historicalKey,
      replacementKey,
    ]);
    expect(rows[1]).toMatchObject({
      definitionVersion: "1.0.0",
      familyBinding: { key: "appointment", version: "appointment-booking/v2" },
      parameterPolicy: "none/v1",
      admissionExpectations: {
        presentation: { key: "appointment-booking", version: "2.0.0" },
        compilerProfile: "appointment-booking@2.0.0",
      },
    });
  });

  it("offers only V2 to fresh provider selection while retaining the historical registry", () => {
    const schemas = JSON.stringify(definitionSelectionJsonSchemas);
    const instructions = definitionSelectionInstructions.join("\n");
    expect(schemas).toContain(`"const":"${replacementKey}"`);
    expect(schemas).not.toContain(`"const":"${historicalKey}"`);
    expect(instructions).toContain(replacementKey);
    expect(instructions).not.toContain(historicalKey);
    expect(() => project(historicalKey)).not.toThrow();
  });

  it("projects the exact V2 business structure without changing historical entities or workflows", () => {
    const historical = project(historicalKey).blueprint;
    const current = project(replacementKey).blueprint;
    expect(isAppointmentConsumerWorkspaceBlueprint(current)).toBe(true);
    expect(current.entities).toEqual(historical.entities);
    expect(current.workflows).toEqual(historical.workflows);
    expect(current.pageIntents).toEqual(historical.pageIntents);
    expect(
      current.actors.map((actor) => ({
        ...actor,
        permissions: actor.permissions.filter(
          (permission) => !permission.actions.includes("read-availability"),
        ),
      })),
    ).toEqual(historical.actors);
  });

  it("does not start a fresh automatic consumer journey from historical V1", () => {
    const { requirement, blueprint, plan } = standard(historicalKey);
    expect(
      matchExactConsumerFamilyPlan(blueprint, requirement.requirementId, plan),
    ).toBeNull();
  });

  it("admits only the exact V2 standard plan to automatic Appointment delivery", () => {
    const { requirement, blueprint, plan } = standard(replacementKey);
    expect(
      matchExactConsumerFamilyPlan(blueprint, requirement.requirementId, plan),
    ).toBe("appointment");
    expect(
      matchExactConsumerFamilyPlan(blueprint, "different-application", plan),
    ).toBeNull();
    const broadened = structuredClone(blueprint);
    const customer = broadened.actors.find(
      (actor) => actor.key === "customer",
    )!;
    const availability = customer.permissions.find((permission) =>
      permission.actions.includes("read-availability"),
    )!;
    availability.actions.push("read");
    expect(
      matchExactConsumerFamilyPlan(broadened, requirement.requirementId, plan),
    ).toBeNull();
  });
});
