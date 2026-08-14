import { expect, test } from "@playwright/test";

import { workbenchGraph } from "../lib/workbench-graph";
import { templateDraftResponse } from "../test/template-draft-fixture";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test("clones, previews, and renames an independent Restaurant Draft", async ({
  page,
}, testInfo) => {
  const first = templateDraftResponse(1);
  const second = templateDraftResponse(2);
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
  await page.screenshot({
    path: testInfo.outputPath("template-draft-r2.png"),
    fullPage: true,
  });
});
