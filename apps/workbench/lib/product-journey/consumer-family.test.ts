import { describe, expect, it } from "vitest";
import { planProductAlternatives } from "@factory/capabilities";
import {
  createBlankApplicationDraft,
  hashRequirementSpec,
} from "@factory/graph";
import { projectDefinitionSelection } from "../../../../packages/adapters/src/requirements/definition-selection-catalogue";
import { consumerFamilyFor } from "./consumer-family";
import type { ProductJourneyController } from "./use-product-journey";

const families = [
  ["appointment-booking-v2", "appointment"],
  ["knowledge-resource-directory", "content-directory"],
  ["supplies-stockroom", "inventory-operations"],
  ["facilities-service-desk", "service-work-orders"],
  ["customer-support-desk", "customer-requests"],
] as const;

function accepted(definitionKey: string) {
  const interpretation = projectDefinitionSelection({
    definitionKey,
    disposition: "supported-default",
    requirementId: "consumer-requirement",
    title: "Business application",
    outcome: "Complete the accepted business operation.",
    materialQuestions: [],
    businessParameters: null,
  });
  const alternatives = [
    ...planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: interpretation.spec.requirementId,
        workspaceId: "local-workspace",
        name: interpretation.blueprint.title,
      }),
    }),
  ];
  return {
    state: {
      interpretation: { interpretation },
      alternatives,
      review: { applicationGraphId: "database-row-id" },
    },
    openQuestions: [] as unknown[],
  };
}
type Fixture = ReturnType<typeof accepted>;
const familyFor = (fixture: Fixture) =>
  consumerFamilyFor(fixture as unknown as ProductJourneyController);
const planFor = (fixture: Fixture) => fixture.state.alternatives[0]!.plan;

describe("accepted consumer family admission", () => {
  for (const [definitionKey, family] of families) {
    it(`admits the actual ${family} projection using requirement identity`, () => {
      const fixture = accepted(definitionKey);
      expect(familyFor(fixture)).toBe(family);
      fixture.state.interpretation.interpretation.blueprint.title =
        "Different business title";
      planFor(fixture).planId = "untrusted-display-label";
      expect(familyFor(fixture)).toBe(family);
      const reordered = JSON.parse(
        JSON.stringify(fixture, (_key, value) =>
          value && typeof value === "object" && !Array.isArray(value)
            ? Object.fromEntries(Object.entries(value).reverse())
            : value,
        ),
      );
      expect(familyFor(reordered)).toBe(family);
    });

    const invalid: [string, (f: Fixture) => void][] = [
      [
        "material controller question",
        (f) => {
          f.openQuestions = [{}];
        },
      ],
      [
        "material spec question despite empty controller",
        (f) => {
          const { spec, blueprint } = f.state.interpretation.interpretation;
          spec.openQuestions.push({
            category: "authorization",
            question: "Who may access these records?",
          });
          blueprint.requirementChecksum = hashRequirementSpec(spec);
          planFor(f).requirementChecksum = blueprint.requirementChecksum;
        },
      ],
      [
        "malformed spec",
        (f) => {
          f.state.interpretation.interpretation = {
            ...f.state.interpretation.interpretation,
            spec: {} as never,
          };
        },
      ],
      [
        "malformed blueprint",
        (f) => {
          f.state.interpretation.interpretation = {
            ...f.state.interpretation.interpretation,
            blueprint: {} as never,
          };
        },
      ],
      [
        "blueprint checksum drift",
        (f) => {
          f.state.interpretation.interpretation.blueprint.requirementChecksum = `sha256:${"a".repeat(64)}`;
        },
      ],
      [
        "plan checksum drift",
        (f) => {
          planFor(f).requirementChecksum = `sha256:${"a".repeat(64)}`;
        },
      ],
      [
        "incompatible plan",
        (f) => {
          planFor(f).compatibility.result = "conflict";
        },
      ],
      [
        "missing standard",
        (f) => {
          f.state.alternatives = [];
        },
      ],
      [
        "minimal only",
        (f) => {
          f.state.alternatives = [
            { ...f.state.alternatives[0]!, key: "minimal" },
          ];
        },
      ],
      [
        "duplicate standard",
        (f) => {
          f.state.alternatives = [
            f.state.alternatives[0]!,
            f.state.alternatives[0]!,
          ];
        },
      ],
      [
        "third alternative",
        (f) => {
          f.state.alternatives = [
            f.state.alternatives[0]!,
            f.state.alternatives[0]!,
            f.state.alternatives[0]!,
          ];
        },
      ],
      [
        "unknown alternative",
        (f) => {
          f.state.alternatives = [
            { ...f.state.alternatives[0]!, key: "custom" as never },
          ];
        },
      ],
      [
        "empty label",
        (f) => {
          f.state.alternatives = [{ ...f.state.alternatives[0]!, label: "" }];
        },
      ],
      [
        "malformed alternative",
        (f) => {
          f.state.alternatives = [null] as never;
        },
      ],
      [
        "malformed minimal companion",
        (f) => {
          f.state.alternatives = [
            f.state.alternatives[0]!,
            { key: "minimal", label: "Minimal", plan: {} as never },
          ];
        },
      ],
      [
        "malformed plan",
        (f) => {
          f.state.alternatives = [
            { ...f.state.alternatives[0]!, plan: {} as never },
          ];
        },
      ],
      [
        "stale digest",
        (f) => {
          planFor(f).capabilityLocks[0]!.manifestDigest =
            `sha256:${"0".repeat(64)}`;
        },
      ],
      [
        "stale version",
        (f) => {
          planFor(f).capabilityLocks[0]!.version = "0.0.0";
        },
      ],
      [
        "missing lock",
        (f) => {
          planFor(f).capabilityLocks.pop();
        },
      ],
      [
        "duplicate lock",
        (f) => {
          planFor(f).capabilityLocks.push(planFor(f).capabilityLocks[0]!);
        },
      ],
      [
        "extra lock",
        (f) => {
          planFor(f).capabilityLocks.push({
            ...planFor(f).capabilityLocks[0]!,
            key: "extra.capability",
          });
        },
      ],
      [
        "reordered locks",
        (f) => {
          planFor(f).capabilityLocks.reverse();
        },
      ],
      [
        "missing binding",
        (f) => {
          planFor(f).graphBindings.pop();
        },
      ],
      [
        "duplicate binding",
        (f) => {
          planFor(f).graphBindings.push(planFor(f).graphBindings[0]!);
        },
      ],
      [
        "extra binding",
        (f) => {
          planFor(f).graphBindings.push({
            ...planFor(f).graphBindings[0]!,
            inputKey: "extra",
          });
        },
      ],
      [
        "reordered bindings",
        (f) => {
          planFor(f).graphBindings.reverse();
        },
      ],
      [
        "database row identity binding",
        (f) => {
          planFor(f).graphBindings.find(
            (b) => b.inputKey === "principalEntity",
          )!.graphSymbol = "graph.domain.database-row-id-principal";
        },
      ],
      [
        "near-family field",
        (f) => {
          f.state.interpretation.interpretation.blueprint.entities[0]!.fields[0]!.required = false;
        },
      ],
      [
        "labels alone",
        (f) => {
          f.state.interpretation.interpretation.blueprint.actors[0]!.permissions =
            [];
        },
      ],
    ];
    it.each(invalid)(`keeps ${family} manual for %s`, (_name, mutate) => {
      const fixture = accepted(definitionKey);
      mutate(fixture);
      expect(familyFor(fixture)).toBeNull();
    });
  }
});
