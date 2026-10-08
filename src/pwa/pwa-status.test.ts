import { describe, expect, it } from "vitest";
import type { PersistentStorageResult } from "../library/persistent-storage";
import {
  createStorageHintDismissalStore,
  PwaStatus,
  type InstallChoice,
  type InstallPromptEvent,
  type PwaPorts,
} from "./pwa-status";

class FakeInstallPrompt implements InstallPromptEvent {
  defaultPrevented = false;
  prompted = 0;
  readonly userChoice: Promise<InstallChoice>;

  constructor(outcome: InstallChoice["outcome"]) {
    this.userChoice = Promise.resolve({ outcome });
  }

  preventDefault(): void {
    this.defaultPrevented = true;
  }

  prompt(): Promise<void> {
    this.prompted += 1;
    return Promise.resolve();
  }
}

function pwaWith(
  overrides: Partial<PwaPorts> = {},
  storage: { told?: boolean; persisted?: boolean; grant?: PersistentStorageResult } = {},
) {
  let installPrompt: (event: InstallPromptEvent) => void = () => {};
  let installed: () => void = () => {};
  let updateWaiting: () => void = () => {};
  const calls: string[] = [];
  let dismissed = false;
  const ports: PwaPorts = {
    secureContext: true,
    runningInstalled: false,
    installGuide: null,
    onInstallPrompt: (listener) => (installPrompt = listener),
    onInstalled: (listener) => (installed = listener),
    hintDismissal: {
      wasDismissed: () => dismissed,
      recordDismissed: () => (dismissed = true),
    },
    storage: {
      refusalTold: () => storage.told ?? false,
      persisted: () => Promise.resolve(storage.persisted ?? false),
      request: () => {
        calls.push("request storage");
        return Promise.resolve(storage.grant ?? "refused");
      },
    },
    updates: {
      onWaiting: (listener) => (updateWaiting = listener),
      apply: () => calls.push("apply update"),
    },
    ...overrides,
  };
  const pwa = new PwaStatus(ports);
  return {
    pwa,
    calls,
    fireInstallPrompt: (event: InstallPromptEvent) => installPrompt(event),
    fireInstalled: () => installed(),
    fireUpdateWaiting: () => updateWaiting(),
  };
}

describe("PwaStatus", () => {
  it("starts from the environment and the remembered hint", () => {
    const { pwa } = pwaWith({ secureContext: false, runningInstalled: true, installGuide: "ios" });
    expect(pwa.state).toEqual({
      secureContext: false,
      installed: true,
      installPromptAvailable: false,
      installGuide: "ios",
      hintDismissed: false,
      storageRefused: false,
      updateWaiting: false,
    });
  });

  it("keeps the browser's install prompt for the hint instead of letting the browser show it", () => {
    const { pwa, fireInstallPrompt } = pwaWith();
    const event = new FakeInstallPrompt("dismissed");
    fireInstallPrompt(event);
    expect(event.defaultPrevented).toBe(true);
    expect(pwa.state.installPromptAvailable).toBe(true);
  });

  it("counts as installed once the install prompt was accepted", async () => {
    const { pwa, fireInstallPrompt } = pwaWith();
    const event = new FakeInstallPrompt("accepted");
    fireInstallPrompt(event);
    await pwa.install();
    expect(event.prompted).toBe(1);
    expect(pwa.state.installed).toBe(true);
    expect(pwa.state.installPromptAvailable).toBe(false);
  });

  it("stays uninstalled when the install prompt was dismissed; the prompt is spent", async () => {
    const { pwa, fireInstallPrompt } = pwaWith();
    fireInstallPrompt(new FakeInstallPrompt("dismissed"));
    await pwa.install();
    expect(pwa.state.installed).toBe(false);
    expect(pwa.state.installPromptAvailable).toBe(false);
  });

  it("refuses to install without a kept prompt", async () => {
    const { pwa } = pwaWith();
    await expect(pwa.install()).rejects.toThrow(/install prompt/);
  });

  it("counts as installed when the browser reports the app installed", () => {
    const { pwa, fireInstalled } = pwaWith();
    fireInstalled();
    expect(pwa.state.installed).toBe(true);
  });

  it("remembers a hidden hint", () => {
    const { pwa } = pwaWith();
    pwa.dismissHint();
    expect(pwa.state.hintDismissed).toBe(true);
    const { pwa: sameDevice } = pwaWith({
      hintDismissal: { wasDismissed: () => true, recordDismissed: () => {} },
    });
    expect(sameDevice.state.hintDismissed).toBe(true);
  });

  it("tells subscribers every change", () => {
    const { pwa, fireUpdateWaiting } = pwaWith();
    const seen: boolean[] = [];
    pwa.subscribe((state) => seen.push(state.updateWaiting));
    fireUpdateWaiting();
    expect(seen).toEqual([true]);
  });

  it("stops telling an unsubscribed listener", () => {
    const { pwa, fireUpdateWaiting } = pwaWith();
    const seen: boolean[] = [];
    pwa.subscribe((state) => seen.push(state.updateWaiting))();
    pwa.dismissHint();
    fireUpdateWaiting();
    expect(pwa.state.updateWaiting).toBe(true);
    expect(seen).toEqual([]);
  });

  it("asks the waiting version to take over on reload", () => {
    const { pwa, calls } = pwaWith();
    pwa.reload();
    expect(calls).toEqual(["apply update"]);
  });

  it("knows the storage refused once the refusal is told", () => {
    const { pwa } = pwaWith();
    pwa.storageRefusalTold();
    expect(pwa.state.storageRefused).toBe(true);
  });

  describe("at startup", () => {
    it("finds the storage refused when the refusal was told and it is still not persistent", async () => {
      const { pwa, calls } = pwaWith({}, { told: true, persisted: false });
      await pwa.start();
      expect(pwa.state.storageRefused).toBe(true);
      expect(calls).toEqual([]);
    });

    it("finds the storage kept when it became persistent since the refusal", async () => {
      const { pwa } = pwaWith({}, { told: true, persisted: true });
      await pwa.start();
      expect(pwa.state.storageRefused).toBe(false);
    });

    it("does not ask about storage when no refusal was told", async () => {
      const { pwa, calls } = pwaWith({ runningInstalled: true }, { told: false });
      await pwa.start();
      expect(pwa.state.storageRefused).toBe(false);
      expect(calls).toEqual([]);
    });

    it("asks for persistent storage again when running installed after a told refusal", async () => {
      const { pwa, calls } = pwaWith({ runningInstalled: true }, { told: true, grant: "granted" });
      await pwa.start();
      expect(calls).toEqual(["request storage"]);
      expect(pwa.state.storageRefused).toBe(false);
    });

    it("keeps the storage refused when the installed app is refused again", async () => {
      const { pwa } = pwaWith({ runningInstalled: true }, { told: true, grant: "refused" });
      await pwa.start();
      expect(pwa.state.storageRefused).toBe(true);
    });
  });
});

describe("createStorageHintDismissalStore", () => {
  it("remembers the hidden hint in the given storage", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    expect(createStorageHintDismissalStore(storage).wasDismissed()).toBe(false);
    createStorageHintDismissalStore(storage).recordDismissed();
    expect(createStorageHintDismissalStore(storage).wasDismissed()).toBe(true);
  });
});
