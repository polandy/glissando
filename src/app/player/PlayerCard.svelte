<script module lang="ts">
  /**
   * Why the player stopped short: a picture could not be loaded, Immich did not answer for a
   * server slideshow's picture, or playback failed.
   */
  export type PlayerFailure = "picture" | "immich" | "playback";
</script>

<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /**
   * The card over the player once it failed (the reason and "Schließen") or ended ("Nochmal" and
   * "Schließen"); nothing while it plays. Styled by `player-overlay.css`.
   */
  let {
    failure,
    ended,
    onPlayAgain,
    onClose,
  }: {
    failure: PlayerFailure | null;
    ended: boolean;
    onPlayAgain: () => void;
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();
  const FAILURE_TEXT = {
    picture: "player.pictureError",
    immich: "server.immichNotAnswering",
    playback: "player.playbackError",
  } as const satisfies Record<PlayerFailure, string>;
</script>

{#if failure !== null}
  <div class="card-layer" role="alert">
    <div class="box">
      <p>{t(FAILURE_TEXT[failure])}</p>
      <button class="pill" type="button" onclick={onClose}>{t("common.close")}</button>
    </div>
  </div>
{:else if ended}
  <div class="card-layer">
    <div class="box">
      <h2>{t("player.end")}</h2>
      <div class="row">
        <button class="pill light" type="button" onclick={onPlayAgain}>
          <Icon name="replay" />{t("player.again")}
        </button>
        <button class="pill" type="button" onclick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  </div>
{/if}
