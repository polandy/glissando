<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import Icon from "./Icon.svelte";
  import ViewerRoundButton from "./ViewerRoundButton.svelte";

  /** The viewer's top bar: the close button, the shown picture's date and time, its position. */
  let {
    date,
    time,
    position,
    count,
    setAsideReason,
    hidden,
    onClose,
    closeButton = $bindable(),
  }: {
    date: string;
    time: string;
    position: number;
    count: number;
    /** Why the picture was set aside; null for one in the strip. */
    setAsideReason: "similar" | "blurry" | null;
    hidden: boolean;
    onClose: () => void;
    closeButton?: HTMLButtonElement | undefined;
  } = $props();
  const { t } = getTranslator();
</script>

<header class="bar top" class:hidden>
  <ViewerRoundButton bind:element={closeButton} label={t("common.close")} onclick={onClose}>
    <Icon name="close" />
  </ViewerRoundButton>
  <div class="meta">
    <b class="mono">{date} · {time}</b>
    <span>
      {t("view.position", { position, count })}
      {#if setAsideReason !== null}
        · {t("view.setAside", {
          reason: t(setAsideReason === "similar" ? "cull.similar" : "cull.blurry"),
        })}
      {/if}
    </span>
  </div>
</header>

<style>
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    transition: opacity 0.2s;
  }
  .top {
    top: 0;
    background: linear-gradient(var(--gl-photo-fade), transparent);
  }
  .hidden {
    opacity: 0;
    pointer-events: none;
  }
  .meta {
    display: grid;
    min-width: 0;
    font-size: var(--gl-size-meta);
  }
  .meta span {
    color: var(--gl-player-muted);
  }
</style>
