// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { templateDraftResponse } from "../test/template-draft-fixture";
import { TemplateAccessWorkspace } from "./template-access-workspace";

function setInput(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TemplateAccessWorkspace", () => {
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

  it("shows the declared canonical roles and derives both previews from the strict Graph", () => {
    act(() => {
      root.render(
        <TemplateAccessWorkspace
          instance={templateDraftResponse(6)}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Team roles");
    for (const role of ["customer", "cashier", "kitchen", "manager"]) {
      expect(container.textContent).toContain(role);
    }
    expect(
      Array.from(
        container.querySelectorAll("[data-template-access-preview] strong"),
      ).map((element) => element.textContent),
    ).toEqual(["4 roles", "4 roles"]);
  });

  it("submits one normalized role key and blocks invalid, duplicate, and busy saves", () => {
    const onSave = vi.fn();
    const render = (busy: boolean) => {
      act(() => {
        root.render(
          <TemplateAccessWorkspace
            instance={templateDraftResponse(6)}
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
      'input[aria-label="Role key"]',
    )!;
    const save = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save role as new Draft"]',
    )!;
    expect(save.disabled).toBe(true);
    for (const invalid of ["Host", "1host", "host_role", "", "manager"]) {
      act(() => setInput(input, invalid));
      expect(save.disabled).toBe(true);
    }
    act(() => setInput(input, "  host  "));
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
    expect(onSave).toHaveBeenCalledWith("host");
    render(true);
    expect(save.disabled).toBe(true);
    act(() => save.click());
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("settles a failed attempt before allowing one retry with the fixed error", () => {
    const onSave = vi.fn();
    const render = (busy: boolean, error: string | null) => {
      act(() => {
        root.render(
          <TemplateAccessWorkspace
            instance={templateDraftResponse(6)}
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
      'input[aria-label="Role key"]',
    )!;
    const form = container.querySelector("form")!;
    act(() => setInput(input, "host"));
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledOnce();

    render(true, null);
    render(false, "Template access could not be saved.");
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save role as new Draft"]',
      )!.disabled,
    ).toBe(false);
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

  it("settles a successful r.7 attempt without enabling the added role or retaining the latch", () => {
    const onSave = vi.fn();
    const render = (revision: 6 | 7, busy: boolean) => {
      act(() => {
        root.render(
          <TemplateAccessWorkspace
            instance={templateDraftResponse(revision)}
            busy={busy}
            error={null}
            onSave={onSave}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(6, false);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Role key"]',
    )!;
    const form = container.querySelector("form")!;
    act(() => setInput(input, "host"));
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledOnce();

    render(6, true);
    render(7, false);
    expect(input.value).toBe("");
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save role as new Draft"]',
      )!.disabled,
    ).toBe(true);
  });

  it("fails closed for unsupported policy data with deterministic Escape and status", () => {
    const unsupported = structuredClone(templateDraftResponse(6));
    (unsupported.draft.graph.policy as unknown as { roles: unknown }).roles =
      "not-an-array";
    const onBack = vi.fn();
    act(() => {
      root.render(
        <TemplateAccessWorkspace
          instance={unsupported}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={onBack}
        />,
      );
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Template access could not be saved.",
    );
    expect(
      container.querySelector("[data-template-access-preview]"),
    ).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onBack).toHaveBeenCalledOnce();
  });
});
