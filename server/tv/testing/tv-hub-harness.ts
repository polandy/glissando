import type { PlaybackState } from "../../../src/tv-remote/tv-protocol";
import { CODE_ALPHABET, createTvHub, type EventSink } from "../tv-hub";

export const KEY_PATTERN = /^[A-Za-z0-9_-]{22}$/;
export const KEY_BYTES = 16;

/**
 * A hub on a clock the test moves. Each random call is answered from `scripted` while it lasts,
 * then with a counter's digits, so every key and code differs.
 */
export function hubHarness(scripted: Uint8Array[] = []) {
  let now = 0;
  let counter = 0;
  const hub = createTvHub({
    now: () => now,
    randomBytes: (count) => scripted.shift() ?? countingBytes(++counter, count),
  });
  return {
    hub,
    advanceClock(milliseconds: number) {
      now += milliseconds;
    },
  };
}

/** `value`'s digits in base 23, so that both keys and codes differ from one value to the next. */
function countingBytes(value: number, count: number): Uint8Array {
  return Uint8Array.from(
    { length: count },
    (_, index) => Math.floor(value / CODE_ALPHABET.length ** index) % CODE_ALPHABET.length,
  );
}

/** A sink that keeps what it was sent and whether the hub closed it. */
export function recordingSink<Event extends { name: string }>() {
  const events: Event[] = [];
  const sink: EventSink<Event> & { closed: boolean } = {
    closed: false,
    send: (event) => events.push(event),
    close() {
      sink.closed = true;
    },
  };
  return { sink, events, names: () => events.map((event) => event.name) };
}

export const playingState: PlaybackState = {
  playing: true,
  ended: false,
  needsTvOk: false,
  positionSeconds: 12.5,
  durationSeconds: 90,
  pictureIndex: 3,
  pictureCount: 20,
  volume: 0.8,
  title: "Generated test slideshow",
};

/** A way A session, claimed, so it has both a key and a secret. */
export function claimedSession(hub: ReturnType<typeof createTvHub>) {
  const { tvKey, code } = hub.create();
  const remoteSecret = hub.claim(code);
  if (remoteSecret === undefined) throw new Error("the claim failed");
  return { tvKey, remoteSecret };
}
