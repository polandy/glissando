<script lang="ts">
  import type { Scheduler } from "../../ui-kit/scheduler";
  import { getTranslator } from "../i18n/context";

  const CLIP_NOTICE_MS = 6000;

  /**
   * The hint over the poster a refused clip leaves on screen: shown when the player emits
   * `clipskipped`, dropped after `CLIP_NOTICE_MS`. Styled by `player-overlay.css`.
   */
  let { player, scheduler }: { player: EventTarget | null; scheduler: Scheduler } = $props();

  const { t } = getTranslator();
  let shown = $state(false);

  $effect(() => {
    let cancel = () => {};
    const onSkipped = () => {
      cancel();
      shown = true;
      cancel = scheduler.after(CLIP_NOTICE_MS, () => (shown = false));
    };
    player?.addEventListener("clipskipped", onSkipped);
    return () => {
      player?.removeEventListener("clipskipped", onSkipped);
      cancel();
    };
  });
</script>

{#if shown}
  <p class="clip-notice" role="status">{t("player.clipSkipped")}</p>
{/if}
