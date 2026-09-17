import { createRequire } from "node:module";
import { posix, join } from "node:path";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { ModuleKind, JsxEmit, transpileModule } from "typescript";
import { describe, it, expect } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import {
  generateApplicationBundle,
  buildCompilationInput,
} from "../src/index.js";
import { calculatedInput } from "./fixtures/approval-calculated-total.js";

const nodeRequire = createRequire(import.meta.url);
const prismaRequire = createRequire(
  join(__dirname, "../../../apps/control-plane/package.json"),
);
function runtime() {
  const input = calculatedInput(),
    bundle = generateApplicationBundle(input);
  const cache = new Map<string, any>();
  function load(path: string): any {
    if (cache.has(path)) return cache.get(path);
    const exports: any = {};
    cache.set(path, exports);
    const source = bundle.files.find((f) => f.path === path)!.content;
    new Function(
      "require",
      "exports",
      transpileModule(source, {
        compilerOptions: { module: ModuleKind.CommonJS, target: 99 },
      }).outputText,
    )((name: string) => {
      const resolved = posix.normalize(posix.join(posix.dirname(path), name));
      return name.startsWith(".")
        ? load(
            bundle.files.some((f) => f.path === resolved)
              ? resolved
              : resolved.replace(/\.js$/, ".ts"),
          )
        : name === "@prisma/client"
          ? prismaRequire(name)
          : nodeRequire(name);
    }, exports);
    return exports;
  }
  const { ApplicationRuntime, InMemoryRecordStore } = load(
    "api/src/application-runtime.ts",
  );
  const store = new InMemoryRecordStore(),
    app = new ApplicationRuntime(store);
  const entity = input.graph.domain.entities[0]!.key,
    role = input.graph.policy.roles[0]!;
  const command = (
    operation: string,
    key: string,
    body: unknown,
    id?: string,
  ) => app.approvalCommand(role, role, entity, id, operation, key, body);
  return { input, bundle, store, app, entity, role, command, load };
}
const values = {
  itemName: "Laptop",
  quantity: 3,
  unitPrice: 0.1,
  justification: "Replacement",
};
function webRuntime() {
  const bundle = generateApplicationBundle(calculatedInput()),
    source = bundle.files.find(
      (f) => f.path === "web/app/page-runtime.tsx",
    )!.content;
  const exports: any = {};
  const math: any = {};
  new Function(
    "exports",
    transpileModule(
      bundle.files.find(
        (f) => f.path === "web/app/calculated-request-total.js",
      )!.content,
      { compilerOptions: { module: ModuleKind.CommonJS, target: 99 } },
    ).outputText,
  )(math);
  const jsx = (type: any, props: any) => ({ type, props });
  new Function(
    "require",
    "exports",
    transpileModule(
      source +
        "\nexport {definition,formPayload,FieldControl,approvalRecordIdentity,decisionHistoryPayload};",
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
        : name === "./calculated-request-total.js"
          ? math
          : { jsx, jsxs: jsx },
    exports,
  );
  return exports;
}
describe("calculated Approval emitted runtime", () => {
  it.each(["author", "audit"])(
    "keeps calculated labels and useful records within the complete %s workspace",
    async (scope) => {
      const input = calculatedInput(),
        bundle = generateApplicationBundle(input),
        source = bundle.files.find(
          (f) => f.path === "web/app/page-runtime.tsx",
        )!.content,
        css = bundle.files.find(
          (f) => f.path === "web/app/globals.css",
        )!.content;
      const reactRequire = createRequire(
          join(__dirname, "../../../apps/workbench/package.json"),
        ),
        React = reactRequire("react"),
        record = {
          id: "label-check",
          ...input.graph.domain.seedData![0]!.values,
          version: 0,
        },
        records = [
          record,
          {
            ...record,
            id: "corrected",
            itemName: "Adjustable shared-workspace desks",
            quantity: 5,
            unitPrice: 299.5,
            total: 1497.5,
            status: "approved",
            version: 7,
          },
          {
            ...record,
            id: "additional",
            itemName: "Meeting-room display stands",
            quantity: 2,
            unitPrice: 89.9,
            total: 179.8,
            status: "approved",
            version: 2,
          },
        ];
      const hooks = {
          ...React,
          useState: (initial: unknown) => [
            Array.isArray(initial)
              ? records
              : initial === true
                ? false
                : initial === input.graph.policy.roles[0] && scope === "audit"
                  ? input.graph.policy.roles[2]
                  : typeof initial === "function"
                    ? initial()
                    : initial,
            () => {},
          ],
        },
        exports: any = {},
        math: any = {};
      new Function(
        "exports",
        transpileModule(
          bundle.files.find(
            (f) => f.path === "web/app/calculated-request-total.js",
          )!.content,
          { compilerOptions: { module: ModuleKind.CommonJS, target: 99 } },
        ).outputText,
      )(math);
      new Function(
        "require",
        "exports",
        transpileModule(source + "\nexport {definition,EntityRecords};", {
          compilerOptions: {
            module: ModuleKind.CommonJS,
            jsx: JsxEmit.ReactJSX,
            target: 99,
          },
        }).outputText,
      )(
        (name: string) =>
          name === "react"
            ? hooks
            : name === "./calculated-request-total.js"
              ? math
              : reactRequire(name),
        exports,
      );
      const html = reactRequire("react-dom/server").renderToStaticMarkup(
        React.createElement(exports.GeneratedApplication, {
          requestedPath: "/submission-list",
        }),
      );
      const browser = await nodeRequire("@playwright/test").chromium.launch({
        headless: true,
      });
      try {
        const page = await browser.newPage();
        await page.route("**/*", (route: any) => route.abort());
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.setContent(`<style>${css}</style>${html}`);
          if (scope === "author") {
            const submit = page
              .getByRole("button", { name: "Submit", exact: true })
              .first();
            const actionBox = await submit.boundingBox();
            expect(actionBox).not.toBeNull();
            expect(actionBox!.height).toBeGreaterThanOrEqual(44);
            expect(actionBox!.width).toBeGreaterThanOrEqual(44);
            expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(650);
          } else {
            expect(
              await page
                .locator(".approval-decision-history:not([open])")
                .count(),
            ).toBe(1);
            const secondSummary = await page
              .locator(".approval-summary")
              .nth(1)
              .boundingBox();
            expect(secondSummary).not.toBeNull();
            expect(secondSummary!.y).toBeGreaterThanOrEqual(0);
            expect(
              secondSummary!.y + secondSummary!.height,
            ).toBeLessThanOrEqual(900);
          }
          const summary = page.locator(".approval-summary").first();
          const labels = await summary
            .locator("dt")
            .evaluateAll((elements: HTMLElement[]) =>
              elements.slice(0, 3).map((element) => {
                const style = getComputedStyle(element),
                  rect = element.getBoundingClientRect();
                return {
                  text: element.textContent,
                  clip: style.clipPath,
                  overflow: style.overflow,
                  position: style.position,
                  fontSize: parseFloat(style.fontSize),
                  width: rect.width,
                  height: rect.height,
                };
              }),
            );
          expect(labels.map((label: any) => label.text)).toEqual([
            "Quantity",
            "Unit price",
            "Total",
          ]);
          for (const label of labels) {
            expect(label.clip).toBe("none");
            expect(label.position).not.toBe("absolute");
            expect(label.overflow).toBe("visible");
            expect(label.width).toBeGreaterThan(30);
            expect(label.height).toBeGreaterThan(12);
            expect(label.fontSize).toBeGreaterThanOrEqual(12);
          }
          const values = await summary
            .locator("dd")
            .evaluateAll((elements: HTMLElement[]) =>
              elements.slice(0, 3).map((element) => {
                const style = getComputedStyle(element);
                return {
                  size: parseFloat(style.fontSize),
                  weight: Number(style.fontWeight),
                  text: element.textContent,
                };
              }),
            );
          expect(values[2].size).toBeGreaterThan(values[0].size);
          expect(values[2].weight).toBeGreaterThanOrEqual(600);
          expect(values[2].text).toBe("1506");
        }
      } finally {
        await browser.close();
      }
    },
  );
  it("preserves alternate coherent decimal seeds through the emitted Prisma upsert", async () => {
    const input = calculatedInput();
    Object.assign(input.graph.domain.seedData![0]!.values, {
      quantity: 3,
      unitPrice: 0.07,
      total: 0.21,
    });
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.compositionLock.packages,
    });
    const source = generateApplicationBundle(input).files.find(
      (file) => file.path === "database/prisma/seed.ts",
    )!.content;
    const writes: { delegate: string; data: any }[] = [],
      exports: any = {};
    class PrismaClient {
      constructor() {
        return new Proxy(this, {
          get: (_target, delegate: string) => ({
            upsert: async (data: any) => {
              writes.push({ delegate, data });
            },
          }),
        });
      }
    }
    new Function(
      "require",
      "exports",
      transpileModule(source.slice(0, source.indexOf("void seed().catch")), {
        compilerOptions: { module: ModuleKind.CommonJS, target: 99 },
      }).outputText,
    )(() => ({ PrismaClient }), exports);
    await exports.seed();
    const row = writes.find(
      (write) => write.delegate === input.graph.domain.entities[0]!.key,
    )!;
    for (const data of [row.data.create, row.data.update])
      expect(data).toMatchObject({
        quantity: 3,
        unitPrice: "0.07",
        total: "0.21",
      });
  });
  it("preserves canonical decimal write encodings at the generated Prisma boundary", async () => {
    const { load, entity } = runtime(),
      { PrismaRecordStore } = load("api/src/prisma-record-store.ts");
    const writes: any[] = [];
    let row: any;
    const delegate = {
      async create({ data }: any) {
        writes.push(data);
        row = { id: "record", ...data };
        return row;
      },
      async update({ data }: any) {
        writes.push(data);
        row = { ...row, ...data };
        return row;
      },
      async updateMany({ data }: any) {
        writes.push(data);
        row = { ...row, ...data };
        return { count: 1 };
      },
      async findUnique() {
        return row;
      },
    };
    const store = new PrismaRecordStore({ [entity]: delegate });
    await store.create(entity, {
      ...values,
      unitPrice: 0.07,
      total: 0.21,
      status: "draft",
      version: 0,
    });
    await store.update(entity, "record", { unitPrice: 0.07, total: 0.21 });
    const result = await store.conditionalApprovalUpdate(
      entity,
      "record",
      "draft",
      0,
      { unitPrice: 0.07, total: 0.21, status: "draft", version: 1 },
    );
    for (const data of writes) {
      expect(data.unitPrice).toBe("0.07");
      expect(data.total).toBe("0.21");
    }
    expect(writes[0].quantity).toBe(3);
    expect(result).toMatchObject({
      unitPrice: "0.07",
      total: "0.21",
      version: 1,
    });
  });
  it("typechecks generated adapters and UI and emits the shared JavaScript module", () => {
    const bundle = generateApplicationBundle(calculatedInput()),
      directory = mkdtempSync(join(__dirname, ".typecheck-calculated-"));
    try {
      for (const file of bundle.files.filter(
        (f) =>
          f.path.startsWith("api/src/") ||
          f.path.startsWith("web/app/calculated-request-total.") ||
          f.path === "web/app/page-runtime.tsx",
      )) {
        const target = join(directory, file.path);
        mkdirSync(join(target, ".."), { recursive: true });
        writeFileSync(target, file.content);
      }
      writeFileSync(
        join(directory, "package.json"),
        JSON.stringify({ type: "module" }),
      );
      const config = JSON.parse(
        bundle.files.find((f) => f.path === "api/tsconfig.json")!.content,
      );
      config.compilerOptions.outDir = "build";
      config.compilerOptions.skipLibCheck = true;
      config.compilerOptions.jsx = "react-jsx";
      // Match the existing generated-source check's workspace dependency aliases.
      // The integration gate separately builds the untouched application tsconfigs.
      config.compilerOptions.module = "esnext";
      config.compilerOptions.moduleResolution = "bundler";
      config.compilerOptions.paths = {
        "@prisma/client": [
          join(
            __dirname,
            "../../../apps/control-plane/node_modules/@prisma/client",
          ),
        ],
        "@nestjs/*": [
          join(__dirname, "../../../apps/control-plane/node_modules/@nestjs/*"),
        ],
      };
      config.include = [
        "api/src/**/*.ts",
        "api/src/**/*.js",
        "web/app/**/*.tsx",
        "web/app/**/*.d.ts",
      ];
      writeFileSync(join(directory, "tsconfig.json"), JSON.stringify(config));
      const result = spawnSync(
        process.execPath,
        [
          nodeRequire.resolve("typescript/bin/tsc"),
          "-p",
          join(directory, "tsconfig.json"),
        ],
        { encoding: "utf8" },
      );
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(
        readFileSync(
          join(directory, "build/api/src/calculated-request-total.js"),
          "utf8",
        ),
      ).toContain("BigInt");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it.each([
    "missing-title",
    "ambiguous-title",
    "extra-numeric",
    "missing-witness",
    "incomplete-witness",
    "unknown-profile",
  ])("rejects unsupported %s in bundle and subtarget preparation", (kind) => {
    const input = calculatedInput(),
      entity = input.graph.domain.entities[0]!,
      seed = input.graph.domain.seedData![0]!;
    if (kind === "missing-title")
      entity.fields.find((f) => f.key === "itemName")!.type = "text";
    if (kind === "ambiguous-title") {
      entity.fields.push({ key: "otherTitle", type: "string", required: true });
      seed.values.otherTitle = "Other";
    }
    if (kind === "extra-numeric") {
      entity.fields.push({
        key: "otherNumber",
        type: "decimal",
        required: false,
      });
    }
    if (kind === "missing-witness") input.graph.domain.seedData = [];
    if (kind === "incomplete-witness") delete seed.values.justification;
    if (kind === "unknown-profile") input.graph.flow.flows = [];
    if (kind !== "missing-witness")
      input.compositionLock = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(input.graph),
        selections: input.compositionLock.packages,
      });
    expect(() => generateApplicationBundle(input)).toThrow();
    expect(() => buildCompilationInput(input)).toThrow();
  });
  it("derives exact totals and preserves the original create receipt after partial correction", async () => {
    const { command, bundle } = runtime();
    const created = await command("create", "create", { values });
    expect(created.body.total).toBe(0.3);
    const changed = await command(
      "update",
      "edit",
      { expectedVersion: 0, values: { unitPrice: 0.07 } },
      created.body.id,
    );
    expect(changed.body).toMatchObject({
      quantity: 3,
      unitPrice: 0.07,
      total: 0.21,
      version: 1,
    });
    expect(await command("create", "create", { values })).toEqual(created);
    const source = bundle.files.find(
      (f) => f.path === "web/app/page-runtime.tsx",
    )!.content;
    expect(source).toContain("approval-record-identity/v3");
    expect(source).toContain("approval-workspace-presentation@2.4.0");
  });
  it.each([null, 0.3, 99])(
    "rejects caller output %j without effects",
    async (total) => {
      const { command, store, entity } = runtime();
      const before = await store.list(entity);
      await expect(
        command("create", "forge", { values: { ...values, total } }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.list(entity)).toEqual(before);
      expect(await store.listAudit()).toEqual([]);
    },
  );
  it("rejects precision loss, rejects corrupt reads and allows an authorized total repair", async () => {
    const { command, store, entity, role, app } = runtime();
    await expect(
      command("create", "loss", {
        values: { ...values, unitPrice: 0.10000000000000002 },
      }),
    ).rejects.toMatchObject({ status: 400 });
    const created = await command("create", "good", { values });
    await store.update(entity, created.body.id, {
      total: "0.30000000000000000001",
    });
    for (const read of [
      () => app.list(role, entity),
      () => app.read(role, entity, created.body.id),
      () => app.approvalDecisionEvents(role, entity, created.body.id),
      () =>
        command("submit", "submit", { expectedVersion: 0 }, created.body.id),
    ])
      await expect(read()).rejects.toMatchObject({
        status: 409,
        body: { code: "approval.calculation_invalid_record" },
      });
    expect(
      (
        await command(
          "update",
          "repair",
          { expectedVersion: 0, values: { justification: "Repaired" } },
          created.body.id,
        )
      ).body.total,
    ).toBe(0.3);
  });
  it("shows exact operand-only unsaved previews and serializes writable values only", () => {
    const web = webRuntime(),
      fields = web.definition.entities[0].fields.filter(
        (f: any) => f.key !== "status",
      ),
      field = fields.find((f: any) => f.key === "total");
    const render = (quantity: string, unitPrice: string) =>
      web.FieldControl({
        field,
        fields,
        formValues: { quantity, unitPrice },
        value: "999",
        id: "total",
        onChange() {},
      });
    expect(render("3", "0.1").props.children[0]).toMatchObject({
      type: "output",
      props: { id: "total", children: "0.3" },
    });
    for (const [q, p] of [
      ["", "0.1"],
      ["3", "0.10000000000000002"],
      ["0x3", "0.1"],
    ])
      expect(render(q, p).props.children[0].props.children).toBe("Unavailable");
    expect(
      web.formPayload(fields, {
        ...values,
        quantity: "3",
        unitPrice: "0.07",
        total: "999",
      }),
    ).toEqual({ ...values, unitPrice: 0.07 });
    expect(() =>
      web.formPayload(fields, {
        ...values,
        quantity: "3",
        unitPrice: "0.10000000000000002",
      }),
    ).toThrow(/exactly representable/);
    expect(web.approvalRecordIdentity.summaryFieldKeys).toEqual([
      "quantity",
      "unitPrice",
      "total",
    ]);
    expect(() =>
      web.decisionHistoryPayload(
        [],
        [{ id: "r", ...values, total: "0.30000000000000001" }],
        web.definition.entities[0].key,
      ),
    ).toThrow(/history/);
  });
  it("rolls back store-returned corruption with no receipt, audit, version or effects", async () => {
    const { store, command, entity } = runtime(),
      original = store.inTransaction.bind(store);
    let corrupt = true;
    store.inTransaction = (operation: any) =>
      original(async (tx: any) => {
        for (const method of ["create", "conditionalApprovalUpdate"]) {
          const write = tx[method].bind(tx);
          tx[method] = async (...args: any[]) => {
            const record = await write(...args);
            if (corrupt && record) {
              await tx.update(entity, record.id, {
                total: "0.30000000000000000001",
              });
              return { ...record, total: "0.30000000000000000001" };
            }
            return record;
          };
        }
        return operation(tx);
      });
    const before = await store.list(entity);
    await expect(command("create", "create", { values })).rejects.toMatchObject(
      { status: 409 },
    );
    expect(await store.list(entity)).toEqual(before);
    expect(await store.listAudit()).toEqual([]);
    expect(await store.listCapabilityEvents()).toEqual([]);
    corrupt = false;
    const created = await command("create", "create", { values });
    corrupt = true;
    await expect(
      command(
        "update",
        "edit",
        { expectedVersion: 0, values: { quantity: 7 } },
        created.body.id,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(await store.find(entity, created.body.id)).toMatchObject({
      quantity: 3,
      total: 0.3,
      version: 0,
    });
    expect(await store.listAudit()).toHaveLength(1);
    corrupt = false;
    expect(
      (
        await command(
          "update",
          "edit",
          { expectedVersion: 0, values: { quantity: 7 } },
          created.body.id,
        )
      ).body.total,
    ).toBe(0.7);
  });
  it("requires replacing invalid retained operands and rejects forged update output", async () => {
    const { command, store, entity } = runtime(),
      created = await command("create", "create", { values });
    await store.update(entity, created.body.id, {
      unitPrice: "0.10000000000000000001",
    });
    await expect(
      command(
        "update",
        "retain",
        { expectedVersion: 0, values: { justification: "Changed" } },
        created.body.id,
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      command(
        "update",
        "forge",
        { expectedVersion: 0, values: { unitPrice: 0.07, total: 0.21 } },
        created.body.id,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      (
        await command(
          "update",
          "repair",
          { expectedVersion: 0, values: { unitPrice: 0.07 } },
          created.body.id,
        )
      ).body.total,
    ).toBe(0.21);
  });
  it("validates receipts and fresh transition records without recomputing historical edit responses", async () => {
    const { command, store, entity, app, input } = runtime(),
      created = await command("create", "create", { values });
    const edit = await command(
      "update",
      "edit",
      { expectedVersion: 0, values: { quantity: 7 } },
      created.body.id,
    );
    await command(
      "update",
      "later",
      { expectedVersion: 1, values: { unitPrice: 0.07 } },
      created.body.id,
    );
    expect(
      await command(
        "update",
        "edit",
        { expectedVersion: 0, values: { quantity: 7 } },
        created.body.id,
      ),
    ).toEqual(edit);
    const submitted = await command(
      "submit",
      "submit",
      { expectedVersion: 2 },
      created.body.id,
    );
    const reviewer = input.graph.policy.roles[1]!;
    const approved = await app.approvalCommand(
      reviewer,
      reviewer,
      entity,
      created.body.id,
      "approve",
      "approve",
      { expectedVersion: 3 },
    );
    await store.update(entity, created.body.id, {
      total: "0.490000000000000001",
    });
    await expect(
      command("submit", "submit", { expectedVersion: 2 }, created.body.id),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      app.approvalCommand(
        reviewer,
        reviewer,
        entity,
        created.body.id,
        "approve",
        "approve",
        { expectedVersion: 3 },
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(submitted.body.total).toBe(0.49);
    expect(approved.body.total).toBe(0.49);
    const original = store.inTransaction.bind(store);
    store.inTransaction = (operation: any) =>
      original(async (tx: any) => {
        const read = tx.getApprovalReceipt.bind(tx);
        tx.getApprovalReceipt = async (...args: any[]) => {
          const receipt = await read(...args);
          return receipt
            ? {
                ...receipt,
                responseBody: {
                  ...receipt.responseBody,
                  total: "0.300000000000000001",
                },
              }
            : receipt;
        };
        return operation(tx);
      });
    await expect(command("create", "create", { values })).rejects.toMatchObject(
      { status: 409, body: { code: "approval.calculation_invalid_record" } },
    );
  });
  it("commits one coherent edit for concurrent versions", async () => {
    const { command, store, entity } = runtime(),
      created = await command("create", "create", { values });
    const results = await Promise.allSettled([
      command(
        "update",
        "one",
        { expectedVersion: 0, values: { quantity: 7, unitPrice: 0.07 } },
        created.body.id,
      ),
      command(
        "update",
        "two",
        { expectedVersion: 0, values: { quantity: 5, unitPrice: 0.03 } },
        created.body.id,
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected"),
    ).toMatchObject({
      reason: { status: 409, body: { code: "approval.version_conflict" } },
    });
    const record = await store.find(entity, created.body.id);
    expect([0.49, 0.15]).toContain(record.total);
    expect(record.version).toBe(1);
    expect(await store.listAudit()).toHaveLength(2);
  });
});
