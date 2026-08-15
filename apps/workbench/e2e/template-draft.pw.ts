import { expect, test } from "@playwright/test";

import { workbenchGraph } from "../lib/workbench-graph";
import { templateDraftResponse } from "../test/template-draft-fixture";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test("clones through an authoritative Restaurant Experience Draft r.6", async ({
  page,
}) => {
  const first = templateDraftResponse(1);
  const second = templateDraftResponse(2);
  const third = templateDraftResponse(3, {
    pageId: "customer-menu",
    title: "Seasonal Menu",
  });
  const fourth = templateDraftResponse(
    4,
    { pageId: "customer-menu", title: "Seasonal Menu" },
    {
      pageId: "customer-home",
      blockIds: ["home-items", "home-hero", "home-categories"],
    },
  );
  const fifth = templateDraftResponse(
    5,
    { pageId: "customer-menu", title: "Seasonal Menu" },
    {
      pageId: "customer-home",
      blockIds: ["home-items", "home-hero", "home-categories"],
    },
    "Heirloom tomato pizza",
  );
  const sixth = templateDraftResponse(
    6,
    { pageId: "customer-menu", title: "Seasonal Menu" },
    {
      pageId: "customer-home",
      blockIds: ["home-items", "home-hero", "home-categories"],
    },
    "Heirloom tomato pizza",
    "dark",
  );
  let templateCreated = false;
  let currentTemplate = first;
  let blockOrderAttempts = 0;
  let dataFieldAttempts = 0;
  let experienceThemeAttempts = 0;
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (
      request.method() === "GET" &&
      path === "/workspaces/local/application-graphs/ops-workspace"
    ) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          id: "graph-initial",
          draftRevisions: [
            { id: "draft-initial", revisionNumber: 1, graph: workbenchGraph },
          ],
          publishedRevisions: [],
        }),
      });
      return;
    }
    if (
      request.method() === "GET" &&
      path === "/workspaces/local/application-graphs"
    ) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(
          templateCreated
            ? [
                {
                  id: "application-1",
                  key: "restaurant-template-001",
                  name: "Maison Rivage",
                  templateOrigin: {
                    templateKey: "restaurant-dual-surface",
                    templateVersion: "1.0.0",
                  },
                  compositionProfile: "restaurant-ordering",
                  latestDraft: {
                    revisionNumber: currentTemplate.draft.revisionNumber,
                    createdAt: "2026-08-14T08:04:00.000Z",
                  },
                  latestPublished: null,
                  latestCompilation: null,
                  goldenAssetMaturity: {
                    status: "golden",
                    goldenAssets: 15,
                    totalAssets: 15,
                  },
                },
              ]
            : [],
        ),
      });
      return;
    }
    if (
      request.method() === "GET" &&
      path === "/workspaces/local/curated-templates"
    ) {
      templateCreated = true;
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([first.template]),
      });
      return;
    }
    if (
      request.method() === "GET" &&
      path ===
        "/workspaces/local/template-draft-instances/restaurant-template-001"
    ) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(currentTemplate),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path ===
        "/workspaces/local/curated-templates/restaurant-dual-surface/instances"
    ) {
      currentTemplate = first;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(first),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path === "/template-draft-instances/application-1/revisions"
    ) {
      expect(request.postDataJSON()).toEqual({
        baseDraftRevisionId: "draft-1",
        name: "Maison Rivage",
      });
      currentTemplate = second;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(second),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path === "/template-draft-instances/application-1/page-revisions"
    ) {
      expect(request.postDataJSON()).toEqual({
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      });
      currentTemplate = third;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(third),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path ===
        "/template-draft-instances/application-1/page-block-order-revisions"
    ) {
      expect(request.postDataJSON()).toEqual({
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-items", "home-hero", "home-categories"],
      });
      blockOrderAttempts += 1;
      if (blockOrderAttempts === 1) {
        await route.fulfill({
          status: 409,
          headers: jsonHeaders,
          body: JSON.stringify({ message: "HOSTILE_SERVER_SAVE_DETAIL" }),
        });
        return;
      }
      currentTemplate = fourth;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(fourth),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path === "/template-draft-instances/application-1/data-field-revisions"
    ) {
      expect(request.postDataJSON()).toEqual({
        baseDraftRevisionId: "draft-4",
        entityKey: "menu-item",
        recordId: "margherita-pizza",
        fieldKey: "name",
        value: "Heirloom tomato pizza",
      });
      dataFieldAttempts += 1;
      if (dataFieldAttempts === 1) {
        await route.fulfill({
          status: 409,
          headers: jsonHeaders,
          body: JSON.stringify({ message: "HOSTILE_DATA_SAVE_DETAIL" }),
        });
        return;
      }
      currentTemplate = fifth;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(fifth),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path ===
        "/template-draft-instances/application-1/experience-theme-revisions"
    ) {
      expect(request.postDataJSON()).toEqual({
        baseDraftRevisionId: "draft-5",
        mode: "dark",
      });
      experienceThemeAttempts += 1;
      if (experienceThemeAttempts === 1) {
        await route.fulfill({
          status: 409,
          headers: jsonHeaders,
          body: JSON.stringify({ message: "HOSTILE_EXPERIENCE_SAVE_DETAIL" }),
        });
        return;
      }
      currentTemplate = sixth;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(sixth),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "not available in this smoke" }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start from Maison Aurelia" }).click();
  await expect(page.getByText("Preview synced · Draft r.1")).toBeVisible();
  await expect(page.getByText("8 customer pages")).toBeVisible();
  await expect(page.getByText("7 merchant pages")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish draft" }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "Advanced" })).toHaveCount(0);

  await page
    .getByRole("textbox", { name: "Application name" })
    .fill("Maison Rivage");
  await page.getByRole("button", { name: "Save application name" }).click();
  await expect(page.getByText("Preview synced · Draft r.2")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Maison Rivage" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview details" }).click();
  await expect(page.getByText("preview-2")).toBeVisible();
  await page.getByRole("button", { name: "Preview details" }).click();
  await page.getByRole("button", { name: "Select Menu" }).click();
  await page.getByRole("button", { name: "Edit Menu" }).click();
  await expect(
    page.getByRole("region", { name: "Template Page workspace" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Builder navigation" })
      .getByRole("button"),
  ).toHaveCount(3);
  await expect(
    page
      .getByRole("navigation", { name: "Builder navigation" })
      .getByRole("button"),
  ).toHaveText(["Page", "Data", "Access", "Experience"]);
  const pageTitle = page.getByRole("textbox", { name: "Page title" });
  await pageTitle.fill("Seasonal Menu");
  await expect(
    page.getByLabel("Menu preview").getByRole("heading", { name: "Menu" }),
  ).toBeVisible();
  await expect(page.getByLabel("Seasonal Menu preview")).toHaveCount(0);
  await pageTitle.press("Enter");
  await expect(page.getByText("Draft r.3 · Preview active")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Seasonal Menu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to preview" }).click();
  await expect(page.getByText("Preview synced · Draft r.3")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Select Seasonal Menu" }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Preview details" }).click();
  await expect(page.getByText("preview-3")).toBeVisible();
  await expect(page.getByText("preview-2")).toHaveCount(0);
  await page.getByRole("button", { name: "Preview details" }).click();
  await page.getByRole("button", { name: "Select Home" }).click();
  await page.getByRole("button", { name: "Edit Home" }).click();
  const livePreview = page.getByLabel("Home preview");
  await expect(livePreview.locator(".template-block-grid strong")).toHaveText([
    "Seasonal menu",
    "Menu categories",
    "Signature dishes",
  ]);
  const puckBlocks = page.locator(".template-order-puck [data-puck-component]");
  await expect(puckBlocks).toHaveCount(3);
  const sourceBlock = page.locator(
    '.template-order-puck [data-puck-component="home-items"]',
  );
  await sourceBlock.click();
  const sourceBox = await sourceBlock.boundingBox();
  const targetBox = await page
    .locator('.template-order-puck [data-puck-component="home-hero"]')
    .boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (sourceBox === null || targetBox === null) {
    throw new Error("Puck drag coordinates could not be resolved.");
  }
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2 - 12,
    { steps: 3 },
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect(
    page.locator('.template-page-block-order [role="status"]'),
  ).toContainText("Proposed order");
  await expect(livePreview.locator(".template-block-grid strong")).toHaveText([
    "Seasonal menu",
    "Menu categories",
    "Signature dishes",
  ]);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Template Page workspace" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Select Home" }).click();
  await page.getByRole("button", { name: "Edit Home" }).click();
  const focusedMove = page.getByRole("button", {
    name: "Move menu-item-card home-items up",
  });
  await focusedMove.click();
  await expect(focusedMove).toBeFocused();
  await focusedMove.click();
  expect
    .soft(
      await puckBlocks.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-puck-component")),
      ),
    )
    .toEqual(["home-items", "home-hero", "home-categories"]);
  await expect(
    page.locator('.template-page-block-order [role="status"]'),
  ).toContainText("Proposed order");
  await expect(livePreview.locator(".template-block-grid strong")).toHaveText([
    "Seasonal menu",
    "Menu categories",
    "Signature dishes",
  ]);
  await page.getByRole("button", { name: "Save block order" }).click();
  await expect(page.locator('.template-page-error[role="alert"]')).toHaveText(
    "Template page could not be saved.",
  );
  await expect(page.getByText("HOSTILE_SERVER_SAVE_DETAIL")).toHaveCount(0);
  await expect(page.getByText("Draft r.3 · Preview active")).toBeVisible();
  expect(
    await puckBlocks.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-puck-component")),
    ),
  ).toEqual(["home-items", "home-hero", "home-categories"]);
  await expect(livePreview.locator(".template-block-grid strong")).toHaveText([
    "Seasonal menu",
    "Menu categories",
    "Signature dishes",
  ]);
  expect(blockOrderAttempts).toBe(1);
  expect(currentTemplate.draft.revisionNumber).toBe(3);
  expect(currentTemplate.snapshot).toEqual(third.snapshot);
  expect(
    currentTemplate.previews[0].surface.pages[0]!.blocks.map(({ id }) => id),
  ).toEqual(["home-hero", "home-categories", "home-items"]);

  await page.getByRole("button", { name: "Save block order" }).click();
  await expect(page.getByText("Draft r.4 · Preview active")).toBeVisible();
  expect(blockOrderAttempts).toBe(2);
  await expect
    .soft(page.locator('[data-page-save-status="success"]'))
    .toBeFocused();
  expect
    .soft(
      await puckBlocks.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-puck-component")),
      ),
    )
    .toEqual(["home-items", "home-hero", "home-categories"]);
  await expect(
    page.getByLabel("Home preview").locator(".template-block-grid strong"),
  ).toHaveText(["Signature dishes", "Seasonal menu", "Menu categories"]);
  expect(third.snapshot.id).toBe("preview-3");
  expect(
    third.previews[0].surface.pages[0]!.blocks.map(({ id }) => id),
  ).toEqual(["home-hero", "home-categories", "home-items"]);

  await page
    .getByRole("navigation", { name: "Builder navigation" })
    .getByRole("button", { name: "Data" })
    .click();
  await expect(
    page.getByRole("region", { name: "Template Data workspace" }),
  ).toBeVisible();
  const dishName = page.getByRole("textbox", { name: "Dish name" });
  await expect(dishName).toHaveValue("Margherita pizza");
  const dataPreviews = page.locator("[data-template-data-preview] strong");
  await expect(dataPreviews).toHaveText([
    "Margherita pizza",
    "Margherita pizza",
  ]);
  await dishName.fill("Heirloom tomato pizza");
  await expect(dataPreviews).toHaveText([
    "Margherita pizza",
    "Margherita pizza",
  ]);
  await dishName.press("Enter");
  await expect(
    page
      .getByRole("region", { name: "Template Data workspace" })
      .getByRole("alert"),
  ).toHaveText("Template data could not be saved.");
  await expect(page.getByText("HOSTILE_DATA_SAVE_DETAIL")).toHaveCount(0);
  await expect(dishName).toHaveValue("Heirloom tomato pizza");
  await expect(dataPreviews).toHaveText([
    "Margherita pizza",
    "Margherita pizza",
  ]);
  expect(currentTemplate).toEqual(fourth);
  await page
    .getByRole("button", { name: "Save dish name as new Draft" })
    .click();
  await expect(page.getByText("Draft r.5 · Preview active")).toBeVisible();
  await expect(dataPreviews).toHaveText([
    "Heirloom tomato pizza",
    "Heirloom tomato pizza",
  ]);
  await expect
    .soft(page.locator('[data-template-data-save-status="success"]'))
    .toBeFocused();
  expect(dataFieldAttempts).toBe(2);
  expect(
    fourth.draft.graph.domain.seedData!.find(
      ({ id }) => id === "margherita-pizza",
    )!.values.name,
  ).toBe("Margherita pizza");
  expect(fourth.snapshot.id).toBe("preview-4");
  expect(fifth.snapshot.id).toBe("preview-5");
  expect(fifth.snapshot.graphChecksum).not.toBe(fourth.snapshot.graphChecksum);

  const builderNavigation = page.getByRole("navigation", {
    name: "Builder navigation",
  });
  const experienceDestination = builderNavigation.getByRole("button", {
    name: "Experience",
  });
  await experienceDestination.focus();
  await expect(experienceDestination).toBeFocused();
  await experienceDestination.press("Enter");
  const experienceWorkspace = page.getByRole("region", {
    name: "Template Experience workspace",
  });
  await expect(experienceWorkspace).toBeVisible();
  const light = page.getByRole("radio", { name: "Light" });
  const dark = page.getByRole("radio", { name: "Dark" });
  const experienceFrames = page.locator("[data-template-experience-preview]");
  const experienceFrameThemes = () =>
    experienceFrames.evaluateAll((frames) =>
      frames.map((frame) => frame.getAttribute("data-template-theme")),
    );
  await expect(light).toBeChecked();
  await expect(dark).not.toBeChecked();
  expect(await experienceFrameThemes()).toEqual(["light", "light"]);
  await dark.check();
  await expect(dark).toBeChecked();
  expect(await experienceFrameThemes()).toEqual(["light", "light"]);
  await experienceWorkspace.locator("form").evaluate((form) => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await expect(experienceWorkspace.getByRole("alert")).toHaveText(
    "Template experience could not be saved.",
  );
  await expect(page.getByText("HOSTILE_EXPERIENCE_SAVE_DETAIL")).toHaveCount(0);
  await expect(dark).toBeChecked();
  await expect(dark).toBeFocused();
  expect(await experienceFrameThemes()).toEqual(["light", "light"]);
  expect(experienceThemeAttempts).toBe(1);
  expect(currentTemplate).toEqual(fifth);

  await page
    .getByRole("button", { name: "Save dark theme as new Draft" })
    .click();
  await expect(page.getByText("Draft r.6 · Preview active")).toBeVisible();
  expect(await experienceFrameThemes()).toEqual(["dark", "dark"]);
  await expect
    .soft(page.locator('[data-template-experience-save-status="success"]'))
    .toBeFocused();
  expect(experienceThemeAttempts).toBe(2);
  expect(fifth.draft.graph.experience.theme.mode).toBe("light");
  expect(fifth.snapshot.id).toBe("preview-5");
  expect(sixth.draft.graph.experience.theme.mode).toBe("dark");
  expect(sixth.snapshot.id).toBe("preview-6");
  expect(sixth.snapshot.graphChecksum).not.toBe(fifth.snapshot.graphChecksum);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("button", { name: "Open Maison Rivage" }).click();
  await expect(page.getByText("Preview synced · Draft r.6")).toBeVisible();
  await page.getByRole("button", { name: "Select Home" }).click();
  await page.getByRole("button", { name: "Edit Home" }).click();
  await page
    .getByRole("navigation", { name: "Builder navigation" })
    .getByRole("button", { name: "Data" })
    .click();
  await expect(dishName).toHaveValue("Heirloom tomato pizza");
  await expect(dataPreviews).toHaveText([
    "Heirloom tomato pizza",
    "Heirloom tomato pizza",
  ]);
  const editorBox = await page.locator(".template-data-editor").boundingBox();
  const previewBox = await page
    .locator(".template-data-previews")
    .boundingBox();
  const saveDataBox = await page
    .getByRole("button", { name: "Save dish name as new Draft" })
    .boundingBox();
  expect(editorBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(saveDataBox).not.toBeNull();
  expect
    .soft(previewBox!.y)
    .toBeGreaterThan(editorBox!.y + editorBox!.height - 1);
  expect
    .soft(
      await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 390, scrollWidth: 390 });
  for (const button of await page
    .locator(".template-data-workspace button")
    .all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect.soft(box!.width).toBeGreaterThanOrEqual(44);
    expect.soft(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(saveDataBox!.height).toBeGreaterThanOrEqual(44);
  const contrast = await dishName.evaluate((element) => {
    const parse = (value: string) =>
      value
        .match(/\d+(?:\.\d+)?/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
      );
    };
    const style = getComputedStyle(element);
    const foreground = luminance(parse(style.color));
    const background = luminance(parse(style.backgroundColor));
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);

  await page
    .getByRole("navigation", { name: "Builder navigation" })
    .getByRole("button", { name: "Experience" })
    .click();
  await expect(experienceWorkspace).toBeVisible();
  await expect(dark).toBeChecked();
  await expect(light).not.toBeChecked();
  expect(await experienceFrameThemes()).toEqual(["dark", "dark"]);
  await expect(experienceFrames).toContainText([
    "Snapshot preview-6",
    "Snapshot preview-6",
  ]);
  const experienceEditorBox = await page
    .locator(".template-experience-editor")
    .boundingBox();
  const experiencePreviewBox = await page
    .locator(".template-experience-previews")
    .boundingBox();
  expect(experienceEditorBox).not.toBeNull();
  expect(experiencePreviewBox).not.toBeNull();
  expect
    .soft(experiencePreviewBox!.y)
    .toBeGreaterThan(experienceEditorBox!.y + experienceEditorBox!.height - 1);
  for (const target of await page
    .locator(
      ".template-experience-workspace button, .template-experience-option",
    )
    .all()) {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    expect.soft(box!.width).toBeGreaterThanOrEqual(44);
    expect.soft(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect
    .soft(
      await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 390, scrollWidth: 390 });
  const darkFrameContrast = await experienceFrames
    .first()
    .evaluate((element) => {
      const parse = (value: string) =>
        value
          .match(/\d+(?:\.\d+)?/g)!
          .slice(0, 3)
          .map(Number);
      const luminance = (rgb: number[]) => {
        const channels = rgb.map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return (
          0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
        );
      };
      const style = getComputedStyle(element);
      const foreground = luminance(parse(style.color));
      const background = luminance(parse(style.backgroundColor));
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
  expect(darkFrameContrast).toBeGreaterThanOrEqual(4.5);
});
