import {
  hashRequirementSpec,
  parseCompositionPlan,
  parseProductBlueprint,
  parseRequirementSpec,
  type CompositionPlanV1,
  type ProductBlueprintV1,
} from "@factory/graph";

import type { ProductJourneyController } from "./use-product-journey";

export type ConsumerFamily = "restaurant-ordering" | "approval" | "task";

const approvalLocks = new Map([
  ["core.crud", "1.0.1"],
  ["core.workflow", "1.0.1"],
  ["core.identity-policy", "1.0.0"],
  ["core.policy-declarations", "1.0.0"],
  ["core.audit", "1.0.2"],
  ["core.notification", "1.1.1"],
]);

const exactSet = (actual: readonly string[], expected: readonly string[]) =>
  actual.length === expected.length &&
  new Set(actual).size === actual.length &&
  expected.every((value) => actual.includes(value));

function isTask(
  blueprint: ProductBlueprintV1,
  plan: CompositionPlanV1,
  applicationId: string,
): boolean {
  if (
    blueprint.entities.length !== 1 ||
    blueprint.workflows.length !== 1 ||
    blueprint.actors.length !== 2 ||
    blueprint.pageIntents.length !== 5
  )
    return false;
  const entity = blueprint.entities[0],
    flow = blueprint.workflows[0];
  const expectedFields = [
    ["title", "text", true],
    ["description", "long-text", false],
    ["assignee", "text", true],
    ["dueDate", "date", true],
    ["priority", "enum", true],
  ] as const;
  if (
    entity.fields.length !== 5 ||
    !expectedFields.every(([key, type, required]) =>
      entity.fields.some(
        (f) =>
          f.key === key &&
          f.type === type &&
          f.required === required &&
          f.referenceTo === undefined &&
          (key === "priority"
            ? exactSet(f.options ?? [], ["low", "medium", "high"])
            : f.options === undefined),
      ),
    )
  )
    return false;
  if (
    flow.entityKey !== entity.key ||
    flow.states[0].key !== "not-started" ||
    !exactSet(
      flow.states.map((s) => s.key),
      ["not-started", "in-progress", "completed"],
    ) ||
    flow.transitions.length !== 3
  )
    return false;
  const member = blueprint.actors.find(
    (a) =>
      a.permissions.length === 1 &&
      a.permissions[0].entityKey === entity.key &&
      exactSet(a.permissions[0].actions, [
        "create",
        "read",
        "start",
        "complete",
        "reopen",
      ]),
  );
  const viewer = blueprint.actors.find(
    (a) =>
      a.permissions.length === 1 &&
      a.permissions[0].entityKey === entity.key &&
      exactSet(a.permissions[0].actions, ["read"]),
  );
  if (!member || !viewer || member.key === viewer.key) return false;
  if (
    ![
      ["start", "not-started", "in-progress"],
      ["complete", "in-progress", "completed"],
      ["reopen", "completed", "in-progress"],
    ].every(([key, from, to]) =>
      flow.transitions.some(
        (t) =>
          t.key === key &&
          t.from === from &&
          t.to === to &&
          t.actorKey === member.key,
      ),
    )
  )
    return false;
  if (
    !exactSet(
      blueprint.pageIntents.map((p) => p.intent),
      ["dashboard", "list", "form", "detail", "queue"],
    ) ||
    blueprint.pageIntents.some((p) => p.entityKey !== entity.key)
  )
    return false;
  const list = blueprint.pageIntents.find((p) => p.intent === "list")!;
  const first = blueprint.actors[0].key,
    second = blueprint.actors[1].key;
  const expected = [
    ["core.crud", "entityKey", `graph.domain.${entity.key}`],
    ["core.crud", "routeKey", `graph.page.${list.key}`],
    ["core.workflow", "flowKey", `graph.flow.${flow.key}`],
    [
      "core.identity-policy",
      "principalEntity",
      `graph.domain.${applicationId}-principal`,
    ],
    [
      "core.identity-policy",
      "sessionEntity",
      `graph.domain.${applicationId}-session`,
    ],
    ["core.identity-policy", "defaultRole", `graph.policy.${first}`],
    ["core.identity-policy", "authenticatedRole", `graph.policy.${second}`],
    ["core.audit", "actorRole", `graph.policy.${first}`],
    ["core.notification", "recipientRole", `graph.policy.${first}`],
  ];
  return exactSet(
    plan.graphBindings.map((b) =>
      JSON.stringify([b.capabilityKey, b.inputKey, b.graphSymbol]),
    ),
    expected.map((b) => JSON.stringify(b)),
  );
}

function standardPlan(
  journey: ProductJourneyController,
): CompositionPlanV1 | null {
  const alternatives = journey.state.alternatives;
  if (
    journey.openQuestions.length !== 0 ||
    !Array.isArray(alternatives) ||
    alternatives.length === 0 ||
    alternatives.length > 2
  )
    return null;
  const keys = new Set<string>();
  let standard: CompositionPlanV1 | null = null;
  for (const alternative of alternatives) {
    if (
      alternative === null ||
      typeof alternative !== "object" ||
      Array.isArray(alternative)
    )
      return null;
    const candidate = alternative as {
      readonly key?: unknown;
      readonly label?: unknown;
      readonly plan?: unknown;
    };
    if (
      (candidate.key !== "standard" && candidate.key !== "minimal") ||
      keys.has(candidate.key) ||
      typeof candidate.label !== "string" ||
      candidate.label.length === 0
    )
      return null;
    const plan = parseCompositionPlan(candidate.plan);
    keys.add(candidate.key);
    if (candidate.key === "standard") standard = plan;
  }
  return standard;
}

/** Only checksum-bound, unambiguous supported semantics remove manual handoffs. */
export function consumerFamilyFor(
  journey: ProductJourneyController,
): ConsumerFamily | null {
  try {
    const plan = standardPlan(journey);
    if (plan === null) return null;
    const interpretation = journey.state.interpretation?.interpretation;
    // Preserve the accepted Restaurant selector independently of V1 approval parsing.
    if (interpretation?.spec.productType === "restaurant-ordering")
      return "restaurant-ordering";
    const spec = parseRequirementSpec(interpretation?.spec);
    if (spec.productType !== undefined && spec.productType !== "workflow")
      return null;
    const blueprint = parseProductBlueprint(interpretation?.blueprint);
    const checksum = hashRequirementSpec(spec);
    if (
      blueprint.requirementChecksum !== checksum ||
      plan.requirementChecksum !== checksum ||
      plan.compatibility.result !== "compatible"
    )
      return null;
    if (
      plan.capabilityLocks.length !== approvalLocks.size ||
      new Set(plan.capabilityLocks.map(({ key }) => key)).size !==
        approvalLocks.size ||
      plan.capabilityLocks.some(
        ({ key, version }) => approvalLocks.get(key) !== version,
      )
    )
      return null;

    // Product composition creates Graph identity from the checksum-bound
    // requirement key; review.applicationGraphId addresses its database row.
    if (isTask(blueprint, plan, spec.requirementId)) return "task";

    const candidates = blueprint.workflows.filter((workflow) => {
      const grants = (
        actor: (typeof blueprint.actors)[number],
        actions: readonly string[],
      ) =>
        actor.permissions.some(
          (permission) =>
            permission.entityKey === workflow.entityKey &&
            actions.every((action) =>
              permission.actions.some((granted) => granted === action),
            ),
        );
      const requesters = blueprint.actors.filter((actor) =>
        grants(actor, ["create", "read", "submit"]),
      );
      const reviewers = blueprint.actors.filter((actor) =>
        grants(actor, ["read", "approve", "reject"]),
      );
      if (
        requesters.length !== 1 ||
        reviewers.length !== 1 ||
        requesters[0].key === reviewers[0].key
      )
        return false;
      const submit = workflow.transitions.find(({ key }) => key === "submit");
      const approve = workflow.transitions.find(({ key }) => key === "approve");
      const reject = workflow.transitions.find(({ key }) => key === "reject");
      return (
        submit !== undefined &&
        approve !== undefined &&
        reject !== undefined &&
        submit.actorKey === requesters[0].key &&
        submit.from !== submit.to &&
        approve.actorKey === reviewers[0].key &&
        reject.actorKey === reviewers[0].key &&
        approve.from === submit.to &&
        reject.from === submit.to &&
        approve.to !== reject.to &&
        approve.to !== submit.to &&
        reject.to !== submit.to
      );
    });
    if (candidates.length !== 1) return null;
    const workflow = candidates[0];
    const pages = blueprint.pageIntents.filter(
      ({ entityKey }) => entityKey === workflow.entityKey,
    );
    const lists = pages.filter(({ intent }) => intent === "list");
    if (
      !pages.some(({ intent }) => intent === "form") ||
      !pages.some(({ intent }) => intent === "queue") ||
      lists.length !== 1
    )
      return null;
    const matchesBinding = (
      capabilityKey: string,
      inputKey: string,
      graphSymbol: string,
    ) => {
      const bindings = plan.graphBindings.filter(
        (binding) =>
          binding.capabilityKey === capabilityKey &&
          binding.inputKey === inputKey,
      );
      return bindings.length === 1 && bindings[0].graphSymbol === graphSymbol;
    };
    return matchesBinding(
      "core.workflow",
      "flowKey",
      `graph.flow.${workflow.key}`,
    ) &&
      matchesBinding(
        "core.crud",
        "entityKey",
        `graph.domain.${workflow.entityKey}`,
      ) &&
      matchesBinding("core.crud", "routeKey", `graph.page.${lists[0].key}`)
      ? "approval"
      : null;
  } catch {
    return null;
  }
}
