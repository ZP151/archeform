import { describe, expect, it } from "vitest";

import { createCuratedRestaurantTemplateGraph } from "../src/template/template.service.js";
import {
  applyTemplateDataFieldEdit,
  captureTemplateDataFieldRevisionInput,
  type AppendTemplateDataFieldRevisionInput,
} from "../src/template/template-data-field-edit.js";

const invalidRequest = "Template Draft request is invalid.";
const revisionMoved = "Template Draft revision moved; reload before editing.";

function restaurantGraph() {
  return createCuratedRestaurantTemplateGraph(
    "restaurant-template-001",
    "Maison Rivage",
  );
}

function command(
  overrides: Partial<AppendTemplateDataFieldRevisionInput> = {},
): AppendTemplateDataFieldRevisionInput {
  return {
    baseDraftRevisionId: "draft-4",
    entityKey: "menu-item",
    recordId: "margherita-pizza",
    fieldKey: "name",
    value: "Heirloom tomato pizza",
    ...overrides,
  };
}

describe("template Restaurant data-field edit", () => {
  it("captures one frozen primitive command and normalizes only the value", () => {
    const input = command({ value: "  Heirloom tomato pizza  " });

    const captured = captureTemplateDataFieldRevisionInput(input);

    expect(captured).toEqual(command());
    expect(captured).not.toBe(input);
    expect(Object.isFrozen(captured)).toBe(true);
    expect(input.value).toBe("  Heirloom tomato pizza  ");
  });

  it.each([
    [
      "missing property",
      (({ fieldKey: _removed, ...rest }) => rest)(command()),
    ],
    ["extra property", { ...command(), scenario: "fine-dining-service" }],
    ["array", Object.values(command())],
    ["wrong entity", command({ entityKey: "menu-category" as never })],
    ["wrong record", command({ recordId: "mushroom-risotto" as never })],
    ["wrong field", command({ fieldKey: "description" as never })],
    ["empty base", command({ baseDraftRevisionId: "" })],
    ["upper-case base", command({ baseDraftRevisionId: "Draft-4" })],
    ["overlong base", command({ baseDraftRevisionId: `d${"a".repeat(128)}` })],
    ["non-string value", command({ value: 42 as never })],
    ["one character after trim", command({ value: " a " })],
    ["overlong after trim", command({ value: ` ${"a".repeat(121)} ` })],
    ["C0 control", command({ value: "Dish\u001f" })],
    ["DEL control", command({ value: "Dish\u007f" })],
  ] as const)("rejects %s with one fixed capture error", (_label, input) => {
    expect(() => captureTemplateDataFieldRevisionInput(input)).toThrow(
      new Error(invalidRequest),
    );
  });

  it("rejects symbol, non-enumerable, accessor, inherited, and custom-prototype properties without invoking getters", () => {
    let getterCalls = 0;
    const symbol = { ...command(), [Symbol("hostile")]: "hidden" };
    const nonEnumerable = { ...command() };
    Object.defineProperty(nonEnumerable, "hidden", {
      enumerable: false,
      value: "hidden",
    });
    const accessor = { ...command() } as Record<string, unknown>;
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "Hostile dish";
      },
    });
    const inherited = Object.assign(
      Object.create({ hostile: true }),
      command(),
    );
    const customPrototype = Object.assign(Object.create(null), command());

    for (const input of [
      symbol,
      nonEnumerable,
      accessor,
      inherited,
      customPrototype,
    ]) {
      expect(() => captureTemplateDataFieldRevisionInput(input)).toThrow(
        new Error(invalidRequest),
      );
    }
    expect(getterCalls).toBe(0);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "redacts a hostile body Proxy %s trap",
    (trap) => {
      const input = new Proxy(command(), {
        [trap]() {
          throw new Error("HOSTILE_BODY_SENTINEL");
        },
      });

      expect(() => captureTemplateDataFieldRevisionInput(input)).toThrow(
        new Error(invalidRequest),
      );
    },
  );

  it("rejects a revoked Proxy and caller conversion hooks without invoking them", () => {
    let conversionCalls = 0;
    const hostileValue = {
      toString() {
        conversionCalls += 1;
        return "Hostile dish";
      },
      valueOf() {
        conversionCalls += 1;
        return "Hostile dish";
      },
      toJSON() {
        conversionCalls += 1;
        return "Hostile dish";
      },
    };
    const revoked = Proxy.revocable(command(), {});
    revoked.revoke();

    expect(() => captureTemplateDataFieldRevisionInput(revoked.proxy)).toThrow(
      new Error(invalidRequest),
    );
    expect(() =>
      captureTemplateDataFieldRevisionInput({
        ...command(),
        value: hostileValue,
      }),
    ).toThrow(new Error(invalidRequest));
    expect(conversionCalls).toBe(0);
  });

  it("does not use capture as Graph authority for a normalized no-op", () => {
    expect(
      captureTemplateDataFieldRevisionInput(
        command({ value: "  Margherita pizza  " }),
      ).value,
    ).toBe("Margherita pizza");
  });

  it("changes only the aligned seed/scenario name pair and leaves caller data immutable", () => {
    const graph = restaurantGraph();
    const before = structuredClone(graph);
    const expected = structuredClone(graph);
    const seedIndex = expected.domain.seedData!.findIndex(
      ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
    );
    expected.domain.seedData![seedIndex]!.values.name = "Heirloom tomato pizza";
    expected.seedScenarios[0]!.records[seedIndex]!.values.name =
      "Heirloom tomato pizza";

    const result = applyTemplateDataFieldEdit(graph, command());

    expect(result).toMatchObject(command());
    expect(result.graph).toEqual(expected);
    expect(result.graph).not.toBe(graph);
    expect(graph).toEqual(before);
    expect(result.graph.domain.seedData).not.toBe(graph.domain.seedData);
    expect(result.graph.seedScenarios).not.toBe(graph.seedScenarios);
  });

  it("maps a normalized current-value no-op to the fixed revision conflict", () => {
    expect(() =>
      applyTemplateDataFieldEdit(
        restaurantGraph(),
        command({ value: "  Margherita pizza  " }),
      ),
    ).toThrow(new Error(revisionMoved));
  });

  it.each([
    [
      "duplicate target seed",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.domain.seedData!.push(
          structuredClone(
            graph.domain.seedData!.find(({ id }) => id === "margherita-pizza")!,
          ),
        );
      },
    ],
    [
      "missing target seed",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.domain.seedData = graph.domain.seedData!.filter(
          ({ id }) => id !== "margherita-pizza",
        );
      },
    ],
    [
      "missing scenario",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.seedScenarios = [];
      },
    ],
    [
      "duplicate scenario",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.seedScenarios.push(structuredClone(graph.seedScenarios[0]!));
      },
    ],
    [
      "wrong scenario key",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.seedScenarios[0]!.key = "ordinary-service";
      },
    ],
    [
      "reordered scenario record",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.seedScenarios[0]!.records.reverse();
      },
    ],
    [
      "misaligned scenario values",
      (graph: ReturnType<typeof restaurantGraph>) => {
        const record = graph.seedScenarios[0]!.records.find(
          ({ entityKey, values }) =>
            entityKey === "menu-item" && values.name === "Margherita pizza",
        )!;
        record.values.name = "Scenario drift";
      },
    ],
    [
      "non-string mirrored target value",
      (graph: ReturnType<typeof restaurantGraph>) => {
        const seedIndex = graph.domain.seedData!.findIndex(
          ({ entity, id }) =>
            entity === "menu-item" && id === "margherita-pizza",
        );
        graph.domain.seedData![seedIndex]!.values.name = 7;
        graph.seedScenarios[0]!.records[seedIndex]!.values.name = 7;
      },
    ],
    [
      "duplicate menu-item entity",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.domain.entities.push(
          structuredClone(
            graph.domain.entities.find(({ key }) => key === "menu-item")!,
          ),
        );
      },
    ],
    [
      "drifted name field",
      (graph: ReturnType<typeof restaurantGraph>) => {
        const field = graph.domain.entities
          .find(({ key }) => key === "menu-item")!
          .fields.find(({ key }) => key === "name")!;
        field.required = false;
      },
    ],
    [
      "authority drift",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.fieldAuthorities.find(
          ({ entityKey, fieldKey }) =>
            entityKey === "menu-item" && fieldKey === "name",
        )!.authority = "server";
      },
    ],
    [
      "missing required binding",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.bindingPolicies = graph.bindingPolicies.filter(
          (policy) =>
            !(
              policy.kind === "domain-field" &&
              policy.pageId === "customer-home" &&
              policy.blockId === "home-items" &&
              policy.bindingKey === "name"
            ),
        );
      },
    ],
    [
      "duplicate field binding",
      (graph: ReturnType<typeof restaurantGraph>) => {
        const policy = graph.bindingPolicies.find(
          (candidate) =>
            candidate.kind === "domain-field" &&
            candidate.entityKey === "menu-item" &&
            candidate.fieldKey === "name",
        )!;
        graph.bindingPolicies.push(structuredClone(policy));
      },
    ],
    [
      "binding access drift",
      (graph: ReturnType<typeof restaurantGraph>) => {
        const policy = graph.bindingPolicies.find(
          (candidate) =>
            candidate.kind === "domain-field" &&
            candidate.pageId === "customer-menu" &&
            candidate.blockId === "menu-items" &&
            candidate.bindingKey === "name",
        );
        if (!policy || policy.kind !== "domain-field") throw new Error();
        policy.access = "write";
      },
    ],
    [
      "binding target drift",
      (graph: ReturnType<typeof restaurantGraph>) => {
        const policy = graph.bindingPolicies.find(
          (candidate) =>
            candidate.kind === "domain-field" &&
            candidate.pageId === "customer-dish-detail" &&
            candidate.blockId === "dish-configurator" &&
            candidate.bindingKey === "name",
        );
        if (!policy || policy.kind !== "domain-field") throw new Error();
        policy.fieldKey = "description";
      },
    ],
    [
      "manager permission drift",
      (graph: ReturnType<typeof restaurantGraph>) => {
        graph.policy.permissions.find(
          ({ role, resource }) =>
            role === "manager" && resource === "menu-item",
        )!.actions = ["create", "read"];
      },
    ],
  ] as const)("rejects %s with the fixed request error", (_label, mutate) => {
    const graph = restaurantGraph();
    mutate(graph);

    expect(() => applyTemplateDataFieldEdit(graph, command())).toThrow(
      new Error(invalidRequest),
    );
  });
});
