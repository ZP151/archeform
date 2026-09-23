import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { selectContentDirectoryProfile } from "../src/content-directory-contract.js";
import { generateApplicationBundle } from "../src/index.js";
import {
  contentDirectoryInput,
  previousDefinitionInput,
} from "./fixtures/content-directory.js";
import { currentDefinitionDataCompilationEvidence } from "./fixtures/definition-data-compatibility.js";

const baseline = JSON.parse(
  readFileSync(
    new URL("./fixtures/eight-definition-baseline.json", import.meta.url),
    "utf8",
  ),
);
describe("exact Content/Directory profile", () => {
  it("selects and compiles the same immutable values after a JSON persistence round trip", () => {
    const original = contentDirectoryInput();
    const persisted = JSON.parse(JSON.stringify(original));
    expect(
      Object.getPrototypeOf(original.compositionLock.packages[0]!.bindings),
    ).toBeNull();
    expect(
      Object.getPrototypeOf(persisted.compositionLock.packages[0].bindings),
    ).toBe(Object.prototype);
    expect(
      selectContentDirectoryProfile(persisted.graph, persisted.compositionLock),
    ).toEqual(
      selectContentDirectoryProfile(original.graph, original.compositionLock),
    );
    const publishedRevisionId = "directory-json-persistence";
    expect(
      generateApplicationBundle({ ...persisted, publishedRevisionId }),
    ).toEqual(generateApplicationBundle({ ...original, publishedRevisionId }));
  });
  it("selects a real composed immutable Published Graph with a separate lock", () => {
    const input = contentDirectoryInput();
    expect(input.graph.integration.compositionSelections).toBeUndefined();
    const profile = selectContentDirectoryProfile(
      input.graph,
      input.compositionLock,
    )!;
    expect(profile).toMatchObject({
      key: "content-directory",
      version: "1.0.0",
      entity: "resource",
      roles: { reader: "reader", curator: "curator" },
      fields: {
        title: "title",
        summary: "summary",
        body: "body",
        category: "category",
        status: "status",
      },
      pages: {
        list: "resource-list",
        form: "resource-form",
        detail: "resource-detail",
      },
      categories: ["Guides", "Reference", "Checklists"],
      graphHash: hashApplicationGraph(input.graph),
    });
    expect(Object.isFrozen(profile)).toBe(true);
    for (const value of [
      profile.fields,
      profile.roles,
      profile.pages,
      profile.categories,
    ])
      expect(Object.isFrozen(value)).toBe(true);
  });
  it.each(["unknown", "accessor", "toJSON", "pollution", "cycle"])(
    "rejects %s on persisted lock data before JSON comparison can execute it",
    (kind) => {
      const input = JSON.parse(JSON.stringify(contentDirectoryInput()));
      const bindings = input.compositionLock.packages[0].bindings;
      let invoked = false;
      const execute = () => {
        invoked = true;
        return {};
      };
      if (kind === "unknown") bindings.extra = "undeclared";
      if (kind === "accessor")
        Object.defineProperty(bindings, "extra", {
          enumerable: true,
          get: execute,
        });
      if (kind === "toJSON") bindings.toJSON = execute;
      if (kind === "pollution")
        Object.defineProperty(bindings, "__proto__", {
          enumerable: true,
          value: {},
        });
      if (kind === "cycle") bindings.extra = bindings;
      expect(() =>
        selectContentDirectoryProfile(input.graph, input.compositionLock),
      ).toThrow("Unsupported Content/Directory profile.");
      expect(invoked).toBe(false);
    },
  );
  it("recognizes semantic roles and safe custom identifiers and categories", () => {
    const input = contentDirectoryInput({
      entity: "article",
      reader: "visitor",
      curator: "editor",
      categories: ["Manuals", "Examples"],
    });
    expect(
      selectContentDirectoryProfile(input.graph, input.compositionLock),
    ).toMatchObject({
      entity: "article",
      roles: { reader: "visitor", curator: "editor" },
      categories: ["Manuals", "Examples"],
    });
  });
  it.each([
    ["ASCII case", ["Guides", "guides"]],
    ["Unicode simple case", ["Straße", "STRAẞE"]],
    ["NFC equivalence", ["Caf\u00e9", "Cafe\u0301"]],
  ])(
    "rejects composed %s duplicate categories with aligned seeds",
    (_name, categories) => {
      const input = contentDirectoryInput({
        categories: categories as string[],
      });
      expect(input.graph.domain.seedData![0]!.values.category).toBe(
        categories[0],
      );
      expect(() =>
        selectContentDirectoryProfile(input.graph, input.compositionLock),
      ).toThrow("Unsupported Content/Directory profile.");
    },
  );
  it.each([
    ["dotless i", ["i", "ı"]],
    ["simple versus full folding", ["ß", "ss"]],
    ["anchored literal", ["A", "AB"]],
    [
      "regexp syntax as business text",
      ["A.B", "AXB", "C++", "C", "[Notes]", "Notes", "A|B", "A"],
    ],
  ])(
    "accepts composed distinct %s categories with aligned seeds",
    (_name, categories) => {
      const input = contentDirectoryInput({
        categories: categories as string[],
      });
      expect(input.graph.domain.seedData![0]!.values.category).toBe(
        categories[0],
      );
      expect(
        selectContentDirectoryProfile(input.graph, input.compositionLock)
          ?.categories,
      ).toEqual(categories);
    },
  );
  const mutations: [string, (graph: any, lock: any) => void][] = [
    [
      "missing lock",
      (_graph, lock) => {
        delete lock.apiVersion;
      },
    ],
    [
      "lock digest",
      (_graph, lock) => {
        lock.lockDigest = "sha256:" + "0".repeat(64);
      },
    ],
    [
      "manifest digest",
      (_graph, lock) => {
        lock.packages[0].lock.manifestDigest = "sha256:" + "0".repeat(64);
      },
    ],
    [
      "extra package",
      (_graph, lock) => {
        lock.packages.push(lock.packages[0]);
      },
    ],
    [
      "package version",
      (_graph, lock) => {
        lock.packages[0].lock.version = "9.0.0";
      },
    ],
    [
      "wrong binding owner",
      (_graph, lock) => {
        lock.packages.find(
          (s: any) => s.lock.key === "core.crud",
        ).bindings.entityKey.graphSymbol =
          "graph.domain.directory-fixture-principal";
      },
    ],
    [
      "extra business field",
      (graph) => {
        graph.domain.entities[0].fields.push({
          key: "extra",
          type: "string",
          required: true,
        });
      },
    ],
    [
      "missing body",
      (graph) => {
        graph.domain.entities[0].fields.splice(2, 1);
      },
    ],
    [
      "optional title",
      (graph) => {
        graph.domain.entities[0].fields[0].required = false;
      },
    ],
    [
      "wrong body type",
      (graph) => {
        graph.domain.entities[0].fields[2].type = "string";
      },
    ],
    [
      "too few categories",
      (graph) => {
        graph.domain.entities[0].fields[3].values = ["Guides"];
      },
    ],
    [
      "oversized category",
      (graph) => {
        graph.domain.entities[0].fields[3].values = ["Guides", "A".repeat(41)];
      },
    ],
    [
      "reader write",
      (graph) => {
        graph.policy.permissions[0].actions.push("create");
      },
    ],
    [
      "curator delete",
      (graph) => {
        graph.policy.permissions
          .find((p: any) => p.resource === "resource" && p.role === "curator")
          .actions.push("delete");
      },
    ],
    [
      "extra grant",
      (graph) => {
        graph.policy.permissions.push({
          role: "reader",
          resource: "*",
          actions: ["read"],
        });
      },
    ],
    [
      "wrong state",
      (graph) => {
        graph.flow.flows[0].initialState = "listed";
      },
    ],
    [
      "reversed transition",
      (graph) => {
        graph.flow.flows[0].transitions[0].from = "listed";
      },
    ],
    [
      "wrong actor",
      (graph) => {
        graph.flow.flows[0].transitions[0].roles = ["reader"];
      },
    ],
    [
      "extra effect",
      (graph) => {
        graph.flow.flows[0].transitions[0].effects = [
          { capability: "notification.send", operation: "send" },
        ];
      },
    ],
    [
      "wrong page entity",
      (graph) => {
        graph.page.pages[0].blocks[0].entity = "directory-fixture-principal";
      },
    ],
    [
      "missing page",
      (graph) => {
        graph.page.pages.pop();
      },
    ],
    [
      "extra block",
      (graph) => {
        graph.page.pages[0].blocks.push({
          id: "other",
          type: "detail",
          entity: "resource",
        });
      },
    ],
    [
      "unknown profile",
      (graph) => {
        graph.integration.compositionProfile = "unsupported-directory";
      },
    ],
    [
      "extra provider",
      (graph) => {
        graph.integration.providers.push({ id: "external", type: "external" });
      },
    ],
    [
      "identity field injection",
      (graph) => {
        graph.domain.entities[1].fields.push({
          key: "extra",
          type: "string",
          required: true,
        });
      },
    ],
    [
      "unknown Graph version",
      (graph) => {
        graph.apiVersion = "factory.application-graph/v99";
      },
    ],
    [
      "unknown field metadata",
      (graph) => {
        graph.domain.entities[0].fields[0].defaultValue = "injected";
      },
    ],
    [
      "extra relation",
      (graph) => {
        graph.domain.relations.push({
          from: "resource",
          to: "directory-fixture-principal",
          kind: "many-to-one",
        });
      },
    ],
    [
      "extra navigation",
      (graph) => {
        graph.page.navigation.push({
          id: "extra",
          label: "Extra",
          pageId: "resource-detail",
        });
      },
    ],
    [
      "mutable selections",
      (graph, lock) => {
        graph.integration.compositionSelections = lock.packages;
      },
    ],
  ];
  it.each(mutations)("fails closed for %s", (_name, mutate) => {
    const original = contentDirectoryInput();
    const graph = structuredClone(original.graph);
    const lock = structuredClone(original.compositionLock);
    mutate(graph, lock);
    // Rebind Graph-only mutations so eligibility is checked beyond checksum validation.
    let witness = lock;
    if (JSON.stringify(lock) === JSON.stringify(original.compositionLock)) {
      try {
        witness = createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(graph),
          selections: lock.packages,
        });
      } catch {
        /* Semantically invalid Graphs must still receive the bounded selector error. */
      }
    }
    expect(() => selectContentDirectoryProfile(graph, witness)).toThrow(
      "Unsupported Content/Directory profile.",
    );
  });
  it("rejects missing and stale separate witnesses", () => {
    const { graph, compositionLock } = contentDirectoryInput();
    expect(() => selectContentDirectoryProfile(graph)).toThrow(
      "Unsupported Content/Directory profile.",
    );
    graph.metadata.name = "Changed after locking";
    expect(() => selectContentDirectoryProfile(graph, compositionLock)).toThrow(
      "Unsupported Content/Directory profile.",
    );
  });
  it.each([
    "core.crud",
    "core.identity-policy",
    "core.audit",
    "core.notification",
    "core.workflow",
  ])(
    "rejects a freshly digested lock with incorrect %s ownership",
    (capability) => {
      const { graph, compositionLock } = contentDirectoryInput();
      const selections = structuredClone(compositionLock.packages);
      const selection = selections.find(
        (item) => item.lock.key === capability,
      )!;
      const binding = Object.keys(selection.bindings)[0]!;
      const symbol = selection.bindings[binding] as { graphSymbol: string };
      symbol.graphSymbol = symbol.graphSymbol.startsWith("graph.policy.")
        ? symbol.graphSymbol === "graph.policy.curator"
          ? "graph.policy.reader"
          : "graph.policy.curator"
        : "graph.domain.resource";
      if (capability === "core.crud")
        symbol.graphSymbol = "graph.domain.directory-fixture-principal";
      const wrong = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(graph),
        selections,
      });
      expect(() => selectContentDirectoryProfile(graph, wrong)).toThrow(
        "Unsupported Content/Directory profile.",
      );
    },
  );
  it("leaves unrelated generic fields, single visibility states and optional undefined values alone", () => {
    const { graph, compositionLock } =
      previousDefinitionInput("team-task-tracking");
    graph.domain.entities[0]!.fields.push(
      { key: "summary", type: "string", required: false },
      { key: "category", type: "string", required: false },
    );
    graph.flow.flows[0]!.states.push("hidden");
    graph.integration.compositionSelections = undefined;
    graph.metadata.name = "Knowledge Resource Directory";
    expect(
      selectContentDirectoryProfile(graph, compositionLock),
    ).toBeUndefined();
  });
  it("detaches profile data from mutable caller references", () => {
    const input = contentDirectoryInput();
    const profile = selectContentDirectoryProfile(
      input.graph,
      input.compositionLock,
    )!;
    input.graph.domain.entities[0]!.fields[3]!.values![0] = "Mutated";
    input.graph.policy.roles[0] = "Mutated";
    expect(profile.categories[0]).toBe("Guides");
    expect(profile.roles.reader).toBe("reader");
  });
  it("does not invoke own accessors or accept inherited witness data", () => {
    const input = contentDirectoryInput();
    const getter = () => {
      throw Error("secret getter must never execute");
    };
    Object.defineProperty(input.graph.domain.entities[0], "label", {
      get: getter,
    });
    expect(() =>
      selectContentDirectoryProfile(input.graph, input.compositionLock),
    ).toThrow("Unsupported Content/Directory profile.");
    const valid = contentDirectoryInput();
    expect(() =>
      selectContentDirectoryProfile(
        valid.graph,
        Object.create(valid.compositionLock),
      ),
    ).toThrow("Unsupported Content/Directory profile.");
    expect(() =>
      selectContentDirectoryProfile(
        Object.create(valid.graph),
        valid.compositionLock,
      ),
    ).toThrow("Unsupported Content/Directory profile.");
    const accessorGraph = { ...valid.graph };
    Object.defineProperty(accessorGraph, "domain", { get: getter });
    expect(() =>
      selectContentDirectoryProfile(accessorGraph, valid.compositionLock),
    ).toThrow("Unsupported Content/Directory profile.");
  });
  it("retains independently captured projections and every old-eight generated byte", () => {
    const keys = baseline.entries.map((entry: any) => entry.definitionKey);
    expect(currentDefinitionDataCompilationEvidence(keys)).toEqual(
      baseline.entries,
    );
    for (const key of keys) {
      const input = previousDefinitionInput(key);
      expect(
        selectContentDirectoryProfile(input.graph, input.compositionLock),
      ).toBeUndefined();
    }
  });
  it("retains the baseline capture receipt and source identity", () => {
    const receipt = JSON.parse(
      readFileSync(
        new URL(
          "./fixtures/eight-definition-baseline-capture.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(receipt.base).toBe("62c53884897a7f72c3a4c9fe25c2b010491515fd");
    const sha = (file: string) =>
      "sha256:" +
      createHash("sha256")
        .update(readFileSync(new URL(file, import.meta.url)))
        .digest("hex");
    expect(receipt.fixtureSha256).toBe(
      sha("./fixtures/eight-definition-baseline.json"),
    );
    expect(receipt.captureScriptSha256).toBe(
      sha("./fixtures/capture-eight-definition-baseline.mjs"),
    );
    expect(receipt.sourceFiles.length).toBeGreaterThan(100);
  });
});
