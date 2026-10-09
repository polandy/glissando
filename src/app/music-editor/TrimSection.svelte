<script lang="ts">
  import type { MusicTrim } from "../../library/own-music";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import Icon from "../components/Icon.svelte";
  import ResetButton from "../components/ResetButton.svelte";
  import SectionHead from "../components/SectionHead.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MusicEditorView } from "./music-editor-view";
  import {
    canStepTrimEdge,
    stepTrimEdge,
    type TrimEdge,
    type TrimStepDirection,
  } from "./trim-edges";

  /** The excerpt's start and end, each with − and + for half seconds; "Whole track" resets. */
  let {
    music,
    onTrim,
    onReset,
  }: {
    music: MusicEditorView;
    onTrim: (trim: MusicTrim) => void;
    onReset: () => void;
  } = $props();

  const { t, formatTenths, formatDuration } = getTranslator();
  const EDGES: readonly TrimEdge[] = ["start", "end"];
  const EDGE_LABELS = { start: "music.start", end: "music.end" } as const;
  const STEP_LABELS = { earlier: "music.earlier", later: "music.later" } as const;
  const STEP_ICONS = { earlier: "minus", later: "plus" } as const;
  const DIRECTIONS: readonly TrimStepDirection[] = ["earlier", "later"];

  const trim = $derived({ startMs: music.startMs, endMs: music.endMs });

  function step(edge: TrimEdge, direction: TrimStepDirection): void {
    if (canStepTrimEdge(trim, edge, direction, music.durationMs)) {
      onTrim(stepTrimEdge(trim, edge, direction, music.durationMs));
    }
  }
</script>

<section class="section" aria-labelledby="music-excerpt">
  <SectionHead
    id="music-excerpt"
    title={t("music.excerpt")}
    stateText={music.trimmed ? t("music.trimmed") : t("music.wholeTrack")}
    own={music.trimmed}
  />
  <div class="edges">
    {#each EDGES as edge (edge)}
      {@const atMs = edge === "start" ? music.startMs : music.endMs}
      <div class="edge">
        <span class="muted">{t(EDGE_LABELS[edge])}</span>
        <div class="stepper">
          {#each DIRECTIONS as direction, index (direction)}
            <button
              type="button"
              aria-label={t(STEP_LABELS[direction], { edge: t(EDGE_LABELS[edge]) })}
              aria-disabled={!canStepTrimEdge(trim, edge, direction, music.durationMs)}
              onclick={() => step(edge, direction)}
            >
              <Icon name={STEP_ICONS[direction]} />
            </button>
            {#if index === 0}
              <output class="mono">{formatTenths(atMs / MILLISECONDS_PER_SECOND)}</output>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
  {#if music.trimmed}
    <div>
      <ResetButton automatic={false} alreadyAutomatic="" label={t("music.wholeTrack")} {onReset} />
    </div>
  {:else}
    <p class="hint">
      {t("music.wholeTrackHint", {
        duration: formatDuration(music.durationMs / MILLISECONDS_PER_SECOND),
      })}
    </p>
  {/if}
</section>

<style>
  .section {
    display: grid;
    gap: 10px;
  }
  .edges {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .edge {
    display: grid;
    gap: 5px;
    font-size: var(--gl-size-meta);
  }
  .stepper {
    display: grid;
    grid-template-columns: 34px 1fr 34px;
    align-items: center;
    gap: 4px;
    padding: 3px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .stepper button {
    display: grid;
    place-items: center;
    height: 34px;
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
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-medium);
    text-align: center;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
