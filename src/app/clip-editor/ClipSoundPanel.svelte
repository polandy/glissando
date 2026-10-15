<script lang="ts">
  import {
    DEFAULT_VIDEO_VOLUME,
    MAX_VIDEO_VOLUME,
    VIDEO_VOLUME_STEP,
  } from "../../library/own-video";
  import { radioIndexForKey } from "../components/radio-keys";
  import SectionHead from "../components/SectionHead.svelte";
  import { getTranslator } from "../i18n/context";

  type Sound = "on" | "off";

  /**
   * A clip's sound: on or off, how loud, and whether the music gives way meanwhile. Off is
   * volume 0; switching on again returns to the volume it had.
   */
  let {
    volume,
    duckMusic,
    onVolume,
    onDuckMusic,
  }: {
    /** 0 to 100 in steps of 5; 0 is sound off. */
    volume: number;
    duckMusic: boolean;
    onVolume: (volume: number) => void;
    onDuckMusic: (duck: boolean) => void;
  } = $props();

  const { t } = getTranslator();
  // svelte-ignore state_referenced_locally
  let loudness = $state(volume > 0 ? volume : DEFAULT_VIDEO_VOLUME);
  $effect(() => {
    if (volume > 0) loudness = volume;
  });

  const sound = $derived<Sound>(volume > 0 ? "on" : "off");
  const SOUNDS: readonly Sound[] = ["on", "off"];
  const LABELS = { on: "clip.soundOn", off: "clip.soundOff" } as const;
  const radios: HTMLButtonElement[] = $state([]);
  const choose = (next: Sound): void => onVolume(next === "on" ? loudness : 0);

  // Selection follows focus, as in the WAI-ARIA radio group.
  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, SOUNDS.length);
    const target = next === null ? undefined : SOUNDS[next];
    if (next === null || target === undefined) return;
    event.preventDefault();
    choose(target);
    radios[next]?.focus();
  }
</script>

<section class="sound" aria-labelledby="clip-sound">
  <SectionHead id="clip-sound" title={t("clip.sound")} own={false} />
  <div class="seg" role="radiogroup" aria-label={t("clip.sound")}>
    {#each SOUNDS as option, index (option)}
      <button
        bind:this={radios[index]}
        type="button"
        role="radio"
        aria-checked={option === sound}
        tabindex={option === sound ? 0 : -1}
        onclick={() => choose(option)}
        onkeydown={(event) => onkeydown(event, index)}
      >
        {t(LABELS[option])}
      </button>
    {/each}
  </div>
  <label class="volume" class:off={sound === "off"}>
    <span class="name">
      {t("clip.volume")}
      <span class="mono">{t("clip.volumeValue", { percent: volume })}</span>
    </span>
    <input
      type="range"
      min="0"
      max={MAX_VIDEO_VOLUME}
      step={VIDEO_VOLUME_STEP}
      value={volume}
      disabled={sound === "off"}
      oninput={(event) => onVolume(Number(event.currentTarget.value))}
    />
  </label>
  <label class="duck" class:off={sound === "off"}>
    <input
      type="checkbox"
      checked={duckMusic}
      disabled={sound === "off"}
      onchange={(event) => onDuckMusic(event.currentTarget.checked)}
    />
    {t("clip.duck")}
  </label>
</section>

<style>
  .sound {
    display: grid;
    gap: 12px;
  }
  .seg {
    display: inline-flex;
    justify-self: start;
    padding: 3px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .seg button {
    min-width: 64px;
    min-height: 36px;
    padding: 0 14px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-muted);
    font: inherit;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
  .seg button[aria-checked="true"] {
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  .volume {
    display: grid;
    gap: 6px;
  }
  .name {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--gl-accent);
  }
  .duck {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
  }
  .duck input {
    accent-color: var(--gl-accent);
  }
  .off {
    opacity: 0.5;
  }
</style>
