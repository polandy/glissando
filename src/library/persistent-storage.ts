export type PersistentStorageResult = "granted" | "refused" | "unsupported";

/**
 * Asks the browser not to evict the library on its own. A refusal is not an error: the app keeps
 * working and offers installing, which makes browsers more willing to grant it.
 */
export async function requestPersistentStorage(
  storage: Pick<StorageManager, "persist" | "persisted"> | undefined,
): Promise<PersistentStorageResult> {
  if (storage === undefined) {
    return "unsupported";
  }
  if (await storage.persisted()) {
    return "granted";
  }
  return (await storage.persist()) ? "granted" : "refused";
}
