<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";
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
    class="btn"
    type="button"
    aria-label={t("import.secondsShorter")}
    disabled={!canStep(seconds, "shorter")}
    onclick={() => step("shorter")}
  >
    {ICONS.minus}
  </button>
  <b aria-live="polite">{formatSeconds(seconds)}</b>
  <button
    class="btn"
    type="button"
    aria-label={t("import.secondsLonger")}
    disabled={!canStep(seconds, "longer")}
    onclick={() => step("longer")}
  >
    {ICONS.plus}
  </button>
</div>

<style>
  .stepper {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px;
  }
  .btn {
    padding: 6px 14px;
  }
  b {
    min-width: 48px;
    font-weight: var(--gl-weight-heading);
    text-align: center;
  }
</style>
