<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import QrCodeFigure from "./QrCodeFigure.svelte";
  import type { SharedLink, ShareLinkSession } from "./share-link-session";

  /** The share sheet with its link: copy it, hand it on, watch it, scan it. */
  let {
    session,
    link,
    copied,
    qrCodeShown,
    title,
  }: {
    session: ShareLinkSession;
    link: SharedLink;
    copied: boolean;
    qrCodeShown: boolean;
    /** The slideshow's title, handed to the browser's share sheet. */
    title: string;
  } = $props();

  const { t, formatDate } = getTranslator();
</script>

<div class="link-box">
  <output class="mono" aria-label={t("share.link")}>{link.url}</output>
  {#if session.canCopy}
    <button class="btn" class:copied type="button" onclick={() => void session.copy()}>
      <Icon name={copied ? "check" : "copy"} />{copied ? t("share.copied") : t("share.copy")}
    </button>
  {/if}
</div>
<div class="ways">
  {#if session.canUseShareSheet}
    <button class="btn" type="button" onclick={() => void session.shareVia(title)}>
      <Icon name="share" />{t("share.shareVia")}
    </button>
  {/if}
  <button class="btn" type="button" onclick={() => session.openAsViewer()}>
    <Icon name="eye" />{t("share.openAsViewer")}
  </button>
  <button
    class="btn"
    type="button"
    aria-pressed={qrCodeShown}
    onclick={() => session.toggleQrCode()}
  >
    <Icon name="qrCode" />{t("share.qrCode")}
  </button>
</div>
{#if qrCodeShown}
  <QrCodeFigure url={link.url} />
{/if}
<p class="since">
  <span>{t("share.created", { date: formatDate(link.createdAt) })}</span>
  <span aria-hidden="true">·</span>
  <span>{t("share.untilOff")}</span>
</p>

<style>
  .link-box {
    display: flex;
    gap: 8px;
  }
  output {
    display: block;
    flex: 1;
    min-width: 0;
    height: 44px;
    padding: 0 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
    line-height: 42px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: all;
  }
  .link-box .btn {
    height: 44px;
    min-width: 104px;
  }
  .link-box .copied {
    border-color: transparent;
    background: var(--gl-mint-tint);
  }
  /* On a narrow phone, a long label wraps the row rather than squeezing its neighbours. */
  .ways {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ways .btn {
    flex: 1 1 auto;
    padding: 0 12px;
  }
  .ways .btn[aria-pressed="true"] {
    border-color: var(--gl-faint);
    background: var(--gl-hover);
  }
  .since {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
