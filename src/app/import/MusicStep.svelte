<script lang="ts">
  import { onDestroy } from "svelte";
  import { slideDurationsMs } from "../../compose";
  import { UnreadableMusicError } from "../../import/music-probe";
  import { DEFAULT_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import SecondsStepper from "../components/SecondsStepper.svelte";
  import { getTranslator } from "../i18n/context";
  import Icon from "../components/Icon.svelte";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import DropZone from "./DropZone.svelte";
  import ImportFrame from "./ImportFrame.svelte";
  import type { ImportSession } from "./import-session";
  import { importTiming, musicFormatLabel } from "./import-view";

  let {
    session,
    loadThumbnail,
    onBack,
    onCreate,
    onError,
    onMusicUnreadable,
  }: {
    session: ImportSession;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onBack: () => void;
    onCreate: () => void;
    onError: (error: unknown) => void;
    /** `retry` opens the music picker again. */
    onMusicUnreadable: (retry: () => void) => void;
  } = $props();

  const MUSIC_TYPES = "audio/*";
  const { t, formatDuration, formatSeconds } = getTranslator();

  // The session and the loader are fixed for the step's lifetime.
  // svelte-ignore state_referenced_locally
  let choices = $state.raw(session.choices.current());
  // svelte-ignore state_referenced_locally
  let pictureIds = $state.raw(session.pictures.state.pictures.map((picture) => picture.id));
  let urls = $state<ReadonlyMap<string, string>>(new Map());
  let pickMusic: HTMLInputElement;

  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({ ...browserObjectUrls, load: loadThumbnail, onError });
  onDestroy(() => thumbnails.dispose());

  $effect(() => session.choices.subscribe((next) => (choices = next)));
  $effect(() =>
    session.pictures.subscribe((next) => (pictureIds = next.pictures.map((picture) => picture.id))),
  );
  $effect(() => thumbnails.subscribe((next) => (urls = next)));
  $effect(() => thumbnails.sync(choices.music ? pictureIds : []));

  const pictureCount = $derived(pictureIds.length);
  const timing = $derived(
    importTiming(pictureCount, choices.music?.durationMs, choices.secondsPerPicture),
  );
  // Each picture's share of the track, by the rule the slideshow is composed with.
  const segmentsMs = $derived(
    slideDurationsMs(pictureCount, choices.music?.durationMs, choices.secondsPerPicture),
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
  <div>
    <h1 class="title">{t("import.musicTitle")}</h1>
    <p class="lead">
      {t("import.musicText", { seconds: formatSeconds(DEFAULT_SECONDS_PER_PICTURE) })}
    </p>
  </div>

  {#if choices.music}
    {@const file = choices.music.file}
    <div class="panel">
      <div class="track">
        <span class="art"><Icon name="music" /></span>
        <div class="text">
          <b>{file.name}</b>
          <span class="muted mono meta">
            {t("import.trackMeta", {
              duration: formatDuration(choices.music.durationMs / MILLISECONDS_PER_SECOND),
              format: musicFormatLabel(file.name, file.type),
            })}
          </span>
        </div>
        <button
          class="icon-btn"
          type="button"
          title={t("import.removeMusic")}
          aria-label={t("import.removeMusic")}
          onclick={() => session.removeMusic()}
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="fit" aria-hidden="true">
        <div class="segments">
          {#each pictureIds as id, index (id)}
            {@const url = urls.get(id)}
            <i
              style:flex-grow={segmentsMs[index]}
              style:background-image={url === undefined ? undefined : `url("${url}")`}
            ></i>
          {/each}
        </div>
        <div class="fitline mono">
          <span>{formatDuration(0)}</span>
          <span>
            {t("import.fitPerPicture", {
              count: pictureCount,
              seconds: formatSeconds(timing.perPictureSeconds),
            })}
          </span>
          <span>{formatDuration(timing.totalSeconds)}</span>
        </div>
      </div>
    </div>
  {:else}
    <DropZone icon="music" onFiles={choose} {onError}>
      <button class="btn primary" type="button" onclick={() => pickMusic.click()}>
        {t("import.pickMusic")}
      </button>
      <span class="formats">{t("import.musicFormats")}</span>
    </DropZone>
    <div class="panel track">
      <div class="text">
        <b>{t("import.secondsTitle")}</b>
        <span class="muted meta">
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
      <dd class="mono">{pictureCount}</dd>
    </div>
    <div>
      <dt>{t("import.timingPerPicture")}</dt>
      <dd class="mono">{formatSeconds(timing.perPictureSeconds)}</dd>
    </div>
    <div>
      <dt>{t("import.timingTotal")}</dt>
      <dd class="mono">{formatDuration(timing.totalSeconds)}</dd>
    </div>
  </dl>

  {#snippet actions()}
    <button class="btn" type="button" onclick={onBack}>
      <Icon name="back" />{t("import.backToPictures")}
    </button>
    <button class="btn primary" type="button" onclick={onCreate}>
      {choices.music ? t("import.create") : t("import.createWithoutMusic")}
    </button>
  {/snippet}
</ImportFrame>

<style>
  .formats {
    font-size: var(--gl-size-small);
    color: var(--gl-faint);
  }
  .panel {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .track {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .text b {
    display: block;
    overflow: hidden;
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: var(--gl-size-meta);
  }
  .art {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: var(--gl-radius);
    background: linear-gradient(135deg, var(--gl-lemon), var(--gl-logo-peach));
    color: var(--gl-art-ink);
  }
  .fit {
    display: grid;
    gap: 6px;
  }
  .segments {
    display: flex;
    gap: 2px;
    height: 26px;
  }
  .segments i {
    flex-basis: 0;
    min-width: 0;
    border-radius: 3px;
    background-color: var(--gl-hover);
    background-position: center;
    background-size: cover;
  }
  .fitline {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .timing {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
  }
  .timing div {
    display: flex;
    flex-direction: column-reverse;
    gap: 2px;
    padding: 10px 12px;
    background: var(--gl-raised);
  }
  .timing div + div {
    border-left: 1px solid var(--gl-line);
  }
  .timing dd {
    margin: 0;
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-name);
  }
  .timing dt {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
