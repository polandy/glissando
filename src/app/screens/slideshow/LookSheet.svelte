<script lang="ts">
  import { onMount } from "svelte";
  import { DEFAULT_SLIDESHOW_LOOK, SLIDESHOW_LOOKS, type SlideshowLook } from "../../../player";
  import ResetButton from "../../components/ResetButton.svelte";
  import SectionHead from "../../components/SectionHead.svelte";
  import { radioIndexForKey } from "../../components/radio-keys";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails } from "../view-models";
  import LookFilterDefs from "./LookFilterDefs.svelte";
  import { lookFilterUrl } from "./look-filter-id";
  import LookPictureRow from "./LookPictureRow.svelte";
  import LookPreview from "./LookPreview.svelte";
  import LookTile from "./LookTile.svelte";

  /**
   * The slideshow's colour grade (ADR-0044). A pick is stored at once; the preview and the tiles
   * show it applied with the same SVG filter the player uses.
   */
  let {
    slideshow,
    onLook,
    onReset,
    onClose,
  }: {
    slideshow: SlideshowDetails;
    onLook: (look: SlideshowLook) => void;
    /** "Back to None"; offered while another look is chosen. */
    onReset: () => void;
    /** "Done", the scrim, Esc. */
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();
  const ROW_PICTURE_COUNT = 4;
  // One instance of the filter defs per open sheet; scopes their ids against the strip's own.
  const filterPrefix = crypto.randomUUID();

  const isDefault = $derived(slideshow.look === DEFAULT_SLIDESHOW_LOOK);
  let previewIndex = $state(0);
  const previewPicture = $derived(slideshow.pictures[previewIndex] ?? slideshow.pictures[0]);
  const rowPictures = $derived(slideshow.pictures.slice(0, ROW_PICTURE_COUNT));

  let dialog: HTMLDialogElement;
  const radios: HTMLButtonElement[] = $state([]);

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    dialog.showModal();
    radios[SLIDESHOW_LOOKS.indexOf(slideshow.look)]?.focus();
    return () => dialog.close();
  });

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
    const next = radioIndexForKey(event.key, index, SLIDESHOW_LOOKS.length);
    const choice = next === null ? undefined : SLIDESHOW_LOOKS[next];
    if (next === null || choice === undefined) {
      return;
    }
    event.preventDefault();
    onLook(choice);
    radios[next]?.focus();
  }
</script>

<LookFilterDefs prefix={filterPrefix} />

<dialog bind:this={dialog} aria-labelledby="look-title" oncancel={cancel} onclick={closeOnScrim}>
  <div class="sheet">
    <SectionHead
      id="look-title"
      title={t("look.title")}
      stateText={t(`look.${slideshow.look}`)}
      own={!isDefault}
    />
    {#if previewPicture !== undefined}
      <LookPreview
        pictureUrl={previewPicture.thumbnailUrl}
        caption={previewPicture.caption}
        filterUrl={lookFilterUrl(filterPrefix, slideshow.look)}
        showCompare={!isDefault}
      />
    {/if}
    {#if slideshow.pictures.length > 1}
      <LookPictureRow
        pictures={rowPictures}
        {previewIndex}
        filterUrl={lookFilterUrl(filterPrefix, slideshow.look)}
        onPick={(index) => (previewIndex = index)}
      />
    {/if}
    <div class="tiles" role="radiogroup" aria-labelledby="look-title">
      {#each SLIDESHOW_LOOKS as look, index (look)}
        <LookTile
          bind:radio={radios[index]}
          {look}
          checked={look === slideshow.look}
          tag={look === DEFAULT_SLIDESHOW_LOOK ? t("look.defaultTag") : null}
          pictureUrl={previewPicture?.thumbnailUrl ?? null}
          filterUrl={lookFilterUrl(filterPrefix, look)}
          onPick={() => onLook(look)}
          onKeydown={(event) => onkeydown(event, index)}
        />
      {/each}
    </div>
    <p class="hint">{t("look.hint")}</p>
    <footer>
      <ResetButton
        automatic={isDefault}
        alreadyAutomatic={t("look.alreadyNone")}
        label={t("look.reset")}
        {onReset}
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
    grid-template-columns: repeat(4, 1fr);
    gap: 10px 8px;
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
  /* The tile grid's own breakpoint, narrower than the dialog's: four tiles per row still fit the
     720 px bottom sheet; only a narrow phone needs three. */
  @media (max-width: 480px) {
    .tiles {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
