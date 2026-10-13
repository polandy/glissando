import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, createTvHub, type RemoteEvent, type TvEvent } from "./tv-hub";
import {
  claimedSession,
  hubHarness,
  KEY_BYTES,
  KEY_PATTERN,
  playingState,
  recordingSink,
} from "./testing/tv-hub-harness";

describe("making a session (way A)", () => {
  it("answers a 22-character base64url key and a code of four letters from the alphabet", () => {
    const { tvKey, code } = hubHarness().hub.create();
    expect(tvKey).toMatch(KEY_PATTERN);
    expect(code).toHaveLength(4);
    expect([...code].every((letter) => CODE_ALPHABET.includes(letter))).toBe(true);
  });

  it("uses the letters without I, L and O", () => {
    expect(CODE_ALPHABET).toBe("ABCDEFGHJKMNPQRSTUVWXYZ");
  });

  it.each([
    ["the first four letters", [0, 1, 2, 3], "ABCD"],
    ["the last letter", [22, 22, 22, 22], "ZZZZ"],
    ["a byte past the alphabet wraps around", [23, 24, 45, 252], "ABZZ"],
  ])("draws a code from the random bytes: %s", (_, bytes, code) => {
    const { hub } = hubHarness([new Uint8Array(bytes)]);
    expect(hub.create().code).toBe(code);
  });

  it("draws again when a byte would favour some letters (253 and above)", () => {
    const { hub } = hubHarness([new Uint8Array([0, 0, 0, 253]), new Uint8Array([1, 1, 1, 1])]);
    expect(hub.create().code).toBe("BBBB");
  });

  it("draws again when the code belongs to a live session", () => {
    const { hub } = hubHarness([
      new Uint8Array([0, 0, 0, 0]),
      new Uint8Array(KEY_BYTES).fill(1),
      new Uint8Array([0, 0, 0, 0]),
      new Uint8Array([2, 2, 2, 2]),
    ]);
    expect(hub.create().code).toBe("AAAA");
    expect(hub.create().code).toBe("CCCC");
  });

  it("fails loud when the random source never gives an unused code", () => {
    let calls = 0;
    const hub = createTvHub({
      now: () => 0,
      randomBytes: (count) => new Uint8Array(count).fill(count === KEY_BYTES ? ++calls : 255),
    });
    expect(() => hub.create()).toThrow("code");
  });
});

describe("claiming a code", () => {
  it("answers the remote's secret once, then the code is gone", () => {
    const { hub } = hubHarness();
    const { tvKey, code } = hub.create();
    const secret = hub.claim(code);
    expect(secret).toMatch(KEY_PATTERN);
    expect(secret).not.toBe(tvKey);
    expect(hub.claim(code)).toBeUndefined();
  });

  it("answers nothing for a code no session has", () => {
    const { hub } = hubHarness();
    hub.create();
    expect(hub.claim("QQQQ")).toBeUndefined();
  });

  it("tells the TV it was claimed", () => {
    const { hub } = hubHarness();
    const { tvKey, code } = hub.create();
    const tv = recordingSink<TvEvent>();
    hub.connectTv(tvKey, tv.sink);
    hub.claim(code);
    expect(tv.names()).toEqual(["snapshot", "claimed"]);
  });
});

describe("choosing a slideshow", () => {
  it("tells the TV to show it and names it as the session's source", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const tv = recordingSink<TvEvent>();
    hub.connectTv(tvKey, tv.sink);
    expect(hub.sourceOf(tvKey)).toEqual({ kind: "chosen", slideshowId: undefined });
    expect(hub.show(remoteSecret, "slideshow-1")).toBe("shown");
    expect(tv.names()).toEqual(["snapshot", "show"]);
    expect(hub.sourceOf(tvKey)).toEqual({ kind: "chosen", slideshowId: "slideshow-1" });
  });

  it("refuses a session bound to a share link", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = hub.createBound("SHARETOKENSHARETOKEN12");
    expect(hub.show(remoteSecret, "slideshow-1")).toBe("boundToLink");
    expect(hub.sourceOf(tvKey)).toEqual({ kind: "link", token: "SHARETOKENSHARETOKEN12" });
  });

  it("answers noSuchTv for a secret no session has", () => {
    expect(hubHarness().hub.show("unknown", "slideshow-1")).toBe("noSuchTv");
  });
});

describe("replaying the state on connect, so the order of connecting does not matter", () => {
  it("gives a fresh way A TV nothing claimed, shown or present", () => {
    const { hub } = hubHarness();
    const tv = recordingSink<TvEvent>();
    hub.connectTv(hub.create().tvKey, tv.sink);
    expect(tv.events).toEqual([
      { name: "snapshot", data: { claimed: false, showing: false, remotePresent: false } },
    ]);
  });

  it("gives a TV that connects late the claim, the show and the remote already there", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    hub.show(remoteSecret, "slideshow-1");
    hub.connectRemote(remoteSecret, recordingSink<RemoteEvent>().sink);
    const tv = recordingSink<TvEvent>();
    hub.connectTv(tvKey, tv.sink);
    expect(tv.events).toEqual([
      { name: "snapshot", data: { claimed: true, showing: true, remotePresent: true } },
    ]);
  });

  it("gives a way B TV a claimed session that is showing its link", () => {
    const { hub } = hubHarness();
    const tv = recordingSink<TvEvent>();
    hub.connectTv(hub.createBound("SHARETOKENSHARETOKEN12").tvKey, tv.sink);
    expect(tv.events).toEqual([
      { name: "snapshot", data: { claimed: true, showing: true, remotePresent: false } },
    ]);
  });

  it("gives a remote that connects first no TV and no state, then tells it the TV came", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const remote = recordingSink<RemoteEvent>();
    hub.connectRemote(remoteSecret, remote.sink);
    hub.connectTv(tvKey, recordingSink<TvEvent>().sink);
    expect(remote.events).toEqual([
      { name: "snapshot", data: { tvPresent: false, state: null } },
      { name: "tv", data: { present: true } },
    ]);
  });

  it("gives a remote that connects late the TV's presence and its last state", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    hub.connectTv(tvKey, recordingSink<TvEvent>().sink);
    hub.report(tvKey, playingState);
    const remote = recordingSink<RemoteEvent>();
    hub.connectRemote(remoteSecret, remote.sink);
    expect(remote.events).toEqual([
      { name: "snapshot", data: { tvPresent: true, state: playingState } },
    ]);
  });

  it("answers no stream for a key or secret no session has", () => {
    const { hub } = hubHarness();
    expect(hub.connectTv("unknown", recordingSink<TvEvent>().sink)).toBeUndefined();
    expect(hub.connectRemote("unknown", recordingSink<RemoteEvent>().sink)).toBeUndefined();
  });
});

describe("the streams' presence", () => {
  it("closes a TV's first stream when it opens a second, without the TV going away", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const remote = recordingSink<RemoteEvent>();
    hub.connectRemote(remoteSecret, remote.sink);
    const first = recordingSink<TvEvent>();
    const closeFirst = hub.connectTv(tvKey, first.sink);
    hub.connectTv(tvKey, recordingSink<TvEvent>().sink);
    expect(first.sink.closed).toBe(true);
    closeFirst?.();
    hub.report(tvKey, playingState);
    expect(remote.names()).toEqual(["snapshot", "tv", "state"]);
  });

  it("tells the remotes when the TV's stream closes", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const closeTv = hub.connectTv(tvKey, recordingSink<TvEvent>().sink);
    const remote = recordingSink<RemoteEvent>();
    hub.connectRemote(remoteSecret, remote.sink);
    closeTv?.();
    expect(remote.events.at(-1)).toEqual({ name: "tv", data: { present: false } });
  });

  it("tells the TV when the first remote opens and the last one closes, not between", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const tv = recordingSink<TvEvent>();
    hub.connectTv(tvKey, tv.sink);
    const closeFirst = hub.connectRemote(remoteSecret, recordingSink<RemoteEvent>().sink);
    const closeSecond = hub.connectRemote(remoteSecret, recordingSink<RemoteEvent>().sink);
    closeFirst?.();
    closeFirst?.();
    expect(tv.events.slice(1)).toEqual([{ name: "remote", data: { present: true } }]);
    closeSecond?.();
    expect(tv.events.slice(1)).toEqual([
      { name: "remote", data: { present: true } },
      { name: "remote", data: { present: false } },
    ]);
  });
});

describe("commands and state reports", () => {
  it.each([
    [{ type: "pause" } as const],
    [{ type: "seek", value: 42 } as const],
    [{ type: "volume", value: 0.25 } as const],
  ])("sends %o to the TV", (command) => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const tv = recordingSink<TvEvent>();
    hub.connectTv(tvKey, tv.sink);
    expect(hub.command(remoteSecret, command)).toBe("sent");
    expect(tv.events.at(-1)).toEqual({ name: "command", data: command });
  });

  it("answers tvAway while the TV has no stream open", () => {
    const { hub } = hubHarness();
    const { remoteSecret } = claimedSession(hub);
    expect(hub.command(remoteSecret, { type: "play" })).toBe("tvAway");
  });

  it("answers noSuchTv for a secret no session has", () => {
    expect(hubHarness().hub.command("unknown", { type: "play" })).toBe("noSuchTv");
  });

  it("ends the session on disconnect: both streams get end and are closed", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const tv = recordingSink<TvEvent>();
    const remote = recordingSink<RemoteEvent>();
    hub.connectTv(tvKey, tv.sink);
    hub.connectRemote(remoteSecret, remote.sink);
    expect(hub.command(remoteSecret, { type: "disconnect" })).toBe("sent");
    expect([tv.events.at(-1), tv.sink.closed]).toEqual([{ name: "end", data: {} }, true]);
    expect([remote.events.at(-1), remote.sink.closed]).toEqual([{ name: "end", data: {} }, true]);
    expect(hub.sourceOf(tvKey)).toBeUndefined();
    expect(hub.command(remoteSecret, { type: "play" })).toBe("noSuchTv");
  });

  it("ends the session on disconnect while the TV is away too", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    expect(hub.sourceOf(tvKey)).toBeDefined();
    expect(hub.command(remoteSecret, { type: "disconnect" })).toBe("sent");
    expect(hub.sourceOf(tvKey)).toBeUndefined();
  });

  it("passes the TV's state on to every remote", () => {
    const { hub } = hubHarness();
    const { tvKey, remoteSecret } = claimedSession(hub);
    const remotes = [recordingSink<RemoteEvent>(), recordingSink<RemoteEvent>()];
    for (const remote of remotes) hub.connectRemote(remoteSecret, remote.sink);
    expect(hub.report(tvKey, playingState)).toBe("reported");
    expect(remotes.map((remote) => remote.events.at(-1))).toEqual([
      { name: "state", data: playingState },
      { name: "state", data: playingState },
    ]);
  });

  it("answers noSuchTv to a report for a key no session has", () => {
    expect(hubHarness().hub.report("unknown", playingState)).toBe("noSuchTv");
  });
});
