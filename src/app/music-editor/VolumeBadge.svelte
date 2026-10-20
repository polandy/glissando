<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { SongVolumeBadge } from "./playlist-view";

  /** The song list's own-volume badge: the own dB once measured, a pulse while measuring. */
  let { badge }: { badge: SongVolumeBadge } = $props();

  const { t, formatVolumeDb } = getTranslator();
</script>

{#if badge.kind === "measuring"}
  <span class="badge measuring"
    ><span class="dot" aria-hidden="true"></span>{t("music.volumeMeasuring")}</span
  >
{:else if badge.kind === "own"}
  <span class="badge own">{formatVolumeDb(badge.ownDb)}</span>
{:else}
  <span class="badge" aria-hidden="true"></span>
{/if}

<style>
  .badge {
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-medium);
    padding: 3px 8px;
    border-radius: var(--gl-radius-pill);
    white-space: nowrap;
  }
  .badge.own {
    background: color-mix(in srgb, var(--gl-accent) 24%, var(--gl-surface));
    color: var(--gl-ink);
  }
  .badge.measuring {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--gl-muted);
  }
  .badge .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--gl-accent);
    animation: badge-pulse 1s infinite;
  }
  @keyframes badge-pulse {
    50% {
      opacity: 0.25;
    }
  }
</style>
