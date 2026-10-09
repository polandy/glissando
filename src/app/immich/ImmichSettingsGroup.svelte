<script lang="ts">
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import ImmichGlyph from "./ImmichGlyph.svelte";
  import { immichSettings, PROBLEM_MESSAGES } from "./immich-view";

  /** The settings' read-only Immich group: the key lives on the server (ADR-0013). */
  let {
    state,
    onCheck,
    onReload,
  }: { state: ImmichAvailabilityState; onCheck: () => void; onReload: () => void } = $props();

  const SETUP_GUIDE = "https://github.com/polandy/glissando/blob/main/docs/self-hosting.md";
  const { t } = getTranslator();
  const view = $derived(immichSettings(state));
</script>

<section class="group">
  <div class="eyebrow">{t("immich.name")}</div>
  <div class="box">
    <div class="conn">
      <ImmichGlyph dimmed={view.kind === "notSetUp" || view.kind === "checking"} />
      <div class="text">
        {#if view.kind === "checking"}
          <span>{t("immich.checking")}</span>
        {:else if view.kind === "available"}
          <b>{t("immich.throughServer")}</b>
          <span>
            {t("immich.serverDetails", { version: view.version, count: view.albumCount })}
          </span>
        {:else if view.kind === "notSetUp"}
          <b>{t("immich.notSetUp")}</b>
          <span>{t("immich.notSetUpText")}</span>
        {:else}
          <b>{t("immich.throughServer")}</b>
          <span>{t("immich.unusable")}</span>
        {/if}
      </div>
    </div>
    {#if view.kind === "notSetUp"}
      <div>
        <a class="btn small" href={SETUP_GUIDE} target="_blank" rel="noopener noreferrer">
          {t("immich.howToSetUp")}
        </a>
      </div>
    {:else if view.kind === "problem"}
      <Notice tone="error">{t(PROBLEM_MESSAGES[view.problem])}</Notice>
      <div>
        {#if view.remedy === "reload"}
          <button class="btn small" type="button" onclick={onReload}>{t("immich.reload")}</button>
        {:else}
          <button class="btn small" type="button" onclick={onCheck}>
            {t("immich.checkAgain")}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .group {
    display: grid;
    gap: 8px;
  }
  .box {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
  }
  .conn {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .text b {
    font-weight: var(--gl-weight-semibold);
  }
  .text span {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  a.btn {
    text-decoration: none;
  }
</style>
