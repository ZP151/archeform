import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";

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
  await verifyExpressiveMaterials(page);
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
  ).toBe("4");
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

export async function verifyExpressiveMaterials(page: Page) {
  const hero = page.locator(".approval-family-hero");
  await expect(hero).toHaveCount(1);
  const photos = page.locator("img[data-approval-material]");
  await expect(photos.first()).toBeVisible();
  await expect(async () => {
    const facts = await photos.evaluateAll((images) =>
      images.map((node) => {
        const image = node as HTMLImageElement;
        const rect = image.getBoundingClientRect();
        return {
          key: image.dataset.approvalMaterial,
          local: image.src.startsWith("data:image/webp;base64,"),
          loaded:
            image.complete &&
            image.naturalWidth === 768 &&
            image.naturalHeight === 512,
          decorative: image.alt === "",
          sized:
            image.width > 0 &&
            image.height > 0 &&
            rect.width > 0 &&
            rect.height > 0,
        };
      }),
    );
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect([
        "approval-workspace-material",
        "approval-expense-material",
      ]).toContain(fact.key);
      expect(fact.local && fact.loaded && fact.decorative && fact.sized).toBe(
        true,
      );
    }
  }).toPass();
  const totalBytes = await photos.evaluateAll((images) =>
    [...new Set(images.map((node) => (node as HTMLImageElement).src))].reduce(
      (sum, source) => sum + atob(source.split(",")[1]!).length,
      0,
    ),
  );
  expect(totalBytes).toBeLessThanOrEqual(160 * 1024);
  for (const row of await page.locator(".approval-record").all()) {
    await expect(
      row.locator(".approval-material img[data-approval-material]"),
    ).toHaveCount(1);
    const status = (
      await row.locator(".approval-summary-status dd").innerText()
    ).trim();
    await expect(row.locator(".approval-progress > ol > li")).toHaveCount(3);
    await expect(
      row.locator(".approval-progress [aria-current='step']"),
    ).toContainText(status);
  }
}

/** Corrupt one decoded image in the real app; preserve real API records/actions. */
export async function verifyExpressiveRecovery(page: Page, evidence: string) {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => scrollTo(0, 0));
  await verifyExpressiveMaterials(page);
  const role = await page.getByLabel("Demo role", { exact: true }).inputValue();
  const before = await page.locator(".approval-record").allTextContents();
  const material = page
    .locator(".approval-family-hero .approval-material")
    .first();
  const bounds = await material.boundingBox();
  await material.locator("img").evaluate((node) => {
    (node as HTMLImageElement).src = "data:image/webp;base64,broken";
  });
  await expect(material.locator("img")).not.toBeVisible();
  const afterBounds = await material.boundingBox();
  expect(afterBounds!.width).toBeCloseTo(bounds!.width, 0);
  expect(afterBounds!.height).toBeCloseTo(bounds!.height, 0);
  expect(await page.locator(".approval-record").allTextContents()).toEqual(
    before,
  );
  await expect(
    page.locator(".approval-records-section .approval-refresh"),
  ).toBeEnabled();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: resolve(evidence, "media-fallback-390.png"),
    fullPage: true,
  });
  await page.reload();
  await page.getByLabel("Demo role", { exact: true }).selectOption(role);
  await expect(page.locator(".approval-record")).toHaveCount(before.length);
  await verifyExpressiveMaterials(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .locator("main.approval-v1")
      .evaluate((node) => node.setAttribute("data-theme", "dark"));
    await page.evaluate(() => scrollTo(0, 0));
    await verifyApprovalAssets(page);
    await verifyExpressiveMaterials(page);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: resolve(evidence, `workspace-dark-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .locator("main.approval-v1")
    .evaluate((node) => node.setAttribute("data-theme", "light"));
  const captionColors = await page
    .locator("main.approval-v1")
    .evaluate((node) => {
      const app = node as HTMLElement;
      const saved = app.getAttribute("style");
      try {
        app.style.setProperty("--factory-colour-surface", "#f2eee3");
        app.style.setProperty("--factory-colour-text", "#263225");
        const style = getComputedStyle(
          app.querySelector(".approval-material-caption")!,
        );
        return { background: style.backgroundColor, text: style.color };
      } finally {
        if (saved === null) app.removeAttribute("style");
        else app.setAttribute("style", saved);
      }
    });
  expect(captionColors).toEqual({
    background: "rgb(242, 238, 227)",
    text: "rgb(38, 50, 37)",
  });
  console.info(
    "FACTORY_EXPRESSIVE_MATERIALS",
    JSON.stringify({
      localOnly: true,
      fallbackPreservesLayoutAndRecords: true,
      reloaded: true,
      darkWidths: [390, 768, 1440],
    }),
  );
}

export async function verifyDecisionHistory(
  page: Page,
  options: {
    auditor: string;
    requester: string;
    entity: string;
    identities?: readonly string[];
    evidence?: string;
  },
) {
  const role = page.getByLabel("Demo role", { exact: true });
  const panel = page.locator(".approval-decision-history");
  const summary = panel.locator(":scope > summary");
  const open = async () => {
    await expect(panel).not.toHaveAttribute("open", "");
    await summary.focus();
    await summary.press("Enter");
    await expect(panel).toHaveAttribute("open", "");
  };
  let auditRequests = 0;
  const observe = (request: import("@playwright/test").Request) => {
    if (new URL(request.url()).pathname === "/api/audit") auditRequests++;
  };
  page.on("request", observe);
  try {
    for (const deniedRole of [options.requester, "manager"]) {
      await role.selectOption(deniedRole);
      await expect(panel).toHaveCount(0);
      const response = await page.request.get(
        new URL("/api/audit", page.url()).toString(),
        {
          headers: {
            "x-factory-fixture-session": "fixture-session-" + deniedRole,
          },
        },
      );
      expect(response.status()).toBe(403);
    }
    expect(auditRequests).toBe(0);
    if (options.identities) await page.reload();
    await role.selectOption(options.auditor);
    await expect(panel).toBeVisible();
    await expect(panel).not.toHaveAttribute("open", "");
    expect(auditRequests).toBe(0);
    await open();
    if (!options.identities) {
      await expect(
        panel.getByText("No decisions yet.", { exact: true }),
      ).toBeVisible();
      await expect(panel.locator(".approval-history-row")).toHaveCount(0);
      await summary.press("Enter");
      await role.selectOption(options.requester);
      console.info(
        "FACTORY_HISTORY_EMPTY",
        JSON.stringify({
          entity: options.entity,
          auditRequests,
          unauthorizedUiAndApi: true,
        }),
      );
      return;
    }
    const rows = panel.locator(".approval-history-row");
    await expect(rows).toHaveCount(2);
    for (const [index, identity] of options.identities.entries()) {
      const row = rows.nth(index);
      await expect(row.getByRole("heading", { level: 3 })).toContainText(
        identity,
      );
      await expect(row.locator(".approval-badge")).toHaveText(
        index === 0 ? "Approve" : "Reject",
      );
      await expect(
        row.getByText("Demo role: Manager", { exact: true }),
      ).toBeVisible();
      const time = row.locator(".approval-history-outcome time");
      expect(
        Number.isFinite(Date.parse((await time.getAttribute("datetime"))!)),
      ).toBe(true);
    }
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => scrollTo(0, 0));
      await verifyApprovalAssets(page);
      await verifyBrandColors(page);
      expect(
        await panel.evaluate((node) =>
          getComputedStyle(node)
            .getPropertyValue("--approval-decision-history-version")
            .trim(),
        ),
      ).toBe("1");
      for (const target of await panel
        .locator("summary:visible, button:visible")
        .all()) {
        const box = await target.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        await rows.evaluateAll((items) =>
          items.every(
            (row) =>
              getComputedStyle(row).backgroundColor ===
              getComputedStyle(row.closest(".approval-decision-history")!)
                .backgroundColor,
          ),
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      if (options.evidence)
        await page.screenshot({
          path: resolve(options.evidence, `decision-history-${width}.png`),
          fullPage: true,
        });
      await summary.click();
      await page.evaluate(() => scrollTo(0, 0));
      await verifyWorkspaceComposition(page, width);
      if (width === 390 && options.evidence)
        await page.screenshot({
          path: resolve(options.evidence, "decision-history-closed-390.png"),
          fullPage: true,
        });
      await open();
    }
    const failed = "**/api/audit";
    await page.route(
      failed,
      (route) =>
        route.fulfill({ status: 500, body: "unsafe internal failure payload" }),
      { times: 1 },
    );
    await panel.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(panel.getByRole("alert")).toHaveText(
      "Decision history is unavailable. Try again.",
    );
    await expect(panel).not.toContainText("unsafe internal");
    const retry = panel.getByRole("button", { name: "Retry", exact: true });
    expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.setViewportSize({ width: 390, height: 900 });
    expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await retry.focus();
    await retry.press("Enter");
    await expect(rows).toHaveCount(2);
    const held: Array<{
      route: import("@playwright/test").Route;
      response: import("@playwright/test").APIResponse;
    }> = [];
    const hold = async (route: import("@playwright/test").Route) => {
      if (
        route.request().headers()["x-factory-fixture-session"] !==
        "fixture-session-" + options.auditor
      )
        return route.continue();
      const response = await route.fetch();
      held.push({ route, response });
    };
    const pattern = new RegExp("/api/(audit|" + options.entity + ")$");
    await page.route(pattern, hold);
    try {
      await panel.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect.poll(() => held.length).toBe(2);
      await role.selectOption(options.requester);
      await expect(panel).toHaveCount(0);
      for (const item of held)
        await item.route.fulfill({ response: item.response });
    } finally {
      await page.unroute(pattern, hold);
    }
    await expect(panel).toHaveCount(0);
    await role.selectOption(options.auditor);
    await expect(panel).not.toHaveAttribute("open", "");
    await expect(rows).toHaveCount(0);
    await open();
    await expect(rows).toHaveCount(2);
    await summary.click();
    await role.selectOption(options.requester);
    await page.setViewportSize({ width: 390, height: 900 });
    console.info(
      "FACTORY_HISTORY_BUSINESS",
      JSON.stringify({
        entity: options.entity,
        visibleDecisions: 2,
        reload: true,
        safeErrorRetry: true,
        lateRoleResponsesIgnored: true,
        unauthorizedUiAndApi: true,
        responsive: [390, 768, 1440],
      }),
    );
  } finally {
    page.off("request", observe);
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
        surface: resolve("--factory-surface"),
        mobile: innerWidth < 900,
        canvas: getComputedStyle(node.closest("main")!).backgroundColor,
        canvasToken: resolve("--factory-bg"),
      };
    });
  expect(facts.background).toBe(facts.mobile ? facts.surface : facts.accent);
  if (!facts.mobile) expect(facts.text).toBe(facts.foreground);
  expect(facts.canvas).toBe(facts.canvasToken);
  const hero = page.locator(".approval-family-hero");
  if (await hero.count()) {
    const brand = await hero.evaluate((node) => {
      const resolve = (token: string) => {
        const probe = document.createElement("span");
        probe.style.color = `var(${token})`;
        node.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      return {
        actual: resolve("--approval-hero-brand"),
        expected: resolve("--factory-accent"),
      };
    });
    expect(brand.actual).toBe(brand.expected);
  }
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
