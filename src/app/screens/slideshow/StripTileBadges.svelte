<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { PictureTile } from "../view-models";

  /** The small marks on a strip tile: just added, own motion, own duration, own transition. */
  let {
    picture,
    isNew,
    ownSeconds,
  }: {
    picture: PictureTile;
    isNew: boolean;
    /** The tile's own duration, already formatted; null to use the slideshow's. */
    ownSeconds: string | null;
  } = $props();

  const { t } = getTranslator();
</script>

<span class="badges" aria-hidden="true">
  {#if isNew}
    <span class="badge new-badge">{t("add.newBadge")}</span>
  {/if}
  {#if picture.ownMotion}
    <span class="badge"><Icon name="frame" />{t("slideshow.ownMotionBadge")}</span>
  {/if}
  {#if ownSeconds !== null}
    <span class="badge timing-badge mono"><Icon name="clock" />{ownSeconds}</span>
  {/if}
  {#if picture.ownTransition !== null}
    <span class="badge timing-badge" title={t(`effect.${picture.ownTransition}`)}
      ><Icon name="transition" /></span
    >
  {/if}
</span>

<style>
  .badges {
    position: absolute;
    right: 6px;
    bottom: 22px;
    display: flex;
    gap: 4px;
  }
  .badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    --gl-icon-size: var(--gl-size-caption);
  }
  .badge.new-badge {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
</style>
