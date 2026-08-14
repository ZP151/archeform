// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { templateDraftResponse } from "../test/template-draft-fixture";
import { TemplateDataWorkspace } from "./template-data-workspace";

function setInput(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TemplateDataWorkspace", () => {
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

  it("shows the exact Restaurant hierarchy and derives both previews from the strict Graph", () => {
    act(() => {
      root.render(
        <TemplateDataWorkspace
          instance={templateDraftResponse(4)}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Menu items");
    expect(container.textContent).toContain("Margherita pizza");
    expect(container.textContent).toContain("Dish name");
    expect(container.textContent).toContain("Customer Menu");
    expect(container.textContent).toContain("Merchant Menu Management");
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Dish name"]')
        ?.value,
    ).toBe("Margherita pizza");
    expect(
      Array.from(
        container.querySelectorAll("[data-template-data-preview] strong"),
      ).map((element) => element.textContent),
    ).toEqual(["Margherita pizza", "Margherita pizza"]);
  });

  it("submits one normalized value and blocks invalid, unchanged, busy, and duplicate saves", () => {
    const onSave = vi.fn();
    const render = (busy: boolean) => {
      act(() => {
        root.render(
          <TemplateDataWorkspace
            instance={templateDraftResponse(4)}
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
      'input[aria-label="Dish name"]',
    )!;
    const save = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save dish name as new Draft"]',
    )!;
    expect(save.disabled).toBe(true);
    act(() => setInput(input, "A"));
    expect(save.disabled).toBe(true);
    act(() => setInput(input, "Dish\u0000name"));
    expect(save.disabled).toBe(true);
    act(() => setInput(input, "  Heirloom tomato pizza  "));
    expect(save.disabled).toBe(false);

    const form = container.querySelector("form")!;
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("Heirloom tomato pizza");
    render(true);
    expect(save.disabled).toBe(true);
    act(() => save.click());
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("settles a failed attempt before allowing one retry, including an identical repeated error", () => {
    const onSave = vi.fn();
    const render = (busy: boolean, error: string | null) => {
      act(() => {
        root.render(
          <TemplateDataWorkspace
            instance={templateDraftResponse(4)}
            busy={busy}
            error={error}
            onSave={onSave}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(false, null);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Dish name"]',
    )!;
    const form = container.querySelector("form")!;
    act(() => setInput(input, "Heirloom tomato pizza"));
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledOnce();

    render(true, null);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save dish name as new Draft"]',
      )!.disabled,
    ).toBe(true);
    render(false, "Template data could not be saved.");
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledTimes(2);

    render(false, "Template data could not be saved.");
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledTimes(3);
  });

  it("settles a successful r.5 attempt without enabling unchanged data or retaining the latch", () => {
    const onSave = vi.fn();
    const render = (revision: 4 | 5, busy: boolean) => {
      act(() => {
        root.render(
          <TemplateDataWorkspace
            instance={templateDraftResponse(
              revision,
              undefined,
              undefined,
              revision === 5 ? "Heirloom tomato pizza" : undefined,
            )}
            busy={busy}
            error={null}
            onSave={onSave}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(4, false);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Dish name"]',
    )!;
    const form = container.querySelector("form")!;
    const save = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save dish name as new Draft"]',
    )!;
    act(() => setInput(input, "Heirloom tomato pizza"));
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledOnce();

    render(4, true);
    render(5, false);
    expect(input.value).toBe("Heirloom tomato pizza");
    expect(save.disabled).toBe(true);
    act(() => setInput(input, "Truffle pizza"));
    expect(save.disabled).toBe(false);
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("preserves failed input and authoritative previews, then updates both together on strict r.5", () => {
    const render = (revision: 4 | 5, busy: boolean, error: string | null) => {
      act(() => {
        root.render(
          <TemplateDataWorkspace
            instance={templateDraftResponse(
              revision,
              undefined,
              undefined,
              revision === 5 ? "Heirloom tomato pizza" : undefined,
            )}
            busy={busy}
            error={error}
            onSave={vi.fn()}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(4, false, null);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Dish name"]',
    )!;
    act(() => setInput(input, "Heirloom tomato pizza"));
    render(4, true, null);
    expect(input.value).toBe("Heirloom tomato pizza");
    expect(
      Array.from(
        container.querySelectorAll("[data-template-data-preview] strong"),
      ).map((element) => element.textContent),
    ).toEqual(["Margherita pizza", "Margherita pizza"]);
    render(4, false, "Template data could not be saved.");
    expect(input.value).toBe("Heirloom tomato pizza");
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Template data could not be saved.",
    );
    expect(document.activeElement).toBe(input);

    render(5, false, null);
    expect(input.value).toBe("Heirloom tomato pizza");
    expect(
      Array.from(
        container.querySelectorAll("[data-template-data-preview] strong"),
      ).map((element) => element.textContent),
    ).toEqual(["Heirloom tomato pizza", "Heirloom tomato pizza"]);
    expect(container.textContent).toContain("Draft r.5 · Preview active");
    expect(
      document.activeElement?.getAttribute("data-template-data-save-status"),
    ).toBe("success");
  });

  it("fails closed for unsupported data and provides deterministic Escape and accessible status behavior", () => {
    const unsupported = structuredClone(templateDraftResponse(4));
    unsupported.draft.graph.domain.seedData!.find(
      ({ id }) => id === "margherita-pizza",
    )!.id = "unsupported-pizza";
    const onBack = vi.fn();
    act(() => {
      root.render(
        <TemplateDataWorkspace
          instance={unsupported}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={onBack}
        />,
      );
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Template data could not be saved.",
    );
    expect(container.querySelector("[data-template-data-preview]")).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onBack).toHaveBeenCalledOnce();
  });
});
