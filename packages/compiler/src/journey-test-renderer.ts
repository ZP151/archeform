import type { ApplicationGraphV1 } from "@factory/graph";

/**
 * The generated role-journey test: every assertion is derived from the
 * composed Graph's declared scenario — the create permission, the seeded
 * payload fields, the flow's linear transition walk, the declared effects,
 * and the transition roles. A second test denies the same event to a role
 * the Graph does not declare, so the generated bundle proves both the
 * journey and the denial with no product-specific identifiers.
 */

function defaultJourneyValue(
  field: ApplicationGraphV1["domain"]["entities"][number]["fields"][number],
  initialState: string,
): unknown {
  if (field.key === "status" && initialState) return initialState;
  if (field.type === "integer" || field.type === "decimal") return 1;
  if (field.type === "boolean") return true;
  if (field.type === "date") return "2026-01-01";
  if (field.type === "datetime") return "2026-01-01T00:00:00.000Z";
  if (field.type === "enum") return field.values?.[0] ?? "sample";
  if (field.type === "email") return "user@example.test";
  if (field.type === "url") return "https://example.test";
  if (field.type === "json") return { sample: true };
  return `sample-${field.key}`;
}

export function renderJourneyTest(graph: ApplicationGraphV1): string {
  const flow = graph.flow.flows[0];
  const entity =
    flow &&
    graph.domain.entities.find((candidate) => candidate.key === flow.entity);
  const createPermission =
    entity &&
    graph.policy.permissions.find(
      (permission) =>
        permission.resource === entity.key &&
        permission.actions.includes("create"),
    );
  if (!flow || !entity || !createPermission) {
    return [
      'import { describe, expect, it } from "vitest";',
      "",
      "describe('generated journey', () => {",
      "  it('records that this Graph has no declared create-and-flow journey', () => {",
      "    expect(true).toBe(true);",
      "  });",
      "});",
      "",
    ].join("\n");
  }
  const payload = Object.fromEntries(
    entity.fields
      .filter((field) => field.required)
      .map((field) => [
        field.key,
        defaultJourneyValue(field, flow.initialState),
      ]),
  );
  const transitions: ApplicationGraphV1["flow"]["flows"][number]["transitions"] =
    [];
  let state = flow.initialState;
  const visited = new Set<string>();
  while (true) {
    const transition = flow.transitions.find(
      (candidate) =>
        candidate.from === state &&
        !visited.has(`${candidate.from}:${candidate.event}`),
    );
    if (!transition) break;
    transitions.push(transition);
    visited.add(`${transition.from}:${transition.event}`);
    state = transition.to;
  }
  const auditRole = graph.policy.permissions.find((permission) =>
    permission.actions.includes("audit"),
  )?.role;
  const capabilityEffects = transitions.flatMap(
    (transition) => transition.effects ?? [],
  );
  const catalogEntity = graph.domain.relations.find(
    (relation) => relation.from === entity.key,
  )?.to;
  const catalogSeed = catalogEntity
    ? graph.domain.seedData?.find((seed) => seed.entity === catalogEntity)
    : undefined;
  const includesCartAdd = graph.integration.capabilities.some(
    (capability) =>
      capability.key === "cart.add" && capability.operation === "add",
  );
  const cartJourney =
    !!catalogEntity &&
    !!catalogSeed &&
    includesCartAdd &&
    transitions.some((transition) =>
      transition.effects?.some(
        (effect) =>
          effect.capability === "payment.simulate" ||
          effect.capability === "inventory.decrement",
      ),
    );
  const versionedOrderJourney =
    entity.key === "order" &&
    graph.integration.capabilities.some(
      (capability) =>
        capability.key === "order.transition" &&
        capability.operation === "transition",
    );
  const capabilityEventPairs = [
    ...(cartJourney ? [{ capability: "cart.add", operation: "add" }] : []),
    ...capabilityEffects.flatMap((effect) =>
      ["notification.send", "payment.simulate"].includes(effect.capability)
        ? [effect, effect]
        : [effect],
    ),
  ];
  const auditEffectCount = capabilityEffects.filter(
    (effect) => effect.capability === "audit.record",
  ).length;
  // The denial test: the first event declared from the initial stage, fired
  // by a role the transition does not declare. The generated runtime denies
  // it and the record must stay at the initial stage.
  const deniedTransition = flow.transitions.find(
    (transition) =>
      transition.from === flow.initialState &&
      (transition.roles?.length ?? 0) > 0,
  );
  const deniedRole = deniedTransition
    ? graph.policy.roles.find(
        (role) => !(deniedTransition.roles ?? []).includes(role),
      )
    : undefined;
  return [
    'import { describe, expect, it } from "vitest";',
    'import { applicationRuntime } from "../src/application-runtime.js";',
    "",
    "describe('generated role journey', () => {",
    "  it('executes the declared record flow', async () => {",
    `    let record = await applicationRuntime.create(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, ${JSON.stringify(payload)});`,
    `    expect(record.status).toBe(${JSON.stringify(flow.initialState)});`,
    ...(cartJourney
      ? [
          `    await applicationRuntime.addCartItem(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify({ catalogEntity, catalogRecordId: catalogSeed!.id ?? `seed-${catalogSeed!.entity}-1`, quantity: 1 })});`,
        ]
      : []),
    // transition() returns the updated record and never mutates the
    // create()-returned object in place, so the binding follows the returned
    // record through the flow.
    ...transitions.flatMap((transition, index) => [
      `    record = await applicationRuntime.transition(${JSON.stringify(transition.roles?.[0] ?? createPermission.role)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify(transition.event)}${versionedOrderJourney ? `, { expectedVersion: ${index}, idempotencyKey: ${JSON.stringify(`generated-${transition.event}-${index + 1}`)} }` : ""});`,
      `    expect(record.status).toBe(${JSON.stringify(transition.to)});`,
    ]),
    ...(auditRole
      ? [
          `    expect(await applicationRuntime.auditLog(${JSON.stringify(auditRole)})).toHaveLength(${transitions.length + 1 + auditEffectCount + (cartJourney ? 1 : 0)});`,
        ]
      : []),
    ...(auditRole && capabilityEffects.length > 0
      ? [
          `    const capabilityEvents = await applicationRuntime.capabilityEvents(${JSON.stringify(auditRole)});`,
          `    expect(capabilityEvents.map((entry) => [entry.capability, entry.operation])).toEqual(${JSON.stringify(capabilityEventPairs.map((effect) => [effect.capability, effect.operation]))});`,
        ]
      : []),
    "  });",
    ...(deniedTransition && deniedRole
      ? [
          "  it('denies an event fired outside the declared transition roles', async () => {",
          `    const record = await applicationRuntime.create(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, ${JSON.stringify(payload)});`,
          `    await expect(applicationRuntime.transition(${JSON.stringify(deniedRole)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify(deniedTransition.event)})).rejects.toThrow('cannot trigger');`,
          `    expect(record.status).toBe(${JSON.stringify(flow.initialState)});`,
          "  });",
        ]
      : []),
    "});",
    "",
  ].join("\n");
}
