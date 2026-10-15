<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import Switch from "../components/Switch.svelte";
  import { getTranslator } from "../i18n/context";

  /** Settings' picture frame section (`dev-docs/app/SETTINGS.md`). */
  let {
    cardShown,
    onSetUp,
    onCardShown,
  }: {
    cardShown: boolean;
    onSetUp: () => void;
    onCardShown: (shown: boolean) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<section class="group" aria-label={t("settings.frame")}>
  <div class="eyebrow">{t("settings.frame")}</div>
  <button class="row setup" type="button" onclick={onSetUp}>
    <span class="grow"><b>{t("settings.frameSetUp")}</b></span>
    <Icon name="chevronRight" />
  </button>
  <div class="row">
    <div class="grow">
      <b>{t("settings.frameShowCard")}</b>
      <small>{t(cardShown ? "settings.frameShowCardOn" : "settings.frameShowCardOff")}</small>
    </div>
    <Switch checked={cardShown} label={t("settings.frameShowCard")} onChange={onCardShown} />
  </div>
</section>

<style>
  .group {
    display: grid;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    text-align: start;
  }
  .setup {
    cursor: pointer;
  }
  .setup:hover {
    border-color: var(--gl-ink);
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    margin-top: 2px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
