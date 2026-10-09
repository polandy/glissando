import { describe, expect, it } from "vitest";
import { pinnedThemeScript } from "./pinned-theme-script.ts";

function runWithStoredTheme(stored: string | null): Record<string, string> {
  const attributes: Record<string, string> = {};
  const localStorage = { getItem: (key: string) => (key === "glissando.theme" ? stored : null) };
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
    },
  };
  new Function("localStorage", "document", pinnedThemeScript())(localStorage, document);
  return attributes;
}

describe("pinnedThemeScript", () => {
  it.each(["light", "dark"])("puts a pinned %s theme on <html> before the app runs", (theme) => {
    expect(runWithStoredTheme(theme)).toEqual({ "data-theme": theme });
  });

  it.each([
    ["the system theme", "system"],
    ["an unknown value", "sepia"],
    ["nothing stored", null],
  ])("leaves <html> alone for %s", (_case, stored) => {
    expect(runWithStoredTheme(stored)).toEqual({});
  });
});
