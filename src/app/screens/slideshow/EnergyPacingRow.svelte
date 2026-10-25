<script lang="ts">
  import Switch from "../../components/Switch.svelte";
  import { getTranslator } from "../../i18n/context";

  /**
   * The info panel's "Follow the music's energy" row, right under "Picture times" while the
   * slideshow has music (ADR-0046): the same `role="switch"` as the Mood sheet's, storing at
   * once through the same path, so either switch always shows the other's state.
   */
  let { on, onChange }: { on: boolean; onChange: (on: boolean) => void } = $props();

  const { t } = getTranslator();
</script>

<div>
  <dt>
    <b>{t("mood.energySwitch")}</b>
    <small>{t("mood.energySwitchPanelSubtitle")}</small>
  </dt>
  <dd>
    <Switch checked={on} label={t("mood.energySwitch")} {onChange} />
  </dd>
</div>

<style>
  div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid var(--gl-line);
  }
  dt {
    display: grid;
    gap: 2px;
    color: var(--gl-ink);
  }
  dt b {
    font-weight: var(--gl-weight-medium);
  }
  dt small {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
