import { expect, test, type Page } from "@playwright/test";

/**
 * Live action-inventory probe: every visible interactive control of the
 * Workbench must carry an accessible name, the project switcher must be a
 * real select with real options, and every visibly disabled button must be a
 * documented gated control (see docs/acceptance/workbench-action-inventory.md).
 *
 * The probe sweeps the Home surface and every rail surface canvas against the
 * live compose stack; it reads the shell only and does not mutate the Draft.
 */

const RAIL_SURFACES = ["Page", "Domain", "Flow", "Policy", "AI", "Code"];

/**
 * The documented gated controls: shown at their phase but disabled until
 * their precondition holds (an open, bound Draft; a Published revision; a
 * completed compilation; a running preview). A visible disabled button
 * outside this set is an inventory gap.
 */
const SAFE_DYNAMIC_LABEL = String.raw`[\p{L}\p{N}][\p{L}\p{N} &'’()+,./:–—_-]*`;
const STATIC_GATED_CONTROL_PATTERN =
  /^(?:Publish draft|Compile|Publish Draft|Compile Published Graph|Run Isolated Verification|Start Preview|Stop and clean up|Apply to Draft|Save draft|Continue|Release again|Interpret requirement|Add relation|Propose Draft change|Export Published|undo|redo|Switch to (?:Small|Medium|Large|Full-width) viewport|Zoom viewport (?:in|out)|Zoom (?:In|Out)|Insert block|Copy block|Delete block|Start preview|Open preview|Stop preview|Chosen|Approve Draft Diff|Restart release|Proposing…|Publishing…|Compiling…|Verifying…|Booting preview…|Approving…)$/;
const DYNAMIC_GATED_CONTROL_PATTERN = new RegExp(
  String.raw`^(?:Move (${SAFE_DYNAMIC_LABEL}) (?:up|down)|Choose (${SAFE_DYNAMIC_LABEL})|Compile (${SAFE_DYNAMIC_LABEL}))$`,
  "u",
);

function isDocumentedGatedControl(name: string): boolean {
  if (STATIC_GATED_CONTROL_PATTERN.test(name)) return true;
  const match = DYNAMIC_GATED_CONTROL_PATTERN.exec(name);
  if (match === null) return false;
  const dynamicLabel = match
    .slice(1)
    .find((candidate) => candidate !== undefined);
  return dynamicLabel !== undefined && dynamicLabel.length <= 160;
}

async function sweepInteractiveNames(page: Page, surface: string) {
  const offenders = await page.evaluate(() => {
    const selector = "button, a, input, select, textarea";
    const visible = [...document.querySelectorAll(selector)].filter(
      (element) => {
        const style = getComputedStyle(element);
        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          (element as HTMLElement).offsetParent !== null
        );
      },
    );
    const missingName: string[] = [];
    const unnamedDisabled: string[] = [];
    for (const element of visible) {
      const associatedLabels =
        element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? [...(element.labels ?? [])]
              .map((label) => label.textContent?.trim() ?? "")
              .filter(Boolean)
              .join(" ")
          : "";
      const labelledBy = (element.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      const accessibleName =
        [
          labelledBy,
          element.getAttribute("aria-label") ?? "",
          associatedLabels,
          element.textContent ?? "",
          (element as HTMLInputElement).placeholder ?? "",
        ]
          .find((candidate) => candidate.trim().length > 0)
          ?.trim() ?? "";
      if (accessibleName.length === 0) {
        missingName.push(`<${element.tagName.toLowerCase()}>`);
      }
      if (
        element instanceof HTMLButtonElement &&
        element.disabled &&
        accessibleName.length === 0
      ) {
        unnamedDisabled.push(`<${element.tagName.toLowerCase()}>`);
      }
    }
    return { missingName, unnamedDisabled };
  });
  expect(
    offenders.missingName,
    `${surface}: every visible interactive element must have an accessible name`,
  ).toEqual([]);
  expect(
    offenders.unnamedDisabled,
    `${surface}: every visibly disabled button must be a documented gated control with a name`,
  ).toEqual([]);
}

async function sweepDisabledButtons(page: Page, surface: string) {
  const names = await page.evaluate(() => {
    return [...document.querySelectorAll("button")]
      .filter(
        (element) =>
          element.disabled &&
          getComputedStyle(element).display !== "none" &&
          getComputedStyle(element).visibility !== "hidden" &&
          element.offsetParent !== null,
      )
      .map((element) => {
        const labelledBy = (element.getAttribute("aria-labelledby") ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ");
        const associatedLabels = [...(element.labels ?? [])]
          .map((label) => label.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ");
        return (
          [
            labelledBy,
            element.getAttribute("aria-label") ?? "",
            associatedLabels,
            element.textContent ?? "",
          ]
            .find((candidate) => candidate.trim().length > 0)
            ?.trim() ?? ""
        );
      })
      .filter((name) => name.length > 0);
  });
  for (const name of names) {
    expect(
      isDocumentedGatedControl(name),
      `${surface}: disabled button "${name}" is not a documented gated control`,
    ).toBe(true);
  }
}

async function openSurface(page: Page, surface: string): Promise<void> {
  await page.getByRole("button", { name: surface, exact: true }).click();
  // The canvas board and the rail item share the label; the region is the
  // surface's workspace section.
  await expect(page.getByLabel(`${surface} canvas`)).toBeVisible();
}

test("disabled icon-only controls are retained for gate validation", async ({
  page,
}) => {
  await page.setContent(
    '<button disabled aria-label="Undocumented icon action"><svg aria-hidden="true"></svg></button>',
  );

  await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
    'disabled button "Undocumented icon action" is not a documented gated control',
  );
});

test("page-tree boundary reorder controls are documented gates", async ({
  page,
}) => {
  await page.setContent(
    '<button disabled aria-label="Move Request intake up"><svg aria-hidden="true"></svg></button>',
  );

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("Puck history boundary controls are documented gates", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled aria-label="undo"><svg aria-hidden="true"></svg></button>
    <button disabled aria-label="redo"><svg aria-hidden="true"></svg></button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("Puck viewport boundary controls are documented gates", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled aria-label="Switch to Small viewport"></button>
    <button disabled aria-label="Switch to Medium viewport"></button>
    <button disabled aria-label="Switch to Large viewport"></button>
    <button disabled aria-label="Switch to Full-width viewport"></button>
    <button disabled aria-label="Zoom viewport in"></button>
    <button disabled aria-label="Zoom viewport out"></button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("Puck viewport gates reject undocumented label variants", async ({
  page,
}) => {
  const undocumentedLabels = [
    "Switch to Small viewport now",
    "switch to Small viewport",
    "Zoom viewport in|Publish Draft",
  ];

  for (const name of undocumentedLabels) {
    await page.setContent(`<button disabled aria-label="${name}"></button>`);

    await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
      `disabled button "${name}" is not a documented gated control`,
    );
  }
});

test("React Flow zoom boundaries are documented without admitting Fit View", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled aria-label="Zoom In"></button>
    <button disabled aria-label="Zoom Out"></button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();

  await page.setContent('<button disabled aria-label="Fit View"></button>');
  await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
    'disabled button "Fit View" is not a documented gated control',
  );
});

test("Page Studio block-selection boundaries are documented gates", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled>Insert block</button>
    <button disabled>Copy block</button>
    <button disabled>Delete block</button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("Code preview lifecycle boundaries are documented gates", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled>Start preview</button>
    <button disabled>Open preview</button>
    <button disabled>Stop preview</button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("journey choices and recent-card compilation use bounded dynamic gates", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled>Chosen</button>
    <button disabled>Choose Fine Dining</button>
    <button disabled aria-label="Compile Appointment Booking">Compile</button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("release failure actions and exact disabled busy states are documented gates", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled>Approve Draft Diff</button>
    <button disabled>Restart release</button>
    <button disabled>Proposing…</button>
    <button disabled>Publishing…</button>
    <button disabled>Compiling…</button>
    <button disabled>Verifying…</button>
    <button disabled>Booting preview…</button>
    <button disabled>Approving…</button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("existing Workbench journey, canvas, and release gates stay documented", async ({
  page,
}) => {
  await page.setContent(`
    <button disabled>Publish draft</button>
    <button disabled>Compile</button>
    <button disabled>Save draft</button>
    <button disabled>Interpret requirement</button>
    <button disabled>Continue</button>
    <button disabled>Apply to Draft</button>
    <button disabled>Add relation</button>
    <button disabled>Propose Draft change</button>
    <button disabled>Export Published</button>
    <button disabled>Publish Draft</button>
    <button disabled>Compile Published Graph</button>
    <button disabled>Run Isolated Verification</button>
    <button disabled>Start Preview</button>
    <button disabled>Stop and clean up</button>
    <button disabled>Release again</button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("aria-label overrides visible busy text for disabled controls", async ({
  page,
}) => {
  await page.setContent(
    '<button disabled aria-label="Compile Appointment Booking">Queueing…</button>',
  );

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("aria-labelledby overrides aria-label for disabled controls", async ({
  page,
}) => {
  await page.setContent(`
    <span id="primary-name">Fit View</span>
    <button disabled aria-labelledby="primary-name" aria-label="undo">Queueing…</button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
    'disabled button "Fit View" is not a documented gated control',
  );
});

test("disabled controls resolve aria-labelledby and associated labels", async ({
  page,
}) => {
  await page.setContent(`
    <span id="labelled-name">Fit View</span>
    <button disabled aria-labelledby="labelled-name"></button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
    'disabled button "Fit View" is not a documented gated control',
  );

  await page.setContent(`
    <label for="associated-button">Fit View</label>
    <button id="associated-button" disabled></button>
  `);
  await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
    'disabled button "Fit View" is not a documented gated control',
  );
});

test("associated labels override visible button content", async ({ page }) => {
  await page.setContent(`
    <label for="labelled-button">Fit View</label>
    <button id="labelled-button" disabled>undo</button>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
    'disabled button "Fit View" is not a documented gated control',
  );
});

test("the complete surface sweep rejects undocumented disabled gates", async ({
  page,
}) => {
  await page.setContent(
    '<button disabled aria-label="Undocumented Home action"></button>',
  );

  await expect(
    (async () => {
      await sweepInteractiveNames(page, "Home");
      await sweepDisabledButtons(page, "Home");
    })(),
  ).rejects.toThrow(
    'disabled button "Undocumented Home action" is not a documented gated control',
  );
});

test("dynamic and finite gates reject case, suffix, and injection-like labels", async ({
  page,
}) => {
  const undocumentedLabels = [
    "zoom In",
    "Zoom In now",
    "Fit View",
    "insert block",
    "Start preview now",
    "Choose Fine Dining|Publish Draft",
    "Choose <script>alert(1)</script>",
    "Compile Appointment Booking; Restart release",
    "Approving...",
  ];

  for (const name of undocumentedLabels) {
    await page.setContent("<button disabled></button>");
    await page.locator("button").evaluate((element, accessibleName) => {
      element.setAttribute("aria-label", accessibleName);
    }, name);

    await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
      `disabled button "${name}" is not a documented gated control`,
    );
  }
});

test("dynamic gate labels accept the 160-character schema boundary only", async ({
  page,
}) => {
  const boundedLabel = "A".repeat(160);
  await page.setContent("<button disabled></button>");
  await page.locator("button").evaluate((element, accessibleName) => {
    element.setAttribute("aria-label", accessibleName);
  }, `Choose ${boundedLabel}`);
  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();

  const oversizedLabel = "A".repeat(161);
  await page.locator("button").evaluate((element, accessibleName) => {
    element.setAttribute("aria-label", accessibleName);
  }, `Choose ${oversizedLabel}`);
  await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
    `disabled button "Choose ${oversizedLabel}" is not a documented gated control`,
  );
});

test("astral dynamic labels enforce the 160-code-unit boundary across every branch", async ({
  page,
}) => {
  const boundedLabel = "\u{10400}".repeat(80);
  expect(boundedLabel.length).toBe(160);
  const boundedNames = [
    `Move ${boundedLabel} up`,
    `Choose ${boundedLabel}`,
    `Compile ${boundedLabel}`,
  ];
  for (const name of boundedNames) {
    await page.setContent("<button disabled></button>");
    await page.locator("button").evaluate((element, accessibleName) => {
      element.setAttribute("aria-label", accessibleName);
    }, name);
    await expect(
      sweepDisabledButtons(page, "Fixture"),
    ).resolves.toBeUndefined();
  }

  const oversizedLabel = "\u{10400}".repeat(81);
  expect(oversizedLabel.length).toBe(162);
  const oversizedNames = [
    `Move ${oversizedLabel} up`,
    `Choose ${oversizedLabel}`,
    `Compile ${oversizedLabel}`,
  ];
  for (const name of oversizedNames) {
    await page.setContent("<button disabled></button>");
    await page.locator("button").evaluate((element, accessibleName) => {
      element.setAttribute("aria-label", accessibleName);
    }, name);
    await expect(sweepDisabledButtons(page, "Fixture")).rejects.toThrow(
      `disabled button "${name}" is not a documented gated control`,
    );
  }
});

test("disabled controls under a hidden ancestor are outside the visible inventory", async ({
  page,
}) => {
  await page.setContent(`
    <div style="display: none">
      <button disabled aria-label="Fit View"></button>
    </div>
  `);

  await expect(sweepDisabledButtons(page, "Fixture")).resolves.toBeUndefined();
});

test("broken aria-labelledby references do not count as accessible names", async ({
  page,
}) => {
  await page.setContent('<button aria-labelledby="missing-label"></button>');

  await expect(sweepInteractiveNames(page, "Fixture")).rejects.toThrow(
    "every visible interactive element must have an accessible name",
  );
});

test("every visible workbench control has an accessible name and gated controls stay documented", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto("/");
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });

  // Home: the requirement composer is the primary decision.
  await expect(page.getByLabel("Requirement brief")).toBeVisible();
  await sweepInteractiveNames(page, "Home");
  await sweepDisabledButtons(page, "Home");

  // The project switcher is a real select, not a placeholder.
  const switcher = page.getByLabel("Switch application");
  await expect(switcher).toBeVisible();
  expect(await switcher.evaluate((element) => element.tagName)).toBe("SELECT");
  const switcherOptions = switcher.locator("option");
  expect(await switcherOptions.count()).toBeGreaterThan(0);
  await expect(switcherOptions.first()).not.toHaveText("");

  // The theme toggle carries its state-change label.
  await expect(
    page.getByRole("button", { name: "Switch to dark theme" }),
  ).toBeVisible();

  // Every rail surface: canvas visible, every visible control named, every
  // disabled button documented.
  for (const surface of RAIL_SURFACES) {
    await openSurface(page, surface);
    await sweepInteractiveNames(page, surface);
    await sweepDisabledButtons(page, surface);
  }

  // The Release surface: the release workspace region with its gated action.
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Release", exact: true }),
  ).toBeVisible();
  await sweepInteractiveNames(page, "Release");
  await sweepDisabledButtons(page, "Release");
  // The immutable publication control is the first gated release action.
  await expect(
    page
      .getByRole("region", { name: "Release", exact: true })
      .getByRole("button", { name: "Publish Draft", exact: true }),
  ).toBeVisible();
});
