<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import ShareRow from "./ShareRow.svelte";
  import ShareSheet, { type ShareSubject } from "./ShareSheet.svelte";
  import type { ShareLinkSession, ShareLinkState } from "./share-link-session";

  /**
   * The share row and the sheet it opens (SHARE_LINK.md, In the app). A device slideshow has no
   * session: its row only says how to share it.
   */
  let { session, subject }: { session: ShareLinkSession | null; subject: ShareSubject } = $props();

  // svelte-ignore state_referenced_locally
  let view = $state.raw<ShareLinkState | null>(session?.state ?? null);
  let row = $state<ShareRow>();

  onMount(() => {
    if (session === null) return;
    const stop = session.subscribe((next) => {
      const closed = view?.sheet !== "closed" && next.sheet === "closed";
      view = next;
      // Closing gives focus back to the row the sheet was opened from.
      if (closed) void tick().then(() => row?.focus());
    });
    void session.load();
    return stop;
  });
  onDestroy(() => session?.dispose());
</script>

{#if session === null || view === null}
  <ShareRow link="device" />
{:else}
  <ShareRow bind:this={row} link={view.link?.url ?? null} onOpen={() => session.open()} />
  {#if view.sheet !== "closed"}
    <ShareSheet {session} {subject} />
  {/if}
{/if}
