import { expect, test } from "@playwright/test";

import { workbenchGraph } from "../lib/workbench-graph";
import { templateDraftResponse } from "../test/template-draft-fixture";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test("clones, renames, and edits one page in an independent Restaurant Draft", async ({
  page,
}, testInfo) => {
  const first = templateDraftResponse(1);
  const second = templateDraftResponse(2);
  const third = templateDraftResponse(3, {
    pageId: "customer-menu",
    title: "Seasonal Menu",
  });
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
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }
    if (
      request.method() === "GET" &&
      path === "/workspaces/local/curated-templates"
    ) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([first.template]),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path ===
        "/workspaces/local/curated-templates/restaurant-dual-surface/instances"
    ) {
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
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(third),
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Preview details" }).click();
  await page.getByRole("button", { name: "Edit Seasonal Menu" }).click();
  const editorBox = await page.locator(".template-page-editor").boundingBox();
  const previewBox = await page.locator(".template-page-preview").boundingBox();
  expect(editorBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(previewBox!.y).toBeGreaterThan(editorBox!.y + editorBox!.height - 1);
  await page.screenshot({
    path: testInfo.outputPath("template-page-r3.png"),
    fullPage: true,
  });
});
