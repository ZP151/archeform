import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { createHash } from "node:crypto";

const taskIconNames = [
  "house",
  "receipt-text",
  "user-round",
  "refresh-cw",
  "clock",
  "circle-check",
  "circle-x",
] as const;

const taskNavigationLabels = [
  "Task overview",
  "All tasks",
  "Task workflow",
] as const;

type TaskAssetExpectation = {
  /** A currently rendered interactive icon that this call must retain. */
  readonly visibleIconClass?: string;
};

export function taskField(row: Locator, label: string): Locator {
  return row
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .locator("..")
    .locator("dd");
}

export async function immutableTaskFingerprint(
  request: APIRequestContext,
  endpoint: string,
) {
  const response = await request.get(endpoint);
  expect(response.status()).toBe(200);
  const compilation = await response.json();
  expect(compilation.publishedRevisionId).toEqual(expect.any(String));
  expect(compilation.inputGraphHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(compilation.artifacts.length).toBeGreaterThan(0);
  return createHash("sha256").update(JSON.stringify(compilation)).digest("hex");
}

export async function openTaskNavigation(page: Page) {
  const disclosure = page
    .locator("details")
    .filter({ has: page.locator('nav[aria-label="Application routes"]') });
  if (
    (await disclosure.isVisible()) &&
    (await disclosure.getAttribute("open")) === null
  )
    await disclosure.locator(":scope > summary").click();
}

export async function navigateTask(page: Page, name: string) {
  await openTaskNavigation(page);
  await page
    .getByRole("navigation", { name: "Application routes" })
    .getByRole("link", { name, exact: true })
    .click();
}

export async function taskPresentationFacts(page: Page) {
  return page.evaluate((icons) => {
    const app = document.querySelector<HTMLElement>("main.task-v1");
    if (!app) return null;
    const style = getComputedStyle(app);
    const tokenReferences = new Set<string>();
    for (const sheet of document.styleSheets) {
      try {
        if (sheet.disabled) continue;
        for (const rule of sheet.cssRules)
          for (const match of rule.cssText.matchAll(
            /var\((--factory-[a-z0-9-]+)/g,
          ))
            tokenReferences.add(match[1]!);
      } catch {
        // Local generated CSS is readable. Cross-origin sheets are irrelevant.
      }
    }
    const visibleInteractiveIconClasses = [
      ...app.querySelectorAll<SVGElement>(
        "a svg[class*='lucide-'], button svg[class*='lucide-']",
      ),
    ]
      .filter((icon) => {
        const rect = icon.getBoundingClientRect();
        return (
          rect.width >= 16 &&
          rect.height >= 16 &&
          getComputedStyle(icon).visibility !== "hidden" &&
          icon.querySelector("path, circle, rect, line, polyline") !== null
        );
      })
      .flatMap((icon) =>
        icons.filter((name) => icon.classList.contains(`lucide-${name}`)),
      );
    return {
      workspaceVersion: style
        .getPropertyValue("--task-workspace-version")
        .trim(),
      appDisplay: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
      resolvedColourTokens: {
        accent: style.getPropertyValue("--factory-accent").trim(),
        surface: style.getPropertyValue("--factory-surface").trim(),
        text: style.getPropertyValue("--factory-text").trim(),
      },
      visibleInteractiveIconClasses: [
        ...new Set(visibleInteractiveIconClasses),
      ].sort(),
      unresolvedTokens: [...tokenReferences]
        .filter((token) => !style.getPropertyValue(token).trim())
        .sort(),
      bodyOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  }, taskIconNames);
}

export async function verifyTaskAssets(
  page: Page,
  expectation: TaskAssetExpectation = {},
) {
  const sheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLLinkElement).href),
    );
  expect(sheets, "generated stylesheet links").not.toEqual([]);
  for (const href of sheets) {
    const response = await page.request.get(href);
    expect(response.status(), "generated stylesheet HTTP status").toBe(200);
    expect(response.headers()["content-type"]).toContain("text/css");
  }
  const facts = await taskPresentationFacts(page);
  expect(facts, "task workspace root").not.toBeNull();
  expect(facts!.workspaceVersion, "task recipe marker").toBe("1.0.0");
  expect(facts!.appDisplay, "task workspace grid").toBe("grid");
  expect(facts!.gridTemplateColumns, "task workspace columns").not.toBe("");
  expect(facts!.resolvedColourTokens, "task colour tokens resolve").toEqual({
    accent: expect.any(String),
    surface: expect.any(String),
    text: expect.any(String),
  });
  for (const value of Object.values(facts!.resolvedColourTokens))
    expect(value).not.toBe("");
  expect(facts!.unresolvedTokens, "all factory tokens resolve").toEqual([]);
  expect(
    facts!.visibleInteractiveIconClasses,
    "current task state has visible interactive icon geometry",
  ).not.toEqual([]);
  if (expectation.visibleIconClass)
    expect(facts!.visibleInteractiveIconClasses).toContain(
      expectation.visibleIconClass,
    );
}

/**
 * Seven approved icons belong to the emitted Task asset map, even though a
 * particular route/state need not render every icon at once.
 */
export function verifyTaskEmittedIconSupply(source: string) {
  for (const icon of taskIconNames)
    expect(source, `Task emitted source supplies ${icon}`).toMatch(
      new RegExp(`\\b${icon}\\b`),
    );
}

export async function verifyTaskPresentation(page: Page, width: number) {
  await verifyTaskAssets(page);
  const app = page.locator("main.task-v1");
  const disclosure = page
    .locator("details")
    .filter({ has: page.locator('nav[aria-label="Application routes"]') });
  if (width < 900) {
    await expect(disclosure).toBeVisible();
    await expect(disclosure.locator(":scope > summary")).toHaveAccessibleName(
      `Navigation: ${await page.locator("h1").innerText()}`,
    );
    await disclosure.locator(":scope > summary").click();
    const links = page
      .getByRole("navigation", { name: "Application routes" })
      .getByRole("link");
    await expect(links).toHaveText(taskNavigationLabels);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await disclosure.locator(":scope > summary").click();
  } else {
    await expect(page.locator("aside")).toBeVisible();
    const columns = await app.evaluate(
      (node) => getComputedStyle(node).gridTemplateColumns.split(" ").length,
    );
    expect(columns).toBeGreaterThanOrEqual(2);
  }
  const rows = page.locator(".task-records > li");
  const overlap = await rows.evaluateAll((items) =>
    items.some((row) => {
      const boxes = [
        ...row.querySelectorAll<HTMLElement>(".task-summary > div"),
      ].map((field) => field.getBoundingClientRect());
      return boxes.some((box, index) =>
        boxes
          .slice(index + 1)
          .some(
            (other) =>
              Math.min(box.right, other.right) -
                Math.max(box.left, other.left) >
                1 &&
              Math.min(box.bottom, other.bottom) -
                Math.max(box.top, other.top) >
                1,
          ),
      );
    }),
  );
  expect(overlap, "task summaries do not overlap").toBe(false);
  expect(await taskPresentationFacts(page)).toMatchObject({
    bodyOverflow: false,
  });
  const violations = (
    await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()
  ).violations.map(({ id }) => id);
  expect(violations, "task workspace accessibility").toEqual([]);
}

/** Proves the visual checks are capable of rejecting asset regressions. */
export async function verifyTaskAssetFailureDetection(page: Page) {
  const stylesheetStates = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => {
        const element = link as HTMLLinkElement;
        const disabled = element.disabled;
        element.disabled = true;
        return disabled;
      }),
    );
  try {
    await expect(verifyTaskAssets(page)).rejects.toThrow();
  } finally {
    await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((links, states) => {
        links.forEach((link, index) => {
          (link as HTMLLinkElement).disabled = states[index] ?? false;
        });
      }, stylesheetStates);
  }
  await verifyTaskAssets(page);
  const iconClass = await page.evaluate(() => {
    const icon = [
      ...document.querySelectorAll<SVGElement>(
        "main.task-v1 a svg[class*='lucide-'], main.task-v1 button svg[class*='lucide-']",
      ),
    ].find((candidate) => {
      const bounds = candidate.getBoundingClientRect();
      return bounds.width >= 16 && bounds.height >= 16;
    });
    if (!icon) return null;
    const className = [...icon.classList].find((name) =>
      name.startsWith("lucide-"),
    );
    if (!className) return null;
    icon.dataset.taskAssetProbe = "true";
    return className.replace(/^lucide-/, "");
  });
  expect(iconClass, "visible interactive task icon").not.toBeNull();
  await verifyTaskAssets(page, { visibleIconClass: iconClass! });
  const hidden = await page.addStyleTag({
    content:
      "[data-task-asset-probe='true'] { visibility: hidden !important; }",
  });
  try {
    await expect(
      verifyTaskAssets(page, { visibleIconClass: iconClass! }),
    ).rejects.toThrow();
  } finally {
    await hidden.evaluate((node) => node.remove());
    await page.evaluate(() => {
      document
        .querySelector("[data-task-asset-probe='true']")
        ?.removeAttribute("data-task-asset-probe");
    });
  }
  await verifyTaskAssets(page, { visibleIconClass: iconClass! });
}
