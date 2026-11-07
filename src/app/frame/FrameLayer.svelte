<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import type { ImmichClient } from "../../immich/immich-client";
  import { FrameAlbumDeck } from "../../frame/frame-album-deck";
  import { RoundHandover, type RoundHandoverState } from "../../frame/round-handover";
  import { CONTROLS_VISIBLE_MS, TapControls } from "../../frame/tap-controls";
  import { keepScreenAwake } from "../video-export/screen-awake";
  import { getTranslator } from "../i18n/context";
  import BlockingOverlay from "../components/BlockingOverlay.svelte";
  import FrameCaption from "./FrameCaption.svelte";
  import FrameControls from "./FrameControls.svelte";
  import Notice from "../components/Notice.svelte";
  import type { FrameDevice } from "./browser-frame-device";
  import { fetchAlbumPictures } from "../../frame/frame-album-pictures";
  import type { RoundPicture } from "../../frame/round-composition";
  import { createFrameRoundHandoverPorts } from "./frame-round-handover-ports";
  import type { FrameRoundPlayer } from "../../frame/round-handover";
  import type { FramePreferences } from "./frame-preferences";

  const CLOCK_TICK_MS = 1000;

  let {
    albumId,
    immich,
    preferences,
    device,
    onExit,
    random,
    log,
  }: {
    albumId: string;
    immich: { readonly client: ImmichClient };
    preferences: Pick<FramePreferences, "state">;
    device: FrameDevice;
    onExit: () => void;
    /** Uniform in [0, 1); what a shuffled album's order is drawn from. */
    random: () => number;
    log: (error: unknown) => void;
  } = $props();

  const { t } = getTranslator();
  // The playback choices are read once, when the frame starts (`dev-docs/app/FRAME.md`).
  // svelte-ignore state_referenced_locally
  const { intervalSeconds, order, showClock, showDate } = preferences.state;

  let stage: HTMLDivElement | undefined = $state();
  let failure = $state<"unavailable" | "notFound" | null>(null);
  let albumName = $state<string | null>(null);
  // The picture each live round's player shows now; the caption follows the shown round's.
  const shownPictures = new SvelteMap<FrameRoundPlayer, RoundPicture>();
  let handover: RoundHandover | null = null;
  let handoverState = $state.raw<RoundHandoverState>({
    player: null,
    paused: false,
    endOfPictures: false,
    waiting: true,
  });
  // svelte-ignore state_referenced_locally
  const controls = new TapControls(device.scheduler, CONTROLS_VISIBLE_MS);
  let controlsVisible = $state(false);
  let now = $state(new Date());
  let cancelClock: (() => void) | null = null;
  let awake: { release(): void } | null = null;

  function startClock(): void {
    const tick = (): void => {
      now = new Date();
      cancelClock = device.scheduler.after(CLOCK_TICK_MS, tick);
    };
    tick();
  }

  onMount(() => {
    const stopControls = controls.subscribe((visible) => (controlsVisible = visible));
    awake = keepScreenAwake(device.screenAwake);
    if (showClock) {
      startClock();
    }
    immich.client
      .albums()
      .then((albums) => {
        const album = albums.find((candidate) => candidate.id === albumId);
        if (album === undefined) {
          failure = "notFound";
          return;
        }
        albumName = album.name;
        return fetchAlbumPictures(immich.client, albumId).then((pictures) => {
          const deck = new FrameAlbumDeck(pictures, {
            order,
            random,
            refresh: () => fetchAlbumPictures(immich.client, albumId),
            onRefreshFailed: log,
          });
          const containers = new SvelteMap<FrameRoundPlayer, HTMLElement>();
          let shownPlayer: FrameRoundPlayer | null = null;
          handover = new RoundHandover(
            createFrameRoundHandoverPorts({
              deck,
              albumName: album.name,
              intervalMs: intervalSeconds * 1000,
              openPicture: (id) => immich.client.thumbnail(id, "preview"),
              createContainer: () => {
                const container = document.createElement("div");
                container.style.position = "absolute";
                container.style.inset = "0";
                container.style.visibility = "hidden";
                // The player engine is framework-free and owns this subtree entirely (ADR-0001);
                // `stage` itself never has template children, so this cannot desync Svelte's tree.
                // eslint-disable-next-line svelte/no-dom-manipulating
                stage?.appendChild(container);
                return container;
              },
              onPhotoFailed: log,
              onRoundReady: (player, container) => containers.set(player, container),
              onPictureShown: (player, picture) => shownPictures.set(player, picture),
            }),
          );
          const stopHandover = handover.subscribe((next) => {
            handoverState = next;
            if (next.player !== null && next.player !== shownPlayer) {
              const container = containers.get(next.player);
              if (container !== undefined) {
                container.style.visibility = "visible";
              }
              if (shownPlayer !== null) {
                containers.delete(shownPlayer);
                shownPictures.delete(shownPlayer);
              }
              shownPlayer = next.player;
            }
          });
          handover.start();
          return stopHandover;
        });
      })
      .catch((error) => {
        failure = "unavailable";
        log(error);
      });
    return () => {
      stopControls();
      cancelClock?.();
      awake?.release();
      handover?.destroy();
    };
  });

  onDestroy(() => {
    handover?.destroy();
  });

  function exitKey(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onExit();
    }
  }

  const clockText = $derived(
    now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  );
  const currentPicture = $derived(
    handoverState.player === null ? undefined : shownPictures.get(handoverState.player),
  );
</script>

<svelte:window onkeydown={exitKey} />

<div
  class="frame"
  role="application"
  aria-label={t("frame.title")}
  aria-busy={handoverState.waiting}
>
  {#if failure !== null}
    <div class="centered">
      <Notice tone="error">
        <b>{t("frame.unavailableTitle")}</b><br />{t("frame.unavailableText")}
        {#snippet actions()}
          <button class="btn ghost" type="button" onclick={onExit}>{t("frame.exit")}</button>
        {/snippet}
      </Notice>
    </div>
  {:else if albumName === null}
    <BlockingOverlay title={t("frame.preparingTitle")} detail={t("frame.preparingDetail")} />
  {:else if handoverState.endOfPictures}
    <div class="centered">
      <p class="quiet">{t("frame.endOfPictures")}</p>
      <button class="btn ghost" type="button" onclick={onExit}>{t("frame.exit")}</button>
    </div>
  {:else}
    <div
      class="stage"
      class:idle={!controlsVisible}
      bind:this={stage}
      onclick={() => controls.tap()}
      role="presentation"
    ></div>
    {#if showClock}
      <div class="clock mono" aria-hidden="true">{clockText}</div>
    {/if}
    {#if showDate && currentPicture !== undefined}
      <FrameCaption picture={currentPicture} />
    {/if}
    <FrameControls
      idle={!controlsVisible}
      paused={handoverState.paused}
      {onExit}
      onTogglePause={() => (handoverState.paused ? handover?.resume() : handover?.pause())}
      onSkip={() => handover?.skip()}
    />
  {/if}
</div>

<style>
  .frame {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: var(--gl-player-bg);
    overflow: hidden;
  }
  .centered {
    position: absolute;
    inset: 0;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 14px;
    padding: 20px;
    text-align: center;
  }
  .quiet {
    margin: 0;
    color: var(--gl-player-muted);
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  .clock {
    position: absolute;
    z-index: 1;
    color: var(--gl-player-text);
    top: 20px;
    right: 24px;
    font-size: 2.2rem;
    font-weight: var(--gl-weight-semibold);
    text-shadow: 0 1px 6px rgb(0 0 0 / 0.5);
  }
</style>
