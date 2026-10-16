<script lang="ts">
  import type { Snippet } from "svelte";
  import type { SlideshowSearch } from "../../library/focus-pass";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import DropLayer from "../glissando-file/DropLayer.svelte";
  import { fileDrop } from "../glissando-file/file-drop";
  import FrameCard from "../frame/FrameCard.svelte";
  import GlissandoFilePicker from "../glissando-file/GlissandoFilePicker.svelte";
  import type { OpenNotice as OpenNoticeModel } from "../glissando-file/open-flow";
  import OpenNotice from "../glissando-file/OpenNotice.svelte";
  import { getTranslator } from "../i18n/context";
  import SlideshowCard from "./SlideshowCard.svelte";
  import type { ServerShelf, SlideshowSummary } from "./view-models";
  import type { DemoSlideshowState } from "../start/demo-slideshow-flow";
  import DemoSlideshowButton from "../start/DemoSlideshowButton.svelte";

  let {
    slideshows,
    server = null,
    focusSearches,
    onCreate,
    onOpen,
    updateWaiting,
    onSettings,
    onOpenFile,
    notice,
    onDismissNotice,
    onReload,
    logo,
    statusBar,
    serverOn = false,
    onSetUpFrame,
    onHideFrameCard,
    frameCardShown = true,
    demo = { visible: false, state: { kind: "idle", online: true }, onLoad: () => {} },
  }: {
    /** Newest first. */
    slideshows: readonly SlideshowSummary[];
    /** The server's slideshows; null while the server library is off. */
    server?: ServerShelf | null;
    /** The slideshows the background pass is still searching subjects in, by id. */
    focusSearches: ReadonlyMap<string, SlideshowSearch>;
    onCreate: () => void;
    onOpen: (slideshowId: string) => void;
    /** A new version waits to take over: the gear carries a dot. */
    updateWaiting: boolean;
    onSettings: () => void;
    /** A .glissando file was chosen or dropped. */
    onOpenFile: (file: File) => void;
    /** Why the last file opened from here was refused. */
    notice: OpenNoticeModel | null;
    onDismissNotice: () => void;
    onReload: () => void;
    logo?: Snippet | undefined;
    /** The status line at the bottom (dev-docs/app/INSTALLING_AND_OFFLINE.md). */
    statusBar: Snippet;
    /** The picture frame card shows only while the server library is on (`dev-docs/app/FRAME.md`). */
    serverOn?: boolean;
    onSetUpFrame: () => void;
    onHideFrameCard: () => void;
    /** The owner can hide the picture frame card; Settings brings it back. */
    frameCardShown?: boolean;
    /** The "Load demo slideshow" button (dev-docs/app/INSTALLING_AND_OFFLINE.md). */
    demo?: { visible: boolean; state: DemoSlideshowState; onLoad: () => void };
  } = $props();

  const { t } = getTranslator();
  let picker: GlissandoFilePicker;
  let dragging = $state(false);
  const gearLabel = $derived(updateWaiting ? "settings.openUpdateReady" : "settings.open");
</script>

<GlissandoFilePicker bind:this={picker} onFile={onOpenFile} />

<div class="screen">
  <Header crumbs={[]} {actions} />
  {#snippet actions()}
    <button
      class="icon-btn gear"
      type="button"
      title={t(gearLabel)}
      aria-label={t(gearLabel)}
      onclick={onSettings}
    >
      <Icon name="gear" />
      {#if updateWaiting}<span class="badge"></span>{/if}
    </button>
    <!-- An empty library has the large button in the hero instead. -->
    {#if slideshows.length > 0 || server !== null}
      <button class="btn primary" type="button" onclick={onCreate}>
        <Icon name="plus" />{t("start.newSlideshow")}
      </button>
    {/if}
  {/snippet}
  <main
    class="content"
    use:fileDrop={{ onDragging: (next) => (dragging = next), onFile: onOpenFile }}
  >
    {#if notice !== null}
      <OpenNotice
        {notice}
        onPick={() => picker.pick()}
        {onCreate}
        {onReload}
        onDismiss={onDismissNotice}
      />
    {/if}
    {#if logo}
      <div class="logo">{@render logo()}</div>
    {/if}
    {#if serverOn && frameCardShown}
      <FrameCard onSetUp={onSetUpFrame} onHide={onHideFrameCard} />
    {/if}
    {#if slideshows.length === 0 && server === null}
      <div class="hero">
        <h1 class="title">{t("start.heroTitle")}</h1>
        <p class="lead">{t("start.heroText")}</p>
        <button class="btn primary large" type="button" onclick={onCreate}>
          <Icon name="plus" />{t("start.newSlideshow")}
        </button>
        <button class="btn ghost" type="button" onclick={() => picker.pick()}>
          <Icon name="open" />{t("glissandoFile.openGlissandoFile")}
        </button>
        {#if demo.visible}
          <DemoSlideshowButton state={demo.state} onLoad={demo.onLoad} />
        {/if}
      </div>
    {:else}
      <div class="head">
        <div>
          <div class="eyebrow">{t("start.library")}</div>
          <h1 class="title" class:section={server !== null}>
            {#if server === null}
              {t("start.yourSlideshows")}
            {:else}
              <Icon name="device" />{t("server.sectionDevice")}
            {/if}
          </h1>
        </div>
        <button class="btn" type="button" onclick={() => picker.pick()}>
          <Icon name="open" />{t("glissandoFile.openFile")}
        </button>
      </div>
      {#if slideshows.length === 0}
        <p class="empty">{t("server.sectionDeviceEmpty")}</p>
      {:else}
        <ul class="grid">
          {#each slideshows as slideshow (slideshow.id)}
            <li>
              <SlideshowCard {slideshow} search={focusSearches.get(slideshow.id)} {onOpen} />
            </li>
          {/each}
          {#if server === null}
            <li>
              <button class="new" type="button" onclick={onCreate}>
                <Icon name="plus" />{t("start.newSlideshow")}
              </button>
            </li>
          {/if}
        </ul>
      {/if}
      {#if server !== null}
        <section class="shelf" aria-labelledby="server-shelf">
          <h2 class="title section" id="server-shelf">
            <Icon name="server" />{t("server.sectionServer")}
          </h2>
          <p class="lead">
            {#if server.offline}
              <Icon name="cloudOff" />{t("server.sectionOffline")}
            {:else}
              {t("server.sectionLead")}
            {/if}
          </p>
          <ul class="grid">
            {#each server.slideshows as slideshow (slideshow.id)}
              <li>
                <SlideshowCard {slideshow} onServer offline={server.offline} {onOpen} />
              </li>
            {/each}
            <li>
              <button class="new" type="button" onclick={onCreate}>
                <Icon name="plus" />{t("start.newSlideshow")}
              </button>
            </li>
          </ul>
        </section>
      {/if}
    {/if}
    {#if dragging}
      <DropLayer />
    {/if}
  </main>
  {@render statusBar()}
</div>

<style>
  .gear {
    position: relative;
  }
  .badge {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--gl-accent);
    box-shadow: 0 0 0 2px var(--gl-surface);
  }
  main {
    position: relative;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }
  .logo {
    display: flex;
    justify-content: center;
    padding-top: 8px;
  }
  .hero {
    display: grid;
    justify-items: center;
    gap: 14px;
    max-width: 520px;
    margin: 0 auto;
    text-align: center;
  }
  .hero .lead {
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .grid li {
    display: grid;
  }
  .section {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .shelf {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }
  .shelf .title,
  .shelf .lead {
    margin: 0;
  }
  .empty {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .shelf .lead {
    display: flex;
    gap: 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    --gl-icon-size: var(--gl-size-icon-small);
  }
  .new {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 8px;
    min-height: 200px;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: transparent;
    color: var(--gl-muted);
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .new:hover {
    border-color: var(--gl-accent);
    color: var(--gl-ink);
  }
  @container (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
      gap: 14px;
    }
  }
</style>
