<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import ViewerBottomBar from "./ViewerBottomBar.svelte";
  import { neighbourAfterRemoval, stepFrom, type ViewerEntry } from "./picture-viewer-view";

  /**
   * One picture of the pictures step full screen, over the step: its date, a way to browse the
   * pictures in order, and the decision the tile has too (remove it, or take a set-aside one in).
   */
  let {
    entries,
    pictureId,
    urls,
    loadPicture,
    onError,
    onShow,
    onRemove,
    onTakeIn,
    onClose,
  }: {
    /** The strip's pictures, then the set-aside ones. */
    entries: readonly ViewerEntry[];
    pictureId: string;
    /** Thumbnail URLs by picture id: shown until the full picture has loaded, and in the filmstrip. */
    urls: ReadonlyMap<string, string>;
    loadPicture: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
    onShow: (pictureId: string) => void;
    onRemove: (pictureId: string) => void;
    onTakeIn: (pictureId: string) => void;
    onClose: () => void;
  } = $props();

  const SWIPE_MIN_PX = 50;
  const REMOVE_KEYS: ReadonlySet<string> = new Set(["Delete", "Backspace"]);
  const { t, formatDate, formatTime } = getTranslator();

  const index = $derived(entries.findIndex(({ picture }) => picture.id === pictureId));
  const entry = $derived(entries[index]);
  const previousId = $derived(stepFrom(entries, pictureId, -1));
  const nextId = $derived(stepFrom(entries, pictureId, 1));

  let root: HTMLElement | undefined = $state();
  let closeButton: HTMLButtonElement | undefined = $state();
  let fullUrls = $state<ReadonlyMap<string, string>>(new Map());
  let barsHidden = $state(false);
  let swipeStartX: number | null = null;

  // The loader and the error handler are fixed for the viewer's lifetime.
  // svelte-ignore state_referenced_locally
  const fullPictures = new ObjectUrls({ ...browserObjectUrls, load: loadPicture, onError });
  onDestroy(() => fullPictures.dispose());
  $effect(() => fullPictures.subscribe((next) => (fullUrls = next)));
  // The neighbours are fetched ahead so that browsing does not wait.
  $effect(() =>
    fullPictures.sync([pictureId, previousId, nextId].filter((id): id is string => id !== null)),
  );
  $effect(() => {
    void pictureId;
    root
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  });

  onMount(() => {
    const opener = document.activeElement;
    closeButton?.focus();
    // The tile of the picture shown last, which may have moved to the strip; else the one opened.
    return () => {
      const tile = document.querySelector<HTMLElement>(`[data-view-id="${pictureId}"]`);
      (tile ?? (opener instanceof HTMLElement && opener.isConnected ? opener : null))?.focus();
    };
  });

  function show(id: string | null): void {
    if (id !== null) onShow(id);
  }

  /** The next picture follows, or the viewer closes with none left. */
  function remove(): void {
    const next = neighbourAfterRemoval(entries, pictureId);
    onRemove(pictureId);
    if (next === null) onClose();
    else onShow(next);
  }

  function keepFocusInside(event: KeyboardEvent): void {
    const focusable = [...(root?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (entry === undefined) return;
    if (event.key === "Escape") onClose();
    else if (event.key === "ArrowLeft") show(previousId);
    else if (event.key === "ArrowRight") show(nextId);
    else if (REMOVE_KEYS.has(event.key) && entry.setAside === null) remove();
    else if (event.key === "Tab") keepFocusInside(event);
    else return;
    if (event.key !== "Tab") event.preventDefault();
    event.stopPropagation();
  }

  function swipeEnded(event: PointerEvent): void {
    const distance = event.clientX - (swipeStartX ?? event.clientX);
    swipeStartX = null;
    if (Math.abs(distance) >= SWIPE_MIN_PX) show(distance < 0 ? nextId : previousId);
    else barsHidden = !barsHidden;
  }
</script>

{#if entry !== undefined}
  {@const { picture, setAside } = entry}
  {@const date = formatDate(picture.capturedAt)}
  <div
    class="viewer"
    class:hidden={barsHidden}
    role="dialog"
    aria-modal="true"
    aria-label={t("view.label", { date })}
    tabindex="-1"
    bind:this={root}
    onkeydown={onKeydown}
  >
    <div class="stage">
      <img
        src={fullUrls.get(pictureId) ?? urls.get(pictureId)}
        alt=""
        draggable="false"
        onpointerdown={(event) => (swipeStartX = event.clientX)}
        onpointerup={swipeEnded}
      />
    </div>
    <header class="bar top">
      <button
        class="round"
        type="button"
        bind:this={closeButton}
        aria-label={t("common.close")}
        onclick={onClose}
      >
        <Icon name="close" />
      </button>
      <div class="meta">
        <b class="mono">{date} · {formatTime(picture.capturedAt)}</b>
        <span>
          {t("view.position", { position: index + 1, count: entries.length })}
          {#if setAside !== null}
            · {t("view.setAside", {
              reason: t(setAside === "similar" ? "cull.similar" : "cull.blurry"),
            })}
          {/if}
        </span>
      </div>
    </header>
    <button
      class="round side previous"
      type="button"
      aria-label={t("view.previous")}
      disabled={previousId === null}
      onclick={() => show(previousId)}
    >
      <Icon name="chevronLeft" />
    </button>
    <button
      class="round side next"
      type="button"
      aria-label={t("view.next")}
      disabled={nextId === null}
      onclick={() => show(nextId)}
    >
      <Icon name="chevronRight" />
    </button>
    <ViewerBottomBar
      {entries}
      {pictureId}
      {urls}
      setAside={entry.setAside}
      hidden={barsHidden}
      {onShow}
      onRemove={remove}
      onTakeIn={() => onTakeIn(pictureId)}
    />
  </div>
{/if}

<style>
  .viewer {
    position: fixed;
    inset: 0;
    /* Below the toasts, so that "Undo" stays reachable. */
    z-index: 10;
    display: grid;
    background: var(--gl-player-bg);
    color: var(--gl-player-text);
    overscroll-behavior: contain;
    animation: fade 0.16s ease-out;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .viewer {
      animation: none;
    }
  }
  .stage {
    position: absolute;
    inset: 0;
    display: grid;
    touch-action: pan-y;
  }
  .stage img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
  }
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    transition: opacity 0.2s;
  }
  .top {
    top: 0;
    background: linear-gradient(var(--gl-photo-fade), transparent);
  }
  .hidden .bar,
  .hidden .side {
    opacity: 0;
    pointer-events: none;
  }
  .meta {
    display: grid;
    min-width: 0;
    font-size: var(--gl-size-meta);
  }
  .meta span {
    color: var(--gl-player-muted);
  }
  .round {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-player-glass);
    color: inherit;
    cursor: pointer;
  }
  .round:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .side {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    transition: opacity 0.2s;
  }
  .previous {
    left: 12px;
  }
  .next {
    right: 12px;
  }
  @media (pointer: coarse) {
    .side {
      display: none;
    }
  }
  .round:focus-visible {
    outline: 2px solid var(--gl-player-outline);
    outline-offset: 2px;
  }
</style>
