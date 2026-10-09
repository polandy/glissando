import { afterEach, describe, expect, it } from "vitest";
import type { ImmichAvailabilityState } from "../../immich/immich-availability";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import ImmichSettingsGroup from "./ImmichSettingsGroup.svelte";

let destroy = () => {};
afterEach(() => destroy());

function mountGroup(state: ImmichAvailabilityState) {
  const calls: string[] = [];
  const mounted = mountWithTranslator(
    ImmichSettingsGroup,
    { state, onCheck: () => calls.push("check"), onReload: () => calls.push("reload") },
    { current: createTranslator("en") },
  );
  destroy = mounted.destroy;
  const text = () => mounted.target.textContent.replace(/\s+/g, " ").trim();
  const button = (label: string) =>
    [...mounted.target.querySelectorAll<HTMLElement>("button, a")].find(
      (element) => element.textContent.trim() === label,
    );
  return { target: mounted.target, calls, text, button };
}

describe("ImmichSettingsGroup", () => {
  it("names the server, the Immich version and the albums when available", () => {
    const { text } = mountGroup({ kind: "available", version: "3.3.1", albumCount: 41 });

    expect(text()).toContain("Through this Glissando server");
    expect(text()).toContain("Immich 3.3.1 · 41 albums");
  });

  it("links the self-hosting guide when not set up", () => {
    const { text, button } = mountGroup({ kind: "notSetUp" });

    expect(text()).toContain("Not set up");
    expect(button("How to set it up")?.getAttribute("href")).toBe(
      "https://github.com/polandy/glissando/blob/main/docs/self-hosting.md",
    );
  });

  it("says it is checking until the first answer, offering nothing to press", () => {
    const { target, text } = mountGroup({ kind: "checking" });

    expect(text()).toContain("Checking the connection");
    expect(target.querySelectorAll("button, a")).toHaveLength(0);
  });

  it.each([
    ["unreachable", "The Glissando backend cannot reach the Immich server."],
    ["keyRejected", "Immich rejects the server's key."],
    ["offline", "Offline — Immich needs a connection to your Glissando server."],
  ] as const)("names %s in one line and checks again on request", (kind, line) => {
    const { target, calls, button } = mountGroup({ kind });

    expect(target.querySelector(".notice")?.textContent.trim()).toBe(line);
    button("Check again")?.click();
    expect(calls).toEqual(["check"]);
  });

  it("names the five permissions the server's key lacks", () => {
    const { target } = mountGroup({ kind: "permissionMissing" });

    expect(target.querySelector(".notice")?.textContent).toContain(
      "album.read, asset.read, asset.view, asset.download and face.read",
    );
  });

  it("offers Reload, not Check again, when the sign-in has expired", () => {
    const { calls, text, button } = mountGroup({ kind: "signInExpired" });

    expect(text()).toContain("Your sign-in has expired.");
    expect(button("Check again")).toBeUndefined();
    button("Reload")?.click();
    expect(calls).toEqual(["reload"]);
  });
});
