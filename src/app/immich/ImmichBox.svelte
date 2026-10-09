<script lang="ts">
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import ImmichGlyph from "./ImmichGlyph.svelte";
  import { immichBox, PROBLEM_MESSAGES } from "./immich-view";

  /** Step 1's way into Immich; hidden while unknown or where this Glissando has no Immich. */
  let {
    state,
    onOpen,
    onSettings,
  }: { state: ImmichAvailabilityState; onOpen: () => void; onSettings: () => void } = $props();

  const { t } = getTranslator();
  const box = $derived(immichBox(state));
</script>

{#if box.kind !== "hidden"}
  <div class="box" class:off={box.kind !== "open"}>
    <ImmichGlyph dimmed={box.kind !== "open"} />
    <div class="text">
      <b>{t("immich.sourceTitle")}</b>
      {#if box.kind === "open"}
        <span>{t("immich.sourceText")}</span>
      {:else if box.kind === "offline"}
        <span><i class="offline-dot"></i>{t("immich.offlineText")}</span>
      {:else}
        <span>{t(PROBLEM_MESSAGES[box.problem])} {t("immich.detailsInSettings")}</span>
      {/if}
    </div>
    {#if box.kind === "open"}
      <button class="btn" type="button" onclick={onOpen}>
        {t("immich.open")}<Icon name="chevronRight" />
      </button>
    {:else if box.kind === "offline"}
      <button class="btn" type="button" disabled>
        <Icon name="cloudOff" />{t("immich.open")}
      </button>
    {:else}
      <button class="btn" type="button" onclick={onSettings}>
        <Icon name="gear" />{t("settings.open")}
      </button>
    {/if}
  </div>
{/if}

<style>
  .box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-raised);
  }
  .text {
    flex: 1;
    display: grid;
    gap: 2px;
    min-width: 180px;
    font-size: var(--gl-size-body);
  }
  .text b {
    font-weight: var(--gl-weight-semibold);
  }
  .text span {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .offline-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    background: var(--gl-faint);
    vertical-align: 1px;
  }
  @container (max-width: 720px) {
    .box .btn {
      width: 100%;
    }
  }
</style>
