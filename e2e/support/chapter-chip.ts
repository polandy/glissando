import type { Locator, Page } from "@playwright/test";

const CHAPTER_CHIP_TESTID = "chapter-chip";

/**
 * A chapter's strip chip. Its accessible name is title plus subtitle, which an edited title
 * changes, so `text` (when given) filters by the chip's own text instead; without it, every chip.
 */
export function chapterChip(page: Page, text?: string): Locator {
  const chips = page.getByTestId(CHAPTER_CHIP_TESTID);
  return text === undefined ? chips : chips.filter({ hasText: text });
}

/**
 * The strip tile right after the chapter chip whose text contains `text`: a chapter sits directly
 * before its anchor picture, and adjacency is what the strip's order is checked by.
 */
export function tileAfterChapter(page: Page, text: string): Locator {
  return page
    .getByRole("list", { name: "Bilder" })
    .locator(`li:has([data-testid="${CHAPTER_CHIP_TESTID}"]:has-text("${text}")) + li`);
}
