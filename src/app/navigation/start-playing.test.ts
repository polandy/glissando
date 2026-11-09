import { describe, expect, it } from "vitest";
import type { Route } from "./route";
import { startPlaying } from "./start-playing";

function setUp() {
  const events: (string | Route)[] = [];
  const ports = {
    musicOutput: { unlock: () => events.push("unlock") },
    navigator: { open: (route: Route) => events.push(route) },
  };
  return { events, ports };
}

describe("startPlaying", () => {
  it("unlocks the music inside the gesture, then opens the player from the start", () => {
    const { events, ports } = setUp();

    startPlaying(ports, "s1");

    expect(events).toEqual(["unlock", { screen: "player", slideshowId: "s1" }]);
  });

  it("opens the player at a picture", () => {
    const { events, ports } = setUp();

    startPlaying(ports, "s1", "p3");

    expect(events).toEqual(["unlock", { screen: "player", slideshowId: "s1", pictureId: "p3" }]);
  });
});
