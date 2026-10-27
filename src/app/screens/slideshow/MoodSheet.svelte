<script lang="ts">
  import { onMount } from "svelte";
  import type { SongBeats } from "../../../compose/playlist";
  import type { SongLoudness } from "../../../compose/song-loudness";
  import { SLIDESHOW_MOODS, type SlideshowMood } from "../../../library/slideshow-mood";
  import ResetButton from "../../components/ResetButton.svelte";
  import SectionHead from "../../components/SectionHead.svelte";
  import Switch from "../../components/Switch.svelte";
  import { radioIndexForKey } from "../../components/radio-keys";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails } from "../view-models";
  import EnergyStrip from "./EnergyStrip.svelte";
  import { moodKenBurnsText, moodName, moodTransitionText } from "./mood-text";
  import { moodSheetEnergyView } from "./mood-sheet-energy-view";
  import type { MoodPreviewPorts } from "./mood-preview-ports";
  import MoodPreview from "./MoodPreview.svelte";
  import MoodTile from "./MoodTile.svelte";

  /** The sheet's three tiles, in the mockup's order: Calm, Lively, then Custom (`undefined`). */
  const MOOD_CHOICES: readonly (SlideshowMood | undefined)[] = [...SLIDESHOW_MOODS, undefined];

  /**
   * The slideshow's mood (ADR-0045): modal like the Look sheet, with a live preview, a radiogroup
   * of three tiles and what the chosen mood sets. A tap stores at once; "Back to Custom" asks
   * nothing and offers an undo toast.
   */
  let {
    slideshow,
    previewPorts,
    moodBpm,
    moodBeats,
    onMood,
    onResetMood,
    onEnergyPacing,
    onClose,
  }: {
    slideshow: SlideshowDetails;
    /** The live preview's data ports (`MoodPreview.svelte`); left out while it has no pictures. */
    previewPorts: MoodPreviewPorts;
    /** The slideshow's tempo, for "What it sets"; `undefined` without a clear beat. */
    moodBpm: number | undefined;
    /** The pass-aware beats the preview composes and paces to (MOOD.md); also this sheet's energy
     * pacing rows and strip, once the preview's loudness analysis has loaded too. */
    moodBeats: SongBeats;
    onMood: (mood: SlideshowMood | undefined) => void;
    /** "Back to Custom"; offered while a mood is chosen. */
    onResetMood: () => void;
    /** The "Follow the music's energy" switch (ADR-0046): stores at once. */
    onEnergyPacing: (on: boolean) => void;
    /** "Done", the scrim, Esc. */
    onClose: () => void;
  } = $props();

  const translator = getTranslator();
  const { t } = translator;

  const hasPictures = $derived(previewPorts.stored.pictures.length > 0);

  // The preview (`MoodPreview.svelte`) loads the loudness anyway; the energy pacing rows and
  // strip reuse it, combined with `moodBeats`, instead of loading it again.
  let loudness = $state.raw<SongLoudness | null>(null);
  const moodAnalysis = $derived(loudness === null ? null : { beats: moodBeats, loudness });

  const energyView = $derived(
    moodSheetEnergyView(translator, previewPorts.stored, slideshow.mood, moodBpm, moodAnalysis),
  );

  let dialog: HTMLDialogElement;
  const radios: HTMLButtonElement[] = $state([]);

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    dialog.showModal();
    radios[MOOD_CHOICES.indexOf(slideshow.mood)]?.focus();
    return () => dialog.close();
  });

  function pick(choice: SlideshowMood | undefined): void {
    onMood(choice);
  }

  function cancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  function closeOnScrim(event: MouseEvent): void {
    if (event.target === dialog) {
      onClose();
    }
  }

  // Selection follows focus, as in the WAI-ARIA radio group: one tab stop, arrows choose.
  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, MOOD_CHOICES.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    pick(MOOD_CHOICES[next]);
    radios[next]?.focus();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="mood-title" oncancel={cancel} onclick={closeOnScrim}>
  <div class="sheet">
    <SectionHead
      id="mood-title"
      title={t("mood.title")}
      stateText={moodName(t, slideshow.mood)}
      own={slideshow.mood !== undefined}
    />
    {#if hasPictures}
      <MoodPreview
        ports={previewPorts}
        mood={slideshow.mood}
        {moodBeats}
        onLoaded={(loaded) => (loudness = loaded.loudness)}
      />
      {#if energyView.stripGeometry !== null}
        <EnergyStrip geometry={energyView.stripGeometry} />
      {/if}
    {/if}
    <div class="tiles" role="radiogroup" aria-labelledby="mood-title">
      {#each MOOD_CHOICES as choice, index (choice ?? "custom")}
        <MoodTile
          bind:radio={radios[index]}
          mood={choice}
          checked={choice === slideshow.mood}
          onPick={() => pick(choice)}
          onKeydown={(event) => onkeydown(event, index)}
        />
      {/each}
    </div>
    <div class="row switch-row">
      <div>
        <b>{t("mood.energySwitch")}</b>
        <small>{t("mood.energySwitchSubtitle")}</small>
      </div>
      <Switch
        checked={slideshow.energyPacing}
        label={t("mood.energySwitch")}
        onChange={onEnergyPacing}
      />
    </div>
    <dl class="sets">
      <div>
        <dt>{t("slideshow.pictureTimes")}</dt>
        <dd>{energyView.pictureTimesText}</dd>
      </div>
      {#if energyView.hasLift}
        <div>
          <dt>{t("mood.energyLiftLabel")}</dt>
          <dd>{t("mood.energyLiftValue")}</dd>
        </div>
      {/if}
      <div>
        <dt>{t("slideshow.transitions")}</dt>
        <dd>{moodTransitionText(t, slideshow.mood)}</dd>
      </div>
      <div>
        <dt>{t("slideshow.kenBurns")}</dt>
        <dd>{moodKenBurnsText(t, slideshow.mood)}</dd>
      </div>
    </dl>
    <p class="hint">{energyView.hintText}</p>
    <footer>
      <ResetButton
        automatic={slideshow.mood === undefined}
        alreadyAutomatic={t("mood.alreadyCustom")}
        label={t("mood.backToCustom")}
        onReset={onResetMood}
      />
      <button class="btn primary" type="button" onclick={onClose}>{t("slideshow.done")}</button>
    </footer>
  </div>
</dialog>

<style>
  dialog {
    width: calc(100% - 40px);
    max-width: 520px;
    max-height: calc(100% - 48px);
    padding: 0;
    overflow: auto;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: grid;
    gap: 14px;
    padding: 18px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .switch-row small {
    display: block;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-regular);
  }
  .sets {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .sets div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .sets dt {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .sets dd {
    margin: 0;
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-medium);
    text-align: right;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  /* The dialog sits in the top layer, outside the screen's container, so the viewport decides;
     the app fills it, so this matches the screens' 720 px container queries. */
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      width: auto;
      max-width: none;
      max-height: 85%;
      margin: 0;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .sheet {
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
    }
  }
</style>
