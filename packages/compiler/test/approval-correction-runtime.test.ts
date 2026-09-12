import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";
import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";
import { approvalLegacyFixtures } from "./fixtures/approval-legacy.js";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function correctionInput(
  name: "expense" | "purchase" = "expense",
): PublishedGraphInput {
  const input = structuredClone(
    approvalLegacyFixtures[name].input,
  ) as unknown as PublishedGraphInput;
  const graph = input.graph as ApplicationGraphV1;
  const flow = graph.flow.flows[0]!;
  flow.states = ["draft", "submitted", "approved", "returned"];
  flow.events = ["submit", "approve", "reject", "update"];
  flow.transitions[2]!.to = "returned";
  flow.transitions.push({
    from: "returned",
    event: "update",
    to: "draft",
    roles: [flow.transitions[0]!.roles![0]!],
    effects: [{ capability: "audit.record", operation: "record" }],
  });
  graph.policy.permissions[0]!.actions = ["create", "read", "update", "submit"];
  graph.domain.entities[0]!.fields.find((f) => f.key === "status")!.values = [
    "draft",
    "submitted",
    "approved",
    "returned",
  ];
  return {
    ...input,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: graph.integration.compositionSelections!,
    }),
  };
}
function publishedCorrectionInput(
  name: "expense" | "purchase" = "expense",
): PublishedGraphInput {
  const input = correctionInput(name);
  const selections = input.graph.integration.compositionSelections!;
  delete input.graph.integration.compositionSelections;
  return {
    ...input,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections,
    }),
  };
}
describe("immutable approval correction dispatch", () => {
  it.each(["expense", "purchase"] as const)(
    "compiles immutable published %s with its separate lock and preserves its hash",
    (name) => {
      const input = publishedCorrectionInput(name);
      const before = JSON.stringify(input);
      const bundle = generateApplicationBundle(input);
      expect(JSON.stringify(input)).toBe(before);
      expect(bundle.graphHash).toBe(hashApplicationGraph(input.graph));
      expect(
        bundle.files.find((f) => f.path === "api/src/application-runtime.ts")!
          .content,
      ).toContain(hashApplicationGraph(input.graph));
      expect(
        bundle.files.find((f) => f.path === "api/prisma/schema.prisma")!
          .content,
      ).toContain("model ApprovalMutationReceipt");
      expect(
        bundle.files.find((f) => f.path === "web/app/page-runtime.tsx")!
          .content,
      ).toContain("ApprovalRecordCommandState");
      expect(
        bundle.files.find((f) => f.path === "web/app/api/[...path]/route.ts")!
          .content,
      ).toContain("export const PATCH");
    },
  );
  it.each(["missing-package", "binding", "checksum", "status"])(
    "rejects published correction with malformed %s",
    (kind) => {
      const input = publishedCorrectionInput();
      let selections = structuredClone(input.compositionLock.packages);
      if (kind === "missing-package") selections.pop();
      if (kind === "binding")
        selections.find((s) => s.lock.key === "core.crud")!.bindings.entityKey =
          { graphSymbol: "graph.domain.employee" };
      if (kind === "status")
        input.graph.domain.entities[0]!.fields.find(
          (f) => f.key === "status",
        )!.required = false;
      input.compositionLock = createCapabilityCompositionLock({
        graphChecksum:
          kind === "checksum"
            ? "sha256:" + "0".repeat(64)
            : hashApplicationGraph(input.graph),
        selections,
      });
      expect(() => generateApplicationBundle(input)).toThrow();
    },
  );
  it("preserves every ordered baseline byte twice", () => {
    for (const fixture of Object.values(approvalLegacyFixtures))
      for (let attempt = 0; attempt < 2; attempt++) {
        const files = generateApplicationBundle(
          structuredClone(fixture.input) as unknown as PublishedGraphInput,
        ).files;
        const manifest = files.map((f) => ({
          path: f.path,
          bytes: Buffer.byteLength(f.content),
          sha256: hash(f.content),
        }));
        expect(manifest).toEqual(fixture.manifest);
        expect(hash(JSON.stringify(manifest))).toBe(fixture.manifestHash);
        expect(
          hash(
            files
              .map(
                (f) =>
                  `${Buffer.byteLength(f.path)}:${f.path}${Buffer.byteLength(f.content)}:${f.content}`,
              )
              .join(""),
          ),
        ).toBe(fixture.bundleHash);
      }
  });
  it("selects complete correction runtime and isolated schema", () => {
    const files = generateApplicationBundle(correctionInput()).files;
    expect(
      files.find((f) => f.path.endsWith("/application-runtime.ts"))!.content,
    ).toContain("factory.generated.approval-mutation/v1");
    expect(
      files.find((f) => f.path.endsWith("schema.prisma"))!.content,
    ).toContain("model ApprovalMutationReceipt");
  });
});

import { createRequire } from "node:module";
import { posix } from "node:path";
import { transpileModule, ModuleKind } from "typescript";
const runtimeRequire = createRequire(import.meta.url);
function loadRuntime(input = publishedCorrectionInput()) {
  const files = generateApplicationBundle(input).files;
  const cache = new Map<string, any>();
  function load(path: string): any {
    if (cache.has(path)) return cache.get(path);
    const file = files.find((f) => f.path === path);
    if (!file) throw Error(path);
    const exports: any = {};
    cache.set(path, exports);
    const js = transpileModule(file.content, {
      compilerOptions: { module: ModuleKind.CommonJS, target: 99 },
    }).outputText;
    new Function("require", "exports", js)(
      (name: string) =>
        name.startsWith(".")
          ? load(
              posix.normalize(
                posix.join(posix.dirname(path), name.replace(/\.js$/, ".ts")),
              ),
            )
          : runtimeRequire(name),
      exports,
    );
    return exports;
  }
  return { ...load("api/src/application-runtime.ts"), files };
}
const values = {
  amount: 12,
  category: "travel",
  date: "2026-09-12",
  notes: "Correction sample",
};
describe("executed approval command transactions", () => {
  it("executes same-record correction and reconstructs each replay with exact evidence", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    const store = new InMemoryRecordStore();
    let runtime = new ApplicationRuntime(store);
    let id: string | undefined;
    for (const [n, role, operation, body] of [
      [0, "employee", "create", { values }],
      [1, "employee", "update", { expectedVersion: 0, values: { amount: 15 } }],
      [2, "employee", "submit", { expectedVersion: 1 }],
      [
        3,
        "manager",
        "reject",
        { expectedVersion: 2, reason: "  Fix <script>value</script>  " },
      ],
      [4, "employee", "update", { expectedVersion: 3, values: { amount: 20 } }],
      [5, "employee", "submit", { expectedVersion: 4 }],
      [6, "manager", "approve", { expectedVersion: 5 }],
    ] as const) {
      const before = id;
      const result = await runtime.approvalCommand(
        role,
        role,
        "expense",
        id,
        operation,
        "key-" + n,
        body,
      );
      id = result.body.id;
      if (before) expect(id).toBe(before);
      expect(result.body.version).toBe(n);
      runtime = new ApplicationRuntime(store);
      expect(
        await runtime.approvalCommand(
          role,
          role,
          "expense",
          operation === "create" ? undefined : id,
          operation,
          "key-" + n,
          body,
        ),
      ).toEqual(result);
    }
    expect((await store.list("expense")).length).toBe(2);
    expect(
      (await store.listAudit()).map((e: any) => [e.action, e.reason]),
    ).toEqual([
      ["create", null],
      ["update", null],
      ["submit", null],
      ["reject", "Fix <script>value</script>"],
      ["update", null],
      ["submit", null],
      ["approve", null],
    ]);
    expect(
      await runtime.approvalDecisionEvents("employee", "expense", id),
    ).toHaveLength(2);
    expect(
      await store.claimDueNotifications("2100-01-01T00:00:00Z", 99),
    ).toHaveLength(2);
  });
  it("serializes same-key replay and different-key version conflicts", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    const store = new InMemoryRecordStore();
    const a = new ApplicationRuntime(store),
      b = new ApplicationRuntime(store);
    const result = await Promise.all(
      [a, b].map((r) =>
        r.approvalCommand(
          "employee",
          "session",
          "expense",
          undefined,
          "create",
          "same",
          { values },
        ),
      ),
    );
    expect(result[0]).toEqual(result[1]);
    const id = result[0].body.id;
    const edits = await Promise.allSettled(
      [a, b].map((r, i) =>
        r.approvalCommand(
          "employee",
          "session",
          "expense",
          id,
          "update",
          "edit-" + i,
          { expectedVersion: 0, values: { amount: 20 + i } },
        ),
      ),
    );
    expect(edits.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (edits.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason.body,
    ).toEqual({
      code: "approval.version_conflict",
      current: { id, status: "draft", version: 1 },
    });
  });
  it("rejects authority, malformed fields and replay mismatch without evidence", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    const store = new InMemoryRecordStore();
    const runtime = new ApplicationRuntime(store);
    const create = () =>
      runtime.approvalCommand(
        "employee",
        "session",
        "expense",
        undefined,
        "create",
        "key",
        { values },
      );
    await create();
    await expect(
      runtime.approvalCommand(
        "employee",
        "session",
        "expense",
        undefined,
        "create",
        "key",
        { values: { ...values, amount: 9 } },
      ),
    ).rejects.toMatchObject({
      status: 409,
      body: { code: "approval.idempotency_conflict" },
    });
    await expect(
      runtime.approvalCommand(
        "manager",
        "session",
        "expense",
        undefined,
        "create",
        "key",
        { values },
      ),
    ).rejects.toMatchObject({ status: 403 });
    for (const body of [
      { values: { ...values, id: "forced" } },
      { values: { ...values, amount: "12" } },
      { values: { ...values, status: "draft" } },
      { values: { ...values, notes: undefined } },
      { values: { ...values, date: "2026-02-30" } },
      { values, extra: true },
    ])
      await expect(
        runtime.approvalCommand(
          "employee",
          "session",
          "expense",
          undefined,
          "create",
          "bad",
          body,
        ),
      ).rejects.toMatchObject({ status: 400 });
    expect(await store.listAudit()).toHaveLength(1);
  });
});
import { selectApprovalCorrection } from "../src/approval-mutation-contract.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
describe("correction boundaries and emitted build", () => {
  it("rejects semantic mutations while permitting ordering and unrelated returned flows", () => {
    const graph = correctionInput().graph;
    expect(selectApprovalCorrection(graph)).toBe("expense");
    const ordered = structuredClone(graph);
    ordered.flow.flows[0]!.states.reverse();
    ordered.flow.flows[0]!.events.reverse();
    ordered.flow.flows[0]!.transitions.reverse();
    ordered.policy.permissions.reverse();
    ordered.page.pages.reverse();
    ordered.integration.compositionSelections!.reverse();
    expect(selectApprovalCorrection(ordered)).toBe("expense");
    const mutations: ((g: ApplicationGraphV1) => void)[] = [
      (g) => g.flow.flows[0]!.states.push("extra"),
      (g) => g.flow.flows[0]!.states.push("draft"),
      (g) => g.flow.flows[0]!.states.splice(0, 1),
      (g) => g.flow.flows[0]!.events.push("extra"),
      (g) => g.flow.flows[0]!.transitions.pop(),
      (g) =>
        g.flow.flows[0]!.transitions.push(g.flow.flows[0]!.transitions[0]!),
      (g) => g.flow.flows.push(g.flow.flows[0]!),
      (g) => g.policy.permissions[0]!.actions.pop(),
      (g) => g.policy.permissions[0]!.actions.push("approve"),
      (g) => g.policy.permissions[0]!.actions.push("create"),
      (g) => g.policy.permissions.push(g.policy.permissions[0]!),
      (g) => g.page.pages.splice(2, 1),
      (g) => g.page.pages.push(g.page.pages[2]!),
      (g) => g.integration.compositionSelections!.pop(),
      (g) =>
        g.integration.compositionSelections!.push(
          g.integration.compositionSelections![0]!,
        ),
      (g) => {
        g.integration.compositionSelections![0]!.bindings.entityKey = {
          graphSymbol: "graph.domain.employee",
        };
      },
      (g) => {
        g.integration.compositionSelections![0]!.lock.manifestDigest =
          "sha256:" + "0".repeat(64);
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(graph);
      mutate(changed);
      expect(() => selectApprovalCorrection(changed)).toThrow(
        "Approval correction shape",
      );
    }
    const unrelated = structuredClone(
      approvalLegacyFixtures.booking.input.graph,
    ) as unknown as ApplicationGraphV1;
    unrelated.flow.flows[0]!.states.push("returned");
    expect(selectApprovalCorrection(unrelated)).toBeUndefined();
  });
  it("typechecks the generated correction UI and runtime", () => {
    const { files } = loadRuntime();
    const directory = join(__dirname, ".typecheck", "correction");
    mkdirSync(directory, { recursive: true });
    try {
      for (const file of files.filter(
        (f: any) =>
          f.path.startsWith("api/src/") ||
          f.path === "web/app/page-runtime.tsx",
      )) {
        const target = join(directory, file.path);
        mkdirSync(join(target, ".."), { recursive: true });
        writeFileSync(target, file.content);
      }
      writeFileSync(
        join(directory, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            strict: true,
            target: "es2022",
            module: "esnext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            lib: ["es2022", "dom"],
            skipLibCheck: true,
            experimentalDecorators: true,
            paths: {
              "@prisma/client": [
                join(
                  __dirname,
                  "../../../apps/control-plane/node_modules/@prisma/client",
                ),
              ],
              "@nestjs/*": [
                join(
                  __dirname,
                  "../../../apps/control-plane/node_modules/@nestjs/*",
                ),
              ],
            },
          },
          include: ["web/**/*.tsx", "api/src/**/*.ts"],
        }),
      );
      const check = spawnSync(
        process.execPath,
        [
          runtimeRequire.resolve("typescript/bin/tsc"),
          "--noEmit",
          "-p",
          join(directory, "tsconfig.json"),
        ],
        { encoding: "utf8" },
      );
      expect(check.status, check.stdout + check.stderr).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("uses authoritative conflict precedence and validates every return reason", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    const store = new InMemoryRecordStore(),
      r = new ApplicationRuntime(store);
    const first = await r.approvalCommand(
      "employee",
      "e",
      "expense",
      undefined,
      "create",
      "create",
      { values },
    );
    const id = first.body.id;
    await r.approvalCommand(
      "employee",
      "e",
      "expense",
      id,
      "submit",
      "submit",
      { expectedVersion: 0 },
    );
    await expect(
      r.approvalCommand("employee", "e", "expense", id, "update", "stale", {
        expectedVersion: 0,
        values: { amount: 1 },
      }),
    ).rejects.toMatchObject({
      status: 409,
      body: {
        code: "approval.version_conflict",
        current: { id, status: "submitted", version: 1 },
      },
    });
    await expect(
      r.approvalCommand("employee", "e", "expense", id, "update", "state", {
        expectedVersion: 1,
        values: { amount: 1 },
      }),
    ).rejects.toMatchObject({ status: 403 });
    for (const reason of [
      "",
      " ",
      "a".repeat(501),
      "bad\0reason",
      "bad\x7freason",
      "bad\x01reason",
      2,
      null,
    ])
      await expect(
        r.approvalCommand("manager", "m", "expense", id, "reject", "bad", {
          expectedVersion: 1,
          reason,
        }),
      ).rejects.toMatchObject({ status: 400 });
    await expect(
      r.approvalCommand(
        "employee",
        "e",
        "employee",
        "sample-employee",
        "update",
        "secondary",
        { expectedVersion: 0, values: { name: "x" } },
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      r.transition("employee", "expense", id, "update", {}),
    ).rejects.toMatchObject({ status: 403 });
    expect(await store.listAudit()).toHaveLength(2);
  });
  it("rolls back mutations at record, evidence, outbox and receipt boundaries", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    for (const boundary of [
      "create",
      "conditionalApprovalUpdate",
      "appendAudit",
      "appendCapabilityEvent",
      "enqueueNotification",
      "saveApprovalReceipt",
    ]) {
      const store = new InMemoryRecordStore();
      const r = new ApplicationRuntime(store);
      const created = await r.approvalCommand(
        "employee",
        "e",
        "expense",
        undefined,
        "create",
        "first",
        { values },
      );
      const id = created.body.id;
      await r.approvalCommand(
        "employee",
        "e",
        "expense",
        id,
        "submit",
        "submit",
        { expectedVersion: 0 },
      );
      const before = JSON.stringify({
        records: await store.list("expense"),
        audit: await store.listAudit(),
        effects: await store.listCapabilityEvents(),
      });
      const transaction = store.inTransaction.bind(store);
      store.inTransaction = (operation: any) =>
        transaction(async (tx: any) => {
          const original = tx[boundary].bind(tx);
          tx[boundary] = async (...args: unknown[]) => {
            await original(...args);
            throw Error("Injected boundary failure");
          };
          return operation(tx);
        });
      await expect(
        r.approvalCommand(
          boundary === "create" ? "employee" : "manager",
          "s",
          "expense",
          boundary === "create" ? undefined : id,
          boundary === "create" ? "create" : "reject",
          "failed",
          boundary === "create"
            ? { values }
            : { expectedVersion: 1, reason: "Fix this" },
        ),
      ).rejects.toThrow("Injected boundary failure");
      expect(
        JSON.stringify({
          records: await store.list("expense"),
          audit: await store.listAudit(),
          effects: await store.listCapabilityEvents(),
        }),
      ).toBe(before);
      expect(
        await store.claimDueNotifications("2100-01-01T00:00:00Z", 99),
      ).toHaveLength(0);
      store.inTransaction = transaction;
      const recovered = await r.approvalCommand(
        boundary === "create" ? "employee" : "manager",
        "s",
        "expense",
        boundary === "create" ? undefined : id,
        boundary === "create" ? "create" : "reject",
        "failed",
        boundary === "create"
          ? { values }
          : { expectedVersion: 1, reason: "Fix this" },
      );
      expect(recovered.status).toBe(boundary === "create" ? 201 : 200);
    }
  });
});
import { JsxEmit } from "typescript";
describe("executed correction presentation", () => {
  it.each(["expense", "purchase"] as const)(
    "keeps the first %s command within 650px with 44px targets",
    async (name) => {
      const input = publishedCorrectionInput(name);
      const bundle = generateApplicationBundle(input);
      const source = bundle.files.find(
        (f) => f.path === "web/app/page-runtime.tsx",
      )!.content;
      const css = bundle.files.find(
        (f) => f.path === "web/app/globals.css",
      )!.content;
      const flow = input.graph.flow.flows[0]!;
      const seed = input.graph.domain.seedData!.find(
        (seed) => seed.entity === flow.entity,
      )!;
      const record = { id: seed.id, ...seed.values, version: 0 };
      const requireReact = (name: string) =>
        runtimeRequire(
          runtimeRequire.resolve(name, {
            paths: [join(__dirname, "../../../apps/workbench")],
          }),
        );
      const React = requireReact("react");
      const hooks = {
        ...React,
        useState: (initial: unknown) => [
          Array.isArray(initial)
            ? [record]
            : initial === true
              ? false
              : initial,
          () => {},
        ],
      };
      const exports: any = {};
      const compiled = transpileModule(
        source + "\nexport {definition,ApprovalRecordCommands};",
        {
          compilerOptions: {
            module: ModuleKind.CommonJS,
            jsx: JsxEmit.ReactJSX,
            target: 99,
          },
        },
      ).outputText;
      new Function("require", "exports", compiled)(
        (name: string) => (name === "react" ? hooks : requireReact(name)),
        exports,
      );
      const route = input.graph.page.pages.find((page) =>
        page.blocks.some(
          (block) => block.type === "list" && block.entity === flow.entity,
        ),
      )!.route;
      const html = requireReact("react-dom/server").renderToStaticMarkup(
        React.createElement(exports.GeneratedApplication, {
          requestedPath: route,
        }),
      );
      const browser = await runtimeRequire("@playwright/test").chromium.launch({
        headless: true,
      });
      try {
        const page = await browser.newPage();
        const expectAccent = async (button: any) => {
          const colors = await button.evaluate((element: HTMLElement) => {
            const reference = document.createElement("span");
            reference.style.cssText =
              "background:var(--factory-accent);border-color:var(--factory-accent);color:var(--factory-accent-text)";
            element.parentElement!.append(reference);
            const read = (node: Element) => {
              const style = getComputedStyle(node);
              return {
                background: style.backgroundColor,
                border: style.borderColor,
                color: style.color,
              };
            };
            const result = { actual: read(element), expected: read(reference) };
            reference.remove();
            return result;
          });
          expect(colors.actual).toEqual(colors.expected);
        };
        for (const width of [390, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.setContent("<style>" + css + "</style>" + html);
          const submit = page
            .getByRole("button", { name: "Submit", exact: true })
            .first();
          await expectAccent(submit);
          const box = await submit.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.height).toBeGreaterThanOrEqual(44);
          expect(box!.y + box!.height).toBeLessThanOrEqual(650);
          const details = await page
            .locator(".approval-record > details > summary")
            .first()
            .boundingBox();
          expect(details).not.toBeNull();
          expect(box!.x + box!.width).toBeLessThanOrEqual(details!.x);
          if (process.env.FACTORY_CORRECTION_LAYOUT_EVIDENCE_DIR) {
            console.info(
              JSON.stringify({
                family: name,
                width,
                submitBottom: box!.y + box!.height,
                submitWidth: box!.width,
                submitHeight: box!.height,
              }),
            );
            if (width === 390)
              await page.screenshot({
                path: join(
                  process.env.FACTORY_CORRECTION_LAYOUT_EVIDENCE_DIR,
                  `correction-layout-${name}-390.png`,
                ),
                fullPage: true,
              });
          }

          for (const control of await page
            .locator(".approval-record .approval-actions button")
            .all()) {
            const target = await control.boundingBox();
            expect(target!.height).toBeGreaterThanOrEqual(44);
            expect(target!.width).toBeGreaterThanOrEqual(44);
          }
        }
        for (const scenario of [
          {
            status: "submitted",
            role: flow.transitions[1]!.roles![0]!,
            mode: null,
            actions: ["Approve", "Return"],
          },
          {
            status: "draft",
            role: flow.transitions[0]!.roles![0]!,
            mode: "edit",
            actions: ["Save"],
          },
          {
            status: "submitted",
            role: flow.transitions[1]!.roles![0]!,
            mode: "return",
            actions: ["Return"],
          },
        ]) {
          const commands = requireReact(
            "react-dom/server",
          ).renderToStaticMarkup(
            React.createElement(exports.ApprovalRecordCommands, {
              entity: exports.definition.entities.find(
                (entity: any) => entity.key === flow.entity,
              ),
              record: { ...record, status: scenario.status },
              role: scenario.role,
              refresh: async () => [],
              onMutation: () => {},
              isCurrent: () => true,
              commandState: {
                mode: scenario.mode,
                values: {},
                reason: "Correct the amount",
                pending: { current: false },
                retained: { current: null },
                editVersion: { current: 0 },
                listeners: new Set(),
              },
            }),
          );
          await page.setContent("<style>" + css + "</style>" + html);
          await page
            .locator(".approval-correction-controls")
            .first()
            .evaluate((element: HTMLElement, markup: string) => {
              element.outerHTML = markup;
            }, commands);
          for (const action of scenario.actions)
            await expectAccent(
              page.getByRole("button", { name: action, exact: true }).last(),
            );
          if (scenario.mode) {
            const cancel = page.getByRole("button", {
              name: "Cancel",
              exact: true,
            });
            const background = await cancel.evaluate(
              (element: HTMLElement) =>
                getComputedStyle(element).backgroundColor,
            );
            const primary = await page
              .getByRole("button", { name: scenario.actions[0], exact: true })
              .last()
              .evaluate(
                (element: HTMLElement) =>
                  getComputedStyle(element).backgroundColor,
              );
            expect(background).not.toBe(primary);
          }
        }
      } finally {
        await browser.close();
      }
    },
  );
  it.each(["missing", "integer", "incomplete-enum", "optional"])(
    "rejects incompatible stored status %s with a valid recomputed lock",
    (kind) => {
      const input = correctionInput();
      const entity = input.graph.domain.entities.find(
        (e) => e.key === "expense",
      )!;
      const status = entity.fields.find((f) => f.key === "status")!;
      if (kind === "missing") {
        entity.fields = entity.fields.filter((f) => f.key !== "status");
        entity.indexes = [];
        for (const seed of input.graph.domain.seedData ?? [])
          if (seed.entity === "expense") delete seed.values.status;
      }
      if (kind === "integer") {
        Object.assign(status, { type: "integer" });
        delete status.values;
        for (const seed of input.graph.domain.seedData ?? [])
          if (seed.entity === "expense") seed.values.status = 0;
      }
      if (kind === "incomplete-enum")
        status.values = ["draft", "submitted", "approved"];
      if (kind === "optional") status.required = false;
      input.compositionLock = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(input.graph),
        selections: input.graph.integration.compositionSelections!,
      });
      expect(() => generateApplicationBundle(input)).toThrow(
        "Approval correction shape",
      );
    },
  );
  it.each(["edit", "return"])(
    "preserves %s command state through filtered unmount, pending and unknown retry",
    async (mode) => {
      const { pathToFileURL } = await import("node:url");
      const { Window } = await import(
        /* @vite-ignore */ pathToFileURL(
          runtimeRequire.resolve("happy-dom", {
            paths: [runtimeRequire.resolve("vitest")],
          }),
        ).href
      );
      const window = new Window();
      for (const [key, value] of Object.entries({
        window,
        document: window.document,
        HTMLElement: window.HTMLElement,
        Node: window.Node,
        IS_REACT_ACT_ENVIRONMENT: true,
      }))
        vi.stubGlobal(key, value);
      const requireReact = (name: string) =>
        runtimeRequire(
          runtimeRequire.resolve(name, {
            paths: [join(__dirname, "../../../apps/workbench")],
          }),
        );
      const React = requireReact("react"),
        { createRoot } = requireReact("react-dom/client");
      const source = generateApplicationBundle(correctionInput()).files.find(
        (f) => f.path === "web/app/page-runtime.tsx",
      )!.content;
      const compiled = transpileModule(
        source + "\nexport {definition,EntityRecords};",
        {
          compilerOptions: {
            module: ModuleKind.CommonJS,
            jsx: JsxEmit.ReactJSX,
            target: 99,
          },
        },
      ).outputText;
      const exports: any = {};
      new Function("require", "exports", compiled)(requireReact, exports);
      const record = {
        id: "one",
        ...values,
        status: mode === "edit" ? "draft" : "submitted",
        version: 0,
      };
      const commands: any[] = [];
      let rejectResponse: (error: Error) => void = () => {};
      vi.stubGlobal("fetch", async (_url: string, options: any = {}) => {
        if (options.method) {
          commands.push(options);
          if (commands.length === 1)
            return new Promise((_resolve, reject) => {
              rejectResponse = reject;
            });
          return new Response(
            JSON.stringify({
              ...record,
              status: mode === "edit" ? "draft" : "returned",
              version: 1,
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify(_url.endsWith("decision-events") ? [] : [record]),
          { status: 200 },
        );
      });
      const container = window.document.createElement("div");
      window.document.body.append(container);
      const root = createRoot(container);
      const props = (element: any) =>
        element[
          Object.keys(element).find((key) => key.startsWith("__reactProps$"))!
        ];
      const button = (label: string) =>
        [...container.querySelectorAll("button")].find((b: any) =>
          b.textContent?.trim().endsWith(label),
        ) as any;
      const filter = async (value: string) => {
        await React.act(async () => {
          const select = container.querySelector("select")!;
          select.value = value;
          select.dispatchEvent(new window.Event("change", { bubbles: true }));
        });
      };
      const submit = async () => {
        await React.act(async () => {
          const form = container.querySelector(".approval-record form");
          expect(form, container.innerHTML).not.toBeNull();
          form!.dispatchEvent(
            new window.Event("submit", { bubbles: true, cancelable: true }),
          );
        });
      };
      try {
        await React.act(async () => {
          root.render(
            React.createElement(exports.EntityRecords, {
              entity: exports.definition.entities.find(
                (e: any) => e.key === "expense",
              ),
              block: { id: "list", type: "list" },
              role: mode === "edit" ? "employee" : "manager",
              reportError: () => {},
            }),
          );
        });
        await React.act(async () =>
          button(mode === "edit" ? "Edit" : "Return").click(),
        );
        await React.act(async () => {
          const field = container.querySelector(
            mode === "edit" ? "input[type=number]" : "textarea",
          );
          props(field).onChange({
            target: {
              value: mode === "edit" ? "91.5" : "Keep this exact reason",
            },
          });
        });
        await submit();
        expect(commands).toHaveLength(1);
        await filter("approved");
        expect(container.querySelector(".approval-record")).toBeNull();
        await filter("");
        expect(container.querySelector("form")).not.toBeNull();
        expect(
          (
            container.querySelector(
              mode === "edit" ? "input[type=number]" : "textarea",
            ) as any
          ).value,
        ).toBe(mode === "edit" ? "91.5" : "Keep this exact reason");
        expect(
          [...container.querySelectorAll(".approval-record button")].every(
            (b: any) => b.disabled,
          ),
        ).toBe(true);
        await submit();
        expect(commands).toHaveLength(1);
        await React.act(async () => rejectResponse(Error("Lost response")));
        await filter("approved");
        await filter("");
        expect(
          (
            container.querySelector(
              mode === "edit" ? "input[type=number]" : "textarea",
            ) as any
          ).value,
        ).toBe(mode === "edit" ? "91.5" : "Keep this exact reason");
        await submit();
        expect(commands).toHaveLength(2);
        expect(commands[1]).toEqual(commands[0]);
      } finally {
        await React.act(async () => root.unmount());
        vi.unstubAllGlobals();
        await window.happyDOM.close();
      }
    },
  );
  it.each([
    [200, true],
    [409, true],
    [200, false],
    [409, false],
  ] as const)(
    "handles parent outcome %s after unmount with current scope %s",
    async (status, currentScope) => {
      let current = true;
      const source = generateApplicationBundle(correctionInput()).files.find(
        (f) => f.path === "web/app/page-runtime.tsx",
      )!.content;
      expect(source).toContain(
        "if(generation!==scopeGeneration.current)return;",
      );
      expect(source).toContain("setListMutation(next)");
      const refs: { current: unknown }[] = [];
      const requireReact = (name: string) =>
        runtimeRequire(
          runtimeRequire.resolve(name, {
            paths: [join(__dirname, "../../../apps/workbench")],
          }),
        );
      const hooks = {
        ...requireReact("react"),
        useState: (value: unknown) => [value, () => {}],
        useRef: (value: unknown) => {
          const ref = { current: value };
          refs.push(ref);
          return ref;
        },
        useEffect: () => {},
        useCallback: (callback: unknown) => callback,
      };
      const compiled = transpileModule(
        source +
          "\nexport {definition,ApprovalRecordCommands,approvalRecordCommandState};",
        {
          compilerOptions: {
            module: ModuleKind.CommonJS,
            jsx: JsxEmit.ReactJSX,
            target: 99,
          },
        },
      ).outputText;
      const exports: any = {};
      new Function("require", "exports", compiled)(
        (name: string) => (name === "react" ? hooks : requireReact(name)),
        exports,
      );
      const states: any[] = [];
      const tree = exports.ApprovalRecordCommands({
        entity: exports.definition.entities.find(
          (e: any) => e.key === "expense",
        ),
        record: { id: "one", ...values, status: "submitted", version: 1 },
        role: "manager",
        refresh: async () => {
          refs[0]!.current = false;
          current = currentScope;
          return [];
        },
        onMutation: (state: unknown) => states.push(state),
        commandState: exports.approvalRecordCommandState(new Map(), "one", 1),
        isCurrent: () => current,
      });
      const buttons: any[] = [];
      const walk = (node: any): void => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (node.type === "button") buttons.push(node);
        walk(node.props?.children);
      };
      walk(tree);
      const approve = buttons.find((button) =>
        JSON.stringify(button.props.children).includes("Approve"),
      );
      const original = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response(
            JSON.stringify({ id: "one", status: "approved", version: 2 }),
            { status },
          );
        approve.props.onClick();
        await new Promise((resolve) => setTimeout(resolve, 0));
      } finally {
        globalThis.fetch = original;
      }
      expect(states.at(-1)).toMatchObject(
        !currentScope
          ? { status: "pending" }
          : status === 200
            ? { status: "success", message: "Expense: Approved." }
            : {
                status: "error",
                message:
                  "This record changed. Review the refreshed record before trying again.",
              },
      );
    },
  );
  it("projects exact current status steps and escapes reasons", () => {
    const source = generateApplicationBundle(correctionInput()).files.find(
      (f) => f.path === "web/app/page-runtime.tsx",
    )!.content;
    const compiled = transpileModule(
      source +
        "\nexport {definition,approvalProgressSteps,ApprovalProgress,DecisionHistoryRow,approvalMaterialKey,ApprovalRecordCommands,approvalRecordCommandState};",
      {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          jsx: JsxEmit.ReactJSX,
          target: 99,
        },
      },
    ).outputText;
    const exports: any = {};
    const requireReact = (name: string) =>
      runtimeRequire(
        runtimeRequire.resolve(name, {
          paths: [join(__dirname, "../../../apps/workbench")],
        }),
      );
    new Function("require", "exports", compiled)(requireReact, exports);
    const entity = exports.definition.entities.find(
      (e: any) => e.key === "expense",
    );
    expect(exports.approvalMaterialKey(entity.fields, entity.key)).toBe(
      "approval-expense-material",
    );
    for (const [status, labels, phases] of [
      [
        "draft",
        ["Draft", "Submitted", "Decision"],
        ["current", "pending", "pending"],
      ],
      [
        "submitted",
        ["Draft", "Submitted", "Decision"],
        ["complete", "current", "pending"],
      ],
      [
        "returned",
        ["Draft", "Submitted", "Returned"],
        ["complete", "complete", "current"],
      ],
      [
        "approved",
        ["Draft", "Submitted", "Approved"],
        ["complete", "complete", "current"],
      ],
    ] as const) {
      const steps = exports.approvalProgressSteps(entity, status);
      expect(steps.map((s: any) => s.label)).toEqual(labels);
      expect(steps.map((s: any) => s.phase)).toEqual(phases);
    }
    expect(exports.approvalProgressSteps(entity, "unknown")).toBeUndefined();
    const React = requireReact("react");
    const { renderToStaticMarkup } = requireReact("react-dom/server");
    const html = renderToStaticMarkup(
      React.createElement(exports.DecisionHistoryRow, {
        event: {
          actor: "manager",
          action: "reject",
          entity: "expense",
          recordId: "one",
          reason: "<script>alert(1)</script>",
          at: "2026-09-12T00:00:00.000Z",
        },
        entity,
        record: { id: "one", ...values, status: "returned" },
      }),
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Return");
    const progress = renderToStaticMarkup(
      React.createElement(exports.ApprovalProgress, {
        entity,
        status: "returned",
      }),
    );
    expect(progress).toContain('aria-current="step"');
    expect(progress).toContain("Returned");
    for (const [role, status, icon, label] of [
      ["employee", "draft", "receipt-text", "Submit"],
      ["manager", "submitted", "circle-check", "Approve"],
      ["manager", "submitted", "circle-x", "Return"],
    ]) {
      const commands = renderToStaticMarkup(
        React.createElement(exports.ApprovalRecordCommands, {
          entity,
          record: { id: "one", ...values, status, version: 0 },
          role,
          refresh: async () => [],
          onMutation: () => {},
          commandState: exports.approvalRecordCommandState(new Map(), "one", 0),
          isCurrent: () => true,
        }),
      );
      expect(commands).toContain("lucide-" + icon);
      expect(commands).toContain(label);
    }
  });
});

describe("strict replay input and immutable reads", () => {
  it("rejects unsafe keys and object descriptors before any writes", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    const store = new InMemoryRecordStore();
    const runtime = new ApplicationRuntime(store);
    for (const key of [
      undefined,
      null,
      "",
      "a".repeat(129),
      "has space",
      "line\nkey",
      42,
    ])
      await expect(
        runtime.approvalCommand(
          "employee",
          "e",
          "expense",
          undefined,
          "create",
          key,
          { values },
        ),
      ).rejects.toMatchObject({ status: 400 });
    const getter = Object.defineProperty({ ...values }, "amount", {
      enumerable: true,
      get() {
        throw Error("Accessor was evaluated");
      },
    });
    for (const bad of [
      Object.create(values),
      getter,
      { ...values, __unknown: true },
    ])
      await expect(
        runtime.approvalCommand(
          "employee",
          "e",
          "expense",
          undefined,
          "create",
          "invalid",
          { values: bad },
        ),
      ).rejects.toMatchObject({ status: 400 });
    expect(await store.listAudit()).toHaveLength(0);
  });
  it("keeps committed receipt and evidence immutable and checks current authorization before replay", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    const store = new InMemoryRecordStore();
    const runtime = new ApplicationRuntime(store);
    const result = await runtime.approvalCommand(
      "employee",
      "e",
      "expense",
      undefined,
      "create",
      "key",
      { values },
    );
    result.body.notes = "Changed externally";
    const audits = await store.listAudit();
    audits[0].action = "mutated";
    const records = await store.list("expense");
    records.find((r: any) => r.id === result.body.id).status = "approved";
    const replay = await runtime.approvalCommand(
      "employee",
      "e",
      "expense",
      undefined,
      "create",
      "key",
      {
        values: {
          notes: values.notes,
          date: values.date,
          category: values.category,
          amount: values.amount,
        },
      },
    );
    expect(replay.body.notes).toBe("Correction sample");
    expect(replay.body.status).toBe("draft");
    expect((await store.listAudit())[0].action).toBe("create");
    let transactions = 0;
    const original = store.inTransaction.bind(store);
    store.inTransaction = (operation: any) => {
      transactions++;
      return original(operation);
    };
    await expect(
      runtime.approvalCommand(
        "manager",
        "e",
        "expense",
        undefined,
        "create",
        "key",
        { values },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(transactions).toBe(0);
  });
  it("permits exactly one same-key differing-hash concurrent outcome", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadRuntime();
    const store = new InMemoryRecordStore();
    const results = await Promise.allSettled(
      [1, 2].map((amount) =>
        new ApplicationRuntime(store).approvalCommand(
          "employee",
          "e",
          "expense",
          undefined,
          "create",
          "same-key",
          { values: { ...values, amount } },
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason,
    ).toMatchObject({
      status: 409,
      body: { code: "approval.idempotency_conflict" },
    });
    expect(await store.listAudit()).toHaveLength(1);
  });
});
