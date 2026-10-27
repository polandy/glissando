<script lang="ts">
  import { DEFAULT_SLIDESHOW_LOOK } from "../../../player";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails } from "../view-models";
  import { lookSwatchColour } from "./look-swatch-colour";
  import type { MoodEnergyPacing } from "./mood-energy-pacing";
  import { moodName } from "./mood-text";
  import { moodTileSummaryText } from "./mood-tile-summary";
  import { musicTileValue } from "./music-tile-summary";
  import PanelTile from "./PanelTile.svelte";

  /** The info panel's Music, Mood and Look tiles (ADR-0048): never folded, one row of three at
   * every width. */
  let {
    slideshow,
    moodBpm,
    moodEnergyPacing,
    onEditMusic,
    onEditMood,
    onEditLook,
  }: {
    slideshow: SlideshowDetails;
    /** The slideshow's tempo under its mood (ADR-0045); undefined without one. */
    moodBpm: number | undefined;
    /** The Mood tile's picture-times range under the energy pacing (ADR-0046); null without one. */
    moodEnergyPacing: MoodEnergyPacing | null;
    onEditMusic: () => void;
    onEditMood: () => void;
    onEditLook: () => void;
  } = $props();

  let moodTile: PanelTile;
  let lookTile: PanelTile;

  /** The Mood sheet closed: focus goes back to the tile it was opened from. */
  export function focusMood(): void {
    moodTile.focus();
  }

  /** The look sheet closed: focus goes back to the tile it was opened from. */
  export function focusLook(): void {
    lookTile.focus();
  }

  const translator = getTranslator();
  const { t } = translator;

  const music = $derived(musicTileValue(t, translator.formatDuration, slideshow));
  const moodSummary = $derived(
    moodTileSummaryText(
      translator,
      {
        mood: slideshow.mood,
        ownDurationCount: slideshow.ownDurationCount,
        energyPacing: slideshow.energyPacing,
        hasMusic: slideshow.songCount > 0,
      },
      moodBpm,
      moodEnergyPacing,
    ),
  );
  const lookSummary = $derived(
    slideshow.look === DEFAULT_SLIDESHOW_LOOK ? t("slideshow.lookDefault") : "",
  );
  const lookSwatch = $derived(lookSwatchColour(slideshow.look));
</script>

<div class="tiles">
  <PanelTile
    name="music"
    label={t("slideshow.music")}
    value={music.value}
    summary={music.summary}
    onclick={onEditMusic}
  />
  <PanelTile
    bind:this={moodTile}
    name="mood"
    label={t("slideshow.mood")}
    value={moodName(t, slideshow.mood)}
    summary={moodSummary}
    onclick={onEditMood}
  />
  <PanelTile
    bind:this={lookTile}
    name="look"
    label={t("slideshow.look")}
    value={t(`look.${slideshow.look}`)}
    summary={lookSummary}
    swatchColour={lookSwatch}
    onclick={onEditLook}
  />
</div>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: 8px;
  }
</style>
