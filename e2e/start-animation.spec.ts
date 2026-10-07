import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    startLogoPhases: string[];
  }
}

const PHASE_ATTRIBUTE = "data-phase";

/** Records every phase the start logo passes through, from its very first render. */
async function recordStartLogoPhases(page: Page): Promise<void> {
  await page.addInitScript((attribute) => {
    window.startLogoPhases = [];
    new MutationObserver(() => {
      const phase = document.querySelector(`[${attribute}]`)?.getAttribute(attribute);
      if (phase && window.startLogoPhases.at(-1) !== phase) {
        window.startLogoPhases.push(phase);
      }
    }).observe(document, { subtree: true, childList: true, attributes: true });
  }, PHASE_ATTRIBUTE);
}

/** Holds the start animation at its first frame, so a case sees it without racing its end. */
async function freezeStartAnimation(page: Page): Promise<void> {
  await page.addInitScript((attribute) => {
    const observer = new MutationObserver(() => {
      const host = document.querySelector(`[${attribute}]`);
      if (!host) {
        return;
      }
      observer.disconnect();
      for (const animation of host.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = 0;
      }
    });
    observer.observe(document, { subtree: true, childList: true });
  }, PHASE_ATTRIBUTE);
}

function startLogo(page: Page) {
  return page.locator(`[${PHASE_ATTRIBUTE}]`);
}

test("E2E-001 the first launch plays the start animation to its end", async ({ page }) => {
  await recordStartLogoPhases(page);

  await page.goto("/");

  await expect(page.getByRole("img", { name: "Glissando" })).toBeVisible();
  await expect(startLogo(page)).toHaveAttribute(PHASE_ATTRIBUTE, "settled");
  expect(await page.evaluate(() => window.startLogoPhases)).toEqual(["playing", "settled"]);
});

test.describe("with full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("E2E-002 a tap skips the start animation", async ({ page }) => {
    await freezeStartAnimation(page);
    await page.goto("/");
    await expect(startLogo(page)).toHaveAttribute(PHASE_ATTRIBUTE, "playing");

    await page.locator("main").click();

    await expect(startLogo(page)).toHaveAttribute(PHASE_ATTRIBUTE, "settled");
  });
});

test("E2E-003 a later launch shows the logo without the start animation", async ({ page }) => {
  await page.goto("/");
  await expect(startLogo(page)).toHaveAttribute(PHASE_ATTRIBUTE, "settled");
  await recordStartLogoPhases(page);

  await page.reload();

  await expect(page.getByRole("img", { name: "Glissando" })).toBeVisible();
  expect(await page.evaluate(() => window.startLogoPhases)).toEqual(["settled"]);
});

test("E2E-004 with reduced motion the start animation only fades in", async ({ page }) => {
  await freezeStartAnimation(page);

  await page.goto("/");

  const backCard = page.locator(".card-back");
  await expect(backCard).toHaveCSS("opacity", "0");
  await expect(backCard).toHaveCSS("transform", "none");
});
