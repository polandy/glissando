<script lang="ts">
  import type { RoundPicture } from "../../frame/round-composition";
  import { getTranslator } from "../i18n/context";

  let { picture }: { picture: RoundPicture } = $props();

  const { formatDay } = getTranslator();

  // The place leads; a picture without one is captioned by its date alone.
  const date = $derived(formatDay(picture.takenAt));
  const place = $derived(picture.place ?? null);
</script>

<div class="stamp">
  <b>{place ?? date}</b>
  {#if place !== null}
    <small>{date}</small>
  {/if}
</div>

<style>
  .stamp {
    position: absolute;
    z-index: 1;
    bottom: 20px;
    left: 24px;
    color: var(--gl-player-text);
    text-shadow: 0 1px 6px rgb(0 0 0 / 0.5);
  }
  b,
  small {
    display: block;
  }
  b {
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-heading);
    font-weight: var(--gl-weight-title);
  }
  small {
    font-size: var(--gl-size-body);
  }
</style>
