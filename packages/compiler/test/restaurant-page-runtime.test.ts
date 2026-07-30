import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { composeProfileDraft } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

import {
  createGeneratedPageRuntimeProjection,
  generateApplicationBundle,
} from "../src/index.js";
import * as restaurantPageRuntime from "../src/restaurant-page-runtime.js";

function restaurantGraph(): ApplicationGraphV1 {
  return structuredClone(
    composeProfileDraft({ profile: "restaurant-ordering" }).graph,
  );
}

function menuBlock(graph: ApplicationGraphV1) {
  const block = graph.page.pages
    .flatMap((page) => page.blocks)
    .find((candidate) => candidate.type === "menu-browser");
  if (!block) throw new Error("Expected the Restaurant menu block.");
  return block;
}

function generatedFiles(graph: ApplicationGraphV1 = restaurantGraph()) {
  return Object.fromEntries(
    generateApplicationBundle({
      publishedRevisionId: "restaurant-customer-web-1",
      graph,
    }).files.map((file) => [file.path, file.content]),
  );
}

type GeneratedCommandRuntime = {
  readonly restaurantDecimalNumber: (
    value: unknown,
    fieldName: string,
  ) => number;
  readonly projectRestaurantCustomerLine: (value: unknown) => {
    readonly id: string;
    readonly menuItemId: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly lineNote: string;
  };
  readonly commitRestaurantCustomerLineMutation: (
    value: unknown,
    commit: (projection: {
      readonly line: {
        readonly id: string;
        readonly menuItemId: string;
        readonly quantity: number;
        readonly unitPrice: number;
        readonly lineNote: string;
      };
      readonly orderVersion: number;
      readonly total: number;
      readonly modifiers: unknown;
    }) => void,
  ) => void;
  readonly projectRestaurantCustomerOrderState: (value: unknown) => {
    readonly id: string;
    readonly status: string;
    readonly paymentStatus: string;
    readonly orderVersion: number;
    readonly total: number;
    readonly orderNote: string;
  };
  readonly projectRestaurantCustomerOrder: (value: unknown) => {
    readonly id: string;
    readonly total: number;
    readonly fulfilmentType: string;
    readonly createdAt: string;
  };
  readonly projectRestaurantCustomerReceipt: (value: unknown) => {
    readonly total: number;
    readonly lines: readonly {
      readonly unitPrice: number;
      readonly modifiers: unknown;
    }[];
    readonly payments: readonly { readonly amount: number }[];
  };
  readonly createCustomerCommandJournalCoordinator: (
    read: () => readonly unknown[],
    write: (journal: readonly unknown[]) => void,
  ) => {
    readonly confirm: (command: {
      readonly slot: string;
      readonly key: string;
    }) => Promise<void>;
    readonly retain: (
      slot: string,
      body: Readonly<Record<string, unknown>>,
      createKey: () => string,
    ) => Promise<{
      readonly journal: readonly { readonly key: string }[];
      readonly command: { readonly slot: string; readonly key: string };
    }>;
  };
  readonly retainLogicalCommand: (
    journal: readonly unknown[],
    slot: string,
    body: Readonly<Record<string, unknown>>,
    createKey: () => string,
  ) => Promise<{
    readonly journal: readonly { readonly key: string }[];
    readonly command: { readonly key: string };
  }>;
  readonly reconcileLogicalCommandConflict: (
    journal: readonly unknown[],
    command: { readonly slot: string; readonly key: string },
    status: number,
    payload: unknown,
    readStatus: (orderId: string) => Promise<unknown>,
  ) => Promise<{
    readonly journal: readonly unknown[];
    readonly order: {
      readonly id: string;
      readonly status: string;
      readonly orderVersion: number;
    };
  } | null>;
  readonly restaurantPaymentMethod: (value: unknown) => "cash" | "card";
  readonly restaurantPaymentMethods: readonly ("cash" | "card")[];
};

async function generatedCommandRuntime(): Promise<GeneratedCommandRuntime | null> {
  const source = generatedFiles()["web/app/restaurant-customer-command.ts"];
  expect(source).toBeDefined();
  if (!source) return null;
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return (await import(
    `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
  )) as GeneratedCommandRuntime;
}

describe("generated Restaurant Customer page runtime", () => {
  const projectReceiptModifiers = (
    restaurantPageRuntime as unknown as {
      readonly projectRestaurantReceiptModifiers?: (
        value: unknown,
      ) => readonly { key: string; label: string; value: string }[];
    }
  ).projectRestaurantReceiptModifiers;

  it("projects the live line-add Prisma Decimal wire value before cart commit", async () => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;
    const liveLineAddPayload = {
      line: {
        id: "order-line-1",
        orderId: "order-1",
        menuItemId: "margherita-pizza",
        quantity: 2,
        unitPrice: "12.50",
        lineNote: "No basil",
        modifiers: [],
        createdAt: "2026-07-30T00:00:00.000Z",
        updatedAt: "2026-07-30T00:00:00.000Z",
      },
      orderVersion: 1,
      total: 25,
    } as const;

    expect(
      runtime.projectRestaurantCustomerLine(liveLineAddPayload.line),
    ).toEqual({
      id: "order-line-1",
      menuItemId: "margherita-pizza",
      quantity: 2,
      unitPrice: 12.5,
      lineNote: "No basil",
    });
  });

  it.each([
    [
      "line price",
      { line: { unitPrice: "Infinity" } },
      "invalid order line unit price",
    ],
    ["order total", { total: "Infinity" }, "invalid order total"],
  ])(
    "rejects an invalid %s before committing cart state",
    async (_field, invalidOutcome, expectedMessage) => {
      const runtime = await generatedCommandRuntime();
      if (!runtime) return;
      const validOutcome = {
        line: {
          id: "order-line-1",
          orderId: "order-1",
          menuItemId: "margherita-pizza",
          quantity: 2,
          unitPrice: "12.50",
          lineNote: "No basil",
          modifiers: [],
          createdAt: "2026-07-30T00:00:00.000Z",
          updatedAt: "2026-07-30T00:00:00.000Z",
        },
        orderVersion: 1,
        total: "25.00",
      };
      const outcome = {
        ...validOutcome,
        ...invalidOutcome,
        line: {
          ...validOutcome.line,
          ...(typeof invalidOutcome.line === "object"
            ? invalidOutcome.line
            : {}),
        },
      };
      let committedProjection: unknown;

      expect(() =>
        runtime.commitRestaurantCustomerLineMutation(outcome, (projection) => {
          committedProjection = projection;
        }),
      ).toThrow(expectedMessage);
      expect(committedProjection).toBeUndefined();
    },
  );

  it.each([
    [12.5, 12.5],
    ["12.50", 12.5],
    [{ $type: "Decimal", value: "12.50" }, 12.5],
  ])(
    "normalizes supported Customer Decimal wire value %j",
    async (wireValue, expected) => {
      const runtime = await generatedCommandRuntime();
      if (!runtime) return;

      expect(runtime.restaurantDecimalNumber(wireValue, "order total")).toBe(
        expected,
      );
    },
  );

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "",
    "   ",
    "NaN",
    "Infinity",
    "0x10",
    { value: "12.50" },
    { $type: "Decimal", value: "NaN" },
    { $type: "Decimal", value: "12.50", executable: "alert(1)" },
  ])("rejects invalid Customer Decimal wire value %j", async (wireValue) => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;

    expect(() =>
      runtime.restaurantDecimalNumber(wireValue, "order total"),
    ).toThrow("invalid order total");
  });

  it.each([
    ["raw table id prop", { tableId: "raw-table-12" }, undefined],
    ["raw table code prop", { tableCode: "T12" }, undefined],
    [
      "raw table session id prop",
      { tableSessionId: "raw-session-12" },
      undefined,
    ],
    [
      "raw restaurant location id prop",
      { restaurantLocationId: "raw-location-1" },
      undefined,
    ],
    ["session binding", undefined, { session: "raw-table-12" }],
    [
      "raw table session id binding",
      undefined,
      { tableSessionId: "raw-session-12" },
    ],
  ])("rejects a menu block with %s", (_label, props, bindings) => {
    const graph = restaurantGraph();
    const block = menuBlock(graph);
    block.props = props;
    block.bindings = bindings;

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "opaque table-session route token",
    );
  });

  it("emits profile-gated Customer pages over only the frozen typed API routes", () => {
    const graph = restaurantGraph();
    graph.metadata.name = '<Injected />{"danger":true}';
    menuBlock(graph).props = {
      title: "Menu",
      endpoint: "https://external.example/must-not-be-emitted",
      onClick: "must-not-be-emitted()",
      componentId: "must-not-be-emitted-component",
    };

    const files = generatedFiles(graph);
    const runtime = files["web/app/page-runtime.tsx"]!;
    const proxy = files["web/app/api/[...path]/route.ts"]!;

    expect(runtime).toContain("factory.restaurant-customer-page-runtime/v1");
    expect(runtime).toContain(
      'const applicationName = "<Injected />{\\\"danger\\\":true}";',
    );
    expect(runtime).toContain("<h1>{applicationName}</h1>");
    expect(runtime).toContain("sessionStorage");
    expect(runtime).not.toContain("crypto.randomUUID()");
    expect(files["web/app/restaurant-customer-command.ts"]).toContain(
      "crypto.randomUUID",
    );
    expect(runtime).toContain("expectedVersion");
    expect(runtime).toContain("x-factory-table-session-token");
    expect(runtime).toContain("x-factory-idempotency-key");
    expect(runtime).toContain("/api/restaurant/table-sessions/resolve");
    expect(runtime).toContain("/api/restaurant/menu/categories");
    expect(runtime).toContain("/api/restaurant/menu/items");
    expect(runtime).toContain("/api/restaurant/orders/history");
    expect(runtime).toContain("/status");
    expect(runtime).toContain("/receipt");
    expect(runtime).toContain("/lines");
    expect(runtime).toContain("/submit");
    expect(runtime).toContain("/payments");
    expect(runtime).toContain("Add {item.name}");
    expect(runtime).toContain("Pay simulated payment");
    expect(runtime).toContain("Session order history");
    expect(runtime).toContain(
      "modifiers: projectedReceiptModifiers(line.modifiers)",
    );
    expect(runtime).not.toContain("/events/");
    expect(runtime).not.toContain("/cancel");
    expect(runtime).not.toContain("https://external.example");
    expect(runtime).not.toContain("must-not-be-emitted");
    expect(proxy).toContain("x-factory-table-session-token");
    expect(proxy).toContain("x-factory-idempotency-key");
    expect(proxy).toContain("export const PATCH = proxy;");
  });

  it("leaves generic profile page generation unchanged", () => {
    const graph = composeProfileDraft({ profile: "simple-ecommerce" }).graph;
    const files = generatedFiles(graph);

    expect(files["web/app/page-runtime.tsx"]).toContain(
      "factory.generated-page-runtime/v1",
    );
    expect(files["web/app/page-runtime.tsx"]).not.toContain(
      "factory.restaurant-customer-page-runtime/v1",
    );
  });

  it.each(["expense-approval", "simple-ecommerce"] as const)(
    "keeps the generic %s proxy contract unchanged",
    (profile) => {
      const files = generatedFiles(composeProfileDraft({ profile }).graph);
      const proxy = files["web/app/api/[...path]/route.ts"]!;

      expect(proxy).toContain(
        "headers: { 'content-type': request.headers.get('content-type') ?? 'application/json', 'x-factory-role': request.headers.get('x-factory-role') ?? 'anonymous' },",
      );
      expect(proxy).not.toContain("x-factory-table-session-token");
      expect(proxy).not.toContain("x-factory-idempotency-key");
      expect(proxy).not.toContain("export const PATCH = proxy;");
      expect(files["web/app/restaurant-customer-command.ts"]).toBeUndefined();
    },
  );

  it("normalizes a Prisma JSON Decimal total from a Customer order projection", async () => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;

    expect(
      runtime.projectRestaurantCustomerOrderState({
        id: "order-1",
        status: "paid",
        paymentStatus: "paid",
        orderVersion: 3,
        total: { $type: "Decimal", value: "25.00" },
        orderNote: "Please serve together",
      }),
    ).toEqual({
      id: "order-1",
      status: "paid",
      paymentStatus: "paid",
      orderVersion: 3,
      total: 25,
      orderNote: "Please serve together",
    });
  });

  it("normalizes Customer history and receipt Decimal projections", async () => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;
    const order = {
      id: "order-1",
      status: "paid",
      paymentStatus: "paid",
      orderVersion: 3,
      total: "25.00",
      orderNote: "Please serve together",
      fulfilmentType: "dine-in",
      submittedAt: "2026-07-30T00:01:00.000Z",
      paidAt: "2026-07-30T00:02:00.000Z",
      createdAt: "2026-07-30T00:00:00.000Z",
    } as const;

    expect(runtime.projectRestaurantCustomerOrder(order)).toMatchObject({
      id: "order-1",
      total: 25,
      fulfilmentType: "dine-in",
    });
    expect(
      runtime.projectRestaurantCustomerReceipt({
        ...order,
        lines: [
          {
            id: "order-line-1",
            menuItemId: "margherita-pizza",
            menuItemName: "Margherita pizza",
            quantity: 2,
            unitPrice: { $type: "Decimal", value: "12.50" },
            lineNote: "No basil",
            modifiers: [],
          },
        ],
        payments: [
          {
            id: "payment-1",
            method: "card",
            amount: "25.00",
            status: "succeeded",
            paidAt: "2026-07-30T00:02:00.000Z",
          },
        ],
      }),
    ).toMatchObject({
      total: 25,
      lines: [{ unitPrice: 12.5 }],
      payments: [{ amount: 25 }],
    });
  });

  it("rejects a nonfinite receipt Decimal before projection", async () => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;

    expect(() =>
      runtime.projectRestaurantCustomerReceipt({
        id: "order-1",
        status: "paid",
        paymentStatus: "paid",
        orderVersion: 3,
        total: "25.00",
        orderNote: "",
        fulfilmentType: "dine-in",
        submittedAt: null,
        paidAt: null,
        createdAt: "2026-07-30T00:00:00.000Z",
        lines: [],
        payments: [
          {
            id: "payment-1",
            method: "cash",
            amount: "Infinity",
            status: "succeeded",
            paidAt: null,
          },
        ],
      }),
    ).toThrow("invalid payment amount");
  });

  it("delegates receipt ownership to the token-bound API", () => {
    const runtime = generatedFiles()["web/app/page-runtime.tsx"]!;

    expect(runtime).not.toContain("orderId !== scope.order.id");
    expect(runtime).toContain(
      "customerRequest<unknown>(api.receipt(orderId), { token: scope.token })",
    );
  });

  it.each(["submit", "payment"])(
    "retains one logical %s command key across a lost response retry",
    async (commandName) => {
      const runtime = await generatedCommandRuntime();
      if (!runtime) return;
      let keyCount = 0;
      const createKey = () => `logical-key-${++keyCount}`;
      const slot = `order-1:${commandName}`;
      const body = {
        expectedVersion: commandName === "submit" ? 1 : 2,
        ...(commandName === "submit"
          ? { orderNote: "Together" }
          : { amount: 20, method: "card" }),
      };

      const first = await runtime.retainLogicalCommand(
        [],
        slot,
        body,
        createKey,
      );
      const retry = await runtime.retainLogicalCommand(
        first.journal,
        slot,
        body,
        createKey,
      );

      expect(retry.command.key).toBe(first.command.key);
      expect(retry.journal).toHaveLength(1);
      expect(keyCount).toBe(1);
      await expect(
        runtime.retainLogicalCommand(
          retry.journal,
          slot,
          { ...body, expectedVersion: 99 },
          createKey,
        ),
      ).rejects.toThrow("pending logical command");
      expect(keyCount).toBe(1);
    },
  );

  it("serializes concurrent same-slot preparation onto one logical command key", async () => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;
    let journal: readonly unknown[] = [];
    let keyCount = 0;
    const coordinator = runtime.createCustomerCommandJournalCoordinator(
      () => journal,
      (nextJournal) => {
        journal = nextJournal;
      },
    );
    const body = { expectedVersion: 1, orderNote: "Together" };

    const [first, second] = await Promise.all([
      coordinator.retain("order-1:submit", body, () => `key-${++keyCount}`),
      coordinator.retain("order-1:submit", body, () => `key-${++keyCount}`),
    ]);

    expect(first.command.key).toBe("key-1");
    expect(second.command.key).toBe(first.command.key);
    expect(journal).toHaveLength(1);
    expect(keyCount).toBe(1);

    const otherPreparation = coordinator.retain(
      "order-2:payment",
      { expectedVersion: 4, amount: 12, method: "cash" },
      () => `key-${++keyCount}`,
    );
    await Promise.all([otherPreparation, coordinator.confirm(first.command)]);
    expect(journal).toMatchObject([{ slot: "order-2:payment", key: "key-2" }]);

    const fresh = await coordinator.retain(
      "order-1:submit",
      { expectedVersion: 2, orderNote: "Together" },
      () => `key-${++keyCount}`,
    );
    expect(fresh.command.key).toBe("key-3");
    expect(journal).toHaveLength(2);
    expect(keyCount).toBe(3);
  });

  it("keeps a stale command pending until a typed 409 is reconciled through status", async () => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;
    const prepared = await runtime.retainLogicalCommand(
      [],
      "order-1:submit",
      { expectedVersion: 1, orderNote: "Together" },
      () => "stale-command-key",
    );
    const conflict = {
      code: "restaurant.order.version_conflict",
      message: "Stale order version.",
      currentOrder: {
        id: "order-1",
        status: "submitted",
        paymentStatus: "unpaid",
        orderVersion: 2,
        total: 20,
      },
    };

    await expect(
      runtime.reconcileLogicalCommandConflict(
        prepared.journal,
        prepared.command as { readonly slot: string; readonly key: string },
        409,
        conflict,
        async () => {
          throw new Error("status unavailable");
        },
      ),
    ).rejects.toThrow("status unavailable");
    expect(prepared.journal).toHaveLength(1);

    let statusReads = 0;
    const reconciled = await runtime.reconcileLogicalCommandConflict(
      prepared.journal,
      prepared.command as { readonly slot: string; readonly key: string },
      409,
      conflict,
      async (orderId) => {
        statusReads += 1;
        expect(orderId).toBe("order-1");
        return {
          ...conflict.currentOrder,
          status: "paid",
          paymentStatus: "paid",
          orderVersion: 3,
        };
      },
    );

    expect(reconciled?.order).toMatchObject({
      id: "order-1",
      status: "paid",
      orderVersion: 3,
    });
    expect(reconciled?.journal).toHaveLength(0);
    expect(statusReads).toBe(1);
    await expect(
      runtime.reconcileLogicalCommandConflict(
        prepared.journal,
        prepared.command as { readonly slot: string; readonly key: string },
        409,
        { ...conflict, currentOrder: { ...conflict.currentOrder, id: 42 } },
        async () => conflict.currentOrder,
      ),
    ).resolves.toBeNull();
  });

  it("accepts only the bounded simulated payment methods", async () => {
    const runtime = await generatedCommandRuntime();
    if (!runtime) return;

    expect(runtime.restaurantPaymentMethods).toEqual(["cash", "card"]);
    expect(runtime.restaurantPaymentMethod("cash")).toBe("cash");
    expect(runtime.restaurantPaymentMethod("card")).toBe("card");
    expect(() => runtime.restaurantPaymentMethod("external-wallet")).toThrow(
      "cash or card",
    );
  });

  it("wires every Customer mutation through the persisted logical command journal", () => {
    const runtime = generatedFiles()["web/app/page-runtime.tsx"]!;

    expect(runtime).toContain('from "./restaurant-customer-command"');
    expect(runtime).toContain("retainLogicalCommand");
    expect(runtime).toContain("confirmLogicalCommand");
    expect(runtime).toContain("reconcileLogicalCommandConflict");
    expect(runtime).toContain("commandJournalCoordinator.confirm");
    expect(runtime).toContain("commandJournalStorageKey");
    expect(runtime).toContain('"x-factory-idempotency-key": idempotencyKey');
    expect(runtime).not.toContain(
      '"x-factory-idempotency-key": crypto.randomUUID()',
    );
  });

  it("renders the bounded payment enum and sends the validated selection", () => {
    const runtime = generatedFiles()["web/app/page-runtime.tsx"]!;

    expect(runtime).toContain('useState<RestaurantPaymentMethod>("cash")');
    expect(runtime).toContain("restaurantPaymentMethods.map");
    expect(runtime).toContain("restaurantPaymentMethod(event.target.value)");
    expect(runtime).toContain("method: paymentMethod");
    expect(runtime).not.toContain('method: "cash"');
  });

  it("type-checks the generated Customer modules together under strict settings", () => {
    const files = generatedFiles();
    const generatedRoot = path.resolve(
      process.cwd(),
      "../../apps/workbench/app/__generated-restaurant-customer",
    );
    const virtualSources = new Map([
      [
        path.normalize(path.join(generatedRoot, "page-runtime.tsx")),
        files["web/app/page-runtime.tsx"]!,
      ],
      [
        path.normalize(
          path.join(generatedRoot, "restaurant-customer-command.ts"),
        ),
        files["web/app/restaurant-customer-command.ts"]!,
      ],
    ]);
    const options: ts.CompilerOptions = {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
    };
    const host = ts.createCompilerHost(options);
    const baseFileExists = host.fileExists.bind(host);
    const baseGetSourceFile = host.getSourceFile.bind(host);
    const baseReadFile = host.readFile.bind(host);
    host.fileExists = (fileName) =>
      virtualSources.has(path.normalize(fileName)) || baseFileExists(fileName);
    host.readFile = (fileName) =>
      virtualSources.get(path.normalize(fileName)) ?? baseReadFile(fileName);
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
      const source = virtualSources.get(path.normalize(fileName));
      return source === undefined
        ? baseGetSourceFile(fileName, languageVersion, onError, shouldCreate)
        : ts.createSourceFile(fileName, source, languageVersion, true);
    };
    host.resolveModuleNames = (moduleNames, containingFile) =>
      moduleNames.map((moduleName) => {
        if (moduleName === "./restaurant-customer-command") {
          return {
            extension: ts.Extension.Ts,
            resolvedFileName: path.join(
              generatedRoot,
              "restaurant-customer-command.ts",
            ),
          };
        }
        return ts.resolveModuleName(moduleName, containingFile, options, host)
          .resolvedModule;
      });

    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram({
        rootNames: [...virtualSources.keys()],
        options,
        host,
      }),
    );

    expect(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => "\n",
      }),
    ).toBe("");
  });

  it("renders at most twenty bounded receipt modifiers", () => {
    const modifiers = Array.from({ length: 22 }, (_, index) => ({
      key: `modifier-${index}`,
      label: `Modifier ${index}`,
      value: `Value ${index}`,
    }));

    expect(projectReceiptModifiers).toBeTypeOf("function");
    expect(projectReceiptModifiers?.(modifiers)).toHaveLength(20);
  });

  it("drops overlength and control-character receipt modifiers", () => {
    const modifiers = [
      { key: "size", label: "Size", value: "Large" },
      { key: "x".repeat(51), label: "Long key", value: "bad" },
      { key: "label", label: "x".repeat(101), value: "bad" },
      { key: "value", label: "Value", value: "x".repeat(101) },
      { key: "control", label: "Control\u0007", value: "bad" },
      { key: "control-value", label: "Control", value: "bad\u0007" },
    ];

    expect(projectReceiptModifiers).toBeTypeOf("function");
    expect(projectReceiptModifiers?.(modifiers)).toEqual([
      { key: "size", label: "Size", value: "Large" },
    ]);
  });
});
