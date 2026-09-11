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
  await verifyBrandColors(page);
  await verifyDecisionColors(page);
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
    await verifyNavigationColors(page, false);
    await disclosure.locator(":scope > summary").click();
  } else {
    await expect(page.locator("aside")).toBeVisible();
    await verifyNavigationColors(page, true);
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
  ).toBe("2");
  expect(facts.appDisplay).toBe("grid");
  expect(facts.unresolvedTokens, "all used design tokens must resolve").toEqual(
    [],
  );
  expect(facts.bodyOverflow).toBe(false);
  for (const refresh of await page
    .locator("button.approval-refresh:visible")
    .all()) {
    await expect(refresh).toHaveAccessibleName("Refresh");
    await expect(refresh).toHaveAttribute("title", "Refresh");
    await expect(refresh).toHaveText("");
    const bounds = await refresh.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
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

async function verifyBrandColors(page: Page) {
  const facts = await page
    .locator(".approval-workspace-sidebar")
    .evaluate((node) => {
      const style = getComputedStyle(node);
      const resolve = (name: string) => {
        const probe = document.createElement("span");
        probe.style.color = style.getPropertyValue(name);
        probe.style.display = "none";
        node.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      return {
        background: style.backgroundColor,
        text: style.color,
        accent: resolve("--factory-accent"),
        foreground: resolve("--factory-accent-text"),
        canvas: getComputedStyle(node.closest("main")!).backgroundColor,
        canvasToken: resolve("--factory-bg"),
      };
    });
  expect(facts.background).toBe(facts.accent);
  expect(facts.text).toBe(facts.foreground);
  expect(facts.canvas).toBe(facts.canvasToken);
}
async function verifyNavigationColors(page: Page, desktop: boolean) {
  const nav = page.locator(
    desktop
      ? ".approval-workspace-sidebar nav"
      : ".approval-workspace-mobile-nav nav",
  );
  const check = async (current: boolean) => {
    await expect(async () => {
      const link = nav
        .locator(
          current ? "a[aria-current='page']" : "a:not([aria-current='page'])",
        )
        .first();
      const facts = await link.evaluate(
        (node, { desktop, current }) => {
          const style = getComputedStyle(node);
          const resolve = (name: string) => {
            const probe = document.createElement("span");
            probe.style.color = style.getPropertyValue(name);
            probe.style.display = "none";
            node.append(probe);
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
          };
          return {
            background: style.backgroundColor,
            text: style.color,
            expectedBackground: resolve(
              current && !desktop ? "--factory-accent" : "--factory-surface",
            ),
            expectedText: resolve(
              current && !desktop
                ? "--factory-accent-text"
                : desktop
                  ? "--factory-accent"
                  : "--factory-text",
            ),
          };
        },
        { desktop, current },
      );
      expect(facts.background).toBe(facts.expectedBackground);
      expect(facts.text).toBe(facts.expectedText);
    }).toPass({ timeout: 2000 });
  };
  const ordinary = nav.locator("a:not([aria-current='page'])").first();
  await ordinary.hover();
  await check(false);
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await ordinary.focus();
  await expect(ordinary).toBeFocused();
  expect(await ordinary.evaluate((node) => node.matches(":hover"))).toBe(false);
  expect(
    await ordinary.evaluate((node) => node.matches(":focus-visible")),
  ).toBe(true);
  await check(false);
  await check(true);
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
}

async function verifyDecisionColors(page: Page) {
  await expect(async () => {
    const facts = await page.locator(".approval-record").evaluateAll((rows) =>
      rows.map((row) => {
        const resolve = (value: string, background = false) => {
          const probe = document.createElement("span");
          if (background) probe.style.backgroundColor = value;
          else probe.style.color = value;
          probe.style.display = "none";
          row.append(probe);
          const style = getComputedStyle(probe);
          const result = background ? style.backgroundColor : style.color;
          probe.remove();
          return result;
        };
        const checks: Record<string, boolean> = {
          neutralRow:
            getComputedStyle(row).backgroundColor ===
            resolve("var(--factory-surface)", true),
        };
        const tone = ["positive", "pending", "negative"].find((tone) =>
          row.classList.contains(`approval-tone-${tone}`),
        );
        const token =
          tone === "positive"
            ? "success"
            : tone === "pending"
              ? "warning"
              : "danger";
        const badge = row.querySelector(".approval-badge");
        if (tone && badge) {
          const style = getComputedStyle(badge);
          checks.badgeFill =
            style.backgroundColor ===
            resolve(
              `color-mix(in srgb,var(--factory-colour-${token}) 18%,var(--factory-surface))`,
              true,
            );
          checks.badgeBorder =
            style.borderTopColor === resolve(`var(--factory-colour-${token})`);
          checks.badgeText = style.color === resolve("var(--factory-text)");
          const icon = badge.querySelector(".approval-icon");
          checks.badgeIcon =
            !!icon &&
            getComputedStyle(icon).color ===
              resolve(`var(--factory-colour-${token})`);
        }
        for (const [index, button] of [
          ...row.querySelectorAll(
            ":scope > .approval-actions button:not(:disabled)",
          ),
        ].entries()) {
          const style = getComputedStyle(button);
          checks[`action${index}Fill`] =
            style.backgroundColor === resolve("var(--factory-accent)", true);
          checks[`action${index}Border`] =
            style.borderTopColor === resolve("var(--factory-accent)");
          checks[`action${index}Text`] =
            style.color === resolve("var(--factory-accent-text)");
        }
        return { tone: tone ?? "neutral", checks };
      }),
    );
    for (const fact of facts)
      for (const [name, pass] of Object.entries(fact.checks))
        expect(pass, `${fact.tone} ${name}`).toBe(true);
  }).toPass({ timeout: 2000 });
}
