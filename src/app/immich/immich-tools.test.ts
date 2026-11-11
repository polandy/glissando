import { describe, expect, it } from "vitest";
import {
  hiddenTools,
  missingToolMessages,
  monthYears,
  shownTab,
  visibleTabs,
} from "./immich-tools";

const NOTHING_HIDDEN_BY_ANSWER = {
  months: { unavailable: false },
  people: { unavailable: false },
  folderPaths: { unavailable: false },
};

describe("hiddenTools", () => {
  it("hides what the key lacks before anything is asked", () => {
    expect(hiddenTools(["person.read", "folder.read"], NOTHING_HIDDEN_BY_ANSWER)).toEqual(
      new Set(["people", "folders"]),
    );
  });

  it("hides a tool whose list answered permission missing", () => {
    const state = { ...NOTHING_HIDDEN_BY_ANSWER, months: { unavailable: true } };

    expect(hiddenTools([], state)).toEqual(new Set(["months"]));
  });

  it("hides nothing for a key with every permission", () => {
    expect(hiddenTools([], NOTHING_HIDDEN_BY_ANSWER).size).toBe(0);
  });
});

describe("visibleTabs and shownTab", () => {
  it("offers all four tabs, minus those of hidden tools", () => {
    expect(visibleTabs(new Set())).toEqual(["photos", "albums", "people", "folders"]);
    expect(visibleTabs(new Set(["people"]))).toEqual(["photos", "albums", "folders"]);
    expect(visibleTabs(new Set(["months"]))).toEqual(["photos", "albums", "people", "folders"]);
  });

  it("falls back to All pictures when the chosen tab's tool is hidden", () => {
    expect(shownTab("people", new Set(["people"]))).toBe("photos");
    expect(shownTab("folders", new Set(["folders"]))).toBe("photos");
    expect(shownTab("people", new Set(["folders"]))).toBe("people");
    expect(shownTab("albums", new Set(["people", "folders"]))).toBe("albums");
  });
});

describe("monthYears", () => {
  it("groups the months by year, keeping the newest-first order", () => {
    const months = [
      { month: "2025-08", count: 96 },
      { month: "2025-07", count: 412 },
      { month: "2024-12", count: 302 },
    ];

    expect(monthYears(months)).toEqual([
      { year: "2025", months: [months[0], months[1]] },
      { year: "2024", months: [months[2]] },
    ]);
  });

  it("is empty without months", () => {
    expect(monthYears([])).toEqual([]);
  });
});

describe("missingToolMessages", () => {
  it("names each tool the key lacks, in the order of the tabs", () => {
    expect(missingToolMessages(["folder.read", "timeline.read"])).toEqual([
      "immich.toolMonths",
      "immich.toolFolders",
    ]);
  });

  it("is empty when nothing is missing", () => {
    expect(missingToolMessages([])).toEqual([]);
  });
});
