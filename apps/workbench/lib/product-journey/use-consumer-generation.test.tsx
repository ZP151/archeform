// @vitest-environment happy-dom

import { canonicalRestaurantMenuParameters } from "@factory/capabilities";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import {
  planProductAlternatives,
  type ProductPlanAlternative,
} from "@factory/capabilities/node";
import {
  createBlankApplicationDraft,
  hashRequirementSpec,
} from "@factory/graph";

import {
  useProductJourney,
  type ProductJourneyController,
} from "./use-product-journey";
import type {
  ReleaseJourneyController,
  ReleaseTarget,
} from "./use-release-journey";
import {
  useConsumerGeneration,
  type ConsumerGenerationController,
} from "./use-consumer-generation";
import { consumerFamilyFor } from "./consumer-family";
import { canonicalTeamTaskInterpretation } from "../../../../packages/adapters/src/requirements/task-definition-selection";
import { purchaseRequestInterpretationFixture } from "../../test/consumer-generation-fixture";

declare global {
  // eslint-disable-next-line no-var
  var __consumerGeneration: ConsumerGenerationController | undefined;
  // eslint-disable-next-line no-var
  var __freshJourney: ProductJourneyController | undefined;
}

const TARGET: ReleaseTarget = {
  applicationGraphId: "restaurant-ordering",
  draftRevisionId: "draft-restaurant-r2",
};

let validAlternatives: readonly ProductPlanAlternative[] = [];
let expenseInterpretation: Awaited<
  ReturnType<FixtureRequirementInterpreter["interpret"]>
>;

function journeyFor(
  overrides: Partial<ProductJourneyController["state"]> = {},
): ProductJourneyController {
  return {
    state: {
      kind: "product-journey",
      stage: "planning",
      brief: "Build a restaurant ordering application.",
      answers: {},
      interpretationCycles: 1,
      interpretation: {
        interpretation: { spec: { productType: "restaurant-ordering" } },
      },
      review: {
        id: "review-restaurant",
        applicationGraphId: "restaurant-ordering",
        status: "planning",
        requirementChecksum: "sha256:requirement",
        draftBaseChecksum: "sha256:base",
      },
      alternatives: validAlternatives,
      selectedAlternativeKey: null,
      diffChecksum: null,
      failure: null,
      error: null,
      ...overrides,
    } as ProductJourneyController["state"],
    busy: false,
    briefDraft: "Build a restaurant ordering application.",
    setBriefDraft: vi.fn(),
    answers: {},
    setAnswer: vi.fn(),
    openQuestions: [],
    blueprintTitle: "Restaurant ordering",
    planAlternatives: null,
    submitBrief: vi.fn(),
    answerQuestions: vi.fn(),
    createProduct: vi.fn(),
    chooseAlternative: vi.fn().mockResolvedValue(undefined),
    applyProduct: vi.fn(),
    reset: vi.fn(),
  };
}

function releaseFor(
  overrides: Partial<ReleaseJourneyController> = {},
): ReleaseJourneyController {
  return {
    release: {
      phase: "publishing",
      applicationGraphId: TARGET.applicationGraphId,
      draftRevisionId: TARGET.draftRevisionId,
    },
    busy: false,
    canPublish: true,
    canCompile: false,
    canVerify: false,
    canPreview: false,
    canCleanup: false,
    canApproveDraftDiff: false,
    canReset: false,
    approvalError: null,
    publishRelease: vi.fn(),
    compileRelease: vi.fn(),
    verifyRelease: vi.fn(),
    previewRelease: vi.fn(),
    cleanupRelease: vi.fn(),
    approveDraftDiff: vi.fn(),
    resetRelease: vi.fn().mockResolvedValue("resumed"),
    ...overrides,
  } as ReleaseJourneyController;
}

function Harness({
  journey,
  release,
  applyComposedProduct,
}: {
  readonly journey: ProductJourneyController;
  readonly release: ReleaseJourneyController;
  readonly applyComposedProduct: () => Promise<ReleaseTarget | null>;
}) {
  globalThis.__consumerGeneration = useConsumerGeneration({
    journey,
    release,
    applyComposedProduct,
  });
  return null;
}

function FreshDescribeHarness({
  release,
  applyComposedProduct,
}: {
  readonly release: ReleaseJourneyController;
  readonly applyComposedProduct: () => Promise<ReleaseTarget | null>;
}) {
  const journey = useProductJourney("http://control-plane.test");
  globalThis.__freshJourney = journey;
  globalThis.__consumerGeneration = useConsumerGeneration({
    journey,
    release,
    applyComposedProduct,
  });
  return null;
}

async function waitFor(assertion: () => void): Promise<void> {
  let latestError: unknown;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      latestError = error;
    }
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }
  throw latestError;
}

describe("useConsumerGeneration", () => {
  function taskJourney(
    mutate?: (
      interpretation: ReturnType<typeof canonicalTeamTaskInterpretation>,
      plan: ProductPlanAlternative["plan"],
    ) => void,
  ) {
    const interpretation = canonicalTeamTaskInterpretation();
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: "Shared board",
    });
    const alternatives = structuredClone(
      planProductAlternatives({
        requirement: interpretation.spec,
        blueprint: interpretation.blueprint,
        baseDraft,
      }),
    );
    mutate?.(interpretation, alternatives[0].plan);
    return journeyFor({
      interpretation: {
        apiVersion: "factory.requirement-interpretation-result/v1",
        interpretation,
        businessParameters: null,
      },
      alternatives,
      review: {
        ...journeyFor().state.review!,
        applicationGraphId: "cmstoredapplicationrowidentity",
      },
    });
  }
  it("recognizes the exact Task composition and announces Task delivery", async () => {
    const journey = taskJourney();
    expect(consumerFamilyFor(journey)).toBe("task");
    await act(async () =>
      root.render(
        <Harness
          journey={journey}
          release={releaseFor()}
          applyComposedProduct={vi.fn()}
        />,
      ),
    );
    expect(globalThis.__consumerGeneration?.family).toBe("task");
    expect(globalThis.__consumerGeneration?.status).toContain("Task");
    expect(journey.chooseAlternative).toHaveBeenCalledWith("standard");
  });
  it("rejects identity bindings aimed at the database row instead of the Graph requirement key", () => {
    const journey = taskJourney((_, plan) => {
      for (const binding of plan.graphBindings) {
        if (binding.inputKey === "principalEntity")
          binding.graphSymbol =
            "graph.domain.cmstoredapplicationrowidentity-principal";
        if (binding.inputKey === "sessionEntity")
          binding.graphSymbol =
            "graph.domain.cmstoredapplicationrowidentity-session";
      }
    });
    expect(consumerFamilyFor(journey)).toBeNull();
  });
  it("set-matches Task declarations, options, locks and bindings", () => {
    const journey = taskJourney((i, p) => {
      i.blueprint.entities[0].fields.reverse();
      i.blueprint.entities[0].fields
        .find((f) => f.key === "priority")!
        .options!.reverse();
      i.blueprint.actors.forEach((a) => a.permissions[0].actions.reverse());
      i.blueprint.pageIntents.reverse();
      i.blueprint.workflows[0].transitions.reverse();
      p.capabilityLocks.reverse();
      p.graphBindings.reverse();
    });
    expect(consumerFamilyFor(journey)).toBe("task");
  });
  it("accepts renamed Task symbols and reversed actors only with recomputed planner bindings", () => {
    const journey = taskJourney((i, p) => {
      const mapping: Record<string, string> = {
        task: "work-item",
        "task-lifecycle": "work-status",
        member: "collaborator",
        viewer: "reader",
      };
      i.blueprint.entities[0].key = "work-item";
      i.blueprint.entities[0].label = "Work item";
      for (const actor of i.blueprint.actors) {
        actor.key = mapping[actor.key];
        actor.label = "Display " + actor.key;
        actor.permissions[0].entityKey = "work-item";
      }
      i.blueprint.actors.reverse();
      for (const journey of i.blueprint.acceptanceJourneys)
        for (const step of journey.steps)
          step.actorKey = mapping[step.actorKey];
      const flow = i.blueprint.workflows[0];
      flow.key = "work-status";
      flow.entityKey = "work-item";
      flow.label = "Progress";
      flow.transitions.forEach((t) => (t.actorKey = "collaborator"));
      flow.states.splice(1, 2, flow.states[2], flow.states[1]);
      for (const page of i.blueprint.pageIntents) {
        mapping[page.key] = "page-" + page.intent;
        page.key = mapping[page.key];
        page.entityKey = "work-item";
        page.label = "Display " + page.intent;
      }
      for (const b of p.graphBindings) {
        const parts = b.graphSymbol.split(".");
        parts[2] = mapping[parts[2]] ?? parts[2];
        b.graphSymbol = parts.join(".");
        if (["defaultRole", "actorRole", "recipientRole"].includes(b.inputKey))
          b.graphSymbol = "graph.policy.reader";
        if (b.inputKey === "authenticatedRole")
          b.graphSymbol = "graph.policy.collaborator";
      }
    });
    expect(consumerFamilyFor(journey)).toBe("task");
  });
  it.each([
    ["field", (i: any) => i.blueprint.entities[0].fields.pop()],
    [
      "extra field",
      (i: any) =>
        i.blueprint.entities[0].fields.push({
          key: "notes",
          label: "Notes",
          type: "text",
          required: false,
        }),
    ],
    [
      "requiredness",
      (i: any) => (i.blueprint.entities[0].fields[0].required = false),
    ],
    [
      "options",
      (i: any) => i.blueprint.entities[0].fields[4].options.push("urgent"),
    ],
    ["actor", (i: any) => i.blueprint.actors.pop()],
    [
      "grant",
      (i: any) => i.blueprint.actors[0].permissions[0].actions.push("update"),
    ],
    [
      "viewer grant",
      (i: any) => i.blueprint.actors[1].permissions[0].actions.push("complete"),
    ],
    ["page", (i: any) => i.blueprint.pageIntents.pop()],
    ["transition", (i: any) => i.blueprint.workflows[0].transitions.pop()],
    ["initial", (i: any) => i.blueprint.workflows[0].states.reverse()],
    [
      "checksum",
      (i: any) =>
        (i.blueprint.requirementChecksum = "sha256:" + "0".repeat(64)),
    ],
    ["lock", (_: any, p: any): unknown => p.capabilityLocks.pop()],
    [
      "duplicate lock",
      (_: any, p: any): unknown =>
        (p.capabilityLocks[0] = p.capabilityLocks[1]),
    ],
    ["binding", (_: any, p: any): unknown => p.graphBindings.pop()],
    [
      "duplicate binding",
      (_: any, p: any): unknown => p.graphBindings.push(p.graphBindings[0]),
    ],
    [
      "binding target",
      (_: any, p: any): unknown =>
        (p.graphBindings[0].graphSymbol = "graph.domain.wrong"),
    ],
  ] as const)("rejects independently falsified Task %s", (_, mutate) => {
    expect(consumerFamilyFor(taskJourney(mutate))).toBeNull();
  });
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("React", React);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    expenseInterpretation = await new FixtureRequirementInterpreter().interpret(
      {
        brief:
          "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
        answers: {},
      },
    );
    const fixture = expenseInterpretation.interpretation;
    validAlternatives = planProductAlternatives({
      requirement: fixture.spec,
      blueprint: fixture.blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: fixture.spec.requirementId,
        workspaceId: "local-workspace",
        name: "Restaurant ordering",
      }),
    });
  });

  it("selects the canonical approval standard plan and retains its family through journey reset", async () => {
    const journey = journeyFor({ interpretation: expenseInterpretation });
    const approvalTarget = {
      applicationGraphId: "approval-application",
      draftRevisionId: "draft-approval-r2",
    };
    let release = releaseFor({
      release: {
        ...releaseFor().release!,
        phase: "publishing",
        ...approvalTarget,
      },
    });
    const applyComposedProduct = vi.fn().mockResolvedValue(approvalTarget);
    const render = async (next: ProductJourneyController) => {
      await act(async () => {
        root.render(
          <Harness
            journey={next}
            release={release}
            applyComposedProduct={applyComposedProduct}
          />,
        );
      });
    };
    await render(journey);
    expect(journey.chooseAlternative).toHaveBeenCalledTimes(1);
    expect(journey.chooseAlternative).toHaveBeenCalledWith("standard");
    await render({
      ...journey,
      state: {
        ...journey.state,
        stage: "reviewing",
        selectedAlternativeKey: "standard",
      },
    });
    expect(applyComposedProduct).toHaveBeenCalledTimes(1);
    expect(applyComposedProduct).toHaveBeenCalledWith({ resetJourney: false });
    await render(
      journeyFor({
        stage: "brief",
        interpretation: null,
        review: null,
        alternatives: null,
      }),
    );
    expect(globalThis.__consumerGeneration).toMatchObject({
      family: "approval",
      active: true,
      status: "Preparing your Approval app…",
    });
    expect(release.publishRelease).toHaveBeenCalledTimes(1);
    const idle = journeyFor({
      stage: "brief",
      interpretation: null,
      review: null,
      alternatives: null,
    });
    for (const phase of [
      "compiling",
      "verifying",
      "starting-preview",
      "preview",
    ] as const) {
      release = {
        ...release,
        release: {
          ...release.release!,
          phase,
          previewUrl: "http://127.0.0.1:3210",
          evidenceSummary: { steps: 3, passed: 3, failed: 0 },
        },
      };
      await render(idle);
      await render(idle);
    }
    expect(release.compileRelease).toHaveBeenCalledTimes(1);
    expect(release.verifyRelease).toHaveBeenCalledTimes(1);
    expect(release.previewRelease).toHaveBeenCalledTimes(1);
    expect(globalThis.__consumerGeneration).toMatchObject({
      family: "approval",
      readyUrl: "http://127.0.0.1:3210",
      status: "Your local Approval app is ready.",
    });
  });

  afterEach(() => {
    globalThis.__consumerGeneration = undefined;
    globalThis.__freshJourney = undefined;
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("automatically assembles a registered Purchase definition through the existing approval family", async () => {
    const interpretation = await purchaseRequestInterpretationFixture();
    const { spec, blueprint } = interpretation.interpretation;
    const alternatives = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: spec.requirementId,
        workspaceId: "local-workspace",
        name: blueprint.title,
      }),
    });
    const journey = journeyFor({ interpretation, alternatives });
    expect(consumerFamilyFor(journey)).toBe("approval");
    const applyComposedProduct = vi.fn().mockResolvedValue(TARGET);
    const release = releaseFor();
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={release}
          applyComposedProduct={applyComposedProduct}
        />,
      );
    });
    expect(journey.chooseAlternative).toHaveBeenCalledTimes(1);
    expect(journey.chooseAlternative).toHaveBeenCalledWith("standard");
    await act(async () => {
      root.render(
        <Harness
          journey={{
            ...journey,
            state: {
              ...journey.state,
              stage: "reviewing",
              selectedAlternativeKey: "standard",
            },
          }}
          release={release}
          applyComposedProduct={applyComposedProduct}
        />,
      );
    });
    expect(applyComposedProduct).toHaveBeenCalledTimes(1);
    expect(applyComposedProduct).toHaveBeenCalledWith({
      resetJourney: false,
    });
    expect(globalThis.__consumerGeneration?.family).toBe("approval");
  });

  it("keeps a Purchase privacy question outside automatic delivery", async () => {
    const interpretation = await purchaseRequestInterpretationFixture(
      "private-purchase",
      true,
    );
    const { spec, blueprint } = interpretation.interpretation;
    const alternatives = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: spec.requirementId,
        workspaceId: "local-workspace",
        name: blueprint.title,
      }),
    });
    expect(spec.openQuestions).toHaveLength(1);
    const journey = {
      ...journeyFor({ interpretation, alternatives, stage: "clarifying" }),
      openQuestions: interpretation.interpretation.clarifications.flatMap(
        (group) => group.questions,
      ),
    };
    expect(consumerFamilyFor(journey)).toBeNull();
    const applyComposedProduct = vi.fn();
    const release = releaseFor();
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={release}
          applyComposedProduct={applyComposedProduct}
        />,
      );
    });
    expect(journey.chooseAlternative).not.toHaveBeenCalled();
    expect(applyComposedProduct).not.toHaveBeenCalled();
    expect(release.publishRelease).not.toHaveBeenCalled();
  });

  it("rejects incomplete, ambiguous, or unbound approval semantics without consulting business names", () => {
    const fixture = () => ({
      interpretation: structuredClone(expenseInterpretation),
      alternatives: structuredClone(
        validAlternatives,
      ) as ProductPlanAlternative[],
    });
    type Fixture = ReturnType<typeof fixture>;
    const setProductType = (
      value: Fixture,
      productType: "commerce" | "custom",
    ) => {
      value.interpretation.interpretation.spec.productType = productType;
      const checksum = hashRequirementSpec(
        value.interpretation.interpretation.spec,
      );
      value.interpretation.interpretation.blueprint.requirementChecksum =
        checksum;
      value.alternatives[0].plan.requirementChecksum = checksum;
    };
    const cases: readonly [string, (value: Fixture) => void][] = [
      [
        "commerce",
        (v) => {
          setProductType(v, "commerce");
        },
      ],
      [
        "custom",
        (v) => {
          setProductType(v, "custom");
        },
      ],
      [
        "malformed spec",
        (v) => {
          v.interpretation = {
            ...v.interpretation,
            interpretation: {
              ...v.interpretation.interpretation,
              spec: {} as never,
            },
          };
        },
      ],
      [
        "malformed blueprint",
        (v) => {
          v.interpretation = {
            ...v.interpretation,
            interpretation: {
              ...v.interpretation.interpretation,
              blueprint: {} as never,
            },
          };
        },
      ],
      [
        "blueprint checksum",
        (v) => {
          v.interpretation.interpretation.blueprint.requirementChecksum = `sha256:${"a".repeat(64)}`;
        },
      ],
      [
        "plan checksum",
        (v) => {
          v.alternatives[0].plan.requirementChecksum = `sha256:${"a".repeat(64)}`;
        },
      ],
      [
        "incompatible plan",
        (v) => {
          v.alternatives[0].plan.compatibility.result = "conflict";
        },
      ],
      [
        "missing standard",
        (v) => {
          v.alternatives = v.alternatives.filter(
            ({ key }) => key !== "standard",
          );
        },
      ],
      [
        "duplicate standard",
        (v) => {
          v.alternatives = [v.alternatives[0], v.alternatives[0]];
        },
      ],
      [
        "malformed alternative",
        (v) => {
          v.alternatives = [null] as never;
        },
      ],
      [
        "missing lock",
        (v) => {
          v.alternatives[0].plan.capabilityLocks.pop();
        },
      ],
      [
        "duplicate lock",
        (v) => {
          v.alternatives[0].plan.capabilityLocks[1] =
            v.alternatives[0].plan.capabilityLocks[0];
        },
      ],
      [
        "wrong lock version",
        (v) => {
          v.alternatives[0].plan.capabilityLocks[0].version = "9.0.0";
        },
      ],
      [
        "unrelated approvals asset",
        (v) => {
          v.alternatives[0].plan.capabilityLocks.push({
            ...v.alternatives[0].plan.capabilityLocks[0],
            key: "core.approvals",
            version: "1.0.0",
          });
        },
      ],
      ...(["read", "submit", "create"] as const).map(
        (action): [string, (v: Fixture) => void] => [
          `missing requester ${action}`,
          (v) => {
            const p =
              v.interpretation.interpretation.blueprint.actors[0]
                .permissions[0];
            p.actions = p.actions.filter((a) => a !== action);
          },
        ],
      ),
      ...(["read", "approve", "reject"] as const).map(
        (action): [string, (v: Fixture) => void] => [
          `missing reviewer ${action}`,
          (v) => {
            const p =
              v.interpretation.interpretation.blueprint.actors[1]
                .permissions[0];
            p.actions = p.actions.filter((a) => a !== action);
          },
        ],
      ),
      [
        "same requester and reviewer",
        (v) => {
          const b = v.interpretation.interpretation.blueprint;
          b.actors[0].permissions[0].actions.push("approve", "reject");
          b.actors[1].permissions[0].actions = ["read"];
          b.workflows[0].transitions.forEach((t) => {
            t.actorKey = b.actors[0].key;
          });
        },
      ],
      [
        "ambiguous requester",
        (v) => {
          const b = v.interpretation.interpretation.blueprint;
          b.actors.push({ ...b.actors[0], key: "another-requester" });
        },
      ],
      [
        "ambiguous reviewer",
        (v) => {
          const b = v.interpretation.interpretation.blueprint;
          b.actors.push({ ...b.actors[1], key: "another-reviewer" });
        },
      ],
      [
        "ambiguous workflow",
        (v) => {
          const b = v.interpretation.interpretation.blueprint;
          b.workflows.push({ ...b.workflows[0], key: "another-approval" });
        },
      ],
      [
        "missing decision transition",
        (v) => {
          const w = v.interpretation.interpretation.blueprint.workflows[0];
          w.transitions = w.transitions.filter(({ key }) => key !== "reject");
        },
      ],
      [
        "different review states",
        (v) => {
          v.interpretation.interpretation.blueprint.workflows[0].transitions[2].from =
            "draft";
        },
      ],
      [
        "same outcome",
        (v) => {
          const w = v.interpretation.interpretation.blueprint.workflows[0];
          w.transitions[2].to = w.transitions[1].to;
        },
      ],
      ...(["form", "queue", "list"] as const).map(
        (intent): [string, (v: Fixture) => void] => [
          `missing ${intent} surface`,
          (v) => {
            const b = v.interpretation.interpretation.blueprint;
            b.pageIntents = b.pageIntents.filter((p) => p.intent !== intent);
          },
        ],
      ),
      [
        "unbound form",
        (v) => {
          delete v.interpretation.interpretation.blueprint.pageIntents.find(
            ({ intent }) => intent === "form",
          )!.entityKey;
        },
      ],
      [
        "misbound queue",
        (v) => {
          v.interpretation.interpretation.blueprint.pageIntents.find(
            ({ intent }) => intent === "queue",
          )!.entityKey = "employee";
        },
      ],
      [
        "ambiguous list",
        (v) => {
          const b = v.interpretation.interpretation.blueprint;
          b.pageIntents.push({
            ...b.pageIntents.find(({ intent }) => intent === "list")!,
            key: "another-list",
          });
        },
      ],
      ...(["flowKey", "entityKey", "routeKey"] as const).flatMap(
        (key): [string, (v: Fixture) => void][] => [
          [
            `missing ${key} binding`,
            (v) => {
              v.alternatives[0].plan.graphBindings =
                v.alternatives[0].plan.graphBindings.filter(
                  ({ inputKey }) => inputKey !== key,
                );
            },
          ],
          [
            `wrong ${key} binding`,
            (v) => {
              const binding = v.alternatives[0].plan.graphBindings.find(
                ({ inputKey }) => inputKey === key,
              )!;
              binding.graphSymbol = binding.graphSymbol.replace(
                /[^.]+$/,
                "unrelated",
              );
            },
          ],
          [
            `duplicate ${key} binding`,
            (v) => {
              v.alternatives[0].plan.graphBindings.push(
                v.alternatives[0].plan.graphBindings.find(
                  ({ inputKey }) => inputKey === key,
                )!,
              );
            },
          ],
        ],
      ),
    ];
    for (const [label, mutate] of cases) {
      const value = fixture();
      mutate(value);
      expect(consumerFamilyFor(journeyFor(value)), label).toBeNull();
    }
    const renamed = fixture();
    renamed.interpretation.interpretation.spec.requirementId =
      "unrelated-product";
    renamed.interpretation.interpretation.spec.productType = "workflow";
    renamed.interpretation.interpretation.blueprint.title =
      "Unrelated business title";
    const checksum = hashRequirementSpec(
      renamed.interpretation.interpretation.spec,
    );
    renamed.interpretation.interpretation.blueprint.requirementChecksum =
      checksum;
    renamed.alternatives[0].plan.requirementChecksum = checksum;
    renamed.interpretation.interpretation.blueprint.entities.reverse();
    renamed.interpretation.interpretation.blueprint.actors.reverse();
    renamed.interpretation.interpretation.blueprint.pageIntents.reverse();
    expect(consumerFamilyFor(journeyFor(renamed))).toBe("approval");
    const material = journeyFor(fixture());
    expect(
      consumerFamilyFor({ ...material, openQuestions: [{}] as never }),
    ).toBeNull();
  });

  it("keeps the complete appointment fixture in manual review", async () => {
    const interpretation = await new FixtureRequirementInterpreter().interpret({
      brief:
        "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.",
      answers: {},
    });
    const { spec, blueprint } = interpretation.interpretation;
    const alternatives = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: spec.requirementId,
        workspaceId: "local-workspace",
        name: "Appointment booking",
      }),
    });
    expect(
      consumerFamilyFor(journeyFor({ interpretation, alternatives })),
    ).toBeNull();
  });

  it("keeps an approval manual opt-out from selecting or applying a plan", async () => {
    const release = releaseFor();
    const applyComposedProduct = vi.fn();
    await act(async () => {
      root.render(
        <Harness
          journey={journeyFor({
            stage: "brief",
            interpretation: null,
            review: null,
          })}
          release={release}
          applyComposedProduct={applyComposedProduct}
        />,
      );
    });
    act(() => globalThis.__consumerGeneration?.setManualReview(true));
    const journey = journeyFor({ interpretation: expenseInterpretation });
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={release}
          applyComposedProduct={applyComposedProduct}
        />,
      );
    });
    expect(journey.chooseAlternative).not.toHaveBeenCalled();
    expect(applyComposedProduct).not.toHaveBeenCalled();
    expect(globalThis.__consumerGeneration?.active).toBe(false);
  });

  it("selects the one standard Restaurant alternative once before applying the fresh Draft", async () => {
    const journey = journeyFor();
    const applyComposedProduct = vi.fn().mockResolvedValue(TARGET);

    await act(async () => {
      root.render(
        <React.StrictMode>
          <Harness
            journey={journey}
            release={releaseFor()}
            applyComposedProduct={applyComposedProduct}
          />
        </React.StrictMode>,
      );
      await Promise.resolve();
    });

    expect(journey.chooseAlternative).toHaveBeenCalledTimes(1);
    expect(journey.chooseAlternative).toHaveBeenCalledWith("standard");
    expect(applyComposedProduct).not.toHaveBeenCalled();
    expect(globalThis.__consumerGeneration?.active).toBe(true);
    expect(globalThis.__consumerGeneration?.status).toBe(
      "Preparing your Restaurant app…",
    );
  });

  it("waits for product planning to become idle before consuming its selection latch", async () => {
    const journey = journeyFor();
    const mutableJourney = journey as { busy: boolean };
    mutableJourney.busy = true;
    const applyComposedProduct = vi.fn().mockResolvedValue(TARGET);

    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={releaseFor()}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    expect(journey.chooseAlternative).not.toHaveBeenCalled();

    mutableJourney.busy = false;
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={releaseFor()}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    expect(journey.chooseAlternative).toHaveBeenCalledTimes(1);
    expect(journey.chooseAlternative).toHaveBeenCalledWith("standard");
  });

  it("keeps generic, missing-standard, and duplicate-standard plans in manual review", async () => {
    const excludedJourneys = [
      journeyFor({
        interpretation: {
          interpretation: { spec: { productType: "expense-approval" } },
        } as never,
      }),
      journeyFor({ alternatives: [] }),
      journeyFor({ alternatives: { malformed: true } as never }),
      journeyFor({ alternatives: [null] as never }),
      journeyFor({
        alternatives: [{ key: "standard" }, { key: "standard" }] as never,
      }),
      journeyFor({
        alternatives: [
          validAlternatives[0],
          { ...validAlternatives[0], key: "unexpected" },
        ] as never,
      }),
      journeyFor({
        alternatives: [
          { ...validAlternatives[0], plan: { apiVersion: "invalid" } },
        ] as never,
      }),
    ];

    for (const journey of excludedJourneys) {
      const applyComposedProduct = vi.fn().mockResolvedValue(TARGET);
      await act(async () => {
        root.render(
          <Harness
            journey={journey}
            release={releaseFor()}
            applyComposedProduct={applyComposedProduct}
          />,
        );
        await Promise.resolve();
      });
      expect(journey.chooseAlternative).not.toHaveBeenCalled();
      expect(applyComposedProduct).not.toHaveBeenCalled();
    }
  });

  it("does not advance release after an unmounted consumer apply resolves", async () => {
    const journey = journeyFor({
      stage: "reviewing",
      selectedAlternativeKey: "standard",
    });
    let resolveTarget: ((target: ReleaseTarget) => void) | undefined;
    const applyComposedProduct = vi.fn(
      () =>
        new Promise<ReleaseTarget>((resolve) => {
          resolveTarget = resolve;
        }),
    );
    const release = releaseFor();
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={release}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    expect(applyComposedProduct).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    await act(async () => {
      resolveTarget?.(TARGET);
      await Promise.resolve();
    });

    expect(release.publishRelease).not.toHaveBeenCalled();
  });

  it("pauses a failed Draft adoption without permanently consuming the session", async () => {
    const journey = journeyFor({
      stage: "reviewing",
      selectedAlternativeKey: "standard",
    });
    const applyComposedProduct = vi.fn().mockResolvedValue(null);
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={releaseFor()}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(globalThis.__consumerGeneration?.status).toBe(
        "Delivery paused. Start a new Restaurant request to try again.",
      );
    });
    expect(applyComposedProduct).toHaveBeenCalledTimes(1);

    await act(async () => globalThis.__consumerGeneration?.retry());
    expect(journey.reset).toHaveBeenCalledTimes(1);
  });

  it("returns to Describe when immutable creation cannot be safely retried", async () => {
    const journey = journeyFor({
      stage: "reviewing",
      selectedAlternativeKey: "standard",
    });
    const failed = releaseFor({
      release: { ...releaseFor().release!, phase: "failed" },
      resetRelease: vi.fn().mockResolvedValue("start-over"),
    });
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={failed}
          applyComposedProduct={vi.fn().mockResolvedValue(TARGET)}
        />,
      );
    });
    expect(globalThis.__consumerGeneration?.active).toBe(true);
    // Model the real journey reset after Draft adoption.
    const idleJourney = {
      ...journey,
      state: {
        ...journey.state,
        stage: "brief" as const,
        review: null,
        interpretation: null,
        alternatives: null,
      },
    };
    await act(async () => {
      root.render(
        <Harness
          journey={idleJourney}
          release={failed}
          applyComposedProduct={vi.fn().mockResolvedValue(TARGET)}
        />,
      );
    });
    await act(async () => globalThis.__consumerGeneration?.retry());
    expect(failed.resetRelease).toHaveBeenCalledTimes(1);
    expect(journey.reset).toHaveBeenCalledTimes(2);
    expect(globalThis.__consumerGeneration?.active).toBe(false);
    expect(failed.publishRelease).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "starts from this tab's Describe submission and retains supplied menu %s",
    async (provided) => {
      const businessParameters = provided
        ? {
            apiVersion: "factory.restaurant-menu-parameters/v1",
            mode: "provided",
            currency: "USD",
            items: [{ name: "Soup", description: null, priceMinor: 599 }],
          }
        : canonicalRestaurantMenuParameters();
      const interpreter = new FixtureRequirementInterpreter();
      const fixture = (
        await interpreter.interpret({
          brief:
            "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
          answers: {},
        })
      ).interpretation;
      const requirement = {
        ...fixture.spec,
        productType: "restaurant-ordering",
      } as typeof fixture.spec;
      const interpretation = {
        ...fixture,
        spec: requirement,
        blueprint: {
          ...fixture.blueprint,
          requirementChecksum: hashRequirementSpec(requirement),
        },
      };
      const alternatives = planProductAlternatives({
        requirement: fixture.spec,
        blueprint: fixture.blueprint,
        baseDraft: createBlankApplicationDraft({
          applicationId: fixture.spec.requirementId,
          workspaceId: "local-workspace",
          name: "Restaurant ordering",
        }),
      }).map(({ key, label, plan }) => ({ key, label, plan }));
      const calls: string[] = [];
      const choiceBodies: unknown[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input), "http://workbench.test");
          const method = init?.method ?? "GET";
          calls.push(`${method} ${url.pathname}`);
          const json = (value: unknown) =>
            new Response(JSON.stringify(value), {
              headers: { "content-type": "application/json" },
            });
          if (url.pathname === "/api/requirements/interpret") {
            return json({
              apiVersion: "factory.requirement-interpretation-result/v1",
              interpretation,
              businessParameters,
            });
          }
          if (method === "POST" && url.pathname === "/product/requirements") {
            const request = JSON.parse(String(init?.body));
            if (provided)
              expect(request.businessParameters).toEqual(businessParameters);
            else
              expect(Object.hasOwn(request, "businessParameters")).toBe(false);
            return json({
              review: {
                id: "review-restaurant",
                applicationGraphId: "restaurant-ordering",
                status: "planning",
                requirementChecksum: hashRequirementSpec(interpretation.spec),
                draftBaseChecksum: "sha256:base",
              },
            });
          }
          if (method === "POST" && url.pathname.endsWith("/plan")) {
            return json({ alternatives });
          }
          if (method === "POST" && url.pathname.endsWith("/choices")) {
            choiceBodies.push(JSON.parse(String(init?.body ?? "{}")));
            return json({ checksum: "sha256:restaurant-diff" });
          }
          if (method === "POST" && url.pathname.endsWith("/apply")) {
            return json({
              draftRevision: {
                id: TARGET.draftRevisionId,
                revisionNumber: 2,
                graph: createBlankApplicationDraft({
                  applicationId: "restaurant-ordering",
                  workspaceId: "local-workspace",
                  name: "Restaurant ordering",
                }).graph,
              },
              review: {
                applicationGraphId: TARGET.applicationGraphId,
                status: "applied",
              },
            });
          }
          return new Response(JSON.stringify({ error: "Unexpected route." }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }),
      );
      const applyComposedProduct = vi.fn(async () => {
        await globalThis.__freshJourney?.applyProduct();
        return TARGET;
      });

      await act(async () => {
        root.render(
          <FreshDescribeHarness
            release={releaseFor()}
            applyComposedProduct={applyComposedProduct}
          />,
        );
      });
      act(() => {
        globalThis.__freshJourney?.setBriefDraft(
          "Build a restaurant ordering application.",
        );
      });
      await act(async () => {
        await globalThis.__freshJourney?.submitBrief();
      });
      await waitFor(() => {
        expect(globalThis.__freshJourney?.state.stage).toBe("brief");
        expect(applyComposedProduct).toHaveBeenCalledTimes(1);
      });

      expect(globalThis.__consumerGeneration?.suppliedMenu).toBe(provided);
      expect(calls).toEqual([
        "POST /api/requirements/interpret",
        "POST /product/requirements",
        "POST /product/requirements/review-restaurant/plan",
        "POST /product/requirements/review-restaurant/choices",
        "POST /product/requirements/review-restaurant/apply",
      ]);
      expect(choiceBodies).toEqual([{ alternativeKey: "standard" }]);
    },
  );
});
