import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";

const generatedApplicationUrl = process.env.FACTORY_GENERATED_EXPENSE_E2E_URL;

// The isolated materializer uses the existing hand-built expense-approval
// profile (/expenses, amount/description), with one required date field added
// to its ephemeral Graph before Draft -> Publish -> Compile. Existing seeds
// receive a valid UTC date. The canonical consumer harness is a separate run.
test.skip(
  !generatedApplicationUrl,
  "Set FACTORY_GENERATED_EXPENSE_E2E_URL for an isolated generated-app journey.",
);

function recordWith(page: Page, description: string) {
  return page
    .locator("main.generated-app .generated-records > li")
    .filter({ hasText: description });
}

function valueFor(record: Locator, label: string) {
  return record
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("..")
    .locator("dd");
}

async function expectIcon(control: Locator, key: string) {
  const icon = control.locator(`svg.lucide-${key}`);
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  await expect(icon).toHaveAttribute("focusable", "false");
}

async function expectMobileTargets(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const controls = page
    .locator("main.generated-app")
    .locator("nav a, button:visible, input:visible, select:visible");
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
}

test("completes two typed requests with safe feedback, valid actions, and readable approval results", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const app = page.locator("main.generated-app");
  const expensesUrl = new URL("/expenses", generatedApplicationUrl!).toString();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(expensesUrl);
  await expect(page).toHaveURL(/\/expenses$/);
  await expect(
    page.getByText("Requests and approvals", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: /expense/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue(
    "employee",
  );
  await expectIcon(page.locator('label[for="demo-role"]'), "user-round");
  const roleLabelAlignment = await app
    .locator('label[for="demo-role"]')
    .evaluate((label) => {
      const icon = label.querySelector("svg")!.getBoundingClientRect();
      const text = [...label.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      if (!text) return false;
      const range = document.createRange();
      range.selectNodeContents(text);
      const textBox = range.getBoundingClientRect();
      return (
        icon.right <= textBox.left &&
        Math.abs(icon.y + icon.height / 2 - textBox.y - textBox.height / 2) <= 3
      );
    });
  expect(roleLabelAlignment).toBe(true);

  // This hand-built profile has one declared navigation item: its root route.
  await expectIcon(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Expenses", exact: true }),
    "house",
  );
  await expectIcon(
    page.getByRole("button", { name: "Refresh", exact: true }),
    "refresh-cw",
  );
  await expectMobileTargets(page);

  const descriptions = [
    "Synthetic request for approval",
    "Synthetic request for rejection",
  ];
  for (const [index, description] of descriptions.entries()) {
    await page
      .getByRole("link", { name: "New expense", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/expenses\/new$/);
    await expect(page.getByLabel("Amount", { exact: true })).toHaveAttribute(
      "type",
      "number",
    );
    await expect(page.getByLabel("Date", { exact: true })).toHaveAttribute(
      "type",
      "date",
    );
    await page.getByLabel("Amount", { exact: true }).fill("128.50");
    await page.getByLabel("Description", { exact: true }).fill(description);
    await page.getByLabel("Date", { exact: true }).fill("2026-09-09");
    const create = page.getByRole("button", {
      name: "Create Expense",
      exact: true,
    });

    if (index === 0) {
      // A bounded synthetic error body must never be surfaced or clear input.
      const failure = async (route: Route) =>
        route.fulfill({
          status: 503,
          contentType: "text/plain",
          body: "PRIVATE_SERVER_FAILURE_MARKER",
        });
      await page.route("**/api/expense", failure);
      await create.click();
      await expect(app.getByRole("alert")).toHaveText(
        "The service is unavailable. Please try again.",
      );
      await expect(page.getByLabel("Description", { exact: true })).toHaveValue(
        description,
      );
      await expect(page.getByText("PRIVATE_SERVER_FAILURE_MARKER")).toHaveCount(
        0,
      );
      await page.unroute("**/api/expense", failure);
    }

    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let seen!: () => void;
    const received = new Promise<void>((resolve) => {
      seen = resolve;
    });
    let requests = 0;
    const holdCreate = async (route: Route) => {
      requests++;
      expect(route.request().postDataJSON()).toMatchObject({
        amount: 128.5,
        date: "2026-09-09T00:00:00.000Z",
      });
      seen();
      await held;
      await route.continue();
    };
    await page.route("**/api/expense", holdCreate);
    const response = page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        new URL(candidate.url()).pathname === "/api/expense",
    );
    await create.click();
    await received;
    await expect(create).toBeDisabled();
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
    await expect(app.getByRole("status")).toHaveText("Creating Expense…");
    await page
      .locator("form")
      .evaluate((form) =>
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
      );
    expect(requests).toBe(1);
    release();
    expect((await response).status()).toBe(201);
    await expect(app.getByRole("status")).toHaveText("Created Expense.");
    await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("");
    await page.unroute("**/api/expense", holdCreate);
    await expectMobileTargets(page);
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Expenses", exact: true })
      .click();
    const record = recordWith(page, description);
    await expect(valueFor(record, "Description")).toHaveText(description);
    await expect(valueFor(record, "Amount")).toHaveText("128.5");
    await expect(valueFor(record, "Date").locator("time")).toHaveText(
      "2026-09-09",
    );
    await expect(valueFor(record, "Status")).toHaveText("Draft");
    await expect(record.getByRole("button")).toHaveText(["Submit"]);
    await expectIcon(
      record.getByRole("button", { name: "Submit", exact: true }),
      "receipt-text",
    );

    if (index === 0) {
      let releaseTransition!: () => void;
      const hold = new Promise<void>((resolve) => {
        releaseTransition = resolve;
      });
      const delay = async (route: Route) => {
        await hold;
        await route.continue();
      };
      await page.route("**/events/submit", delay);
      await record.getByRole("button", { name: "Submit", exact: true }).click();
      await expect(
        record.getByRole("button", { name: "Submit", exact: true }),
      ).toBeDisabled();
      await expect(record).toHaveAttribute("aria-busy", "true");
      await expect(record.getByRole("status")).toHaveText(
        "Submit in progress…",
      );
      releaseTransition();
      await expect(valueFor(record, "Status")).toHaveText("Submitted");
      await page.unroute("**/events/submit", delay);
    } else {
      await record.getByRole("button", { name: "Submit", exact: true }).click();
    }
    await expect(valueFor(record, "Status")).toHaveText("Submitted");
    await expect(record.getByRole("status")).toHaveText("Expense: Submitted.");
    await expectIcon(valueFor(record, "Status"), "clock");
    await expect(record.getByRole("button")).toHaveCount(0);
  }

  const submitted = recordWith(page, descriptions[0]!);
  const recordId = (await valueFor(submitted, "ID").innerText()).trim();
  const denied = await page.request.post(
    new URL(
      `/api/expense/${encodeURIComponent(recordId)}/events/approve`,
      generatedApplicationUrl!,
    ).toString(),
    {
      headers: { "x-factory-fixture-session": "fixture-session-employee" },
      data: {},
    },
  );
  expect(denied.status()).toBe(403);
  await expect(valueFor(submitted, "Status")).toHaveText("Submitted");
  await page.getByLabel("Demo role", { exact: true }).selectOption("manager");
  await expect(submitted.getByRole("button")).toHaveText(["Approve", "Reject"]);
  await expectMobileTargets(page);

  const rejected = recordWith(page, descriptions[1]!);
  for (const [record, action, terminal, icon] of [
    [submitted, "Approve", "Approved", "circle-check"],
    [rejected, "Reject", "Rejected", "circle-x"],
  ] as const) {
    await expectIcon(
      record.getByRole("button", { name: action, exact: true }),
      icon,
    );
    if (action === "Approve") {
      const rejectAction = async (route: Route) =>
        route.fulfill({
          status: 403,
          body: "PRIVATE_TRANSITION_FAILURE_MARKER",
        });
      await page.route("**/events/approve", rejectAction);
      await record.getByRole("button", { name: action, exact: true }).click();
      await expect(record.getByRole("alert")).toHaveText(
        "This action is unavailable for your selected role or the current record state.",
      );
      await expect(valueFor(record, "Status")).toHaveText("Submitted");
      await expect(
        page.getByText("PRIVATE_TRANSITION_FAILURE_MARKER"),
      ).toHaveCount(0);
      await page.unroute("**/events/approve", rejectAction);
    }
    await record.getByRole("button", { name: action, exact: true }).click();
    await expect(valueFor(record, "Status")).toHaveText(terminal);
    await expect(record.getByRole("status")).toHaveText(
      `Expense: ${terminal}.`,
    );
    await expectIcon(valueFor(record, "Status"), icon);
    await expect(record.getByRole("button")).toHaveCount(0);
  }

  await page.getByLabel("Demo role", { exact: true }).selectOption("employee");
  await page.reload();
  await expect(
    valueFor(recordWith(page, descriptions[0]!), "Status"),
  ).toHaveText("Approved");
  await expect(
    valueFor(recordWith(page, descriptions[1]!), "Status"),
  ).toHaveText("Rejected");
  const listFailure = async (route: Route) =>
    route.fulfill({ status: 503, body: "PRIVATE_LIST_FAILURE_MARKER" });
  await page.route("**/api/expense", listFailure);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(app.getByRole("alert")).toHaveText(
    "The service is unavailable. Please try again.",
  );
  await expect(page.getByText("PRIVATE_LIST_FAILURE_MARKER")).toHaveCount(0);
  await page.unroute("**/api/expense", listFailure);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(app.getByRole("alert")).toHaveCount(0);
  await expect(
    valueFor(recordWith(page, descriptions[0]!), "Status"),
  ).toHaveText("Approved");

  const emptyList = async (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  await page.route("**/api/expense", emptyList);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  const empty = app
    .getByRole("status")
    .filter({ hasText: "No expense records yet." });
  await expect(empty).toBeVisible();
  await expectIcon(empty, "receipt-text");
  await expect(
    empty.getByRole("link", { name: "Create Expense", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/expense", emptyList);
  await page
    .getByRole("link", { name: "New expense", exact: true })
    .first()
    .click();
  // Traverse the real native controls using only Tab and inspect visible focus.
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  const reached = new Set<string>();
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      const style = getComputedStyle(element);
      return {
        id: element.id,
        text: element.textContent ?? "",
        outline: style.outlineStyle,
        width: style.outlineWidth,
      };
    });
    if (
      focused.id === "demo-role" ||
      focused.id.endsWith("-amount") ||
      focused.id.endsWith("-description") ||
      focused.id.endsWith("-date") ||
      focused.text === "Create Expense"
    ) {
      reached.add(focused.id || focused.text);
      expect(focused.outline).not.toBe("none");
      expect(parseFloat(focused.width)).toBeGreaterThan(0);
    }
  }
  expect([...reached].some((id) => id.endsWith("-amount"))).toBe(true);
  expect([...reached].some((id) => id.endsWith("-description"))).toBe(true);
  expect([...reached].some((id) => id.endsWith("-date"))).toBe(true);
  expect(reached.has("Create Expense")).toBe(true);
  await expectMobileTargets(page);
});
