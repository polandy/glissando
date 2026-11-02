<script lang="ts">
  import { getTranslator } from "../../i18n/context";
  import BarAction from "./BarAction.svelte";

  /**
   * The selection bar's actions for exactly one picture (SELECTING_SEVERAL.md): play from it, view
   * it full screen, edit it. Each is left out where the caller offers no way to do it.
   */
  let {
    onPlayFrom,
    onView,
    onEdit,
  }: {
    onPlayFrom?: (() => void) | undefined;
    onView?: (() => void) | undefined;
    onEdit: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

{#if onPlayFrom !== undefined}
  <BarAction
    icon="play"
    accent
    label={t("slideshow.playFromHereShort")}
    name={t("slideshow.playFromHere")}
    onclick={onPlayFrom}
  />
{/if}
{#if onView !== undefined}
  <BarAction
    icon="eye"
    label={t("slideshow.view")}
    name={t("slideshow.viewFullScreen")}
    onclick={onView}
  />
{/if}
<BarAction
  icon="pencil"
  label={t("slideshow.edit")}
  name={t("slideshow.editPicture")}
  onclick={onEdit}
/>
