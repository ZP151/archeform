import { describe, expect, it } from "vitest";
import { uiPrimitiveRegistry } from "@factory/ui-primitives";
import { uiPatternRegistry } from "@factory/ui-patterns";

import {
  generatedUiRegistry,
  selectCopyableSource,
  validateGeneratedUiClosure,
  validateGeneratedUiRegistry,
} from "../src/index.js";

const executableSource = (source: string) => source.replaceAll("export ", "");

const compileRenderer = (source: string) => {
  const functionName = /export function (render\w+)/.exec(source)?.[1];
  if (!functionName) throw new Error("Copyable source has no renderer.");
  return new Function(
    `${executableSource(source)}; return ${functionName};`,
  )() as (input: Record<string, unknown>, state: string) => string;
};

describe("generated UI registry", () => {
  it("exposes the frozen layouts and business blocks as copyable source", () => {
    expect(generatedUiRegistry.map((item) => item.key)).toEqual([
      "mobile-product-shell",
      "merchant-workspace-shell",
      "menu-hero",
      "category-rail",
      "menu-item-card",
      "dish-configurator",
      "cart-line",
      "order-summary",
      "payment-state",
      "order-timeline",
      "metric-card",
      "active-order-list",
      "kitchen-ticket",
      "table-map",
      "menu-management-table",
      "availability-toggle",
      "role-matrix",
      "customer-profile-form",
      "restaurant-settings-form",
    ]);
    const source = selectCopyableSource(["mobile-product-shell", "menu-hero"]);
    expect(source).toContain("<main");
    expect(source).not.toContain("@factory/");
  });

  it("rejects unknown generated blocks rather than guessing a source path", () => {
    expect(() => selectCopyableSource(["unknown-block"])).toThrow(
      "Unknown registry key",
    );
  });

  it("makes every block stateful, deterministic, and limited to declared ports", () => {
    const payment = generatedUiRegistry.find(
      (item) => item.key === "payment-state",
    )!;
    expect(payment.states).toEqual([
      "loading",
      "empty",
      "validation",
      "error",
      "confirmation",
      "denial",
    ]);
    expect(payment.fixture).toEqual({
      id: "payment-state-default",
      state: "confirmation",
    });
    expect(payment.ports).toContain("method");
    expect(payment.source.code).not.toContain("@factory/");
  });

  it("rejects duplicate or style-only generated blocks", () => {
    const hero = generatedUiRegistry.find((item) => item.key === "menu-hero")!;
    expect(() =>
      validateGeneratedUiRegistry([...generatedUiRegistry, hero]),
    ).toThrow("Duplicate generated UI key");
    expect(() =>
      validateGeneratedUiRegistry([
        ...generatedUiRegistry,
        { ...hero, key: "menu-hero-gold", styleOnlyDuplicateOf: "menu-hero" },
      ]),
    ).toThrow("Style-only duplicate");
  });

  it("ships distinct stateful source that consumes declared ports and accessibility contracts", () => {
    expect(
      new Set(generatedUiRegistry.map((item) => item.source.code)).size,
    ).toBe(generatedUiRegistry.length);
    for (const item of generatedUiRegistry) {
      expect(item.fixtures.map(({ state }) => state)).toEqual([
        "loading",
        "empty",
        "validation",
        "error",
        "confirmation",
        "denial",
      ]);
      expect(item.source.code).toContain("prefers-reduced-motion");
      expect(item.source.code).toContain("@media");
      expect(item.source.code).toMatch(/aria-|<main|<nav|<form|<table/);
      for (const port of item.ports) expect(item.source.code).toContain(port);
      expect(Object.isFrozen(item)).toBe(true);
    }
    expect(
      generatedUiRegistry.find(({ key }) => key === "dish-configurator")!.source
        .code,
    ).toContain("<form");
    expect(
      generatedUiRegistry.find(({ key }) => key === "menu-management-table")!
        .source.code,
    ).toContain("<table");
  });

  it("fails closed on any manifest mutation and validates real package closure", () => {
    expect(validateGeneratedUiClosure()).toBe(true);
    expect(() => validateGeneratedUiRegistry([])).toThrow("exact frozen");
    expect(() =>
      validateGeneratedUiRegistry([...generatedUiRegistry].reverse()),
    ).toThrow("exact frozen");
    for (const mutate of [
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        (items[0]!.ports = ["invented-port"]),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        (items[0]!.responsive = ["watch", "tv", "print"]),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        (items[0]!.fixtures[0]!.id = "invented"),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        (items[0]!.source.code = "<div>arbitrary</div>"),
    ]) {
      const changed = structuredClone(generatedUiRegistry);
      mutate(changed);
      expect(() => validateGeneratedUiRegistry(changed)).toThrow(
        "exact frozen",
      );
    }
  });

  it("executes generated source with real binding inputs and all state branches safely", () => {
    const item = generatedUiRegistry.find(({ key }) => key === "menu-hero")!;
    const source = item.source.code.replaceAll("export ", "");
    const render = new Function(`${source}; return renderMenuHero;`)() as (
      input: Record<string, unknown>,
      state: string,
    ) => string;
    expect(
      render(
        { locationName: "Orchid Room", serviceOpen: true },
        "confirmation",
      ),
    ).toContain("Orchid Room");
    expect(render({}, "loading")).toContain("aria-busy");
    expect(render({}, "empty")).toContain("Nothing here yet");
    expect(render({}, "validation")).toContain("highlighted");
    expect(render({}, "error")).toContain('role="alert"');
    expect(render({}, "denial")).toContain("Access denied");
    expect(
      render({ locationName: "<script>alert(1)</script>" }, "confirmation"),
    ).not.toContain("<script>");
  });

  it("compiles composed selections once and preserves trusted child markup in shells", () => {
    const source = selectCopyableSource([
      "mobile-product-shell",
      "menu-hero",
      "menu-item-card",
      "order-summary",
    ]);
    const renderers = new Function(
      `${executableSource(source)}; return { renderMobileProductShell, renderMenuHero, renderMenuItemCard, renderOrderSummary };`,
    )() as Record<
      string,
      (input: Record<string, unknown>, state: string) => string
    >;
    const hero = renderers.renderMenuHero!(
      { locationName: "Orchid Room", serviceOpen: true },
      "confirmation",
    );
    const shell = renderers.renderMobileProductShell!(
      {
        title: "Dinner",
        content: hero,
        navigation: '<nav aria-label="Primary navigation">Menu</nav>',
      },
      "confirmation",
    );
    expect(shell).toContain(hero);
    expect(shell).toContain('<nav aria-label="Primary navigation">Menu</nav>');
    expect(shell).not.toContain("&lt;nav");

    const repeated = selectCopyableSource(["menu-hero", "menu-hero"]);
    expect(() => new Function(executableSource(repeated))).not.toThrow();
    expect(repeated.match(/export function renderMenuHero/g)).toHaveLength(1);
  });

  it("renders policy-gated business controls from their exact ports", () => {
    const render = (key: string, input: Record<string, unknown>) =>
      compileRenderer(
        generatedUiRegistry.find((item) => item.key === key)!.source.code,
      )(input, "confirmation");

    expect(
      render("dish-configurator", {
        name: "Tasting menu",
        optionLabel: "Wine pairing",
        canAdd: false,
      }),
    ).toMatch(/Add to order[\s\S]*disabled|disabled[\s\S]*Add to order/);
    expect(
      render("payment-state", {
        method: "card",
        pay: "restaurant-order:submitted:pay:paid",
        canPay: false,
      }),
    ).toMatch(/Pay[\s\S]*disabled|disabled[\s\S]*Pay/);
    expect(
      render("restaurant-settings-form", {
        currency: "SGD",
        timezone: "Asia/Singapore",
        canConfigure: false,
      }),
    ).toMatch(/Save settings[\s\S]*disabled|disabled[\s\S]*Save settings/);

    const summary = render("order-summary", {
      total: "120.00",
      status: "submitted",
      submit: "restaurant-order:cart:submit:submitted",
      canSubmit: false,
      cancelSubmitted: "restaurant-order:submitted:cancel:cancelled",
      cancelPaid: "restaurant-order:paid:cancel:cancelled",
      canCancel: false,
    });
    expect(summary).toContain(
      'data-transition="restaurant-order:cart:submit:submitted"',
    );
    expect(summary).toContain(
      'data-transition="restaurant-order:submitted:cancel:cancelled"',
    );
    expect(summary.match(/disabled/g)?.length).toBeGreaterThanOrEqual(2);

    const kitchen = render("kitchen-ticket", {
      accept: "restaurant-order:paid:accept:accepted",
      startPreparing: "restaurant-order:accepted:start-preparing:preparing",
      markReady: "restaurant-order:preparing:mark-ready:ready",
      canAccept: false,
      canStartPreparing: true,
      canMarkReady: false,
    });
    expect(kitchen).toContain("Accept order");
    expect(kitchen).toContain("Start preparing");
    expect(kitchen).toContain("Mark ready");
    expect(kitchen).toContain(
      'data-transition="restaurant-order:accepted:start-preparing:preparing"',
    );

    const tables = render("table-map", {
      activate: "restaurant-table-session:open:activate:active",
      close: "restaurant-table-session:active:close:closed",
      expireOpen: "restaurant-table-session:open:expire:closed",
      expireActive: "restaurant-table-session:active:expire:closed",
      canActivate: false,
      canClose: true,
      canExpire: false,
    });
    expect(tables).toContain("Activate table");
    expect(tables).toContain("Close table");
    expect(tables).toContain("Expire open session");
    expect(tables).toContain("Expire active session");
  });

  it("renders real profile and settings fields instead of metadata-only values", () => {
    const profile = compileRenderer(
      generatedUiRegistry.find(({ key }) => key === "customer-profile-form")!
        .source.code,
    )(
      {
        subjectRef: "customer-1",
        displayName: "Ada",
        email: "ada@example.com",
        locale: "en-SG",
        marketingOptIn: true,
        role: "customer",
      },
      "confirmation",
    );
    expect(profile).toContain('name="displayName"');
    expect(profile).toContain('name="locale"');
    expect(profile).toContain('role="switch"');

    const settings = compileRenderer(
      generatedUiRegistry.find(({ key }) => key === "restaurant-settings-form")!
        .source.code,
    )(
      {
        name: "Orchid Room",
        currency: "SGD",
        taxRate: "9",
        serviceChargeRate: "10",
        timezone: "Asia/Singapore",
        logoUrl: "https://example.com/logo.png",
        serviceOpen: true,
        canConfigure: true,
      },
      "confirmation",
    );
    expect(settings).toContain('name="currency"');
    expect(settings).toContain('name="timezone"');
    expect(settings).toContain('role="switch"');
  });

  it("rejects inherited hostile states and unsafe URL protocols across all 45 renderers", () => {
    const sources = [
      ...uiPrimitiveRegistry,
      ...uiPatternRegistry,
      ...generatedUiRegistry,
    ].map(({ source }) => source.code);
    expect(sources).toHaveLength(45);
    for (const source of sources) {
      const render = compileRenderer(source);
      for (const state of ["toString", "constructor", "__proto__"]) {
        expect(() => render({}, state)).toThrow("Unknown");
      }
      for (const unsafeUrl of [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
      ]) {
        const output = render(
          {
            href: unsafeUrl,
            imageUrl: unsafeUrl,
            logoUrl: unsafeUrl,
            items: [
              {
                href: unsafeUrl,
                label: "Unsafe",
                icon: "house",
                current: false,
              },
            ],
          },
          "confirmation",
        );
        expect(output).not.toMatch(/(?:javascript|data|vbscript):/i);
      }
    }
  });
});
