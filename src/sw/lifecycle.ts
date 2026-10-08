import { cachesToDelete, versionsAfterActivating } from "./app-caches";
import type { SkipWaitingMessage } from "./messages";

/** The cache storage as activating sees it, for one scope. */
export interface VersionStorePorts {
  /** The stored record of activated versions, parsed; `undefined` before the first one. */
  readRecord(): Promise<unknown>;
  writeRecord(versions: readonly string[]): Promise<void>;
  cacheNames(): Promise<string[]>;
  deleteCache(name: string): Promise<unknown>;
}

const SKIP_WAITING_TYPE: SkipWaitingMessage["type"] = "SKIP_WAITING";

/** Records `current` as activated and deletes the scope's caches of every version not kept. */
export async function forgetOldVersions(
  ports: VersionStorePorts,
  scope: string,
  current: string,
): Promise<void> {
  const kept = versionsAfterActivating(parseVersionsRecord(await ports.readRecord()), current);
  await ports.writeRecord(kept);
  const stale = cachesToDelete(await ports.cacheNames(), scope, kept);
  await Promise.all(stale.map((name) => ports.deleteCache(name)));
}

function parseVersionsRecord(stored: unknown): string[] {
  if (stored === undefined) {
    return [];
  }
  if (!Array.isArray(stored) || !stored.every((version) => typeof version === "string")) {
    throw new Error(`the stored versions are invalid: ${JSON.stringify(stored)}`);
  }
  return stored;
}

export function isSkipWaiting(data: unknown): data is SkipWaitingMessage {
  return (
    typeof data === "object" && data !== null && "type" in data && data.type === SKIP_WAITING_TYPE
  );
}
