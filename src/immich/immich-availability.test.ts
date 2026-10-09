import { describe, expect, it } from "vitest";
import {
  browserNetworkStatus,
  ImmichAvailability,
  type ImmichAvailabilityState,
  type NetworkStatus,
} from "./immich-availability";
import type { ImmichStatus } from "./immich-client";
import { FakeImmichClient } from "./testing/fake-immich-client";

const AVAILABLE: ImmichStatus = { kind: "available", version: "3.3.1", albumCount: 2 };

class FakeNetwork implements NetworkStatus {
  online = true;
  readonly #listeners = new Set<(online: boolean) => void>();

  isOnline(): boolean {
    return this.online;
  }

  onChange(listener: (online: boolean) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  get listenerCount(): number {
    return this.#listeners.size;
  }

  go(online: boolean): void {
    this.online = online;
    for (const listener of this.#listeners) listener(online);
  }
}

function setUp(online = true) {
  const client = new FakeImmichClient();
  const network = new FakeNetwork();
  network.online = online;
  const availability = new ImmichAvailability({ client, network });
  const seen: ImmichAvailabilityState[] = [];
  availability.subscribe((state) => seen.push(state));
  return { client, network, availability, seen };
}

describe("ImmichAvailability", () => {
  it("is checking before the first answer, and tells a subscriber at once", () => {
    const { availability, seen } = setUp();

    expect(availability.state).toEqual({ kind: "checking" });
    expect(seen).toEqual([{ kind: "checking" }]);
  });

  it("starts offline when the device is offline", () => {
    const { availability } = setUp(false);

    expect(availability.state).toEqual({ kind: "offline" });
  });

  it("publishes the status a check gets", async () => {
    const { client, availability, seen } = setUp();
    client.statusAnswers.push(AVAILABLE);

    await availability.check();

    expect(availability.state).toEqual(AVAILABLE);
    expect(seen).toEqual([{ kind: "checking" }, AVAILABLE]);
  });

  it("shares one request between concurrent checks", async () => {
    const { client, availability } = setUp();
    client.statusAnswers.push(AVAILABLE);

    await Promise.all([availability.check(), availability.check()]);

    expect(availability.state).toEqual(AVAILABLE);
    expect(client.statusCalls).toBe(1);
  });

  it("asks again on a later check", async () => {
    const { client, availability } = setUp();
    client.statusAnswers.push(AVAILABLE, { kind: "keyRejected" });

    await availability.check();
    await availability.check();

    expect(availability.state).toEqual({ kind: "keyRejected" });
    expect(client.statusCalls).toBe(2);
  });

  it("goes offline when the device does", async () => {
    const { client, network, availability } = setUp();
    client.statusAnswers.push(AVAILABLE);
    await availability.check();

    network.go(false);

    expect(availability.state).toEqual({ kind: "offline" });
  });

  it("checks again when the device comes back online", async () => {
    const { client, network, availability } = setUp(false);
    client.statusAnswers.push(AVAILABLE);

    network.go(true);
    await availability.settled();

    expect(availability.state).toEqual(AVAILABLE);
    expect(client.statusCalls).toBe(1);
  });

  it("drops the answer of a check that was under way when the device went offline", async () => {
    const { client, network, availability } = setUp();
    const answer = client.holdStatus();
    const check = availability.check();

    network.go(false);
    answer(AVAILABLE);
    await check;

    expect(client.statusCalls).toBe(1);
    expect(availability.state).toEqual({ kind: "offline" });
  });

  it("publishes a problem a request met", async () => {
    const { client, availability, seen } = setUp();
    client.statusAnswers.push(AVAILABLE);
    await availability.check();

    availability.report("keyRejected");

    expect(availability.state).toEqual({ kind: "keyRejected" });
    expect(seen).toEqual([{ kind: "checking" }, AVAILABLE, { kind: "keyRejected" }]);
  });

  it("clears a reported problem on a later check that finds Immich available", async () => {
    const { client, availability } = setUp();
    availability.report("unreachable");
    client.statusAnswers.push(AVAILABLE);

    await availability.check();

    expect(availability.state).toEqual(AVAILABLE);
  });

  it("drops the answer of a check that was under way when a problem was reported", async () => {
    const { client, availability } = setUp();
    const answer = client.holdStatus();
    const check = availability.check();

    availability.report("permissionMissing");
    answer(AVAILABLE);
    await check;

    expect(client.statusCalls).toBe(1);
    expect(availability.state).toEqual({ kind: "permissionMissing" });
  });

  it("stops listening to the network when disposed", () => {
    const { network, availability } = setUp();
    expect(network.listenerCount).toBe(1);

    availability.dispose();

    expect(network.listenerCount).toBe(0);
  });
});

describe("browserNetworkStatus", () => {
  it("reads navigator.onLine and reports online and offline events", () => {
    const events = new EventTarget();
    const target = Object.assign(events, { navigator: { onLine: false } });
    const network = browserNetworkStatus(target);
    const seen: boolean[] = [];
    const stop = network.onChange((online) => seen.push(online));

    events.dispatchEvent(new Event("online"));
    events.dispatchEvent(new Event("offline"));
    stop();
    events.dispatchEvent(new Event("online"));

    expect(network.isOnline()).toBe(false);
    expect(seen).toEqual([true, false]);
  });
});
