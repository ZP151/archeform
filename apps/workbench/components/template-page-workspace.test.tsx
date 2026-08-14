// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { templateDraftResponse } from "../test/template-draft-fixture";
import { TemplatePageWorkspace } from "./template-page-workspace";

const selection = {
  surfaceKey: "customer-mobile" as const,
  pageId: "customer-menu",
};

function setInput(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TemplatePageWorkspace", () => {
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

  it("submits the exact selected page title and blocks invalid, unchanged, and busy saves", () => {
    const onSave = vi.fn();
    const render = (busy: boolean) => {
      act(() => {
        root.render(
          <TemplatePageWorkspace
            instance={templateDraftResponse(2)}
            selection={selection}
            busy={busy}
            error={null}
            onSave={onSave}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(false);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Page title"]',
    )!;
    const save = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save page title"]',
    )!;
    expect(input.value).toBe("Menu");
    expect(save.disabled).toBe(true);
    expect(container.textContent).toContain("Customer mobile");
    expect(container.textContent).toContain("/menu");

    act(() => setInput(input, "A"));
    expect(save.disabled).toBe(true);
    act(() => setInput(input, "Seasonal Menu"));
    expect(save.disabled).toBe(false);
    expect(save.textContent).toContain("Save as new Draft");
    expect(
      container.querySelector('article[aria-label="Menu preview"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('article[aria-label="Seasonal Menu preview"]'),
    ).toBeNull();
    act(() => {
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onSave).toHaveBeenCalledWith({
      surfaceKey: "customer-mobile",
      pageId: "customer-menu",
      title: "Seasonal Menu",
    });

    render(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save page title"]',
      )?.disabled,
    ).toBe(true);
  });

  it("keeps an unsaved title after failure and returns on Escape without saving", () => {
    const onBack = vi.fn();
    const onSave = vi.fn();
    act(() => {
      root.render(
        <TemplatePageWorkspace
          instance={templateDraftResponse(2)}
          selection={selection}
          busy={false}
          error="Template Draft revision moved; reload before editing."
          onSave={onSave}
          onBack={onBack}
        />,
      );
    });
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Page title"]',
    )!;
    act(() => setInput(input, "Seasonal Menu"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "reload before editing",
    );
    expect(input.value).toBe("Seasonal Menu");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows the fresh revision and restores focus after a successful response", () => {
    act(() => {
      root.render(
        <TemplatePageWorkspace
          instance={templateDraftResponse(2)}
          selection={selection}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={vi.fn()}
        />,
      );
    });
    const before = document.activeElement;
    act(() => {
      root.render(
        <TemplatePageWorkspace
          instance={templateDraftResponse(3, {
            pageId: "customer-menu",
            title: "Seasonal Menu",
          })}
          selection={selection}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Draft r.3 · Preview active");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Page title"]',
      )?.value,
    ).toBe("Seasonal Menu");
    expect(container.textContent).toContain("Seasonal Menu");
    expect(document.activeElement).not.toBe(before);
    expect(document.activeElement?.getAttribute("data-page-save-status")).toBe(
      "success",
    );
  });
});
