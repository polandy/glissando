/**
 * The storage the browser still grants the app, in bytes; null where it cannot tell (no
 * `navigator.storage` outside a secure context, or an estimate without quota or usage).
 */
export async function freeStorageBytes(
  storage: Pick<StorageManager, "estimate"> | undefined,
): Promise<number | null> {
  if (storage === undefined) {
    return null;
  }
  const { quota, usage } = await storage.estimate();
  return quota === undefined || usage === undefined ? null : Math.max(0, quota - usage);
}
