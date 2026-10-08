<script lang="ts">
  import { UnreadableMusicError } from "../../import/music-probe";
  import { DEFAULT_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
  import SecondsStepper from "../components/SecondsStepper.svelte";
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";
  import DropZone from "./DropZone.svelte";
  import ImportFrame from "./ImportFrame.svelte";
  import type { ImportSession } from "./import-session";
  import { importTiming, musicFormatLabel } from "./import-view";

  let {
    session,
    onBack,
    onCreate,
    onError,
    onMusicUnreadable,
  }: {
    session: ImportSession;
    onBack: () => void;
    onCreate: () => void;
    onError: (error: unknown) => void;
    /** `retry` opens the music picker again. */
    onMusicUnreadable: (retry: () => void) => void;
  } = $props();

  const MILLISECONDS_PER_SECOND = 1000;
  const MUSIC_TYPES = "audio/*";
  const { t, formatDuration, formatSeconds } = getTranslator();

  // The session is fixed for the step's lifetime.
  // svelte-ignore state_referenced_locally
  let choices = $state.raw(session.choices.current());
  // svelte-ignore state_referenced_locally
  let pictureCount = $state(session.pictures.state.pictures.length);
  let pickMusic: HTMLInputElement;

  $effect(() => session.choices.subscribe((next) => (choices = next)));
  $effect(() => session.pictures.subscribe((next) => (pictureCount = next.pictures.length)));

  const timing = $derived(
    importTiming(pictureCount, choices.music?.durationMs, choices.secondsPerPicture),
  );

  function choose(files: readonly File[]): void {
    const file = files[0];
    if (file === undefined) {
      return;
    }
    session.chooseMusic(file).catch((error: unknown) => {
      if (error instanceof UnreadableMusicError) {
        onMusicUnreadable(() => pickMusic.click());
      } else {
        onError(error);
      }
    });
  }

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    choose([...(event.currentTarget.files ?? [])]);
    // Cleared so that picking the same file again still reports a change.
    event.currentTarget.value = "";
  }
</script>

<input bind:this={pickMusic} type="file" accept={MUSIC_TYPES} hidden onchange={picked} />

<ImportFrame step="music" {onBack}>
  <h1>{t("import.musicTitle")}</h1>
  <p class="muted">
    {t("import.musicText", { seconds: formatSeconds(DEFAULT_SECONDS_PER_PICTURE) })}
  </p>

  {#if choices.music}
    {@const file = choices.music.file}
    <div class="card track">
      <span class="note" aria-hidden="true">{ICONS.music}</span>
      <div class="text">
        <b>{file.name}</b>
        <span class="muted">
          {t("import.trackMeta", {
            duration: formatDuration(choices.music.durationMs / MILLISECONDS_PER_SECOND),
            format: musicFormatLabel(file.name, file.type),
          })}
        </span>
      </div>
      <button
        class="remove"
        type="button"
        title={t("import.removeMusic")}
        aria-label={t("import.removeMusic")}
        onclick={() => session.removeMusic()}
      >
        {ICONS.close}
      </button>
    </div>
  {:else}
    <DropZone icon={ICONS.musicFile} onFiles={choose} {onError}>
      <button class="btn lemon" type="button" onclick={() => pickMusic.click()}>
        {t("import.pickMusic")}
      </button>
      <span class="muted formats">{t("import.musicFormats")}</span>
    </DropZone>
    <div class="card track seconds">
      <div class="text">
        <b>{t("import.secondsTitle")}</b>
        <span class="muted">
          {t("import.secondsHint", { seconds: formatSeconds(DEFAULT_SECONDS_PER_PICTURE) })}
        </span>
      </div>
      <SecondsStepper
        seconds={choices.secondsPerPicture}
        onChange={(seconds) => session.setSecondsPerPicture(seconds)}
      />
    </div>
  {/if}

  <dl class="timing">
    <div>
      <dt>{t("import.timingPictures")}</dt>
      <dd>{pictureCount}</dd>
    </div>
    <div>
      <dt>{t("import.timingPerPicture")}</dt>
      <dd>{formatSeconds(timing.perPictureSeconds)}</dd>
    </div>
    <div>
      <dt>{t("import.timingTotal")}</dt>
      <dd>{formatDuration(timing.totalSeconds)}</dd>
    </div>
  </dl>

  {#snippet actions()}
    <button class="btn" type="button" onclick={onBack}>
      <span aria-hidden="true">{ICONS.back}</span>{t("import.backToPictures")}
    </button>
    <button class="btn primary" type="button" onclick={onCreate}>
      {choices.music ? t("import.create") : t("import.createWithoutMusic")}
    </button>
  {/snippet}
</ImportFrame>

<style>
  .formats {
    font-size: var(--gl-size-caption);
  }
  .track {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
  }
  .seconds {
    margin-top: 12px;
  }
  .text {
    min-width: 0;
  }
  .text b {
    display: block;
    overflow: hidden;
    font-weight: var(--gl-weight-heading);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .seconds :global(.stepper) {
    margin-left: auto;
  }
  .note {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: var(--gl-radius-thumb);
    background: var(--gl-lemon);
    color: var(--gl-on-accent);
    font-size: var(--gl-size-icon);
  }
  .remove {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: var(--gl-muted);
    font: inherit;
    font-size: var(--gl-size-title);
    cursor: pointer;
  }
  .timing {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 12px 0 0;
    text-align: center;
  }
  .timing div {
    display: flex;
    flex-direction: column-reverse;
    padding: 10px 6px;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-surface);
  }
  .timing dd {
    margin: 0;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-title);
  }
  .timing dt {
    color: var(--gl-muted);
    font-size: var(--gl-size-caption);
  }
</style>
