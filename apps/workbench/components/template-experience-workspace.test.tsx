// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { templateDraftResponse } from "../test/template-draft-fixture";
import { TemplateExperienceWorkspace } from "./template-experience-workspace";

function experienceInstance(revision: 5 | 6) {
  return templateDraftResponse(
    revision,
    { pageId: "customer-menu", title: "Seasonal Menu" },
    {
      pageId: "customer-home",
      blockIds: ["home-items", "home-hero", "home-categories"],
    },
    "Heirloom tomato pizza",
    revision === 6 ? "dark" : "light",
  );
}

describe("TemplateExperienceWorkspace", () => {
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

  it("shows a labelled Theme group and derives both accepted frames from the strict r.5 Graph", () => {
    act(() => {
      root.render(
        <TemplateExperienceWorkspace
          instance={experienceInstance(5)}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={vi.fn()}
        />,
      );
    });

    const group = container.querySelector(
      '[role="radiogroup"][aria-label="Theme"]',
    );
    const light = container.querySelector<HTMLInputElement>(
      'input[type="radio"][aria-label="Light"]',
    )!;
    const dark = container.querySelector<HTMLInputElement>(
      'input[type="radio"][aria-label="Dark"]',
    )!;
    const frames = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-template-experience-preview]",
      ),
    );
    expect(group).not.toBeNull();
    expect(light.checked).toBe(true);
    expect(dark.checked).toBe(false);
    expect(frames.map((frame) => frame.getAttribute("aria-label"))).toEqual([
      "Customer theme preview",
      "Merchant theme preview",
    ]);
    expect(frames.map((frame) => frame.dataset.templateTheme)).toEqual([
      "light",
      "light",
    ]);
    expect(frames.map((frame) => frame.textContent)).toEqual([
      expect.stringContaining("Snapshot preview-5"),
      expect.stringContaining("Snapshot preview-5"),
    ]);

    act(() => dark.click());
    expect(dark.checked).toBe(true);
    expect(frames.map((frame) => frame.dataset.templateTheme)).toEqual([
      "light",
      "light",
    ]);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save dark theme as new Draft"]',
      )!.disabled,
    ).toBe(false);
  });

  it("submits dark once and blocks unchanged, busy, and same-act duplicate saves", () => {
    const onSave = vi.fn();
    const render = (busy: boolean) => {
      act(() => {
        root.render(
          <TemplateExperienceWorkspace
            instance={experienceInstance(5)}
            busy={busy}
            error={null}
            onSave={onSave}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(false);
    const dark = container.querySelector<HTMLInputElement>(
      'input[type="radio"][aria-label="Dark"]',
    )!;
    const form = container.querySelector("form")!;
    const save = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save dark theme as new Draft"]',
    )!;
    expect(save.disabled).toBe(true);
    act(() => dark.click());
    expect(save.disabled).toBe(false);

    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("dark");
    render(true);
    expect(save.disabled).toBe(true);
    act(() => save.click());
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("retains the Dark proposal and light frames through failure, focuses the choice, and permits one retry", () => {
    const onSave = vi.fn();
    const render = (busy: boolean, error: string | null) => {
      act(() => {
        root.render(
          <TemplateExperienceWorkspace
            instance={experienceInstance(5)}
            busy={busy}
            error={error}
            onSave={onSave}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(false, null);
    const dark = container.querySelector<HTMLInputElement>(
      'input[type="radio"][aria-label="Dark"]',
    )!;
    const form = container.querySelector("form")!;
    act(() => dark.click());
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    render(true, null);
    expect(
      Array.from(
        container.querySelectorAll<HTMLElement>(
          "[data-template-experience-preview]",
        ),
        (frame) => frame.dataset.templateTheme,
      ),
    ).toEqual(["light", "light"]);

    render(false, "Template experience could not be saved.");
    expect(dark.checked).toBe(true);
    expect(document.activeElement).toBe(dark);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Template experience could not be saved.",
    );
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

  it("adopts strict r.6 dark frames together, announces success, and clears the stale latch", () => {
    const onSave = vi.fn();
    const render = (revision: 5 | 6, busy: boolean) => {
      act(() => {
        root.render(
          <TemplateExperienceWorkspace
            instance={experienceInstance(revision)}
            busy={busy}
            error={null}
            onSave={onSave}
            onBack={vi.fn()}
          />,
        );
      });
    };
    render(5, false);
    const dark = container.querySelector<HTMLInputElement>(
      'input[type="radio"][aria-label="Dark"]',
    )!;
    const form = container.querySelector("form")!;
    act(() => dark.click());
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    render(5, true);
    render(6, false);

    expect(dark.checked).toBe(true);
    expect(
      Array.from(
        container.querySelectorAll<HTMLElement>(
          "[data-template-experience-preview]",
        ),
        (frame) => frame.dataset.templateTheme,
      ),
    ).toEqual(["dark", "dark"]);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Save dark theme as new Draft"]',
      )!.disabled,
    ).toBe(true);
    expect(container.textContent).toContain("Draft r.6 · Preview active");
    expect(
      document.activeElement?.getAttribute(
        "data-template-experience-save-status",
      ),
    ).toBe("success");
  });

  it("fails closed for unsupported theme authority and provides deterministic Escape behavior", () => {
    const unsupported = structuredClone(experienceInstance(5));
    unsupported.draft.graph.experience.theme.mode = "system";
    const onBack = vi.fn();
    act(() => {
      root.render(
        <TemplateExperienceWorkspace
          instance={unsupported}
          busy={false}
          error={null}
          onSave={vi.fn()}
          onBack={onBack}
        />,
      );
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Template experience could not be saved.",
    );
    expect(
      container.querySelector("[data-template-experience-preview]"),
    ).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onBack).toHaveBeenCalledOnce();
  });
});
