<script lang="ts">
  import { MAX_OWN_DURATION_MS, MIN_OWN_DURATION_MS } from "../../library/own-timing";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { PictureEditorView } from "./picture-editor-view";
  import ResetButton from "../components/ResetButton.svelte";
  import SectionHead from "../components/SectionHead.svelte";
  import { canStepDuration, stepDurationMs, type StepDirection } from "./timing/duration-step";

  /** How long the picture shows: automatic until − or + makes it the picture's own. */
  let {
    picture,
    onDuration,
    onReset,
  }: {
    picture: PictureEditorView;
    /** An own duration in whole milliseconds, on the half-second grid. */
    onDuration: (durationMs: number) => void;
    onReset: () => void;
  } = $props();

  const { t, formatTenthSeconds } = getTranslator();
  const seconds = (ms: number) => formatTenthSeconds(ms / MILLISECONDS_PER_SECOND);
  const STEP_LABELS = {
    shorter: "editor.durationShorter",
    longer: "editor.durationLonger",
  } as const;
  const STEP_ICONS = { shorter: "minus", longer: "plus" } as const;

  const hint = $derived.by(() => {
    const basis = picture.durationBasis;
    if (basis.kind === "seconds-per-picture") {
      return picture.ownDuration
        ? t("editor.durationHintOwn", { duration: seconds(basis.automaticMs) })
        : t("editor.durationHintAutomatic");
    }
    if (!picture.ownDuration) {
      return t("editor.durationHintMusic", { count: basis.automaticCount });
    }
    if (basis.shareMs === null) {
      return t("editor.durationHintAllOwn");
    }
    const key = basis.clamped ? "editor.durationHintMusicClamped" : "editor.durationHintMusicOwn";
    return t(key, { count: basis.automaticCount, share: seconds(basis.shareMs) });
  });

  function step(direction: StepDirection): void {
    if (canStepDuration(picture.durationMs, direction)) {
      onDuration(stepDurationMs(picture.durationMs, direction));
    }
  }
</script>

{#snippet stepButton(direction: StepDirection)}
  <button
    type="button"
    aria-label={t(STEP_LABELS[direction])}
    aria-disabled={!canStepDuration(picture.durationMs, direction)}
    onclick={() => step(direction)}
  >
    <Icon name={STEP_ICONS[direction]} />
  </button>
{/snippet}

<section class="timing" aria-labelledby="duration-label">
  <SectionHead
    id="duration-label"
    title={t("editor.duration")}
    stateText={picture.ownDuration ? t("editor.ownDuration") : t("editor.automatic")}
    own={picture.ownDuration}
  />
  <div class="stepper" role="group" aria-labelledby="duration-label">
    {@render stepButton("shorter")}
    <output class="mono" aria-live="polite">{seconds(picture.durationMs)}</output>
    {@render stepButton("longer")}
  </div>
  <p class="hint">
    {hint}
    {t("editor.durationRange", {
      min: MIN_OWN_DURATION_MS / MILLISECONDS_PER_SECOND,
      max: MAX_OWN_DURATION_MS / MILLISECONDS_PER_SECOND,
    })}
  </p>
  <div>
    <ResetButton
      automatic={!picture.ownDuration}
      alreadyAutomatic={t("editor.durationAlreadyAutomatic")}
      {onReset}
    />
  </div>
</section>

<style>
  .timing {
    display: grid;
    gap: 12px;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .stepper {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .stepper button {
    display: grid;
    place-items: center;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
    cursor: pointer;
  }
  .stepper button[aria-disabled="true"] {
    background: transparent;
    color: var(--gl-faint);
    box-shadow: none;
    cursor: default;
  }
  output {
    font-size: var(--gl-size-name);
    font-weight: var(--gl-weight-medium);
    text-align: center;
  }
</style>
