import { join } from "node:path";
import { JsxEmit, ModuleKind, transpileModule } from "typescript";
import { describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";
import { loadProductDefinitionData } from "../../adapters/src/requirements/product-definition-data.js";
import { createDefinitionEntry } from "../../adapters/src/requirements/definition-family-registry.js";
import { generateApplicationBundle } from "../src/index.js";

function publicationInput() {
  const data = loadProductDefinitionData().definitions.find(
    (entry) => entry.definitionKey === "publication-review",
  )!;
  const interpretation = createDefinitionEntry(data).project({
    definitionKey: data.definitionKey,
    disposition: "supported-default",
    requirementId: "publication-identity-test",
    title: "Publication Review",
    outcome: "Review an article.",
    materialQuestions: [],
    businessParameters: null,
  });
  const baseDraft = createBlankApplicationDraft({
    applicationId: interpretation.spec.requirementId,
    workspaceId: "local-workspace",
    name: "Publication Review",
  });
  const [standard] = planProductAlternatives({
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const { diff } = composeProductDraft({
    plan: standard!.plan,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
  const selections = graph.integration.compositionSelections!;
  delete graph.integration.compositionSelections;
  return { graph, selections };
}

function compile(input: ReturnType<typeof publicationInput>) {
  const published = {
    publishedRevisionId: "published-publication-identity",
    graph: input.graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.selections,
    }),
  };
  const before = JSON.stringify(published);
  const bundle = generateApplicationBundle(published);
  expect(JSON.stringify(published)).toBe(before);
  return {
    bundle,
    source: bundle.files.find(
      (file) => file.path === "web/app/page-runtime.tsx",
    )!.content,
  };
}

type RecordValue = Record<string, unknown>;
function loadRuntime(source: string, records: RecordValue[] = []) {
  let stateIndex = 0;
  const react = {
    useState(initial: any) {
      const index = stateIndex++;
      return [
        index === 0
          ? records
          : index === 1
            ? null
            : index === 2
              ? false
              : typeof initial === "function"
                ? initial()
                : initial,
        () => {},
      ];
    },
    useRef(initial: unknown) {
      return { current: initial };
    },
    useEffect() {},
    useCallback(callback: unknown) {
      return callback;
    },
  };
  const jsx = (type: unknown, props: any) => ({ type, props });
  const compiled = transpileModule(
    source +
      "\nexport { definition, EntityRecords, decisionIdentityFields, DecisionHistoryRow };",
    { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } },
  ).outputText;
  const exports: Record<string, any> = {};
  new Function("require", "exports", compiled)(
    (name: string) =>
      name === "react"
        ? react
        : { jsx, jsxs: jsx, Fragment: Symbol.for("react.fragment") },
    exports,
  );
  return {
    ...exports,
    reset() {
      stateIndex = 0;
    },
  } as Record<string, any>;
}

function nodes(node: any, predicate: (node: any) => boolean): any[] {
  if (Array.isArray(node))
    return node.flatMap((child) => nodes(child, predicate));
  if (!node || typeof node !== "object") return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...nodes(node.props?.children, predicate),
  ];
}
function text(node: any): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node === null || node === undefined || typeof node === "boolean")
    return "";
  return typeof node === "object" ? text(node.props?.children) : String(node);
}
function primaryEntity(graph: ApplicationGraphV1) {
  return graph.domain.entities.find((entity) =>
    entity.fields.some((field) => field.key === "articleTitle"),
  )!;
}
function rows(runtime: Record<string, any>, entity: any) {
  runtime.reset();
  const role = runtime.definition.policy.permissions.find(
    (permission: any) =>
      permission.resource === entity.key && permission.actions.includes("read"),
  ).role;
  return nodes(
    runtime.EntityRecords({
      block: { id: "records", type: "collection", props: {} },
      entity,
      role,
      reportError() {},
    }),
    (node) =>
      node.type === "li" &&
      node.props.className?.startsWith("approval-record "),
  );
}
function eventFor(entity: any) {
  return {
    actor: "editor",
    action: "approve",
    entity: entity.key,
    recordId: "record-1",
    reason: null,
    at: "2026-09-13T10:00:00.000Z",
  };
}

describe("generic Approval record identity", () => {
  it("shows the same business title and enum summary in compiled cards and history, with long text only in Details", () => {
    const input = publicationInput();
    const { source, bundle } = compile(input);
    const record = {
      id: "record-1",
      articleTitle: "An authored article",
      channel: "newsletter",
      contentBody: "Long article body",
      editorialNotes: "Editorial context",
      status: "approved",
      version: 5,
    };
    const runtime = loadRuntime(source, [record]);
    const entity = runtime.definition.entities.find(
      (candidate: any) => candidate.key === primaryEntity(input.graph).key,
    );
    const [card] = rows(runtime, entity);
    expect(text(nodes(card, (node) => node.type === "h3"))).toContain(
      "An authored article",
    );
    expect(
      text(nodes(card, (node) => node.props.className === "approval-summary")),
    ).toContain("Channelnewsletter");
    const history = runtime.DecisionHistoryRow({
      entity,
      event: eventFor(entity),
      record,
    });
    expect(text(nodes(history, (node) => node.type === "h3"))).toBe(
      "An authored article · Channel: newsletter",
    );
    for (const row of [card, history]) {
      expect(text(nodes(row, (node) => node.type === "details"))).toContain(
        "Long article body",
      );
      expect(text(nodes(row, (node) => node.type === "details"))).toContain(
        "Editorial context",
      );
      expect(text(nodes(row, (node) => node.type === "h3"))).not.toContain(
        "Long article body",
      );
    }
    expect(
      runtime
        .decisionIdentityFields(entity, record)
        .map((field: any) => field.key),
    ).toEqual(["articleTitle", "channel"]);
    expect(source).toContain("approval-workspace-presentation@2.2.0");
    expect(source).toContain("approval-decision-history@1.1.0");
    expect(source).toContain("approval-record-identity/v1");
    expect(compile(input).bundle.files).toEqual(bundle.files);
  });

  it.each([0, 2])(
    "keeps the safe fallback for %i required short-string title candidates",
    (count) => {
      const input = publicationInput();
      const primary = primaryEntity(input.graph);
      const title = primary.fields.find(
        (field) => field.key === "articleTitle",
      )!;
      if (count === 0) title.required = false;
      else
        primary.fields.push({
          key: "secondIdentity",
          type: "string",
          required: true,
        });
      const { source } = compile(input);
      const runtime = loadRuntime(source, [
        {
          id: "record-1",
          articleTitle: "Not a unique title",
          channel: "blog",
          status: "draft",
        },
      ]);
      const entity = runtime.definition.entities.find(
        (candidate: any) => candidate.key === primary.key,
      );
      expect(
        nodes(rows(runtime, entity), (node) => node.type === "h3"),
      ).toEqual([]);
      expect(
        runtime.decisionIdentityFields(entity, {
          articleTitle: "Not a unique title",
          channel: "blog",
        }),
      ).toEqual([]);
      expect(source).not.toContain("approval-record-identity/v1");
      expect(source).toContain("approval-workspace-presentation@2.1.0");
    },
  );

  it.each([0, 1, 3])(
    "selects at most two of %i enums in declaration order after renaming fields and labels",
    (count) => {
      const input = publicationInput();
      input.graph.domain.seedData = [];
      const primary = primaryEntity(input.graph);
      primary.label = "Unrelated review label";
      primary.fields = primary.fields.filter(
        (field) => field.key !== "channel",
      );
      primary.fields.find((field) => field.key === "articleTitle")!.key =
        "businessHeading";
      primary.fields.push({
        key: "optionalAlias",
        type: "string",
        required: false,
      });
      const keys = ["zetaKind", "alphaKind", "thirdKind"].slice(0, count);
      primary.fields.push(
        ...keys.map((key) => ({
          key,
          type: "enum" as const,
          required: true,
          values: ["first", "second"],
        })),
      );
      const record = {
        id: "record-1",
        businessHeading: "Renamed heading",
        contentBody: "Only in details",
        optionalAlias: "Not the title",
        zetaKind: "first",
        alphaKind: "second",
        thirdKind: "first",
        status: "draft",
      };
      const runtime = loadRuntime(compile(input).source, [record]);
      const entity = runtime.definition.entities.find(
        (candidate: any) => candidate.key === primary.key,
      );
      expect(
        runtime
          .decisionIdentityFields(entity, record)
          .map((field: any) => field.key),
      ).toEqual(["businessHeading", ...keys.slice(0, 2)]);
      const [card] = rows(runtime, entity);
      expect(text(nodes(card, (node) => node.type === "h3"))).toBe(
        "Business headingRenamed heading",
      );
      const summary = text(
        nodes(card, (node) => node.props.className === "approval-summary"),
      );
      expect(summary).toBe(
        [
          ...(count > 0 ? ["Zeta kindfirst"] : []),
          ...(count > 1 ? ["Alpha kindsecond"] : []),
          "StatusDraft",
        ].join(""),
      );
      if (count > 2)
        expect(text(nodes(card, (node) => node.type === "details"))).toContain(
          "Third kindfirst",
        );
      const unrelated = runtime.definition.entities.find(
        (candidate: any) => candidate.key !== primary.key,
      );
      expect(runtime.decisionIdentityFields(unrelated, record)).toEqual([]);
      expect(
        nodes(rows(runtime, unrelated), (node) => node.type === "h3"),
      ).toEqual([]);
    },
  );

  it("does not infer currency presentation from a generic enum field key", () => {
    const input = publicationInput();
    input.graph.domain.seedData = [];
    const primary = primaryEntity(input.graph);
    primary.fields.find((field) => field.key === "channel")!.key = "amount";
    const runtime = loadRuntime(compile(input).source, [
      {
        id: "record-1",
        articleTitle: "A title",
        amount: "blog",
        status: "draft",
      },
    ]);
    const entity = runtime.definition.entities.find(
      (candidate: any) => candidate.key === primary.key,
    );
    const [card] = rows(runtime, entity);
    expect(
      nodes(card, (node) => node.props.className === "approval-summary-amount"),
    ).toEqual([]);
    expect(
      text(
        nodes(
          card,
          (node) => node.props.className === "approval-summary-support",
        ),
      ),
    ).toBe("Amountblog");
  });

  it.each(["id", "version", "createdAt", "updatedAt"])(
    "retains the correction selector's rejection of declared reserved field %s",
    (key) => {
      const input = publicationInput();
      primaryEntity(input.graph).fields.push({
        key,
        type: "string",
        required: true,
      });
      expect(() => compile(input)).toThrow();
    },
  );

  it("uses safe values and the entity/record fallback when a history match is missing", () => {
    const input = publicationInput();
    const record = {
      id: "record-1",
      articleTitle: { hidden: "untrusted-object-content" },
      channel: ["untrusted-array-content"],
      contentBody: { hidden: "untrusted-detail-content" },
      status: "draft",
    };
    const { source } = compile(input);
    const runtime = loadRuntime(source, [record]);
    const entity = runtime.definition.entities.find(
      (candidate: any) => candidate.key === primaryEntity(input.graph).key,
    );
    const history = runtime.DecisionHistoryRow({
      entity,
      event: eventFor(entity),
      record,
    });
    for (const row of [rows(runtime, entity)[0], history]) {
      expect(text(row)).toContain("Structured value");
      expect(text(row)).not.toContain("untrusted-");
    }
    for (const value of [null, undefined, "", "  "]) {
      expect(
        runtime.decisionIdentityFields(entity, {
          articleTitle: value,
          channel: value,
        }),
      ).toEqual([]);
    }
    expect(
      runtime
        .decisionIdentityFields(entity, { articleTitle: 42, channel: false })
        .map((field: any) => field.key),
    ).toEqual(["articleTitle", "channel"]);
    const missing = runtime.DecisionHistoryRow({
      entity,
      event: eventFor(entity),
    });
    expect(text(nodes(missing, (node) => node.type === "h3"))).toBe(
      entity.label + " decision",
    );
    expect(text(missing)).toContain("Record ID: record-1");

    const resolveReact = (name: string) =>
      require(
        require.resolve(name, {
          paths: [join(__dirname, "../../../apps/workbench")],
        }),
      );
    const real: Record<string, any> = {};
    new Function(
      "require",
      "exports",
      transpileModule(source + "\nexport { DecisionHistoryRow };", {
        compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX },
      }).outputText,
    )(resolveReact, real);
    const markup = resolveReact("react-dom/server").renderToStaticMarkup(
      resolveReact("react").createElement(real.DecisionHistoryRow, {
        entity,
        event: eventFor(entity),
        record: {
          articleTitle: "<script>alert(1)</script>",
          channel: "<b>unsafe</b>",
        },
      }),
    );
    expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(markup).toContain("&lt;b&gt;unsafe&lt;/b&gt;");
    expect(markup).not.toContain("<script>");
  });
});
