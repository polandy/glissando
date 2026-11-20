import { describe, expect, it } from "vitest";
import { SESSION_IDLE_MS, SESSION_MAX_LIFETIME_MS, type RemoteEvent, type TvEvent } from "./tv-hub";
import { claimedSession, hubHarness, recordingSink, made } from "./testing/tv-hub-harness";

describe("a session's lifetime", () => {
  it.each([
    ["a TV that never connected, just before the idle time", SESSION_IDLE_MS - 1, true],
    ["a TV that never connected, at the idle time", SESSION_IDLE_MS, false],
  ])("%s: alive %s", (_, elapsed, alive) => {
    const { hub, advanceClock } = hubHarness();
    const { tvKey } = made(hub.create());
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
    const { code } = made(hub.create());
    advanceClock(SESSION_IDLE_MS);
    expect(hub.claim(code)).toBeUndefined();
  });

  it("ends at the maximum lifetime, even with its TV and remote there", () => {
    const { hub, advanceClock } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const tv = recordingSink<TvEvent>();
    hub.connectTv(tvKey, tv.sink);
    const remote = recordingSink<RemoteEvent>();
    hub.connectRemote(remoteSecret, remote.sink);
    advanceClock(SESSION_MAX_LIFETIME_MS - 1);
    expect(hub.sourceOf(tvKey)).toBeDefined();
    advanceClock(1);
    expect(hub.sourceOf(tvKey)).toBeUndefined();
    expect(hub.hasRemoteSecret(remoteSecret)).toBe(false);
    expect([tv.events.at(-1), tv.sink.closed]).toEqual([{ name: "end", data: {} }, true]);
    expect([remote.events.at(-1), remote.sink.closed]).toEqual([{ name: "end", data: {} }, true]);
  });

  it("counts the maximum lifetime from when the session was made, not from a reconnect", () => {
    const { hub, advanceClock } = hubHarness();
    const { tvKey } = made(hub.create());
    advanceClock(SESSION_MAX_LIFETIME_MS - 1);
    hub.connectTv(tvKey, recordingSink<TvEvent>().sink)?.();
    hub.connectTv(tvKey, recordingSink<TvEvent>().sink);
    advanceClock(1);
    expect(hub.sourceOf(tvKey)).toBeUndefined();
  });
});
