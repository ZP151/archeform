import { expect, test, type Page } from "@playwright/test";
import { installConsumerGenerationFixture } from "../test/consumer-generation-fixture";

const brief = "Restaurant ordering for my local business.";
async function start(page: Page) {
  await page.goto("/");
  await page.clock.install();
  await page.getByLabel("Requirement brief").fill(brief);
  await page.getByRole("button", { name: "Create product" }).click();
}
async function ready(page: Page) {
  await expect(
    page.getByRole("link", { name: "Open local app" }),
  ).toHaveAttribute("href", "http://127.0.0.1:3210");
}

test("O06: one material answer continues directly to the app", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    askScope: true,
  });
  await start(page);
  const questions = page.locator("ol.clarification-questions input");
  await expect(questions).toHaveCount(1);
  expect(fixture.requests).toEqual(["interpret"]);
  await questions.fill(
    "Yes, restaurant table ordering with standard defaults.",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await ready(page);
  expect(
    fixture.requests.filter((value) => value === "interpret"),
  ).toHaveLength(2);
  expect(fixture.requests.filter((value) => value === "publish")).toHaveLength(
    1,
  );
  await expect(page.getByRole("button", { name: /Choose / })).toHaveCount(0);
});

for (const failure of ["interpretation", "planning"] as const) {
  test(`O07: ${failure} failure retains the brief and recovers only on explicit submit`, async ({
    page,
  }) => {
    const fixture = await installConsumerGenerationFixture(page, {
      failOnce: failure,
    });
    await start(page);
    await expect(
      page.locator(
        '[aria-label="Product creation"][data-journey-outcome="failed"]',
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Requirement brief")).toHaveValue(brief);
    await expect(
      page.getByRole("button", { name: "Create product" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("link", { name: "Open local app" }),
    ).toHaveCount(0);
    const before = [...fixture.requests];
    await page.clock.fastForward(10_000);
    expect(fixture.requests).toEqual(before);
    expect(fixture.requests).not.toContain("publish");
    await page.getByRole("button", { name: "Create product" }).click();
    await ready(page);
    expect(
      fixture.requests.filter((value) => value === "interpret"),
    ).toHaveLength(2);
    expect(
      fixture.requests.filter((value) => value === "publish"),
    ).toHaveLength(1);
  });
}

for (const failure of ["compilation", "verification", "preview"] as const) {
  test(`O08: ${failure} failure pauses delivery without a false app link or repair approval`, async ({
    page,
  }) => {
    const fixture = await installConsumerGenerationFixture(page, {
      deliveryFailure: failure,
    });
    const repairApprovals: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        /approve|repair/u.test(new URL(request.url()).pathname)
      )
        repairApprovals.push("approval");
    });
    await start(page);
    const delivery = page.getByRole("region", { name: "Restaurant delivery" });
    await expect(delivery).toContainText("Delivery paused.");
    await expect(
      delivery.getByRole("button", { name: "Restart local delivery" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("link", { name: "Open local app" }),
    ).toHaveCount(0);
    const before = [...fixture.requests];
    await page.clock.fastForward(10_000);
    expect(fixture.requests).toEqual(before);
    expect(repairApprovals).toEqual([]);
    expect(
      fixture.requests.filter((value) => value === "publish"),
    ).toHaveLength(1);
    if (failure === "compilation")
      expect(fixture.requests).not.toContain("verify");
    if (failure !== "preview")
      expect(fixture.requests).not.toContain("preview");
  });
}

test("O09: a repeated submit creates only one application", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    holdInterpretation: true,
  });
  try {
    await page.goto("/");
    await page.getByLabel("Requirement brief").fill(brief);
    await page.getByRole("button", { name: "Create product" }).dblclick();
    await expect.poll(() => fixture.requests).toEqual(["interpret"]);
    fixture.releaseInterpretation();
    await ready(page);
    for (const action of [
      "interpret",
      "review",
      "apply",
      "publish",
      "compile",
      "verify",
      "preview",
    ]) {
      expect(fixture.requests.filter((value) => value === action)).toHaveLength(
        1,
      );
    }
  } finally {
    fixture.releaseInterpretation();
  }
});

test("O09: leaving during interpretation cannot publish a stale response", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    holdInterpretation: true,
  });
  try {
    await start(page);
    await expect.poll(() => fixture.requests).toEqual(["interpret"]);
    await page.reload();
    fixture.releaseInterpretation();
    await expect(page.getByLabel("Requirement brief")).toBeVisible();
    await page.clock.fastForward(10_000);
    expect(fixture.requests).toEqual(["interpret"]);
    await expect(
      page.getByRole("link", { name: "Open local app" }),
    ).toHaveCount(0);
  } finally {
    fixture.releaseInterpretation();
  }
});
