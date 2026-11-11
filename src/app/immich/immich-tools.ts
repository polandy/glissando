import {
  FOLDER_READ_PERMISSION,
  PERSON_READ_PERMISSION,
  TIMELINE_READ_PERMISSION,
  type OptionalImmichPermission,
  type TimelineMonth,
} from "../../immich/immich-client";
import type { MessageKey } from "../i18n/messages";
import type { BrowserTab } from "./immich-browser";

/** The optional parts of the browser, each behind one more permission of the server's key. */
export type ImmichTool = "months" | "people" | "folders";

const TOOL_PERMISSIONS: Readonly<Record<ImmichTool, OptionalImmichPermission>> = {
  months: TIMELINE_READ_PERMISSION,
  people: PERSON_READ_PERMISSION,
  folders: FOLDER_READ_PERMISSION,
};

const TOOL_MESSAGES: Readonly<Record<ImmichTool, MessageKey>> = {
  months: "immich.toolMonths",
  people: "immich.toolPeople",
  folders: "immich.toolFolders",
};

/** The tools in the order of the tabs. */
const TOOLS: readonly ImmichTool[] = ["months", "people", "folders"];

const TAB_TOOLS: Readonly<Partial<Record<BrowserTab, ImmichTool>>> = {
  people: "people",
  folders: "folders",
};

const TABS: readonly BrowserTab[] = ["photos", "albums", "people", "folders"];

/** What the browser reads of each tool's list: only whether a 403 hid it. */
export interface ToolAnswers {
  readonly months: { readonly unavailable: boolean };
  readonly people: { readonly unavailable: boolean };
  readonly folderPaths: { readonly unavailable: boolean };
}

/** The tools to hide: those the status says the key lacks, and those whose list answered 403. */
export function hiddenTools(
  missing: readonly OptionalImmichPermission[],
  answers: ToolAnswers,
): ReadonlySet<ImmichTool> {
  const answered: Readonly<Record<ImmichTool, boolean>> = {
    months: answers.months.unavailable,
    people: answers.people.unavailable,
    folders: answers.folderPaths.unavailable,
  };
  return new Set(
    TOOLS.filter((tool) => answered[tool] || missing.includes(TOOL_PERMISSIONS[tool])),
  );
}

export function visibleTabs(hidden: ReadonlySet<ImmichTool>): readonly BrowserTab[] {
  return TABS.filter((tab) => {
    const tool = TAB_TOOLS[tab];
    return tool === undefined || !hidden.has(tool);
  });
}

/** The tab to show: the chosen one, or All pictures when its tool is hidden. */
export function shownTab(tab: BrowserTab, hidden: ReadonlySet<ImmichTool>): BrowserTab {
  return visibleTabs(hidden).includes(tab) ? tab : "photos";
}

export interface MonthYear {
  readonly year: string;
  readonly months: readonly TimelineMonth[];
}

/** The months grouped by year, in the order given (newest first). */
export function monthYears(months: readonly TimelineMonth[]): readonly MonthYear[] {
  const years: { year: string; months: TimelineMonth[] }[] = [];
  for (const month of months) {
    const year = month.month.slice(0, "YYYY".length);
    const last = years.at(-1);
    if (last?.year === year) last.months.push(month);
    else years.push({ year, months: [month] });
  }
  return years;
}

/** The settings' lines naming each tool the key lacks. */
export function missingToolMessages(
  missing: readonly OptionalImmichPermission[],
): readonly MessageKey[] {
  return TOOLS.filter((tool) => missing.includes(TOOL_PERMISSIONS[tool])).map(
    (tool) => TOOL_MESSAGES[tool],
  );
}
