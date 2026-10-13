import { describe, expect, it } from "vitest";
import {
  createTvHub,
  MAX_SESSIONS,
  SESSION_IDLE_MS,
  type RemoteEvent,
  type TvEvent,
} from "./tv-hub";
import { claimedSession, hubHarness, recordingSink } from "./testing/tv-hub-harness";

describe("a session's lifetime", () => {
  it.each([
    ["a TV that never connected, just before the idle time", SESSION_IDLE_MS - 1, true],
    ["a TV that never connected, at the idle time", SESSION_IDLE_MS, false],
  ])("%s: alive %s", (_, elapsed, alive) => {
    const { hub, advanceClock } = hubHarness();
    const { tvKey } = hub.create();
    advanceClock(elapsed);
    expect(hub.sourceOf(tvKey) !== undefined).toBe(alive);
  });

  it("lives while the TV's stream is open, and ends the idle time after it closed", () => {
    const { hub, advanceClock } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const closeTv = hub.connectTv(tvKey, recordingSink<TvEvent>().sink);
    const remote = recordingSink<RemoteEvent>();
    hub.connectRemote(remoteSecret, remote.sink);
    advanceClock(4 * SESSION_IDLE_MS);
    expect(hub.sourceOf(tvKey)).toBeDefined();
    closeTv?.();
    advanceClock(SESSION_IDLE_MS - 1);
    expect(hub.sourceOf(tvKey)).toBeDefined();
    advanceClock(1);
    expect(hub.sourceOf(tvKey)).toBeUndefined();
    expect([remote.events.at(-1), remote.sink.closed]).toEqual([{ name: "end", data: {} }, true]);
  });

  it("frees an expired session's code", () => {
    const { hub, advanceClock } = hubHarness();
    const { code } = hub.create();
    advanceClock(SESSION_IDLE_MS);
    expect(hub.claim(code)).toBeUndefined();
  });
});

describe("at most MAX_SESSIONS sessions", () => {
  const fill = (hub: ReturnType<typeof createTvHub>, advanceClock: (ms: number) => void) =>
    Array.from({ length: MAX_SESSIONS }, () => {
      advanceClock(1);
      return hub.create().tvKey;
    });

  it("drops the session whose TV has been away the longest for one more", () => {
    const { hub, advanceClock } = hubHarness();
    const keys = fill(hub, advanceClock);
    const closes = keys.map((key) => hub.connectTv(key, recordingSink<TvEvent>().sink));
    closes[7]?.();
    advanceClock(1);
    closes[3]?.();
    hub.create();
    expect(hub.sourceOf(keys[3] ?? "")).toBeDefined();
    expect(hub.sourceOf(keys[7] ?? "")).toBeUndefined();
    expect(keys.filter((key) => hub.sourceOf(key) !== undefined)).toHaveLength(MAX_SESSIONS - 1);
  });

  it("drops the oldest session when every TV is there", () => {
    const { hub, advanceClock } = hubHarness();
    const keys = fill(hub, advanceClock);
    const tvs = keys.map(() => recordingSink<TvEvent>());
    keys.forEach((key, index) => hub.connectTv(key, tvs[index]?.sink ?? recordingSink().sink));
    hub.create();
    expect(hub.sourceOf(keys[1] ?? "")).toBeDefined();
    expect(hub.sourceOf(keys[0] ?? "")).toBeUndefined();
    expect([tvs[0]?.events.at(-1), tvs[0]?.sink.closed]).toEqual([{ name: "end", data: {} }, true]);
  });
});
