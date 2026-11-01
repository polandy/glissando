<script lang="ts">
  import { EVEN_PICTURE_CHANGES, type PictureChanges } from "../../library/own-music";
  import { radioIndexForKey } from "../components/radio-keys";
  import { getTranslator } from "../i18n/context";
  import InfoHead from "./InfoHead.svelte";
  import type { PictureChangesView } from "./picture-changes-view";

  /**
   * Whether the automatic picture changes land on the music's beats or share it evenly; while the
   * beats are listened for, or the music has none, it says so and offers no choice (ADR-0021).
   */
  let {
    view,
    onPictureChanges,
  }: {
    view: PictureChangesView;
    /** `undefined`: on the beat. */
    onPictureChanges: (changes: PictureChanges | undefined) => void;
  } = $props();

  const { t, formatList, formatSeconds } = getTranslator();
  const HEAD_ID = "music-picture-changes";
  const CHOICES = [
    { changes: undefined, label: "music.onTheBeat" },
    { changes: EVEN_PICTURE_CHANGES, label: "music.evenly" },
  ] as const;
  /** While the pictures fill the music, and while they last their own seconds. */
  const STATUS_TEXTS = {
    listening: ["music.listeningForBeat", "music.listeningForBeatSeconds"],
    undecodable: ["music.musicUndecodable", "music.musicUndecodableSeconds"],
    none: ["music.noSteadyBeat", "music.noSteadyBeatSeconds"],
  } as const;

  const radios: HTMLButtonElement[] = $state([]);
  const selected = $derived(view.kind === "beats" && !view.onTheBeat ? 1 : 0);

  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, CHOICES.length);
    const choice = next === null ? undefined : CHOICES[next];
    if (next === null || choice === undefined) {
      return;
    }
    event.preventDefault();
    onPictureChanges(choice.changes);
    radios[next]?.focus();
  }
</script>

<section class="section" aria-labelledby={HEAD_ID}>
  <InfoHead
    id={HEAD_ID}
    icon="transition"
    title={t("music.pictureChanges")}
    infoLabel={t("music.infoPictureChanges")}
    {...view.kind === "beats"
      ? { stateText: t("music.beatsPerMinute", { bpm: view.beatsPerMinute }) }
      : {}}
  >
    <p>{t("music.onTheBeatHint")}</p>
    {#if view.kind === "beats" && view.ownDurationNumbers.length > 0}
      <p>
        {t("music.ownDurationsOffBeat", {
          count: view.ownDurationNumbers.length,
          pictures: formatList(view.ownDurationNumbers.map(String)),
        })}
      </p>
    {/if}
    <p>
      {view.kind === "beats" && view.secondsPerPicture !== undefined
        ? t("music.evenlyHintSeconds", { seconds: formatSeconds(view.secondsPerPicture) })
        : t("music.evenlyHint")}
    </p>
  </InfoHead>
  {#if view.kind === "beats"}
    <div class="choices" role="radiogroup" aria-labelledby={HEAD_ID}>
      {#each CHOICES as choice, index (choice.label)}
        {@const checked = index === selected}
        <button
          bind:this={radios[index]}
          type="button"
          role="radio"
          aria-checked={checked}
          tabindex={checked ? 0 : -1}
          onclick={() => onPictureChanges(choice.changes)}
          onkeydown={(event) => onkeydown(event, index)}
        >
          {t(choice.label)}
        </button>
      {/each}
    </div>
  {:else}
    <p class="hint">
      {#if view.kind === "listening"}<span class="pulse" aria-hidden="true"></span>{/if}
      {#if view.secondsPerPicture === undefined}
        {t(STATUS_TEXTS[view.kind][0])}
      {:else}
        {t(STATUS_TEXTS[view.kind][1], { seconds: formatSeconds(view.secondsPerPicture) })}
      {/if}
    </p>
  {/if}
</section>

<style>
  .section {
    display: grid;
    gap: 10px;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .choices button {
    padding: 7px 6px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .choices button[aria-checked="true"] {
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  /* Listening: a dot that breathes; still under reduced motion. */
  .pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    background: var(--gl-accent);
    animation: breathe 1s ease-in-out infinite alternate;
  }
  @keyframes breathe {
    to {
      opacity: 0.25;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none;
    }
  }
</style>
