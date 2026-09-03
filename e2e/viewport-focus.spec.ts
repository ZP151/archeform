import { expect, test } from "@playwright/test";

/**
 * Task 7 focused browser check: at 1440x900 and 1024x768 the primary
 * action ("Interpret requirement") and the active rail state (Home label)
 * must be visible without scrolling.
 */
const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`primary action + active rail visible without scrolling at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");
    await page.waitForSelector('[aria-label="Home"].is-active', {
      timeout: 10_000,
    });

    const homeRail = page.locator('[aria-label="Home"]');
    await expect(homeRail).toBeVisible();
    await expect(homeRail).toHaveClass(/is-active/);

    // The active rail label is only visible in the active state; it must
    // render on-screen without scrolling at both widths.
    const activeLabel = homeRail.locator("span");
    await expect(activeLabel).toBeVisible();

    const interpret = page.getByRole("button", {
      name: "Interpret requirement",
    });
    await expect(interpret).toBeVisible();

    // Visible without scrolling: the bounding box must sit inside the viewport.
    const labelBox = await activeLabel.boundingBox();
    expect(labelBox).not.toBeNull();
    expect(labelBox!.x).toBeGreaterThanOrEqual(0);
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(viewport.width);

    const actionBox = await interpret.boundingBox();
    expect(actionBox).not.toBeNull();
    expect(actionBox!.y).toBeGreaterThanOrEqual(0);
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(
      viewport.height,
    );
  });
}
