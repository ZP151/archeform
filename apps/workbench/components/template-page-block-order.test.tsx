// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const puckState = vi.hoisted(() => ({ current: null as any }));

vi.mock("@puckeditor/core", () => {
  function Puck(props: any) {
    const [data, setData] = React.useState(props.data);
    puckState.current = {
      ...props,
      data,
      onChange(next: any) {
        setData(next);
        props.onChange(next);
      },
    };
    return (
      <div data-testid="puck-order-surface">
        {data.content.map((entry: any, index: number) => (
          <div
            key={`${String(entry?.props?.id)}-${index}`}
            data-mock-puck-component={String(entry?.props?.id)}
          />
        ))}
        {props.children}
      </div>
    );
  }
  Puck.Layout = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="puck-layout">{children}</div>
  );
  Puck.Outline = () => <div data-testid="puck-outline" />;
  Puck.Preview = () => <div data-testid="puck-preview" />;
  Puck.Components = () => <div data-testid="puck-components" />;
  Puck.Fields = () => <div data-testid="puck-fields" />;
  return { Puck };
});

import { TemplatePageBlockOrder } from "./template-page-block-order";

const blocks = [
  { id: "home-hero", type: "menu-hero" },
  { id: "home-categories", type: "category-rail" },
  { id: "home-items", type: "menu-item-card" },
] as const;

describe("TemplatePageBlockOrder", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    puckState.current = null;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const canvasIds = () =>
    Array.from(container.querySelectorAll("[data-mock-puck-component]")).map(
      (element) => element.getAttribute("data-mock-puck-component"),
    );

  it("configures Puck as reorder-only and saves a valid drag permutation", () => {
    const onSave = vi.fn();
    act(() => {
      root.render(
        <TemplatePageBlockOrder blocks={blocks} busy={false} onSave={onSave} />,
      );
    });

    expect(puckState.current.permissions).toEqual({
      drag: true,
      duplicate: false,
      delete: false,
      edit: false,
      insert: false,
    });
    expect(puckState.current.iframe).toEqual({ enabled: false });
    expect(puckState.current.data).toEqual({
      root: { props: {} },
      content: [
        { type: "menu-hero", props: { id: "home-hero" } },
        { type: "category-rail", props: { id: "home-categories" } },
        { type: "menu-item-card", props: { id: "home-items" } },
      ],
    });
    expect(
      container.querySelector('[data-testid="puck-layout"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="puck-outline"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="puck-preview"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="puck-components"]'),
    ).toBeNull();
    expect(container.querySelector('[data-testid="puck-fields"]')).toBeNull();

    const save = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save block order"]',
    )!;
    expect(save.disabled).toBe(true);
    act(() => {
      puckState.current.onChange({
        root: { props: {} },
        content: [
          puckState.current.data.content[2],
          puckState.current.data.content[0],
          puckState.current.data.content[1],
        ],
      });
    });
    expect(save.disabled).toBe(false);
    act(() => save.click());
    expect(onSave).toHaveBeenCalledWith([
      "home-items",
      "home-hero",
      "home-categories",
    ]);
  });

  it("provides keyboard moves, disabled boundaries, status, and busy gating", () => {
    const onSave = vi.fn();
    const render = (busy: boolean) => {
      act(() => {
        root.render(
          <TemplatePageBlockOrder
            blocks={blocks}
            busy={busy}
            onSave={onSave}
          />,
        );
      });
    };
    render(false);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Move menu-hero home-hero up"]',
      )?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Move menu-item-card home-items down"]',
      )?.disabled,
    ).toBe(true);

    const move = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Move menu-item-card home-items up"]',
    )!;
    act(() => move.click());
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Proposed order",
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Save block order"]',
        )!
        .click(),
    );
    expect(onSave).toHaveBeenCalledWith([
      "home-hero",
      "home-items",
      "home-categories",
    ]);

    render(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save block order"]',
      )?.disabled,
    ).toBe(true);
  });

  it("rejects hostile Puck output and never enables Save", () => {
    act(() => {
      root.render(
        <TemplatePageBlockOrder
          blocks={blocks}
          busy={false}
          onSave={vi.fn()}
        />,
      );
    });
    act(() => {
      puckState.current.onChange({
        root: { props: {} },
        content: [
          puckState.current.data.content[0],
          puckState.current.data.content[0],
          puckState.current.data.content[2],
        ],
      });
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Order change rejected",
    );
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save block order"]',
      )?.disabled,
    ).toBe(true);
  });

  it("synchronizes the mounted Puck canvas after keyboard, failure, and authoritative props", () => {
    const render = (
      nextBlocks: readonly { readonly id: string; readonly type: string }[],
      busy = false,
    ) => {
      act(() => {
        root.render(
          <TemplatePageBlockOrder
            blocks={nextBlocks}
            busy={busy}
            onSave={vi.fn()}
          />,
        );
      });
    };
    render(blocks);
    expect(canvasIds()).toEqual(["home-hero", "home-categories", "home-items"]);

    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Move menu-item-card home-items up"]',
        )!
        .click(),
    );
    expect(canvasIds()).toEqual(["home-hero", "home-items", "home-categories"]);

    render(blocks, true);
    expect(canvasIds()).toEqual(["home-hero", "home-items", "home-categories"]);

    render([blocks[2], blocks[0], blocks[1]]);
    expect(canvasIds()).toEqual(["home-items", "home-hero", "home-categories"]);
  });

  it("remounts Puck to the last accepted order after hostile output", () => {
    act(() => {
      root.render(
        <TemplatePageBlockOrder
          blocks={blocks}
          busy={false}
          onSave={vi.fn()}
        />,
      );
    });
    act(() => {
      puckState.current.onChange({
        root: { props: {} },
        content: [
          puckState.current.data.content[0],
          puckState.current.data.content[2],
          puckState.current.data.content[1],
        ],
      });
    });
    expect(canvasIds()).toEqual(["home-hero", "home-items", "home-categories"]);

    act(() => {
      puckState.current.onChange({
        root: { props: {} },
        content: [
          ...puckState.current.data.content,
          { type: "menu-hero", props: { id: "hostile-block" } },
        ],
      });
    });
    expect(canvasIds()).toEqual(["home-hero", "home-items", "home-categories"]);
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Order change rejected",
    );
  });
});
