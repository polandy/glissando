/**
 * Resolves once every promise reaction already queued has run, however many `.then` hops deep.
 * A message-channel task only runs after the microtask queue is empty, so no tick count is
 * guessed and fake timers cannot stall it.
 */
export function settleMicrotasks(): Promise<void> {
  const { port1, port2 } = new MessageChannel();
  return new Promise((resolve) => {
    port1.onmessage = () => {
      port1.close();
      port2.close();
      resolve();
    };
    port2.postMessage(null);
  });
}
