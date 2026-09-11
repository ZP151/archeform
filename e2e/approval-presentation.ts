import { expect, type Page } from "@playwright/test";

export async function approvalPresentationFacts(page: Page) {
  return page.evaluate(() => {
    const app = document.querySelector<HTMLElement>("main.approval-v1")!;
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
        /* Cross-origin rules cannot define this local recipe. */
      }
    }
    const icons = [
      ...app.querySelectorAll<HTMLElement>(".approval-icon"),
    ].filter((icon) => {
      const rect = icon.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return {
      stylesheetLoaded: [...document.styleSheets].some((sheet) => {
        try {
          return !sheet.disabled && sheet.cssRules.length > 0;
        } catch {
          return false;
        }
      }),
      workspaceVersion: style
        .getPropertyValue("--approval-workspace-version")
        .trim(),
      iconsVisible:
        icons.length > 0 &&
        icons.every((wrapper) => {
          const icon = wrapper.querySelector<SVGElement>("svg");
          if (!icon) return false;
          const rect = icon.getBoundingClientRect();
          return (
            rect.width >= 16 &&
            rect.height >= 16 &&
            getComputedStyle(icon).visibility !== "hidden" &&
            icon.querySelector("path, circle, rect, line, polyline") !== null
          );
        }),
      appDisplay: style.display,
      unresolvedTokens: [...tokenReferences]
        .filter((token) => !style.getPropertyValue(token).trim())
        .sort(),
      bodyOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

export async function openApprovalNavigation(page: Page) {
  const disclosure = page
    .locator("details")
    .filter({ has: page.locator('nav[aria-label="Application routes"]') });
  if (
    (await disclosure.isVisible()) &&
    (await disclosure.getAttribute("open")) === null
  )
    await disclosure.locator(":scope > summary").click();
}

export async function navigateApproval(page: Page, name: string) {
  await openApprovalNavigation(page);
  await page
    .getByRole("navigation", { name: "Application routes" })
    .getByRole("link", { name, exact: true })
    .click();
}

export async function verifyWorkspaceComposition(page: Page, width: number) {
  await verifyApprovalAssets(page);
  const disclosure = page
    .locator("details")
    .filter({ has: page.locator('nav[aria-label="Application routes"]') });
  if (width < 900) {
    await expect(disclosure).toBeVisible();
    await expect(disclosure.locator(":scope > summary")).toHaveAccessibleName(
      `Navigation: ${await page.locator("h1").innerText()}`,
    );
    await expect(disclosure).not.toHaveAttribute("open", "");
    await disclosure.locator(":scope > summary").click();
    const links = page
      .getByRole("navigation", { name: "Application routes" })
      .getByRole("link");
    expect(await links.count()).toBeGreaterThanOrEqual(5);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      const bounds = await link.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(
        await link.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
    }
    await disclosure.locator(":scope > summary").click();
  } else {
    await expect(page.locator("aside")).toBeVisible();
    const columns = await page
      .locator("main.approval-v1")
      .evaluate(
        (node) => getComputedStyle(node).gridTemplateColumns.split(" ").length,
      );
    expect(columns).toBeGreaterThanOrEqual(2);
  }
  const rows = page.locator(".generated-records > li");
  const overlappingFields = await rows.evaluateAll((items) =>
    items.some((row) => {
      const fields = [
        ...row.querySelectorAll<HTMLElement>(".approval-summary > div"),
      ].map((field) => field.getBoundingClientRect());
      return fields.some((field, i) =>
        fields
          .slice(i + 1)
          .some(
            (other) =>
              Math.min(field.right, other.right) -
                Math.max(field.left, other.left) >
                1 &&
              Math.min(field.bottom, other.bottom) -
                Math.max(field.top, other.top) >
                1,
          ),
      );
    }),
  );
  expect(overlappingFields, "business summaries must not overlap").toBe(false);
  if ((await rows.count()) >= 2) {
    const second = rows.nth(1);
    await expect(second.locator(".approval-summary")).toBeInViewport({
      ratio: 1,
    });
    const title = second.locator(".approval-record-title");
    if (await title.count()) await expect(title).toBeInViewport({ ratio: 1 });
    const colors = await rows.evaluateAll((items) =>
      items.map((row) => getComputedStyle(row).backgroundColor),
    );
    expect(new Set(colors).size, "status does not tint whole rows").toBe(1);
  }
}

export async function verifyApprovalAssets(page: Page) {
  const sheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLLinkElement).href),
    );
  expect(sheets.length).toBeGreaterThan(0);
  for (const href of sheets) {
    const response = await page.request.get(href);
    expect(response.status(), "generated stylesheet HTTP status").toBe(200);
    expect(response.headers()["content-type"]).toContain("text/css");
  }
  const facts = await approvalPresentationFacts(page);
  console.info("FACTORY_APPROVAL_ASSET_FACTS", JSON.stringify(facts));
  expect(facts.stylesheetLoaded).toBe(true);
  expect(facts.iconsVisible).toBe(true);
  expect(
    facts.workspaceVersion,
    "shared composed workspace must be loaded",
  ).toBe("1");
  expect(facts.appDisplay).toBe("grid");
  expect(facts.unresolvedTokens, "all used design tokens must resolve").toEqual(
    [],
  );
  expect(facts.bodyOverflow).toBe(false);
}

export async function verifyAssetFailureDetection(page: Page) {
  await page.evaluate(() => {
    for (const sheet of document.styleSheets) sheet.disabled = true;
  });
  try {
    const degraded = await approvalPresentationFacts(page);
    expect(degraded.stylesheetLoaded).toBe(false);
    expect(degraded.workspaceVersion).toBe("");
    expect(degraded.appDisplay).not.toBe("grid");
  } finally {
    await page.evaluate(() => {
      for (const sheet of document.styleSheets) sheet.disabled = false;
    });
  }
  const hidden = await page.addStyleTag({
    content: ".approval-icon svg { visibility: hidden !important; }",
  });
  try {
    expect((await approvalPresentationFacts(page)).iconsVisible).toBe(false);
  } finally {
    await hidden.evaluate((node) => node.remove());
  }
  await verifyApprovalAssets(page);
}
