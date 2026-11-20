import { describe, expect, it } from "vitest";
import {
  createTvHub,
  MAX_REMOTE_STREAMS,
  MAX_SESSIONS,
  type RemoteEvent,
  type TvEvent,
} from "./tv-hub";
import { hubHarness, made, recordingSink } from "./testing/tv-hub-harness";

type Hub = ReturnType<typeof createTvHub>;

describe("at most MAX_SESSIONS sessions", () => {
  const fill = (hub: Hub, advanceClock: (ms: number) => void) =>
    Array.from({ length: MAX_SESSIONS }, () => {
      advanceClock(1);
      return made(hub.create());
    });

  /** Claims `code` and opens a remote stream on it: a pairing in use. */
  const paired = (hub: Hub, code: string) => {
    const remoteSecret = hub.claim(code);
    if (remoteSecret === undefined) throw new Error("the claim failed");
    hub.connectRemote(remoteSecret, recordingSink<RemoteEvent>().sink);
    return remoteSecret;
  };

  it("drops the session whose TV has been away the longest for one more", () => {
    const { hub, advanceClock } = hubHarness();
    const keys = fill(hub, advanceClock).map(({ tvKey }) => tvKey);
    const closes = keys.map((key) => hub.connectTv(key, recordingSink<TvEvent>().sink));
    closes[7]?.();
    advanceClock(1);
    closes[3]?.();
    made(hub.create());
    expect(hub.sourceOf(keys[3] ?? "")).toBeDefined();
    expect(hub.sourceOf(keys[7] ?? "")).toBeUndefined();
    expect(keys.filter((key) => hub.sourceOf(key) !== undefined)).toHaveLength(MAX_SESSIONS - 1);
  });

  it("holds at most MAX_SESSIONS TV streams: one more ends the oldest unpaired TV's", () => {
    const { hub, advanceClock } = hubHarness();
    const sessions = fill(hub, advanceClock);
    const tvs = sessions.map(({ tvKey }) => {
      const tv = recordingSink<TvEvent>();
      hub.connectTv(tvKey, tv.sink);
      return tv;
    });
    paired(hub, sessions[0]?.code ?? "");
    made(hub.create());
    expect(tvs.map((tv) => tv.sink.closed).indexOf(true)).toBe(1);
    expect(tvs.filter((tv) => tv.sink.closed)).toHaveLength(1);
    expect(tvs[1]?.events.at(-1)).toEqual({ name: "end", data: {} });
    expect(hub.sourceOf(sessions[0]?.tvKey ?? "")).toBeDefined();
  });

  it("never drops a claimed session with a remote connected, even with its TV away", () => {
    const { hub, advanceClock } = hubHarness();
    const sessions = fill(hub, advanceClock);
    const secrets = sessions.map(({ code }) => paired(hub, code));
    expect(hub.create()).toBeUndefined();
    expect(hub.createBound("token")).toBeUndefined();
    expect(secrets.every((secret) => hub.hasRemoteSecret(secret))).toBe(true);
  });

  it("drops a claimed session once its last remote left", () => {
    const { hub, advanceClock } = hubHarness();
    const sessions = fill(hub, advanceClock);
    sessions.forEach(({ tvKey }) => hub.connectTv(tvKey, recordingSink<TvEvent>().sink));
    const [first, ...rest] = sessions;
    rest.forEach(({ code }) => paired(hub, code));
    const remoteSecret = hub.claim(first?.code ?? "") ?? "";
    hub.connectRemote(remoteSecret, recordingSink<RemoteEvent>().sink)?.();
    made(hub.create());
    expect(hub.hasRemoteSecret(remoteSecret)).toBe(false);
  });
});

describe("at most MAX_REMOTE_STREAMS remote streams per session", () => {
  const boundSession = () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = made(hub.createBound("token"));
    const tv = recordingSink<TvEvent>();
    hub.connectTv(tvKey, tv.sink);
    const remotes = Array.from({ length: MAX_REMOTE_STREAMS }, () => {
      const remote = recordingSink<RemoteEvent>();
      return { ...remote, close: hub.connectRemote(remoteSecret, remote.sink) };
    });
    return { hub, remoteSecret, tv, remotes };
  };

  it("closes the oldest for one more, without ending it or flickering the TV's remote", () => {
    const { hub, remoteSecret, tv, remotes } = boundSession();
    const newest = recordingSink<RemoteEvent>();
    hub.connectRemote(remoteSecret, newest.sink);
    expect(remotes.map((remote) => remote.sink.closed)).toEqual([true, false, false, false]);
    expect(remotes[0]?.names()).toEqual(["snapshot"]);
    expect(tv.names()).toEqual(["snapshot", "remote"]);
    expect(newest.names()).toEqual(["snapshot"]);
  });

  it("keeps the remote present when the closed oldest stream reports its close", () => {
    const { hub, remoteSecret, tv, remotes } = boundSession();
    hub.connectRemote(remoteSecret, recordingSink<RemoteEvent>().sink);
    remotes[0]?.close?.();
    remotes.slice(1).forEach((remote) => remote.close?.());
    expect(tv.events.filter((event) => event.name === "remote")).toEqual([
      { name: "remote", data: { present: true } },
    ]);
  });
});
