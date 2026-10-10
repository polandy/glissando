import { describe, expect, it } from "vitest";
import type { ImmichAvailabilityState } from "../immich/immich-availability";
import type { ImmichStatus } from "../immich/immich-client";
import { ServerLibraryAvailability, type ServerLibraryState } from "./server-library-availability";
import { ServerLibraryUnavailableError } from "./server-library-client";
import { createMemoryStorage } from "../app/testing/memory-storage";
import { createStorageServerLibraryMemory, type ServerLibraryMemory } from "./server-library-memory";

const AVAILABLE: ImmichStatus = { kind: "available", version: "3.3.1", albumCount: 2 };

/** Immich's availability as a test publishes it, replayed on subscribe like the real one. */
class FakeImmichAvailability {
  #state: ImmichAvailabilityState = { kind: "checking" };
  readonly #listeners = new Set<(state: ImmichAvailabilityState) => void>();

  subscribe(listener: (state: ImmichAvailabilityState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  publish(state: ImmichAvailabilityState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }

  get listenerCount(): number {
    return this.#listeners.size;
  }
}

type DiscoveryAnswer = boolean | Error;

/** Answers each discovery with the next queued answer, or holds it until the test resolves it. */
class FakeDiscovery {
  readonly answers: DiscoveryAnswer[] = [];
  calls = 0;
  #held: Promise<DiscoveryAnswer> | null = null;

  hold(): (answer: DiscoveryAnswer) => void {
    const { promise, resolve } = Promise.withResolvers<DiscoveryAnswer>();
    this.#held = promise;
    return resolve;
  }

  readonly discover = async (): Promise<boolean> => {
    this.calls += 1;
    const held = this.#held;
    this.#held = null;
    const answer = held === null ? this.answers.shift() : await held;
    if (answer === undefined) throw new Error("the fake discovery has no answer left");
    if (answer instanceof Error) throw answer;
    return answer;
  };
}

function newMemory(): ServerLibraryMemory {
  return createStorageServerLibraryMemory(createMemoryStorage(), () => undefined);
}

function setUp(memory: ServerLibraryMemory = newMemory()) {
  const immich = new FakeImmichAvailability();
  const client = new FakeDiscovery();
  const logged: unknown[] = [];
  const availability = new ServerLibraryAvailability({
    client,
    immich,
    memory,
    log: (error) => logged.push(error),
  });
  const seen: ServerLibraryState["kind"][] = [];
  availability.subscribe((state) => seen.push(state.kind));
  /** Publishes Immich's answer and waits for the discovery it starts. */
  const immichAnswers = async (state: ImmichAvailabilityState) => {
    immich.publish(state);
    await availability.settled();
  };
  return { immich, client, logged, availability, seen, immichAnswers };
}

describe("ServerLibraryAvailability", () => {
  it("is checking until Immich has answered, and tells a subscriber at once", () => {
    const { availability, seen, client } = setUp();

    expect(availability.state).toEqual({ kind: "checking" });
    expect(seen).toEqual(["checking"]);
    expect(client.calls).toBe(0);
  });

  it("is on when the discovery answers and Immich is available", async () => {
    const { availability, client, immichAnswers } = setUp();
    client.answers.push(true);

    await immichAnswers(AVAILABLE);

    expect(availability.state).toEqual({ kind: "on" });
  });

  it("is checking while the first discovery is under way", () => {
    const { availability, client, immich } = setUp();
    client.hold();

    immich.publish(AVAILABLE);

    expect(availability.state).toEqual({ kind: "checking" });
  });

  it("is off when the server answers no discovery", async () => {
    const { availability, client, immichAnswers } = setUp();
    client.answers.push(false);

    await immichAnswers(AVAILABLE);

    expect(availability.state).toEqual({ kind: "off" });
  });

  it.each<ImmichStatus>([{ kind: "notSetUp" }, { kind: "keyRejected" }, { kind: "unreachable" }])(
    "is off while Immich is not available ($kind), even with the discovery",
    async (status) => {
      const { availability, client, immichAnswers } = setUp();
      client.answers.push(true);

      await immichAnswers(status);

      expect(availability.state).toEqual({ kind: "off" });
    },
  );

  it("is offline when the device goes offline after the discovery answered", async () => {
    const { availability, client, immichAnswers, seen } = setUp();
    client.answers.push(true);
    await immichAnswers(AVAILABLE);

    await immichAnswers({ kind: "offline" });

    expect(availability.state).toEqual({ kind: "offline" });
    expect(seen).toEqual(["checking", "on", "offline"]);
    expect(client.calls).toBe(1);
  });

  it("is off when the device is offline and no discovery ever answered", async () => {
    const { availability, client, immichAnswers } = setUp();

    await immichAnswers({ kind: "offline" });

    expect(availability.state).toEqual({ kind: "off" });
    expect(client.calls).toBe(0);
  });

  it("is offline when the app starts offline on a device that last saw the library on", async () => {
    const memory = newMemory();
    memory.rememberOn(true);
    const { availability, client, immichAnswers } = setUp(memory);

    await immichAnswers({ kind: "offline" });

    expect(availability.state).toEqual({ kind: "offline" });
    expect(client.calls).toBe(0);
  });

  it("stays checking online until the discovery answers, even when the library was on", async () => {
    const memory = newMemory();
    memory.rememberOn(true);
    const { availability, client, immich } = setUp(memory);
    const answer = client.hold();

    immich.publish(AVAILABLE);

    expect(availability.state).toEqual({ kind: "checking" });
    answer(true);
    await availability.settled();
    expect(availability.state).toEqual({ kind: "on" });
  });

  it("remembers on this device what the discovery answered", async () => {
    const memory = newMemory();
    const { client, immichAnswers } = setUp(memory);
    client.answers.push(true, false);

    await immichAnswers(AVAILABLE);
    expect(memory.wasOn()).toBe(true);
    await immichAnswers(AVAILABLE);
    expect(memory.wasOn()).toBe(false);
  });

  it("keeps the memory when the server cannot be reached", async () => {
    const memory = newMemory();
    memory.rememberOn(true);
    const { client, immichAnswers } = setUp(memory);
    client.answers.push(new ServerLibraryUnavailableError("unreachable"));

    await immichAnswers(AVAILABLE);

    expect(memory.wasOn()).toBe(true);
  });

  it("asks again whenever Immich's availability is checked", async () => {
    const { availability, client, immichAnswers } = setUp();
    client.answers.push(true, false);
    await immichAnswers(AVAILABLE);

    await immichAnswers(AVAILABLE);

    expect(client.calls).toBe(2);
    expect(availability.state).toEqual({ kind: "off" });
  });

  it("keeps the last answer when the discovery cannot reach the server", async () => {
    const { availability, client, immichAnswers } = setUp();
    client.answers.push(true, new ServerLibraryUnavailableError("GET api/library"));
    await immichAnswers(AVAILABLE);

    await immichAnswers(AVAILABLE);

    expect(availability.state).toEqual({ kind: "on" });
  });

  it("lets the latest discovery win over an earlier one answering later", async () => {
    const { availability, client, immich } = setUp();
    const answerFirst = client.hold();
    immich.publish(AVAILABLE);
    client.answers.push(false);
    immich.publish(AVAILABLE);

    answerFirst(true);
    await availability.settled();

    expect(availability.state).toEqual({ kind: "off" });
  });

  it("logs a discovery failing unexpectedly and is off", async () => {
    const { availability, client, immichAnswers, logged } = setUp();
    const failure = new Error("unexpected");
    client.answers.push(failure);

    await immichAnswers(AVAILABLE);

    expect(availability.state).toEqual({ kind: "off" });
    expect(logged).toEqual([failure]);
  });

  it("stops following Immich once disposed", () => {
    const { availability, immich } = setUp();
    expect(immich.listenerCount).toBe(1);

    availability.dispose();

    expect(immich.listenerCount).toBe(0);
  });
});
