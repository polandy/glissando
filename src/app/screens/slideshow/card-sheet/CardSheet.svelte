<script lang="ts">
  import type { StoredCard } from "../../../../library/stored-slideshow";
  import { radioGroupKeys } from "../../../components/radio-group-keys";
  import SectionHead from "../../../components/SectionHead.svelte";
  import Sheet from "../../../components/Sheet.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { MotionPreviewPorts } from "../../../picture-editor/motion-preview";
  import type { CardEntrance } from "../../../../player/slideshow";
  import type { PictureTile } from "../../view-models";
  import CardBackgroundPicker from "./CardBackgroundPicker.svelte";
  import CardEntrancePicker from "./CardEntrancePicker.svelte";
  import CardPreview from "./CardPreview.svelte";
  import CardStylePicker from "./CardStylePicker.svelte";
  import CardTitleFields from "./CardTitleFields.svelte";

  /**
   * The title slide / closing slide sheet (TITLE_SLIDES.md): a bottom sheet on the phone, a
   * dialog from 720 px. Opening an absent card creates it with its defaults at once. Every field
   * change is stored as it is made; the preview shows the settled state without replaying.
   */
  let {
    kind,
    card: initialCard,
    ensureCard,
    pictures,
    previewPorts,
    reducedMotion,
    onChange,
    onRemove,
    onClose,
  }: {
    kind: "opening" | "closing";
    /** Absent until `ensureCard` makes it, once, when the sheet opens. */
    card: StoredCard | undefined;
    ensureCard: () => StoredCard;
    pictures: readonly PictureTile[];
    previewPorts: MotionPreviewPorts;
    reducedMotion: boolean;
    onChange: (card: StoredCard) => void;
    onRemove: () => void;
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  // The card is read once, when the sheet opens; later changes come back down through onChange.
  // svelte-ignore state_referenced_locally
  let card = $state<StoredCard>(initialCard ?? ensureCard());

  let titleField = $state<HTMLInputElement>();

  function focusTitle(): void {
    titleField?.focus();
  }

  function update(next: StoredCard): void {
    card = next;
    onChange(next);
  }

  // Picking an entrance is the one edit that replays the preview's enter phase (TITLE_SLIDES.md);
  // bumping this token tells CardPreview to play instead of jumping straight to settled.
  let entranceReplayToken = $state(0);

  function updateEntrance(entrance: CardEntrance): void {
    entranceReplayToken += 1;
    update({ ...card, entrance });
  }

  function remove(): void {
    onRemove();
    onClose();
  }

  const sheetTitle = $derived(
    kind === "opening" ? t("cards.openingSheetTitle") : t("cards.closingSheetTitle"),
  );
  const removeLabel = $derived(
    kind === "opening" ? t("cards.removeOpening") : t("cards.removeClosing"),
  );
  const motionActive = $derived(card.background.kind === "picture" && card.motion);
  const hint = $derived(
    kind === "opening"
      ? motionActive
        ? t("cards.hintOpeningMotion")
        : t("cards.hintOpeningStill")
      : motionActive
        ? t("cards.hintClosingMotion")
        : t("cards.hintClosingStill"),
  );
</script>

<Sheet labelId="card-sheet-title" gap="roomy" onOpen={focusTitle} {onClose}>
  <SectionHead id="card-sheet-title" title={sheetTitle} own={false} />

  <CardPreview {card} {pictures} {previewPorts} {reducedMotion} {entranceReplayToken} />

  <CardTitleFields
    {kind}
    title={card.title}
    subtitle={card.subtitle}
    bind:titleField
    onTitleChange={(title) => update({ ...card, title })}
    onSubtitleChange={(subtitle) => update({ ...card, subtitle })}
  />

  <CardStylePicker style={card.style} onChange={(style) => update({ ...card, style })} />

  <CardEntrancePicker entrance={card.entrance} onChange={updateEntrance} />

  <CardBackgroundPicker
    background={card.background}
    motion={card.motion}
    {pictures}
    {kind}
    onChange={(background) => update({ ...card, background })}
    onMotionChange={(motion) => update({ ...card, motion })}
  />

  <section class="field">
    <SectionHead id="card-position-title" title={t("cards.positionLabel")} own={false} />
    <div
      class="kind-toggle"
      role="radiogroup"
      aria-labelledby="card-position-title"
      use:radioGroupKeys
    >
      <button
        class="option"
        class:checked={card.position === "centre"}
        type="button"
        role="radio"
        aria-checked={card.position === "centre"}
        tabindex={card.position === "centre" ? 0 : -1}
        onclick={() => update({ ...card, position: "centre" })}
      >
        {t("cards.position-centre")}
      </button>
      <button
        class="option"
        class:checked={card.position === "bottom-left"}
        type="button"
        role="radio"
        aria-checked={card.position === "bottom-left"}
        tabindex={card.position === "bottom-left" ? 0 : -1}
        onclick={() => update({ ...card, position: "bottom-left" })}
      >
        {t("cards.position-bottom-left")}
      </button>
    </div>
  </section>

  <p class="hint">{hint}</p>

  <footer>
    <button class="btn small ghost" type="button" onclick={remove}>{removeLabel}</button>
    <button class="btn primary" type="button" onclick={onClose}>{t("slideshow.done")}</button>
  </footer>
</Sheet>

<style>
  .field {
    display: grid;
    gap: 8px;
  }
  .kind-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .option {
    padding: 8px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: inherit;
    cursor: pointer;
  }
  .option.checked {
    border-color: var(--gl-accent);
    background: color-mix(in srgb, var(--gl-accent) 14%, var(--gl-raised));
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
</style>
