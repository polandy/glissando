<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /**
   * The adding bar's actions (IMPORT_ARRANGING.md, Add media): Earlier and Later as icons named by
   * their tooltip, View and Remove in words beside their icons.
   */
  let {
    arranging,
    single,
    earlierDisabled,
    laterDisabled,
    removeDisabledLook,
    onEarlier,
    onLater,
    onView,
    onRemove,
  }: {
    /** False hides Earlier and Later: no moving while adding. */
    arranging: boolean;
    /** One picture selected: View opens it full screen. */
    single: boolean;
    earlierDisabled: boolean;
    laterDisabled: boolean;
    removeDisabledLook: boolean;
    onEarlier: () => void;
    onLater: () => void;
    onView: () => void;
    onRemove: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

{#if arranging}
  <button
    class="btn"
    type="button"
    aria-label={t("slideshow.earlier")}
    title={t("slideshow.earlier")}
    aria-disabled={earlierDisabled}
    onclick={onEarlier}
  >
    <Icon name="chevronLeft" />
  </button>
  <button
    class="btn"
    type="button"
    aria-label={t("slideshow.later")}
    title={t("slideshow.later")}
    aria-disabled={laterDisabled}
    onclick={onLater}
  >
    <Icon name="chevronRight" />
  </button>
{/if}
{#if single}
  <button class="btn" type="button" onclick={onView}>
    <Icon name="eye" /><span>{t("slideshow.view")}</span>
  </button>
{/if}
<!-- The last picture stays: Remove looks off but still answers, saying why. -->
<button class="btn remove" type="button" aria-disabled={removeDisabledLook} onclick={onRemove}>
  <Icon name="trash" /><span>{t("slideshow.remove")}</span>
</button>

<style>
  .btn {
    height: 40px;
    padding: 0 12px;
    border-color: transparent;
    background: transparent;
    color: inherit;
  }
  .remove :global(svg) {
    color: var(--gl-inverse-danger);
  }
  /* A touch screen keeps the last tapped button "hovered": highlight for a mouse only. */
  @media (hover: hover) {
    .btn:hover:not([aria-disabled="true"]) {
      background: var(--gl-inverse-hover);
    }
    .remove:hover:not([aria-disabled="true"]) {
      background: color-mix(in srgb, var(--gl-inverse-danger) 30%, var(--gl-inverse-bg));
    }
  }
  @container (max-width: 720px) {
    .btn {
      gap: 4px;
      padding: 0 6px;
      font-size: var(--gl-size-caption);
    }
  }
</style>
