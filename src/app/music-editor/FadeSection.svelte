<script lang="ts">
  import { MUSIC_FADE_CHOICES_MS } from "../../library/own-music";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import ResetButton from "../components/ResetButton.svelte";
  import SectionHead from "../components/SectionHead.svelte";
  import { radioIndexForKey } from "../components/radio-keys";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import type { FadeInReason, FadeOutReason, FadeView } from "./music-editor-view";

  /** A fade's three steps: off, short, long. Automatic until one is picked. */
  let {
    direction,
    fade,
    audibleEndMs,
    onFade,
    onReset,
  }: {
    direction: "in" | "out";
    fade: FadeView<FadeInReason | FadeOutReason>;
    /** Named when the slideshow ends the music early. */
    audibleEndMs: number;
    onFade: (fadeMs: number) => void;
    onReset: () => void;
  } = $props();

  const { t, formatSeconds, formatDuration } = getTranslator();
  const CHOICE_LABELS: readonly MessageKey[] = [
    "music.fadeOff",
    "music.fadeShort",
    "music.fadeLong",
  ];
  const TITLES = { in: "music.fadeIn", out: "music.fadeOut" } as const;
  const ICONS = { in: "fadeIn", out: "fadeOut" } as const;

  const radios: HTMLButtonElement[] = $state([]);
  const headId = $derived(`music-fade-${direction}`);
  const selected = $derived(MUSIC_FADE_CHOICES_MS.findIndex((ms) => ms === fade.ms));

  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, MUSIC_FADE_CHOICES_MS.length);
    const ms = next === null ? undefined : MUSIC_FADE_CHOICES_MS[next];
    if (next === null || ms === undefined) {
      return;
    }
    event.preventDefault();
    onFade(ms);
    radios[next]?.focus();
  }

  const reason = $derived(
    fade.reason === "slideshow-ends"
      ? t("music.reason-slideshow-ends", {
          time: formatDuration(audibleEndMs / MILLISECONDS_PER_SECOND),
        })
      : t(`music.reason-${fade.reason}`),
  );
</script>

<section class="section" aria-labelledby={headId}>
  <SectionHead
    id={headId}
    icon={ICONS[direction]}
    title={t(TITLES[direction])}
    stateText={fade.own ? t("music.fadeOwn") : t("music.fadeAutomatic")}
    own={fade.own}
  />
  <div class="choices" class:automatic={!fade.own} role="radiogroup" aria-labelledby={headId}>
    {#each MUSIC_FADE_CHOICES_MS as ms, index (ms)}
      {@const checked = index === selected}
      <button
        bind:this={radios[index]}
        type="button"
        role="radio"
        aria-checked={checked}
        tabindex={checked || (selected < 0 && index === 0) ? 0 : -1}
        onclick={() => onFade(ms)}
        onkeydown={(event) => onkeydown(event, index)}
      >
        {t(CHOICE_LABELS[index] as MessageKey)}
        <span class="mono"
          >{ms > 0 ? formatSeconds(ms / MILLISECONDS_PER_SECOND) : t("music.fadeNone")}</span
        >
      </button>
    {/each}
  </div>
  {#if fade.own}
    <div><ResetButton automatic={false} alreadyAutomatic="" {onReset} /></div>
  {:else}
    <p class="hint">{t("music.automaticBecause", { reason })}</p>
  {/if}
</section>

<style>
  .section {
    display: grid;
    gap: 10px;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .choices button {
    display: grid;
    justify-items: center;
    gap: 1px;
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
  .choices button span {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-regular);
  }
  .choices button[aria-checked="true"] {
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  /* The automatic choice is shown, not picked: dashed instead of raised. */
  .choices.automatic button[aria-checked="true"] {
    outline: 1.5px dashed var(--gl-faint);
    outline-offset: -1.5px;
    box-shadow: none;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
