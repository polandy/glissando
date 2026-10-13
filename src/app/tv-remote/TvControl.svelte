<script lang="ts">
  import { onMount, tick } from "svelte";
  import TvRow from "./TvRow.svelte";
  import TvSheet from "./TvSheet.svelte";
  import type { TvSessionState, TvSession } from "./tv-session";

  /**
   * "Show on TV" (tv_remote/IN_THE_APP.md): the row and the sheet it opens, or the sheet alone
   * where the TV's QR code opened the app. Whoever made the session ends it.
   */
  let { session, withRow = true }: { session: TvSession; withRow?: boolean } = $props();

  // svelte-ignore state_referenced_locally
  let view = $state.raw<TvSessionState>(session.state);
  let row = $state<TvRow>();

  onMount(() =>
    session.subscribe((next) => {
      const closed = view.step !== "closed" && next.step === "closed";
      view = next;
      // Closing gives focus back to the row the sheet was opened from.
      if (closed) void tick().then(() => row?.focus());
    }),
  );
</script>

{#if withRow}
  <TvRow bind:this={row} onOpen={() => session.open()} />
{/if}
{#if view.step !== "closed"}
  <TvSheet {session} />
{/if}
