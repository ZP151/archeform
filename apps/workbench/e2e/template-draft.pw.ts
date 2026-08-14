import { expect, test } from "@playwright/test";

import { workbenchGraph } from "../lib/workbench-graph";
import { templateDraftResponse } from "../test/template-draft-fixture";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test("clones, renames, edits, and reorders one page in an independent Restaurant Draft", async ({
  page,
}, testInfo) => {
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
  let templateCreated = false;
  let currentTemplate = first;
  let blockOrderAttempts = 0;
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
  ).toBeDisabled();
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
  ).toHaveCount(1);
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

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("button", { name: "Open Maison Rivage" }).click();
  await expect(page.getByText("Preview synced · Draft r.4")).toBeVisible();
  await page.getByRole("button", { name: "Select Home" }).click();
  await page.getByRole("button", { name: "Edit Home" }).click();
  await expect(
    page.getByLabel("Home preview").locator(".template-block-grid strong"),
  ).toHaveText(["Signature dishes", "Seasonal menu", "Menu categories"]);
  expect
    .soft(
      await puckBlocks.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-puck-component")),
      ),
    )
    .toEqual(["home-items", "home-hero", "home-categories"]);
  const editorBox = await page.locator(".template-page-editor").boundingBox();
  const orderBox = await page
    .locator(".template-page-block-order")
    .boundingBox();
  const puckBox = await page.locator(".template-order-puck").boundingBox();
  const keyboardBox = await page
    .locator(".template-order-keyboard")
    .boundingBox();
  const saveOrderBox = await page
    .getByRole("button", { name: "Save block order" })
    .boundingBox();
  const previewBox = await page.locator(".template-page-preview").boundingBox();
  expect(editorBox).not.toBeNull();
  expect(orderBox).not.toBeNull();
  expect(puckBox).not.toBeNull();
  expect(keyboardBox).not.toBeNull();
  expect(saveOrderBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect
    .soft(orderBox!.y)
    .toBeGreaterThan(editorBox!.y + editorBox!.height - 1);
  expect.soft(keyboardBox!.y).toBeGreaterThan(puckBox!.y + puckBox!.height - 1);
  expect
    .soft(saveOrderBox!.y)
    .toBeGreaterThan(keyboardBox!.y + keyboardBox!.height - 1);
  expect
    .soft(previewBox!.y)
    .toBeGreaterThan(editorBox!.y + editorBox!.height - 1);
  expect
    .soft(previewBox!.y)
    .toBeGreaterThan(orderBox!.y + orderBox!.height - 1);
  expect
    .soft(
      await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 390, scrollWidth: 390 });
  for (const button of await page
    .locator(".template-page-block-order button")
    .all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect.soft(box!.width).toBeGreaterThanOrEqual(44);
    expect.soft(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: testInfo.outputPath("template-page-r4.png"),
    fullPage: true,
  });
});
