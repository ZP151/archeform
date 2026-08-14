import { expect, test } from "@playwright/test";

import { workbenchGraph } from "../lib/workbench-graph";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const lateArtifact = {
  path: "web/app/page.tsx",
  digest:
    "sha256:6d8ab230cca0dd998e729e226bd40406a4d572ae52e2a7f95d33158eb3a3c004",
  mediaType: "text/typescript",
  sizeBytes: 27,
};

const selectedArtifact = {
  path: "api/package.json",
  digest:
    "sha256:d41edfc6bfb5d4bfa24a4ed460514b5310c7adbf443421a4273c28c37ce660b8",
  mediaType: "application/json",
  sizeBytes: 58,
};

const lateContent = "export const lateA = true;\n";
const selectedContent =
  '<script id="source-hostile">window.evil=true</script>\n';

const compilation = {
  id: "compilation-1",
  publishedRevisionId: "published-1",
  target: "application-bundle",
  result: {
    status: "succeeded",
    artifactCount: 2,
    completedAt: "2026-08-14T12:00:00.000Z",
  },
  artifacts: [lateArtifact, selectedArtifact],
};

const openedApplication = {
  id: "application-1",
  draftRevisions: [{ id: "draft-1", revisionNumber: 1, graph: workbenchGraph }],
  publishedRevisions: [
    {
      id: "published-1",
      revisionNumber: 1,
      sourceDraftRevisionId: "draft-1",
      graphHash:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      graph: workbenchGraph,
    },
  ],
};

const applicationSummary = {
  id: "application-1",
  key: "source-restaurant",
  name: "Maison Source",
  templateOrigin: null,
  compositionProfile: "restaurant-ordering",
  latestDraft: {
    revisionNumber: 1,
    createdAt: "2026-08-14T11:00:00.000Z",
  },
  latestPublished: {
    revisionNumber: 1,
    publishedAt: "2026-08-14T11:30:00.000Z",
  },
  latestCompilation: {
    id: "compilation-1",
    status: "succeeded",
    completedAt: "2026-08-14T12:00:00.000Z",
  },
  goldenAssetMaturity: {
    status: "golden",
    goldenAssets: 15,
    totalAssets: 15,
  },
};

test("explores only the latest verified registered source at 1440px and 390px", async ({
  page,
}) => {
  let selectedAttempts = 0;
  let lateRequests = 0;
  let artifactContentRequests = 0;
  let compilationRequests = 0;
  let previewStartFailures = 0;
  let releaseLateFailure!: () => void;
  let markLateFailureFulfilled!: () => void;
  let releaseLateSuccess!: () => void;
  let markLateSuccessFulfilled!: () => void;
  let releaseSelectedFailure!: () => void;
  const lateFailureGate = new Promise<void>((resolve) => {
    releaseLateFailure = resolve;
  });
  const lateFailureFulfilled = new Promise<void>((resolve) => {
    markLateFailureFulfilled = resolve;
  });
  const lateSuccessGate = new Promise<void>((resolve) => {
    releaseLateSuccess = resolve;
  });
  const lateSuccessFulfilled = new Promise<void>((resolve) => {
    markLateSuccessFulfilled = resolve;
  });
  const selectedFailureGate = new Promise<void>((resolve) => {
    releaseSelectedFailure = resolve;
  });

  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (
      request.method() === "GET" &&
      (path === "/workspaces/local/application-graphs/ops-workspace" ||
        path === "/workspaces/local/application-graphs/source-restaurant")
    ) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(openedApplication),
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
        body: JSON.stringify([applicationSummary]),
      });
      return;
    }
    if (
      request.method() === "GET" &&
      path === "/workspaces/local/curated-templates"
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
      path === "/workspaces/local/portfolio-summary"
    ) {
      await route.fulfill({
        status: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ message: "Portfolio not used by Source test." }),
      });
      return;
    }
    if (request.method() === "POST" && path === "/compilations") {
      expect(request.postDataJSON()).toEqual({
        publishedRevisionId: "published-1",
        target: "application-bundle",
        compilerVersion: "factory-compiler/v1",
      });
      compilationRequests += 1;
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify(compilation),
      });
      return;
    }
    if (
      request.method() === "GET" &&
      path === "/compilations/compilation-1/preview-runs/current"
    ) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(null),
      });
      return;
    }
    if (
      request.method() === "POST" &&
      path === "/compilations/compilation-1/preview-runs"
    ) {
      previewStartFailures += 1;
      await route.fulfill({
        status: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ message: "UNRELATED_PREVIEW_FAILURE" }),
      });
      return;
    }
    if (
      request.method() === "GET" &&
      path === "/compilations/compilation-1/artifact-content"
    ) {
      artifactContentRequests += 1;
      const artifactPath = url.searchParams.get("path");
      if (artifactPath === lateArtifact.path) {
        lateRequests += 1;
        if (lateRequests === 1) {
          await lateFailureGate;
          await route.fulfill({
            status: 500,
            headers: jsonHeaders,
            body: JSON.stringify({ message: "STALE_ARTIFACT_FAILURE" }),
          });
          markLateFailureFulfilled();
          return;
        }
        await lateSuccessGate;
        await route.fulfill({
          status: 200,
          headers: jsonHeaders,
          body: JSON.stringify({
            path: lateArtifact.path,
            digest: lateArtifact.digest,
            content: lateContent,
          }),
        });
        markLateSuccessFulfilled();
        return;
      }
      if (artifactPath === selectedArtifact.path) {
        selectedAttempts += 1;
        if (selectedAttempts === 1) {
          await selectedFailureGate;
          await route.fulfill({
            status: 200,
            headers: jsonHeaders,
            body: JSON.stringify({
              path: selectedArtifact.path,
              digest: selectedArtifact.digest,
              content: "HOSTILE_UNVERIFIED_CONTENT",
              extra: "HOSTILE_SERVER_DETAIL",
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          headers: jsonHeaders,
          body: JSON.stringify({
            path: selectedArtifact.path,
            digest: selectedArtifact.digest,
            content: selectedContent,
          }),
        });
        return;
      }
    }
    await route.fulfill({
      status: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ message: "not available in Source test" }),
    });
  });

  const openCompilation = async () => {
    await page
      .getByRole("button", { name: "Compile Maison Source", exact: true })
      .click();
    await expect(
      page.getByRole("navigation", { name: "Builder navigation" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Builder navigation" })
        .getByRole("button", { name: "Code" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("region", { name: "Source", exact: true }),
    ).toBeVisible();
  };

  await page.goto("/");
  await openCompilation();

  const source = page.getByRole("region", { name: "Source", exact: true });
  const tree = source.getByRole("navigation", {
    name: "Registered source artifacts",
  });
  const viewer = source.getByRole("region", {
    name: "Verified source content",
  });
  const sourceButtons = tree.locator("[data-source-path]");
  const pathFilter = source.getByRole("searchbox", {
    name: "Filter source files",
  });
  const findInFile = source.getByRole("searchbox", {
    name: "Find in current file",
  });
  await expect(pathFilter).toHaveAttribute("maxlength", "120");
  await expect(findInFile).toHaveAttribute("maxlength", "120");
  await expect(findInFile).toBeDisabled();
  await expect(sourceButtons).toHaveCount(2);
  expect(
    await sourceButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-source-path")),
    ),
  ).toEqual(["api/package.json", "web/app/page.tsx"]);
  await expect(sourceButtons.nth(0)).toContainText("application/json");
  await expect(sourceButtons.nth(0)).toContainText("58 B");
  await expect(sourceButtons.nth(0)).toHaveAttribute(
    "aria-label",
    new RegExp(selectedArtifact.digest),
  );

  const requestsBeforeFiltering = artifactContentRequests;
  await pathFilter.focus();
  await expect(pathFilter).toBeFocused();
  await expect(pathFilter).toHaveCSS("outline-style", "solid");
  await pathFilter.fill("WEB/APP");
  await expect(sourceButtons).toHaveCount(1);
  await expect(sourceButtons).toHaveAttribute(
    "data-source-path",
    lateArtifact.path,
  );
  await pathFilter.fill("[");
  await expect(sourceButtons).toHaveCount(0);
  await expect(tree.getByRole("status")).toHaveText("No source files match.");
  await pathFilter.fill("");
  await expect(sourceButtons).toHaveCount(2);
  expect(artifactContentRequests).toBe(requestsBeforeFiltering);

  const lateButton = tree.locator(`[data-source-path="${lateArtifact.path}"]`);
  const selectedButton = tree.locator(
    `[data-source-path="${selectedArtifact.path}"]`,
  );
  await lateButton.focus();
  await expect(lateButton).toBeFocused();
  await expect(lateButton).toHaveCSS("outline-style", "solid");
  await lateButton.press("Enter");
  await expect.poll(() => lateRequests).toBe(1);
  await expect(viewer.getByRole("status")).toContainText(
    "Verifying registered artifact",
  );
  await expect(viewer).toContainText(lateArtifact.path);
  await expect(viewer.locator("pre code")).toHaveCount(0);
  await expect(findInFile).toBeDisabled();

  await selectedButton.focus();
  await expect(selectedButton).toBeFocused();
  await selectedButton.press("Enter");
  await expect(selectedButton).toHaveAttribute("aria-current", "true");
  await expect(viewer.getByRole("status")).toHaveAttribute(
    "aria-live",
    "polite",
  );
  await expect(viewer.getByRole("status")).toContainText(
    "Verifying registered artifact",
  );
  await expect(viewer).toContainText(selectedArtifact.path);
  await expect(viewer.locator("pre code")).toHaveCount(0);
  await expect(findInFile).toBeDisabled();

  releaseSelectedFailure();
  await expect(viewer.getByRole("status")).toHaveText(
    "Generated artifact could not be inspected.",
  );
  await expect(viewer.locator("pre code")).toHaveCount(0);
  await expect(findInFile).toBeDisabled();
  await expect(page.locator(".operation-error")).toHaveCount(0);
  await expect(page.getByText("HOSTILE_SERVER_DETAIL")).toHaveCount(0);
  await expect(page.getByText("HOSTILE_UNVERIFIED_CONTENT")).toHaveCount(0);

  await selectedButton.press("Enter");
  await expect(viewer.locator("pre code")).toHaveText(selectedContent);
  await expect(viewer).toContainText(selectedArtifact.digest);
  await expect(page.locator("#source-hostile")).toHaveCount(0);
  await expect(findInFile).toBeEnabled();
  const requestsBeforeFinding = artifactContentRequests;
  await findInFile.fill("SCRIPT");
  await expect(viewer.getByText("2 matches.", { exact: true })).toBeVisible();
  await expect(viewer.locator("mark")).toHaveCount(2);
  await expect(viewer.locator("pre code")).toHaveText(selectedContent);
  await expect(page.locator("#source-hostile")).toHaveCount(0);
  expect(artifactContentRequests).toBe(requestsBeforeFinding);
  expect(selectedAttempts).toBe(2);

  await page.getByRole("button", { name: "Start preview" }).click();
  await expect.poll(() => previewStartFailures).toBe(1);
  await expect(page.locator(".operation-error")).toHaveText(
    "Control Plane request failed with 500.",
  );
  await expect(viewer.locator(".source-artifact-status")).toHaveText(
    "Verified registered artifact.",
  );
  await expect(viewer.locator("pre code")).toHaveText(selectedContent);
  await expect(findInFile).toHaveValue("SCRIPT");
  await expect(viewer.locator("mark")).toHaveCount(2);

  releaseLateFailure();
  await lateFailureFulfilled;
  await expect(viewer.locator("pre code")).toHaveText(selectedContent);
  await expect(viewer).toContainText(selectedArtifact.path);
  await expect(viewer).not.toContainText(lateContent);
  await expect(viewer.locator(".source-artifact-status")).toHaveText(
    "Verified registered artifact.",
  );
  await expect(findInFile).toHaveValue("SCRIPT");

  await lateButton.press("Enter");
  await expect.poll(() => lateRequests).toBe(2);
  await expect(viewer.getByRole("status")).toHaveText(
    "Verifying registered artifact",
  );
  await expect(viewer.locator("pre code")).toHaveCount(0);
  await expect(findInFile).toBeDisabled();
  await expect(findInFile).toHaveValue("");
  await expect(viewer.locator("mark")).toHaveCount(0);
  await selectedButton.press("Enter");
  await expect.poll(() => selectedAttempts).toBe(3);
  await expect(viewer.locator("pre code")).toHaveText(selectedContent);
  await expect(findInFile).toBeEnabled();
  await expect(findInFile).toHaveValue("");
  releaseLateSuccess();
  await lateSuccessFulfilled;
  await expect(viewer).toContainText(selectedArtifact.path);
  await expect(viewer).toContainText(selectedArtifact.digest);
  await expect(viewer.locator("pre code")).toHaveText(selectedContent);
  await expect(viewer.locator(".source-artifact-status")).toHaveText(
    "Verified registered artifact.",
  );
  await expect(viewer).not.toContainText(lateContent);
  await expect(viewer).not.toContainText(
    "Generated artifact could not be inspected.",
  );

  expect
    .soft(
      await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 1440, scrollWidth: 1440 });
  for (const button of await sourceButtons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect.soft(box!.width).toBeGreaterThanOrEqual(44);
    expect.soft(box!.height).toBeGreaterThanOrEqual(44);
  }
  for (const input of [pathFilter, findInFile]) {
    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect.soft(box!.width).toBeGreaterThanOrEqual(44);
    expect.soft(box!.height).toBeGreaterThanOrEqual(44);
  }

  await page.reload();
  await openCompilation();
  expect(compilationRequests).toBe(2);
  const reloadedSource = page.getByRole("region", {
    name: "Source",
    exact: true,
  });
  const reloadedViewer = reloadedSource.getByRole("region", {
    name: "Verified source content",
  });
  await expect(reloadedViewer.getByRole("status")).toHaveText(
    "Select a registered artifact.",
  );
  await expect(reloadedViewer.locator("pre code")).toHaveCount(0);
  const reloadedPathFilter = reloadedSource.getByRole("searchbox", {
    name: "Filter source files",
  });
  const reloadedFind = reloadedSource.getByRole("searchbox", {
    name: "Find in current file",
  });
  await expect(reloadedFind).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  const reloadedTree = reloadedSource.getByRole("navigation", {
    name: "Registered source artifacts",
  });
  const treeBox = await reloadedTree.boundingBox();
  const viewerBox = await reloadedViewer.boundingBox();
  expect(treeBox).not.toBeNull();
  expect(viewerBox).not.toBeNull();
  expect.soft(viewerBox!.y).toBeGreaterThan(treeBox!.y + treeBox!.height - 1);
  expect
    .soft(
      await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 390, scrollWidth: 390 });

  const narrowSelected = reloadedTree.locator(
    `[data-source-path="${selectedArtifact.path}"]`,
  );
  await narrowSelected.focus();
  await expect(narrowSelected).toBeFocused();
  await expect(narrowSelected).toHaveCSS("outline-style", "solid");
  await narrowSelected.press("Enter");
  await expect(reloadedViewer.locator("pre code")).toHaveText(selectedContent);
  await expect(page.locator("#source-hostile")).toHaveCount(0);
  await expect(reloadedFind).toBeEnabled();
  const requestsBeforeNarrowFind = artifactContentRequests;
  await reloadedFind.fill("window.evil");
  await expect(
    reloadedViewer.getByText("1 match.", { exact: true }),
  ).toBeVisible();
  await expect(reloadedViewer.locator("mark")).toHaveCount(1);
  await expect(reloadedViewer.locator("pre code")).toHaveText(selectedContent);
  expect(artifactContentRequests).toBe(requestsBeforeNarrowFind);
  for (const button of await reloadedTree.locator("[data-source-path]").all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect.soft(box!.width).toBeGreaterThanOrEqual(44);
    expect.soft(box!.height).toBeGreaterThanOrEqual(44);
  }
  for (const [label, input] of [
    ["Filter source files", reloadedPathFilter],
    ["Find in current file", reloadedFind],
  ] as const) {
    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect.soft(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
    expect.soft(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
  }
});
