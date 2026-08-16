import { describe, expect, it } from "vitest";

import * as browserGraph from "../src/browser.js";
import {
  applicationGraphV3Schema,
  assertApplicationGraphV3,
  hashApplicationGraphV3,
  type ApplicationGraphV3,
} from "../src/application-graph-v3.js";

function minimalHashVector(): Record<string, any> {
  return {
    apiVersion: "factory.application-graph/v3",
    metadata: {
      id: "hash-vector",
      workspaceId: "local-workspace",
      name: "Hash vector",
    },
    surfaces: [],
    page: { pages: [] },
    domain: { entities: [], relations: [] },
    policy: { roles: [], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: {
      theme: { mode: "light", tokens: {} },
      locales: ["en"],
      responsiveNavigation: [],
    },
    seedScenarios: [],
    journeys: [],
    fieldAuthorities: [],
    bindingPolicies: [],
  };
}

function validGraphV3(): Record<string, any> {
  return {
    apiVersion: "factory.application-graph/v3",
    metadata: {
      id: "restaurant-app",
      workspaceId: "local-workspace",
      name: "Maison Ember",
    },
    surfaces: [
      {
        apiVersion: "factory.application-surface/v1",
        key: "customer-mobile",
        label: "Customer",
        kind: "customer",
        audienceRoles: ["customer"],
        device: "mobile",
        entryPageKey: "home",
        navigation: {
          pattern: "bottom-tabs",
          items: [{ pageKey: "home", label: "Home", icon: "house" }],
        },
        responsive: { minimumWidth: 320, maximumContentWidth: 480 },
      },
    ],
    page: {
      pages: [
        {
          id: "home",
          route: "/",
          title: "Home",
          blocks: [
            {
              id: "order-summary",
              type: "order-summary",
              entity: "order",
              bindings: {
                total: "graph.domain.order.total",
                submit: "graph.flow.order.draft.submit.submitted",
                canAccept: "graph.policy.kitchen.order.accept",
              },
            },
          ],
          surfaceKey: "customer-mobile",
          screenIntent: {
            apiVersion: "factory.screen-intent/v1",
            key: "home",
            label: "Home",
            purpose: "discovery",
            primaryJourneyKeys: ["place-order"],
            entityKeys: ["order"],
            capabilityKeys: ["commerce.orders"],
            recipeKey: "restaurant-customer-home",
            preferredViewport: "mobile",
          },
          recipe: {
            key: "restaurant-customer-home",
            version: "1.0.0",
            regions: [{ key: "main", blockIds: ["order-summary"] }],
          },
        },
      ],
    },
    domain: {
      entities: [
        {
          key: "order",
          label: "Order",
          fields: [
            { key: "total", type: "decimal", required: true },
            {
              key: "status",
              type: "enum",
              required: true,
              values: ["draft", "submitted", "accepted"],
            },
          ],
          indexes: [],
        },
      ],
      relations: [],
    },
    policy: {
      roles: ["customer", "kitchen"],
      permissions: [
        {
          role: "customer",
          resource: "order",
          actions: ["read", "submit"],
        },
        { role: "kitchen", resource: "order", actions: ["accept"] },
      ],
    },
    flow: {
      flows: [
        {
          id: "order",
          entity: "order",
          initialState: "draft",
          states: ["draft", "submitted", "accepted"],
          events: ["submit", "accept"],
          transitions: [
            {
              from: "draft",
              event: "submit",
              to: "submitted",
              roles: ["customer"],
            },
            {
              from: "submitted",
              event: "accept",
              to: "accepted",
              roles: ["kitchen"],
            },
          ],
        },
      ],
    },
    integration: {
      providers: [],
      capabilities: [
        {
          key: "commerce.orders",
          providerId: "factory",
          operation: "manage",
        },
      ],
    },
    experience: {
      theme: { mode: "light", tokens: { accent: "ember" } },
      locales: ["en"],
      responsiveNavigation: [
        { surfaceKey: "customer-mobile", compactAt: 720, collapse: "tabs" },
      ],
    },
    seedScenarios: [],
    journeys: [
      {
        key: "place-order",
        label: "Place order",
        steps: [
          {
            flowKey: "order",
            from: "draft",
            event: "submit",
            to: "submitted",
            actorRoleKey: "customer",
          },
          {
            flowKey: "order",
            from: "submitted",
            event: "accept",
            to: "accepted",
            actorRoleKey: "kitchen",
          },
        ],
        entryPageKey: "home",
        outcome: "A customer submits an order and the kitchen accepts it.",
      },
    ],
    fieldAuthorities: [
      { entityKey: "order", fieldKey: "total", authority: "server" },
      { entityKey: "order", fieldKey: "status", authority: "server" },
    ],
    bindingPolicies: [
      {
        kind: "domain-field",
        pageId: "home",
        blockId: "order-summary",
        bindingKey: "total",
        entityKey: "order",
        fieldKey: "total",
        access: "read",
        authority: "server",
      },
      {
        kind: "flow-transition",
        pageId: "home",
        blockId: "order-summary",
        bindingKey: "submit",
        flowKey: "order",
        from: "draft",
        event: "submit",
        to: "submitted",
        access: "request",
      },
      {
        kind: "policy-permission",
        pageId: "home",
        blockId: "order-summary",
        bindingKey: "canAccept",
        roleKey: "kitchen",
        resource: "order",
        action: "accept",
        access: "evaluate",
      },
    ],
  };
}

function expectGraphError(
  mutate: (graph: Record<string, any>) => void,
  message: string | RegExp,
): void {
  const graph = validGraphV3();
  mutate(graph);
  expect(() => assertApplicationGraphV3(graph)).toThrow(message);
}

type GraphBoundaryCase = {
  input: unknown;
  behaviorCalls: () => number;
};

function hostileGraphArray(
  values: readonly unknown[],
  customPrototype = false,
): { value: unknown[]; behaviorCalls: () => number } {
  let calls = 0;
  if (customPrototype) {
    const value = Array.from(values);
    const prototype = Object.create(Array.prototype) as Record<
      PropertyKey,
      unknown
    >;
    prototype.map = function (...args: unknown[]) {
      calls += 1;
      return Reflect.apply(Array.prototype.map, this, args);
    };
    Object.setPrototypeOf(value, prototype);
    return { value, behaviorCalls: () => calls };
  }

  class HostileArray extends Array<unknown> {
    public override map<U>(
      callback: (value: unknown, index: number, array: unknown[]) => U,
      thisArg?: unknown,
    ): U[] {
      calls += 1;
      return Array.prototype.map.call(this, callback, thisArg) as U[];
    }
  }
  const value = new HostileArray();
  for (const item of values) Array.prototype.push.call(value, item);
  return { value, behaviorCalls: () => calls };
}

const graphBoundaryCases = [
  {
    label: "inherited required field",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      const { name, ...ownMetadata } = graph.metadata;
      graph.metadata = Object.assign(Object.create({ name }), ownMetadata);
      return { input: graph, behaviorCalls: () => 0 };
    },
  },
  {
    label: "symbol extra",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      graph.metadata[Symbol("compilerTarget")] = "web";
      return { input: graph, behaviorCalls: () => 0 };
    },
  },
  {
    label: "non-enumerable extra",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      Object.defineProperty(graph.metadata, "compilerTarget", {
        value: "web",
        enumerable: false,
      });
      return { input: graph, behaviorCalls: () => 0 };
    },
  },
  {
    label: "required-field accessor",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      let calls = 0;
      const name = graph.metadata.name;
      Object.defineProperty(graph.metadata, "name", {
        enumerable: true,
        get() {
          calls += 1;
          return name;
        },
      });
      return { input: graph, behaviorCalls: () => calls };
    },
  },
  {
    label: "extra-field accessor",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      let calls = 0;
      Object.defineProperty(graph.metadata, "compilerTarget", {
        enumerable: true,
        get() {
          calls += 1;
          return "web";
        },
      });
      return { input: graph, behaviorCalls: () => calls };
    },
  },
  {
    label: "array subclass",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      const hostile = hostileGraphArray(graph.journeys[0].steps);
      graph.journeys[0].steps = hostile.value;
      return { input: graph, behaviorCalls: hostile.behaviorCalls };
    },
  },
  {
    label: "custom array prototype",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      const hostile = hostileGraphArray(graph.journeys[0].steps, true);
      graph.journeys[0].steps = hostile.value;
      return { input: graph, behaviorCalls: hostile.behaviorCalls };
    },
  },
  {
    label: "nested hostile array",
    create: (): GraphBoundaryCase => {
      const graph = validGraphV3();
      const blockIds = graph.page.pages[0].recipe.regions[0].blockIds;
      const hostile = hostileGraphArray(blockIds);
      graph.page.pages[0].recipe.regions[0].blockIds = hostile.value;
      return { input: graph, behaviorCalls: hostile.behaviorCalls };
    },
  },
] as const;

const graphBoundaryApis = [
  [
    "Node schema",
    (input: unknown) => applicationGraphV3Schema.safeParse(input).success,
  ],
  [
    "browser schema",
    (input: unknown) =>
      browserGraph.applicationGraphV3Schema.safeParse(input).success,
  ],
  [
    "Node assert",
    (input: unknown) => {
      assertApplicationGraphV3(input);
      return true;
    },
  ],
  [
    "browser assert",
    (input: unknown) => {
      browserGraph.assertApplicationGraphV3(input);
      return true;
    },
  ],
  [
    "Node hash",
    (input: unknown) => {
      hashApplicationGraphV3(input);
      return true;
    },
  ],
  [
    "browser hash",
    (input: unknown) => {
      browserGraph.hashApplicationGraphV3(input);
      return true;
    },
  ],
] as const;

describe("ApplicationGraphV3", () => {
  it("accepts distributed-role journey steps and all three binding policy discriminators", () => {
    const graph = validGraphV3();
    const asserted: ApplicationGraphV3 = assertApplicationGraphV3(graph);
    expect(asserted).toEqual(graph);
  });

  it("hashes canonical object keys, preserves array order, and pins the V3-adjacent vector", () => {
    const vector = minimalHashVector();
    const reordered = {
      ...vector,
      metadata: {
        name: vector.metadata.name,
        workspaceId: vector.metadata.workspaceId,
        id: vector.metadata.id,
      },
    };
    expect(hashApplicationGraphV3(reordered)).toBe(
      hashApplicationGraphV3(vector),
    );
    expect(hashApplicationGraphV3(vector)).toBe(
      "sha256:e824bcac07ef498d107fc4bf084aa4209b78b18a466f964c9f225b675b0fec6d",
    );

    const journeyOrder = validGraphV3();
    journeyOrder.flow.flows.push({
      id: "audit",
      entity: "order",
      initialState: "pending",
      states: ["pending", "recorded"],
      events: ["record"],
      transitions: [
        {
          from: "pending",
          event: "record",
          to: "recorded",
          roles: ["customer"],
        },
      ],
    });
    journeyOrder.policy.permissions[0].actions.push("record");
    journeyOrder.journeys[0].steps.splice(1, 0, {
      flowKey: "audit",
      from: "pending",
      event: "record",
      to: "recorded",
      actorRoleKey: "customer",
    });
    const reorderedJourneySteps = structuredClone(journeyOrder);
    const [auditStep] = reorderedJourneySteps.journeys[0].steps.splice(1, 1);
    reorderedJourneySteps.journeys[0].steps.push(auditStep);
    expect(hashApplicationGraphV3(reorderedJourneySteps)).not.toBe(
      hashApplicationGraphV3(journeyOrder),
    );

    const policyOrder = validGraphV3();
    policyOrder.bindingPolicies.reverse();
    expect(hashApplicationGraphV3(policyOrder)).not.toBe(
      hashApplicationGraphV3(validGraphV3()),
    );
  });

  it("rejects duplicate journeys and unresolved journey members with exact errors", () => {
    expectGraphError(
      (graph) => graph.journeys.push(structuredClone(graph.journeys[0])),
      "Application Graph V3 journey 'place-order' is duplicated.",
    );
    expectGraphError(
      (graph) => (graph.journeys[0].entryPageKey = "missing-page"),
      "Journey 'place-order' references unknown page 'missing-page'.",
    );
    expectGraphError(
      (graph) => (graph.journeys[0].steps[0].flowKey = "missing-flow"),
      "Journey 'place-order' step 0 references unknown flow 'missing-flow'.",
    );
    expectGraphError(
      (graph) => (graph.journeys[0].steps[0].actorRoleKey = "manager"),
      "Journey 'place-order' step 0 references unknown role 'manager'.",
    );
  });

  it("rejects duplicate or unmatched transition tuples with exact errors", () => {
    expectGraphError(
      (graph) =>
        graph.flow.flows[0].transitions.push(
          structuredClone(graph.flow.flows[0].transitions[0]),
        ),
      "Flow 'order' transition 'draft:submit:submitted' is duplicated.",
    );
    expectGraphError(
      (graph) => (graph.journeys[0].steps[0].event = "cancel"),
      "Journey 'place-order' step 0 does not match transition 'order:draft:cancel:submitted'.",
    );
  });

  it("rejects journey actors without transition grants or Policy permission", () => {
    expectGraphError((graph) => {
      graph.policy.roles.push("manager");
      graph.policy.permissions.push({
        role: "manager",
        resource: "order",
        actions: ["submit"],
      });
      graph.journeys[0].steps[0].actorRoleKey = "manager";
    }, "Journey 'place-order' step 0 actor 'manager' is not granted on transition 'order:draft:submit:submitted'.");
    expectGraphError(
      (graph) => (graph.policy.permissions[0].actions = ["read"]),
      "Journey 'place-order' step 0 actor 'customer' lacks Policy permission 'order:submit'.",
    );
  });

  it("retains the delivered transition actor-grant and Policy-grant errors", () => {
    expectGraphError(
      (graph) => delete graph.flow.flows[0].transitions[0].roles,
      "Flow 'order' transition 'submit' requires an actor grant.",
    );
    expectGraphError((graph) => {
      graph.policy.roles.push("manager");
      graph.flow.flows[0].transitions[0].roles.push("manager");
    }, "Flow 'order' transition 'submit' is not granted to role 'manager'.");
  });

  it("rejects discontinuous same-flow steps with their original journey indexes", () => {
    expectGraphError((graph) => {
      graph.flow.flows[0].transitions[1] = {
        from: "draft",
        event: "accept",
        to: "accepted",
        roles: ["kitchen"],
      };
      graph.journeys[0].steps[1].from = "draft";
    }, "Journey 'place-order' steps 0 and 1 for flow 'order' are discontinuous: 'submitted' does not equal 'draft'.");
  });

  it("requires every transition to be covered and every flow to be reachable", () => {
    expectGraphError((graph) => {
      graph.flow.flows[0].states.push("archived");
      graph.flow.flows[0].events.push("archive");
      graph.flow.flows[0].transitions.push({
        from: "accepted",
        event: "archive",
        to: "archived",
        roles: ["kitchen"],
      });
      graph.policy.permissions[1].actions.push("archive");
    }, "Flow 'order' transition 'accepted:archive:archived' is not covered by a journey step.");
    expectGraphError(
      (graph) =>
        graph.flow.flows.push({
          id: "delivery",
          entity: "order",
          initialState: "pending",
          states: ["pending"],
          events: [],
          transitions: [],
        }),
      "Graph flow 'delivery' is not reachable from a journey.",
    );
  });

  it("accepts alternative branches only when separate journeys cover them", () => {
    const graph = validGraphV3();
    graph.flow.flows[0].states.push("rejected");
    graph.flow.flows[0].events.push("reject");
    graph.flow.flows[0].transitions.push({
      from: "submitted",
      event: "reject",
      to: "rejected",
      roles: ["kitchen"],
    });
    graph.policy.permissions[1].actions.push("reject");
    graph.journeys.push({
      key: "reject-order",
      label: "Reject order",
      steps: [
        {
          flowKey: "order",
          from: "submitted",
          event: "reject",
          to: "rejected",
          actorRoleKey: "kitchen",
        },
      ],
      entryPageKey: "home",
      outcome: "The kitchen rejects an order.",
    });
    expect(() => assertApplicationGraphV3(graph)).not.toThrow();
  });

  it("resolves Screen Intent journey references against V3 journey keys", () => {
    expectGraphError(
      (graph) =>
        (graph.page.pages[0].screenIntent.primaryJourneyKeys = [
          "missing-journey",
        ]),
      "Screen 'home' references unknown journey 'missing-journey'.",
    );
  });

  it("requires one policy for every block binding and rejects duplicate tuples", () => {
    expectGraphError(
      (graph) => graph.bindingPolicies.pop(),
      "Block binding 'home:order-summary:canAccept' requires exactly one policy.",
    );
    expectGraphError(
      (graph) =>
        graph.bindingPolicies.push(structuredClone(graph.bindingPolicies[0])),
      "Application Graph V3 binding policy 'home:order-summary:total' is duplicated.",
    );
  });

  it("rejects unresolved policy page, block, and binding members with exact errors", () => {
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].pageId = "missing-page"),
      "Binding policy references unknown page 'missing-page'.",
    );
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].blockId = "missing-block"),
      "Binding policy references unknown block 'missing-block'.",
    );
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].bindingKey = "missingBinding"),
      "Binding policy references unknown binding 'missingBinding'.",
    );
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].bindingKey = "constructor"),
      "Binding policy references unknown binding 'constructor'.",
    );
  });

  it("requires exact discriminator-specific binding targets", () => {
    expectGraphError(
      (graph) =>
        (graph.page.pages[0].blocks[0].bindings.total =
          "graph.domain.order.status"),
      "Binding policy target 'graph.domain.order.total' does not match binding 'total'.",
    );
    expectGraphError(
      (graph) =>
        (graph.page.pages[0].blocks[0].bindings.submit =
          "graph.flow.order.draft.submit.accepted"),
      "Binding policy target 'graph.flow.order.draft.submit.submitted' does not match binding 'submit'.",
    );
    expectGraphError(
      (graph) =>
        (graph.page.pages[0].blocks[0].bindings.canAccept =
          "graph.policy.kitchen.order.submit"),
      "Binding policy target 'graph.policy.kitchen.order.accept' does not match binding 'canAccept'.",
    );
  });

  it("resolves exact Flow transition policies", () => {
    expectGraphError(
      (graph) => (graph.bindingPolicies[1].flowKey = "missing-flow"),
      "Flow binding policy references unknown flow 'missing-flow'.",
    );
    expectGraphError(
      (graph) => (graph.bindingPolicies[1].event = "cancel"),
      "Flow binding policy references unknown transition 'order:draft:cancel:submitted'.",
    );
  });

  it("resolves declared Policy permission tuples", () => {
    expectGraphError(
      (graph) => (graph.bindingPolicies[2].roleKey = "manager"),
      "Policy binding policy references unknown role 'manager'.",
    );
    expectGraphError((graph) => {
      graph.policy.roles.push("manager");
      graph.bindingPolicies[2].roleKey = "manager";
    }, "Policy binding policy references undeclared permission 'manager:order:accept'.");
  });

  it("retains Domain field resolution and authority invariants", () => {
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].entityKey = "missing-entity"),
      "Binding policy references unknown entity 'missing-entity'.",
    );
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].fieldKey = "missingField"),
      "Binding policy references unknown field 'missingField'.",
    );
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].authority = "client"),
      "Binding policy authority for 'order.total' does not match its intrinsic field authority.",
    );
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].access = "write"),
      "A server-authoritative field is read-only and cannot grant client write access.",
    );
  });

  it("rejects discriminator relabelling and forbidden authority-like fields", () => {
    expectGraphError(
      (graph) => (graph.bindingPolicies[0].kind = "flow-transition"),
      /Composition record is invalid/,
    );

    for (const [index, field, value] of [
      [1, "authority", "server"],
      [1, "actor", "customer"],
      [1, "grant", true],
      [1, "allow", true],
      [2, "decision", "allow"],
      [2, "tenant", "local-workspace"],
      [2, "mutation", true],
      [2, "server-bypass", true],
    ] as const) {
      expectGraphError(
        (graph) => (graph.bindingPolicies[index][field] = value),
        "Unrecognized key",
      );
    }
  });

  it("rejects V2 journey-wide actors, V2 flow lists, empty steps, and unknown nested keys", () => {
    expectGraphError((graph) => {
      graph.journeys[0].actorRoleKey = "customer";
      graph.journeys[0].flowKeys = ["order"];
    }, "Unrecognized key");
    expectGraphError((graph) => (graph.journeys[0].steps = []), /at least 1/);
    expectGraphError(
      (graph) => (graph.journeys[0].steps[0].tenant = "local-workspace"),
      "Unrecognized key",
    );
  });

  it.each(graphBoundaryCases)(
    "rejects a $label through every Node/browser schema, assert, and hash boundary without invoking behavior",
    ({ create }) => {
      const observations = graphBoundaryApis.map(([label, run]) => {
        const candidate = create();
        let accepted = false;
        try {
          accepted = run(candidate.input);
        } catch {
          accepted = false;
        }
        return { label, accepted, calls: candidate.behaviorCalls() };
      });
      expect(observations.map(({ accepted }) => accepted)).toEqual(
        observations.map(() => false),
      );
      expect(observations.map(({ calls }) => calls)).toEqual(
        observations.map(() => 0),
      );
    },
  );
});
