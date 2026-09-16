import { createRequire } from "node:module";
import { posix } from "node:path";
import { ModuleKind, JsxEmit, transpileModule } from "typescript";
import { describe, it, expect } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { semanticFingerprint } from "../../adapters/src/requirements/definition-family-registry.js";
import { generateApplicationBundle } from "../src/index.js";
import {
  positive,
  numericDefinition as definition,
  numericInput as input,
} from "./fixtures/approval-numeric-domain.js";
const nodeRequire = createRequire(import.meta.url);
function runtime(fixture = input()) {
  const bundle = generateApplicationBundle(fixture);
  const cache = new Map<string, any>();
  function load(path: string): any {
    if (cache.has(path)) return cache.get(path);
    const source = bundle.files.find((f) => f.path === path)!.content;
    const exports: any = {};
    cache.set(path, exports);
    new Function(
      "require",
      "exports",
      transpileModule(source, {
        compilerOptions: { module: ModuleKind.CommonJS, target: 99 },
      }).outputText,
    )(
      (name: string) =>
        name.startsWith(".")
          ? load(
              posix.normalize(
                posix.join(posix.dirname(path), name.replace(/\.js$/, ".ts")),
              ),
            )
          : nodeRequire(name),
      exports,
    );
    return exports;
  }
  return { ...load("api/src/application-runtime.ts"), bundle };
}
const values = {
  courseTitle: "A course",
  fee: 125.5,
  sessionDate: "2026-09-12",
  justification: "Useful course",
};
describe("numeric-domain pipeline", () => {
  it("preserves reviewed policies through selection, fingerprint and composition", () => {
    const a = definition();
    const b = definition({
      ...positive,
      maximum: { value: 200, inclusive: true },
    });
    expect(semanticFingerprint(a)).not.toBe(semanticFingerprint(b));
    const published = input();
    expect(
      published.graph.domain.entities[0]!.fields.find((f) => f.key === "fee")!
        .numericDomain,
    ).toEqual(positive);
    expect(published.graph.domain.seedData![0]!.values.fee).toBe(125.5);
  });
  it("rejects a domain incompatible with unchanged composition witnesses", () => {
    expect(() =>
      input({ ...positive, minimum: { value: 200, inclusive: false } }),
    ).toThrow();
  });
  it("emits deterministic numeric identity and shared summaries", () => {
    const published = input();
    const one = generateApplicationBundle(published),
      two = generateApplicationBundle(published);
    expect(one).toEqual(two);
    const source = one.files.find(
      (f) => f.path === "web/app/page-runtime.tsx",
    )!.content;
    expect(source).toContain("approval-workspace-presentation@2.3.0");
    expect(source).toContain("approval-record-identity/v2");
    expect(source).toContain("factory.generated.approval-numeric-domain/v1");
    const exports: any = {};
    new Function(
      "require",
      "exports",
      transpileModule(
        source +
          "\nexport {definition,formPayload,FieldControl,approvalRecordIdentity};",
        {
          compilerOptions: {
            module: ModuleKind.CommonJS,
            jsx: JsxEmit.ReactJSX,
            target: 99,
          },
        },
      ).outputText,
    )(
      (name: string) =>
        name === "react"
          ? {}
          : {
              jsx: (type: any, props: any) => ({ type, props }),
              jsxs: (type: any, props: any) => ({ type, props }),
            },
      exports,
    );
    expect(exports.approvalRecordIdentity.summaryFieldKeys).toEqual([
      "fee",
      "sessionDate",
    ]);
    const field = exports.definition.entities[0].fields.find(
      (f: any) => f.key === "fee",
    );
    expect(
      exports.FieldControl({ field, value: "0", id: "fee", onChange() {} })
        .props,
    ).toMatchObject({ min: 0, step: "any" });
    expect(() => exports.formPayload([field], { fee: "0" })).toThrow(
      /Fee.*greater than 0/,
    );
    expect(exports.formPayload([field], { fee: "0.0000001" })).toEqual({
      fee: 0.0000001,
    });
  });
  it.each([0, -1, "1", " ", true, null, {}, [], NaN, Infinity])(
    "rejects invalid create %j with no writes",
    async (fee) => {
      const { ApplicationRuntime, InMemoryRecordStore } = runtime();
      const store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store);
      const fixture = input(),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      const before = await store.list(entity);
      await expect(
        app.approvalCommand(
          role,
          role,
          entity,
          undefined,
          "create",
          "invalid",
          { values: { ...values, fee } },
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.list(entity)).toEqual(before);
      expect(await store.listAudit()).toEqual([]);
    },
  );
  it("validates full stored records at submit and allows correction/retry with concurrency intact", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = runtime();
    const store = new InMemoryRecordStore(),
      app = new ApplicationRuntime(store);
    const entity = input().graph.domain.entities[0]!.key;
    const role = input().graph.policy.roles[0]!;
    const cmd = (operation: string, key: string, body: unknown, id?: string) =>
      app.approvalCommand(role, role, entity, id, operation, key, body);
    const created = await cmd("create", "create", { values });
    await store.update(entity, created.body.id, { fee: "0" });
    await expect(
      cmd("submit", "bad-submit", { expectedVersion: 0 }, created.body.id),
    ).rejects.toMatchObject({ status: 400 });
    expect((await store.find(entity, created.body.id)).version).toBe(0);
    const fixed = await cmd(
      "update",
      "fix",
      { expectedVersion: 0, values: { fee: 1e-7 } },
      created.body.id,
    );
    expect(
      await cmd(
        "update",
        "fix",
        { expectedVersion: 0, values: { fee: 1e-7 } },
        created.body.id,
      ),
    ).toEqual(fixed);
    await expect(
      cmd(
        "update",
        "stale",
        { expectedVersion: 0, values: { fee: 1 } },
        created.body.id,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await cmd("submit", "submit", { expectedVersion: 1 }, created.body.id))
        .body.status,
    ).toBe("submitted");
  });
});
it("rejects malformed client numeric strings before payload construction", () => {
  const { bundle } = runtime();
  const source = bundle.files.find(
    (f) => f.path === "web/app/page-runtime.tsx",
  )!.content;
  const exports: any = {};
  new Function(
    "require",
    "exports",
    transpileModule(source + "\nexport {definition,formPayload};", {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        jsx: JsxEmit.ReactJSX,
        target: 99,
      },
    }).outputText,
  )(() => ({}), exports);
  const field = exports.definition.entities[0].fields.find(
    (f: any) => f.key === "fee",
  );
  for (const fee of ["0x10", " 12 ", "Infinity", "1e", "NaN"])
    expect(() => exports.formPayload([field], { fee })).toThrow();
});
function webRuntime(
  fixture = input(),
  initialValues: Record<string, unknown> = {},
) {
  const source = generateApplicationBundle(fixture).files.find(
    (f) => f.path === "web/app/page-runtime.tsx",
  )!.content;
  const exports: any = {},
    messages: unknown[] = [];
  let state = 0;
  const react = {
    useState(value: any) {
      const index = state++;
      return [
        index === 0
          ? initialValues
          : typeof value === "function"
            ? value()
            : value,
        (v: unknown) => messages.push(v),
      ];
    },
    useRef(value: any) {
      return { current: value };
    },
    useEffect() {},
    useCallback(value: any) {
      return value;
    },
  };
  const jsx = (type: any, props: any) => ({ type, props });
  new Function(
    "require",
    "exports",
    transpileModule(
      source +
        "\nexport {definition,FormBlock,FieldControl,formPayload,decisionIdentityFields,selectSummaryFields};",
      {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          jsx: JsxEmit.ReactJSX,
          target: 99,
        },
      },
    ).outputText,
  )((name: string) => (name === "react" ? react : { jsx, jsxs: jsx }), exports);
  return { ...exports, messages };
}
function findNode(node: any, type: string): any {
  if (Array.isArray(node))
    return node.map((n) => findNode(n, type)).find(Boolean);
  if (!node || typeof node !== "object") return undefined;
  return node.type === type ? node : findNode(node.props?.children, type);
}
function refreshLock(fixture: ReturnType<typeof input>) {
  fixture.compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(fixture.graph),
    selections: fixture.compositionLock.packages,
  });
  return fixture;
}
describe("numeric runtime boundaries", () => {
  it.each([
    "missing-title",
    "ambiguous-title",
    "missing-date",
    "ambiguous-date",
    "multiple-domains",
    "secondary-domain",
    "unknown-target",
  ])("fails closed for %s", (kind) => {
    const fixture = input(),
      entity = fixture.graph.domain.entities[0]!;
    const seed = fixture.graph.domain.seedData![0]!;
    if (kind === "missing-title")
      entity.fields.find((f) => f.key === "courseTitle")!.type = "text";
    if (kind === "ambiguous-title") {
      entity.fields.push({ key: "otherTitle", type: "string", required: true });
      seed.values.otherTitle = "Other";
    }
    if (kind === "missing-date")
      entity.fields.find((f) => f.key === "sessionDate")!.required = false;
    if (kind === "ambiguous-date") {
      entity.fields.push({ key: "otherDate", type: "date", required: true });
      seed.values.otherDate = "2026-09-12";
    }
    if (kind === "multiple-domains") {
      entity.fields.push({
        key: "otherFee",
        type: "decimal",
        required: true,
        numericDomain: positive,
      });
      seed.values.otherFee = 1;
    }
    if (kind === "secondary-domain") {
      fixture.graph.domain.entities[1]!.fields.push({
        key: "otherFee",
        type: "decimal",
        required: false,
        numericDomain: positive,
      });
      fixture.graph.domain.seedData!.push({
        entity: fixture.graph.domain.entities[1]!.key,
        id: "numeric-witness",
        values: { otherFee: 1 },
      });
    }
    if (kind === "unknown-target") {
      fixture.graph.flow.flows = [];
    }
    expect(() => generateApplicationBundle(refreshLock(fixture))).toThrow();
  });
  it.each([1.5, 2147483648, -2147483649, 3000000000, Number.MAX_SAFE_INTEGER])(
    "rejects non-Int32 policy integer %s",
    async (fee) => {
      const fixture = input(positive, "number"),
        { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
        store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      await expect(
        app.approvalCommand(role, role, entity, undefined, "create", "int", {
          values: { ...values, fee },
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.listAudit()).toEqual([]);
    },
  );
  it("enforces inclusive and exclusive integer native bounds and the same API interval", async () => {
    const domain = {
        apiVersion: "factory.numeric-field-domain/v1" as const,
        minimum: { value: 0, inclusive: false },
        maximum: { value: 13, inclusive: false },
      },
      fixture = input(domain, "number");
    const web = webRuntime(fixture),
      field = web.definition.entities[0].fields.find(
        (f: any) => f.key === "fee",
      );
    expect(
      web.FieldControl({ field, value: "12", id: "n", onChange() {} }).props,
    ).toMatchObject({ min: 1, max: 12, step: 1 });
    const { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
      app = new ApplicationRuntime(new InMemoryRecordStore()),
      entity = fixture.graph.domain.entities[0]!.key,
      role = fixture.graph.policy.roles[0]!;
    for (const fee of [1, 12])
      expect(
        (
          await app.approvalCommand(
            role,
            role,
            entity,
            undefined,
            "create",
            "int-" + fee,
            { values: { ...values, fee } },
          )
        ).body.fee,
      ).toBe(fee);
    await expect(
      app.approvalCommand(role, role, entity, undefined, "create", "int-13", {
        values: { ...values, fee: 13 },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("does not fetch when the generated create form rejects an exclusive bound", async () => {
    const fixture = input(),
      web = webRuntime(fixture, { ...values, fee: "0" }),
      entity = web.definition.entities[0],
      oldFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
      requests++;
      throw new Error("Unexpected network request");
    };
    try {
      const tree = web.FormBlock({
        block: { id: "create", props: {} },
        entity,
        role: fixture.graph.policy.roles[0],
        reportError() {},
      });
      findNode(tree, "form").props.onSubmit({ preventDefault() {} });
      await Promise.resolve();
      expect(requests).toBe(0);
      expect(web.messages).toContain("Fee must be greater than 0.");
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
  it("projects the same title and ordered numeric/date summaries into matched history", () => {
    const fixture = input(),
      web = webRuntime(fixture),
      entity = web.definition.entities[0];
    expect(web.selectSummaryFields(entity.fields, entity.key)).toEqual([
      "fee",
      "sessionDate",
    ]);
    expect(
      web.decisionIdentityFields(entity, values).map((f: any) => f.key),
    ).toEqual(["courseTitle", "fee", "sessionDate"]);
  });
  it.each([
    " 1",
    "1 ",
    "",
    "NaN",
    "Infinity",
    "0x10",
    true,
    null,
    {},
    "0",
    "-1",
  ])(
    "rejects malformed or out-of-domain trusted stored decimal %j",
    async (fee) => {
      const fixture = input(),
        { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
        store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      const created = await app.approvalCommand(
        role,
        role,
        entity,
        undefined,
        "create",
        "create",
        { values },
      );
      await store.update(entity, created.body.id, { fee });
      const before = await store.listAudit();
      await expect(
        app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "submit",
          "submit",
          { expectedVersion: 0 },
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.listAudit()).toEqual(before);
      expect((await store.find(entity, created.body.id)).version).toBe(0);
    },
  );
  it("rejects replayed submit after authoritative data was tampered and validates required fields", async () => {
    const fixture = input(),
      { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
      store = new InMemoryRecordStore(),
      app = new ApplicationRuntime(store),
      entity = fixture.graph.domain.entities[0]!.key,
      role = fixture.graph.policy.roles[0]!;
    const created = await app.approvalCommand(
      role,
      role,
      entity,
      undefined,
      "create",
      "create",
      { values },
    );
    await store.update(entity, created.body.id, { fee: "1e-7" });
    const submitted = await app.approvalCommand(
      role,
      role,
      entity,
      created.body.id,
      "submit",
      "submit",
      { expectedVersion: 0 },
    );
    expect(submitted.body.fee).toBe(1e-7);
    await store.update(entity, created.body.id, { justification: "" });
    await expect(
      app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "submit",
        "submit",
        { expectedVersion: 0 },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect((await store.listAudit()).length).toBe(2);
  });
  it("rolls back invalid persisted create/update results and retains no idempotency receipt", async () => {
    const fixture = input(),
      { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
      store = new InMemoryRecordStore(),
      app = new ApplicationRuntime(store),
      entity = fixture.graph.domain.entities[0]!.key,
      role = fixture.graph.policy.roles[0]!;
    const original = store.inTransaction.bind(store);
    let corrupt = true;
    store.inTransaction = (operation: any) =>
      original(async (tx: any) => {
        for (const method of ["create", "conditionalApprovalUpdate"]) {
          const write = tx[method].bind(tx);
          tx[method] = async (...args: any[]) => {
            const record = await write(...args);
            if (corrupt && record) {
              await tx.update(entity, record.id, { fee: "0" });
              return { ...record, fee: "0" };
            }
            return record;
          };
        }
        return operation(tx);
      });
    const before = await store.list(entity);
    await expect(
      app.approvalCommand(role, role, entity, undefined, "create", "create", {
        values,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await store.list(entity)).toEqual(before);
    expect(await store.listAudit()).toEqual([]);
    corrupt = false;
    const created = await app.approvalCommand(
      role,
      role,
      entity,
      undefined,
      "create",
      "create",
      { values },
    );
    corrupt = true;
    await expect(
      app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "update",
        "update",
        { expectedVersion: 0, values: { fee: 1 } },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect((await store.find(entity, created.body.id)).version).toBe(0);
    expect((await store.listAudit()).length).toBe(1);
    corrupt = false;
    expect(
      (
        await app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "update",
          "update",
          { expectedVersion: 0, values: { fee: 1 } },
        )
      ).body.version,
    ).toBe(1);
  });
  it("authorizes before numeric validation without reading an unauthorized record", async () => {
    const fixture = input(),
      { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
      store = new InMemoryRecordStore(),
      app = new ApplicationRuntime(store),
      entity = fixture.graph.domain.entities[0]!.key;
    store.find = () => {
      throw new Error("Unauthorized read");
    };
    await expect(
      app.approvalCommand(
        "unknown",
        "unknown",
        entity,
        "missing",
        "submit",
        "key",
        { expectedVersion: 0 },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
it("checks state authority before reporting stored numeric validation", async () => {
  const fixture = input(),
    { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
    store = new InMemoryRecordStore(),
    app = new ApplicationRuntime(store),
    entity = fixture.graph.domain.entities[0]!.key,
    role = fixture.graph.policy.roles[0]!;
  const created = await app.approvalCommand(
    role,
    role,
    entity,
    undefined,
    "create",
    "created",
    { values },
  );
  await store.update(entity, created.body.id, { status: "approved", fee: 0 });
  await expect(
    app.approvalCommand(
      role,
      role,
      entity,
      created.body.id,
      "submit",
      "new-submit",
      { expectedVersion: 0 },
    ),
  ).rejects.toMatchObject({ status: 403 });
});
it("rejects direct invalid updates without a version, audit, or receipt and permits same-key correction", async () => {
  const fixture = input(),
    { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
    store = new InMemoryRecordStore(),
    app = new ApplicationRuntime(store),
    entity = fixture.graph.domain.entities[0]!.key,
    role = fixture.graph.policy.roles[0]!;
  const created = await app.approvalCommand(
    role,
    role,
    entity,
    undefined,
    "create",
    "created",
    { values },
  );
  for (const fee of [0, -1, "1", " ", true, null, {}, [], Infinity, NaN]) {
    await expect(
      app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "update",
        "edit",
        { expectedVersion: 0, values: { fee } },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect((await store.find(entity, created.body.id)).version).toBe(0);
    expect((await store.listAudit()).length).toBe(1);
  }
  expect(
    (
      await app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "update",
        "edit",
        { expectedVersion: 0, values: { fee: 2 } },
      )
    ).body.version,
  ).toBe(1);
});
it("preserves optional nulls and enforces inclusive decimal maximums", async () => {
  const fixture = input({
    ...positive,
    maximum: { value: 125.5, inclusive: true },
  });
  fixture.graph.domain.entities[0]!.fields.find(
    (f) => f.key === "fee",
  )!.required = false;
  refreshLock(fixture);
  const { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
    store = new InMemoryRecordStore(),
    app = new ApplicationRuntime(store),
    entity = fixture.graph.domain.entities[0]!.key,
    role = fixture.graph.policy.roles[0]!;
  for (const fee of [null, 125.5]) {
    const created = await app.approvalCommand(
      role,
      role,
      entity,
      undefined,
      "create",
      "optional-" + fee,
      { values: { ...values, fee } },
    );
    expect(
      (
        await app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "submit",
          "submit-" + fee,
          { expectedVersion: 0 },
        )
      ).body.status,
    ).toBe("submitted");
  }
  await expect(
    app.approvalCommand(role, role, entity, undefined, "create", "high", {
      values: { ...values, fee: 125.5001 },
    }),
  ).rejects.toMatchObject({ status: 400 });
  const web = webRuntime(fixture),
    field = web.definition.entities[0].fields.find((f: any) => f.key === "fee");
  expect(
    web.FieldControl({ field, value: "", id: "fee", onChange() {} }).props,
  ).toMatchObject({ min: 0, max: 125.5, step: "any", required: false });
  expect(() => web.formPayload([field], { fee: "125.5001" })).toThrow(
    /at most 125.5/,
  );
});
describe("trusted Decimal exact policy boundaries", () => {
  function bounded(
    bound: "minimum" | "maximum",
    value: number,
    inclusive: boolean,
  ) {
    const fixture = input();
    fixture.graph.domain.entities[0]!.fields.find(
      (f) => f.key === "fee",
    )!.numericDomain = {
      apiVersion: "factory.numeric-field-domain/v1",
      [bound]: { value, inclusive },
    };
    fixture.graph.domain.seedData![0]!.values.fee =
      bound === "maximum" ? value - 1 : value + 1;
    return refreshLock(fixture);
  }
  it.each([
    ["maximum", 125.5, true, "125.50000000000000001"],
    ["minimum", 125.5, true, "125.49999999999999999"],
    ["maximum", 125.5, true, "1.2550000000000000001e2"],
    ["minimum", 125.5, true, "12549999999999999999e-17"],
    ["maximum", -125.5, true, "-125.49999999999999999"],
    ["minimum", -125.5, true, "-125.50000000000000001"],
    ["minimum", 1, true, "0.99999999999999999"],
    ["minimum", 1, false, "1.000e0"],
    ["maximum", 1, false, "100e-2"],
    ["maximum", 1, false, "1.00000000000000001"],
    ["minimum", 1, false, "0.99999999999999999"],
    ["maximum", Number.MAX_VALUE, true, "1.79769313486231570000001e308"],
    ["minimum", Number.MIN_VALUE, true, "4.99999999999999999e-324"],
  ] as const)(
    "rejects exact persisted %s bound violation before rounding %s %s %s",
    async (bound, boundary, inclusive, fee) => {
      const fixture = bounded(bound, boundary, inclusive),
        { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
        store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      const initial = bound === "maximum" ? boundary - 1 : boundary + 1;
      const created = await app.approvalCommand(
        role,
        role,
        entity,
        undefined,
        "create",
        "create",
        { values: { ...values, fee: initial } },
      );
      await store.update(entity, created.body.id, { fee });
      const before = await store.listAudit();
      await expect(
        app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "submit",
          "submit",
          { expectedVersion: 0 },
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.listAudit()).toEqual(before);
      expect((await store.find(entity, created.body.id)).version).toBe(0);
    },
  );
  it.each([
    ["minimum", 1, false, "1.00000000000000001", 1],
    ["maximum", 1, false, "0.99999999999999999", 1],
    ["minimum", 1, false, "100000000000000001e-17", 1],
    ["maximum", 125.5, true, "125.5000", 125.5],
    ["minimum", 125.5, true, "1.255e+2", 125.5],
    ["maximum", -125.5, true, "-125.5000", -125.5],
    ["minimum", 0, false, "5e-324", Number.MIN_VALUE],
    ["minimum", 0, false, "1.7976931348623157e308", Number.MAX_VALUE],
    ["minimum", 0, true, "-0.000e+300", 0],
  ] as const)(
    "accepts exact valid persisted %s bound %s %s %s",
    async (bound, boundary, inclusive, fee, expected) => {
      const fixture = bounded(bound, boundary, inclusive),
        { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
        store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      const created = await app.approvalCommand(
        role,
        role,
        entity,
        undefined,
        "create",
        "create",
        {
          values: {
            ...values,
            fee: bound === "maximum" ? boundary - 1 : boundary + 1,
          },
        },
      );
      await store.update(entity, created.body.id, { fee });
      const result = await app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "submit",
        "submit",
        { expectedVersion: 0 },
      );
      expect(result.body.fee).toBe(expected);
      expect(
        await app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "submit",
          "submit",
          { expectedVersion: 0 },
        ),
      ).toEqual(result);
      expect((await store.listAudit()).length).toBe(2);
    },
  );
  it.each(["constructor", "toString"])(
    "permits omitted optional constrained %s without inherited-value validation",
    async (key) => {
      const fixture = input(),
        field = fixture.graph.domain.entities[0]!.fields.find(
          (f) => f.key === "fee",
        )!;
      field.key = key;
      field.required = false;
      const seed = fixture.graph.domain.seedData![0]!.values;
      delete seed.fee;
      Object.defineProperty(seed, key, {
        value: 125.5,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      refreshLock(fixture);
      const { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
        store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      const { fee, ...omitted } = values;
      const created = await app.approvalCommand(
        role,
        role,
        entity,
        undefined,
        "create",
        "create",
        { values: omitted },
      );
      expect(
        (
          await app.approvalCommand(
            role,
            role,
            entity,
            created.body.id,
            "submit",
            "submit",
            { expectedVersion: 0 },
          )
        ).body.status,
      ).toBe("submitted");
      expect((await store.listAudit()).length).toBe(2);
    },
  );
});
describe("exact persisted Decimal transaction validation", () => {
  const policy = {
    apiVersion: "factory.numeric-field-domain/v1" as const,
    minimum: { value: 1, inclusive: true },
    maximum: { value: 125.5, inclusive: true },
  };
  it.each(["125.50000000000000001", "0.99999999999999999"])(
    "rolls back precision-adjacent persisted create/update %s and permits a same-key valid retry",
    async (fee) => {
      const fixture = input(policy),
        { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
        store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      const original = store.inTransaction.bind(store);
      let corrupt = true;
      store.inTransaction = (operation: any) =>
        original(async (tx: any) => {
          for (const method of ["create", "conditionalApprovalUpdate"]) {
            const write = tx[method].bind(tx);
            tx[method] = async (...args: any[]) => {
              const record = await write(...args);
              if (corrupt && record) {
                await tx.update(entity, record.id, { fee });
                return { ...record, fee };
              }
              return record;
            };
          }
          return operation(tx);
        });
      const before = await store.list(entity);
      await expect(
        app.approvalCommand(role, role, entity, undefined, "create", "create", {
          values,
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.list(entity)).toEqual(before);
      expect(await store.listAudit()).toEqual([]);
      corrupt = false;
      const created = await app.approvalCommand(
        role,
        role,
        entity,
        undefined,
        "create",
        "create",
        { values },
      );
      corrupt = true;
      await expect(
        app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "update",
          "edit",
          { expectedVersion: 0, values: { fee: 1 } },
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect((await store.find(entity, created.body.id)).version).toBe(0);
      expect((await store.find(entity, created.body.id)).fee).toBe(125.5);
      expect((await store.listAudit()).length).toBe(1);
      corrupt = false;
      const edited = await app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "update",
        "edit",
        { expectedVersion: 0, values: { fee: 1 } },
      );
      expect(edited.body.version).toBe(1);
      expect(
        await app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "update",
          "edit",
          { expectedVersion: 0, values: { fee: 1 } },
        ),
      ).toEqual(edited);
      expect((await store.listAudit()).length).toBe(2);
    },
  );
  it.each(["125.50000000000000001", "0.99999999999999999"])(
    "blocks precision-adjacent tampered submit replay %s with unchanged evidence",
    async (fee) => {
      const fixture = input(policy),
        { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
        store = new InMemoryRecordStore(),
        app = new ApplicationRuntime(store),
        entity = fixture.graph.domain.entities[0]!.key,
        role = fixture.graph.policy.roles[0]!;
      const created = await app.approvalCommand(
        role,
        role,
        entity,
        undefined,
        "create",
        "create",
        { values },
      );
      const submitted = await app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "submit",
        "submit",
        { expectedVersion: 0 },
      );
      await store.update(entity, created.body.id, { fee });
      const before = await store.listAudit();
      await expect(
        app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "submit",
          "submit",
          { expectedVersion: 0 },
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.listAudit()).toEqual(before);
      expect((await store.find(entity, created.body.id)).version).toBe(1);
      await store.update(entity, created.body.id, { fee: "125.5000" });
      expect(
        await app.approvalCommand(
          role,
          role,
          entity,
          created.body.id,
          "submit",
          "submit",
          { expectedVersion: 0 },
        ),
      ).toEqual(submitted);
      expect(await store.listAudit()).toEqual(before);
    },
  );
  it("checks exact trusted Decimal object representations without coercing request objects", async () => {
    const fixture = input(policy),
      { ApplicationRuntime, InMemoryRecordStore } = runtime(fixture),
      store = new InMemoryRecordStore(),
      app = new ApplicationRuntime(store),
      entity = fixture.graph.domain.entities[0]!.key,
      role = fixture.graph.policy.roles[0]!;
    let reads = 0;
    const decimal = {
      toString() {
        reads++;
        return "125.50000000000000001";
      },
    };
    await expect(
      app.approvalCommand(
        role,
        role,
        entity,
        undefined,
        "create",
        "bad-object",
        { values: { ...values, fee: decimal } },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(reads).toBe(0);
    const created = await app.approvalCommand(
      role,
      role,
      entity,
      undefined,
      "create",
      "create",
      { values },
    );
    const original = store.inTransaction.bind(store);
    store.inTransaction = (operation: any) =>
      original(async (tx: any) => {
        const find = tx.find.bind(tx);
        tx.find = async (...args: any[]) => {
          const record = await find(...args);
          return record ? { ...record, fee: decimal } : record;
        };
        return operation(tx);
      });
    await expect(
      app.approvalCommand(
        role,
        role,
        entity,
        created.body.id,
        "submit",
        "submit",
        { expectedVersion: 0 },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(reads).toBe(1);
    expect((await store.listAudit()).length).toBe(1);
  });
});
