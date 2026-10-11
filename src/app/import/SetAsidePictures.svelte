<script lang="ts">
  import { flushSync } from "svelte";
  import type { StoredPicture } from "../../library/stored-slideshow";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { SetAsideGroup } from "./picture-culling";

  /**
   * The pictures the check set aside, below the strip: per similar group with its kept picture, then the
   * blurry ones. Each + takes one in; "Take all in" undoes the whole cull.
   */
  let {
    groups,
    count,
    pictures,
    urls,
    onTakeIn,
    onTakeAllIn,
    onEmptied,
  }: {
    groups: readonly SetAsideGroup[];
    count: number;
    /** The import's pictures, where a similar group's kept one is unless it was removed. */
    pictures: readonly StoredPicture[];
    /** Thumbnail URLs by picture id; a tile without one shimmers. */
    urls: ReadonlyMap<string, string>;
    onTakeIn: (pictureId: string) => void;
    onTakeAllIn: () => void;
    /** The last set-aside picture was taken in, `pictureId` the latest: no + is left to focus. */
    onEmptied: (pictureId: string) => void;
  } = $props();

  const { t, formatDate, formatTime, formatMinuteRange } = getTranslator();
  const HEADING_ID = "set-aside-heading";
  let section: HTMLElement | undefined = $state();

  const keptPicture = (keptId: string): StoredPicture | undefined =>
    pictures.find((picture) => picture.id === keptId);

  /** The group's shown pictures, kept or set aside, from the earliest to the latest. */
  const byCaptureTime = (
    kept: StoredPicture | undefined,
    similar: readonly StoredPicture[],
  ): StoredPicture[] =>
    [...(kept === undefined ? [] : [kept]), ...similar].sort(
      (first, second) => Date.parse(first.capturedAt) - Date.parse(second.capturedAt),
    );

  /** Focus goes to the next picture's +, the previous one at the end. */
  function takeIn(pictureId: string): void {
    const buttons = [...(section?.querySelectorAll<HTMLButtonElement>("button.take") ?? [])];
    const index = buttons.findIndex((button) => button.dataset["pictureId"] === pictureId);
    onTakeIn(pictureId);
    flushSync();
    const left = section?.querySelectorAll<HTMLButtonElement>("button.take") ?? [];
    const next = left[Math.min(index, left.length - 1)];
    if (next === undefined) {
      onEmptied(pictureId);
    } else {
      next.focus();
    }
  }

  function takeAllIn(): void {
    const latest = groups
      .flatMap(({ pictures: setAside }) => setAside)
      .reduce<StoredPicture | undefined>(
        (found, picture) =>
          found === undefined || Date.parse(picture.capturedAt) > Date.parse(found.capturedAt)
            ? picture
            : found,
        undefined,
      );
    onTakeAllIn();
    flushSync();
    if (latest !== undefined) onEmptied(latest.id);
  }
</script>

{#snippet tile(picture: StoredPicture, chip: string, kept: boolean)}
  <li class="tile" class:kept class:pending={!urls.has(picture.id)}>
    {#if urls.has(picture.id)}
      <img src={urls.get(picture.id)} alt="" class:faded={!kept} />
    {/if}
    <span class="date mono">{formatTime(picture.capturedAt)}</span>
    <span class="chip" class:kept>{chip}</span>
    {#if !kept}
      <button
        class="take"
        type="button"
        data-picture-id={picture.id}
        aria-label={t("cull.takeIn", {
          date: formatDate(picture.capturedAt),
          time: formatTime(picture.capturedAt),
        })}
        title={t("cull.takeIn", {
          date: formatDate(picture.capturedAt),
          time: formatTime(picture.capturedAt),
        })}
        onclick={() => takeIn(picture.id)}
      >
        <Icon name="plus" />
      </button>
    {/if}
  </li>
{/snippet}

<section class="aside" aria-labelledby={HEADING_ID} bind:this={section}>
  <div class="head">
    <h2 id={HEADING_ID}>{t("cull.setAside", { count })}</h2>
    <button class="link" type="button" onclick={takeAllIn}>{t("cull.takeAllIn")}</button>
    <span class="why">{t("cull.why")}</span>
  </div>
  {#each groups as group (group.kind === "similar" ? group.keptId : group.kind)}
    <div class="group">
      {#if group.kind === "similar"}
        {@const kept = keptPicture(group.keptId)}
        {@const shown = byCaptureTime(kept, group.pictures)}
        {@const first = shown[0]}
        {@const last = shown.at(-1)}
        <h3>
          {t("cull.similarGroup")}
          {#if first !== undefined && last !== undefined}
            <span class="when mono">
              {formatDate(first.capturedAt)}
              {formatMinuteRange(first.capturedAt, last.capturedAt)}
            </span>
          {/if}
          {#if kept !== undefined}{t("cull.sharpestKept")}{/if}
        </h3>
        <ul class="set">
          {#if kept !== undefined}{@render tile(kept, t("cull.kept"), true)}{/if}
          {#each group.pictures as picture (picture.id)}
            {@render tile(picture, t("cull.similar"), false)}
          {/each}
        </ul>
      {:else}
        <h3>{t("cull.blurry")}</h3>
        <ul class="set">
          {#each group.pictures as picture (picture.id)}
            {@render tile(picture, t("cull.blurry"), false)}
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</section>

<style>
  .aside {
    display: grid;
    gap: 12px;
    padding-top: 14px;
    border-top: 1px solid var(--gl-line);
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }
  h2 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-name);
    font-weight: var(--gl-weight-title);
    letter-spacing: -0.01em;
  }
  .why {
    flex-basis: 100%;
    color: var(--gl-muted);
  }
  .link {
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .group {
    display: grid;
    gap: 7px;
  }
  h3 {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  .when {
    color: var(--gl-ink);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-medium);
  }
  .set {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-hover);
  }
  .tile.kept {
    outline: 2px solid var(--gl-mint);
    outline-offset: -2px;
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* Dimmed: not in the slideshow. */
  .tile img.faded {
    opacity: 0.62;
  }
  .date {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14px 7px 5px;
    background: linear-gradient(transparent, var(--gl-photo-fade));
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-medium);
  }
  .chip {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 2px 7px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
  }
  .chip.kept {
    background: var(--gl-mint);
    color: var(--gl-mint-ink);
  }
  .take {
    position: absolute;
    top: 5px;
    right: 5px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    cursor: pointer;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  /* A touch target of 44 px around the 30 px mark. */
  .take::before {
    content: "";
    position: absolute;
    inset: -7px;
  }
  .take:hover {
    background: var(--gl-accent-hover);
  }
  @container (max-width: 720px) {
    .set {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
  }
</style>
