<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import Icon from "./Icon.svelte";
  import { canStep, stepSeconds, type StepDirection } from "./seconds-step";

  /** Seconds per picture without music, in half-second steps within the allowed range. */
  let { seconds, onChange }: { seconds: number; onChange: (seconds: number) => void } = $props();

  const { t, formatSeconds } = getTranslator();

  function step(direction: StepDirection): void {
    onChange(stepSeconds(seconds, direction));
  }
</script>

<div class="stepper">
  <button
    class="btn stepper-btn"
    type="button"
    aria-label={t("import.secondsShorter")}
    disabled={!canStep(seconds, "shorter")}
    onclick={() => step("shorter")}
  >
    <Icon name="minus" />
  </button>
  <b class="mono" aria-live="polite">{formatSeconds(seconds)}</b>
  <button
    class="btn stepper-btn"
    type="button"
    aria-label={t("import.secondsLonger")}
    disabled={!canStep(seconds, "longer")}
    onclick={() => step("longer")}
  >
    <Icon name="plus" />
  </button>
</div>

<style>
  .stepper {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px;
  }
  .stepper-btn {
    width: 38px;
    padding: 0;
  }
  b {
    min-width: 56px;
    font-weight: var(--gl-weight-medium);
    text-align: center;
  }
</style>
