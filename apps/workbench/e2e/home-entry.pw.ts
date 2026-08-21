import { expect, test } from "@playwright/test";

import { workbenchGraph } from "../lib/workbench-graph";
import { templateDraftResponse } from "../test/template-draft-fixture";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test("recovers the curated-template entry without repeating requests", async ({
  page,
}) => {
  let curatedTemplateRequests = 0;
  let templateInstantiations = 0;
  let retryRequested = false;

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
        body: JSON.stringify([]),
      });
      return;
    }
    if (
      request.method() === "GET" &&
      path === "/workspaces/local/curated-templates"
    ) {
      curatedTemplateRequests += 1;
      await route.fulfill(
        !retryRequested
          ? {
              status: 500,
              headers: jsonHeaders,
              body: JSON.stringify({ message: "HOSTILE_TEMPLATE_LIST_DETAIL" }),
            }
          : {
              status: 200,
              headers: jsonHeaders,
              body: JSON.stringify([
                {
                  apiVersion: "factory.curated-template/v1",
                  key: "restaurant-dual-surface",
                  version: "1.0.0",
                  name: "Maison Aurelia",
                  description:
                    "A polished customer ordering app and merchant operations workspace.",
                  surfaces: ["customer-mobile", "merchant-desktop"],
                  graphChecksum:
                    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                },
              ]),
            },
      );
      return;
    }
    if (
      request.method() === "POST" &&
      path ===
        "/workspaces/local/curated-templates/restaurant-dual-surface/instances"
    ) {
      templateInstantiations += 1;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(templateDraftResponse(1)),
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
  const brief = page.getByRole("textbox", { name: "Requirement brief" });
  await expect(brief).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Describe a product" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Start from a template" }),
  ).toBeVisible();
  await expect(page.locator(".template-list-error p")).toHaveText(
    "Curated templates could not be loaded. Try again.",
  );
  await expect(page.getByText("HOSTILE_TEMPLATE_LIST_DETAIL")).toHaveCount(0);
  const mountRequests = curatedTemplateRequests;
  expect(mountRequests).toBeGreaterThanOrEqual(1);

  retryRequested = true;
  await page.getByRole("button", { name: "Retry curated templates" }).click();
  await expect(
    page.getByRole("button", { name: "Start from Maison Aurelia" }),
  ).toBeEnabled();
  expect(curatedTemplateRequests).toBe(mountRequests + 1);

  await brief.blur();
  await page.getByRole("button", { name: "Example prompts" }).focus();
  await expect(
    page.getByRole("button", { name: "Example prompts" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Example prompts" }),
  ).toBeFocused();
  expect(curatedTemplateRequests).toBe(mountRequests + 1);

  await page.getByRole("button", { name: "Start from Maison Aurelia" }).click();
  await expect(page.getByText("Preview synced · Draft r.1")).toBeVisible();
  expect(templateInstantiations).toBe(1);
  expect(curatedTemplateRequests).toBe(mountRequests + 1);
});
