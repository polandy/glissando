<script lang="ts">
  import { onMount } from "svelte";
  import {
    createPlayer,
    type DecodeClipSound,
    type MusicOutput,
    type OpenPicture,
    type Slideshow,
  } from "../../../player";

  /**
   * Plays one composed preview `Slideshow` on loop (MOOD.md): restarting it on a new mood or a
   * "Sound" toggle is the parent's job, by remounting this component in a `{#key}` block keyed on
   * a newly composed `Slideshow`, since Svelte then destroys and recreates it.
   */
  let {
    slideshow,
    openPicture,
    readVideo,
    musicOutput,
    decodeClipSound,
    onError,
  }: {
    slideshow: Slideshow;
    openPicture: OpenPicture;
    readVideo: (src: string) => Promise<Blob>;
    musicOutput: MusicOutput;
    decodeClipSound: DecodeClipSound;
    /** A picture that cannot be shown stops the player; reported, never left as a silent black. */
    onError: (error: Error) => void;
  } = $props();

  let stage: HTMLDivElement;

  onMount(() => {
    const player = createPlayer(stage, slideshow, {
      openPicture,
      readVideo,
      musicOutput,
      decodeClipSound,
    });
    const loop = (): void => {
      player.currentTime = 0;
      player.play();
    };
    player.addEventListener("ended", loop);
    player.addEventListener("error", () => {
      if (player.error !== null) onError(player.error);
    });
    player.play();
    return () => player.destroy();
  });
</script>

<div bind:this={stage} class="stage"></div>

<style>
  .stage {
    width: 100%;
    height: 100%;
  }
</style>
