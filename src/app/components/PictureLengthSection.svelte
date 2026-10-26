<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { OWN_SECONDS_PICTURE_LENGTH, type PictureLength } from "../../library/picture-length";
  import { getTranslator } from "../i18n/context";
  import { radioIndexForKey } from "./radio-keys";
  import SecondsStepper from "./SecondsStepper.svelte";
  import SectionHead from "./SectionHead.svelte";

  /**
   * Whether the pictures without an own duration last their own seconds, set by the stepper, or
   * fill the music (ADR-0022); in the music editor and the new slideshow's music step. While
   * `fittedShareMs` is set, they instead shrink to end with a shorter music (ADR-0047).
   */
  let {
    ownSeconds,
    secondsPerPicture,
    fittedShareMs,
    onPictureLength,
    onSecondsPerPicture,
  }: {
    /** The pictures last `secondsPerPicture` each; otherwise they fill the music. */
    ownSeconds: boolean;
    secondsPerPicture: number;
    /** The mean shrunk share, while the automatic pictures fit a shorter music (ADR-0047). */
    fittedShareMs?: number | undefined;
    /** `undefined`: they fill the music. */
    onPictureLength: (length: PictureLength | undefined) => void;
    onSecondsPerPicture: (seconds: number) => void;
  } = $props();

  const { t, formatSeconds, formatTenthSeconds } = getTranslator();
  const HEAD_ID = "music-picture-length";
  const CHOICES = [OWN_SECONDS_PICTURE_LENGTH, undefined] as const;

  const radios: HTMLButtonElement[] = $state([]);
  const selected = $derived(ownSeconds ? 0 : 1);

  function label(choice: PictureLength | undefined): string {
    return choice === undefined
      ? t("music.fillTheMusic")
      : t("music.aboutSecondsEach", { seconds: formatSeconds(secondsPerPicture) });
  }

  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, CHOICES.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    onPictureLength(CHOICES[next]);
    radios[next]?.focus();
  }
</script>

<section class="section" aria-labelledby={HEAD_ID}>
  <SectionHead id={HEAD_ID} icon="clock" title={t("music.pictureLength")} own={false} />
  <div class="choices" role="radiogroup" aria-labelledby={HEAD_ID}>
    {#each CHOICES as choice, index (index)}
      {@const checked = index === selected}
      <button
        bind:this={radios[index]}
        type="button"
        role="radio"
        aria-checked={checked}
        tabindex={checked ? 0 : -1}
        onclick={() => onPictureLength(choice)}
        onkeydown={(event) => onkeydown(event, index)}
      >
        {label(choice)}
      </button>
    {/each}
  </div>
  {#if ownSeconds}
    <SecondsStepper seconds={secondsPerPicture} onChange={onSecondsPerPicture} />
  {/if}
  {#if fittedShareMs !== undefined}
    <p class="fitted">
      {t("music.pictureLengthFitted", {
        seconds: formatTenthSeconds(fittedShareMs / MILLISECONDS_PER_SECOND),
      })}
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
  .fitted {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
