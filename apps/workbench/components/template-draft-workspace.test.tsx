// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkbenchTemplateDraftInstance } from "../lib/control-plane-client";
import {
  TemplateDraftWorkspace,
  type TemplatePageSelection,
} from "./template-draft-workspace";

function instance(revisionNumber = 1): WorkbenchTemplateDraftInstance {
  const surface = (
    surfaceKey: "customer-mobile" | "merchant-desktop",
    titles: readonly string[],
  ) => ({
    apiVersion: "factory.restaurant-draft-preview-surface/v2" as const,
    disposition: "preview-only" as const,
    snapshotId: `preview-${revisionNumber}`,
    graphChecksum:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
    surface: {
      apiVersion: "factory.restaurant-surface-plan/v1" as const,
      surfaceKey,
      pages: titles.map((title, index) => ({
        id: `${surfaceKey}-${index}`,
        route: index === 0 ? "/" : `/page-${index}`,
        title,
        surfaceKey,
        recipe: {
          key: `recipe-${index}`,
          version: "1.0.0",
          layoutKey:
            surfaceKey === "customer-mobile"
              ? ("mobile-product-shell" as const)
              : ("merchant-workspace-shell" as const),
        },
        blocks: [
          {
            id: `${surfaceKey}-${index}-hero`,
            type: index === 0 ? "menu-hero" : "order-summary",
          },
        ],
      })),
      navigation: [],
    },
  });
  return {
    apiVersion: "factory.template-draft-instance/v1",
    template: {
      apiVersion: "factory.curated-template/v1",
      key: "restaurant-dual-surface",
      version: "1.0.0",
      name: "Maison Aurelia",
      description: "Restaurant product",
      surfaces: ["customer-mobile", "merchant-desktop"],
      graphChecksum:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    origin: {
      templateKey: "restaurant-dual-surface",
      templateVersion: "1.0.0",
      templateGraphChecksum:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    draft: {
      applicationGraphId: "application-1",
      applicationKey: "restaurant-template-001",
      draftRevisionId: `draft-${revisionNumber}`,
      revisionNumber,
      graph: {
        metadata: {
          name: revisionNumber === 1 ? "Maison Aurelia" : "Maison Rivage",
        },
      } as WorkbenchTemplateDraftInstance["draft"]["graph"],
    },
    snapshot: {
      apiVersion: "factory.draft-preview-snapshot/v2",
      id: `preview-${revisionNumber}`,
      workspaceId: "local-workspace",
      applicationGraphId: "application-1",
      draftRevisionId: `draft-${revisionNumber}`,
      graphVersion: "factory.application-graph/v3",
      graphChecksum:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      snapshotChecksum:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      disposition: "preview-only",
      state: "active",
      createdAt: "2026-08-14T08:00:00.000Z",
      expiresAt: "2026-08-14T08:30:00.000Z",
    },
    previews: [
      surface("customer-mobile", [
        "Welcome",
        "Menu",
        "Dish detail",
        "Cart",
        "Checkout",
        "Orders",
        "Order detail",
        "Profile",
      ]),
      surface("merchant-desktop", [
        "Dashboard",
        "Menu management",
        "Orders",
        "Kitchen queue",
        "Tables",
        "Users and roles",
        "Settings",
      ]),
    ],
  };
}

describe("TemplateDraftWorkspace", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows a real dual-surface Draft preview while technical checksums stay disclosed", () => {
    function Harness() {
      const [selection, setSelection] = React.useState<TemplatePageSelection>({
        surfaceKey: "customer-mobile" as const,
        pageId: "customer-mobile-0",
      });
      return (
        <TemplateDraftWorkspace
          instance={instance()}
          selection={selection}
          busy={false}
          error={null}
          onRename={vi.fn()}
          onSelectionChange={setSelection}
          onEditPage={vi.fn()}
        />
      );
    }
    act(() => {
      root.render(<Harness />);
    });

    expect(container.textContent).toContain("Maison Aurelia");
    expect(container.textContent).toContain(
      "Created from Restaurant dual surface · v1.0.0",
    );
    expect(container.textContent).toContain("Draft r.1");
    expect(container.textContent).toContain("Preview synced");
    expect(container.textContent).toContain("8 customer pages");
    expect(container.textContent).toContain("7 merchant pages");
    expect(container.textContent).toContain("Welcome");
    expect(container.textContent).not.toContain("sha256:");

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Merchant desktop"]',
        )
        ?.click();
    });
    expect(container.textContent).toContain("Dashboard");
    expect(container.textContent).toContain("Kitchen queue");

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Preview details"]',
        )
        ?.click();
    });
    expect(container.textContent).toContain("sha256:cccc");
  });

  it("saves a title edit through the append-only Draft callback", () => {
    const onRename = vi.fn();
    act(() => {
      root.render(
        <TemplateDraftWorkspace
          instance={instance()}
          selection={{
            surfaceKey: "customer-mobile",
            pageId: "customer-mobile-0",
          }}
          busy={false}
          error={null}
          onRename={onRename}
          onSelectionChange={vi.fn()}
          onEditPage={vi.fn()}
        />,
      );
    });
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Application name"]',
    );
    act(() => {
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set;
        setter!.call(input, "Maison Rivage");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Save application name"]',
        )
        ?.click();
    });

    expect(onRename).toHaveBeenCalledWith("Maison Rivage");
  });

  it("renders controlled selection and delegates select and edit events", () => {
    const onSelectionChange = vi.fn();
    const onEditPage = vi.fn();
    function Harness() {
      const [selection, setSelection] = React.useState<TemplatePageSelection>({
        surfaceKey: "customer-mobile" as const,
        pageId: "customer-mobile-1",
      });
      return (
        <TemplateDraftWorkspace
          instance={instance(2)}
          selection={selection}
          busy={false}
          error={null}
          onRename={vi.fn()}
          onSelectionChange={(next) => {
            onSelectionChange(next);
            setSelection(next);
          }}
          onEditPage={onEditPage}
        />
      );
    }
    act(() => {
      root.render(<Harness />);
    });

    expect(
      container.querySelector('button[aria-current="page"]')?.textContent,
    ).toContain("Menu");
    expect(
      container.querySelector('article[aria-label="Menu preview"]'),
    ).not.toBeNull();
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Edit Menu"]')
        ?.click();
    });
    expect(onEditPage).toHaveBeenCalledWith({
      surfaceKey: "customer-mobile",
      pageId: "customer-mobile-1",
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Merchant desktop"]',
        )
        ?.click();
    });
    expect(onSelectionChange).toHaveBeenCalledWith({
      surfaceKey: "merchant-desktop",
      pageId: "merchant-desktop-0",
    });
  });
});
