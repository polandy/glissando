<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import { qrCodeOf } from "./qr-code";

  /** The link's QR code beside how to use it. */
  let { url }: { url: string } = $props();

  const { t } = getTranslator();
  const code = $derived(qrCodeOf(url));
</script>

<div class="qr">
  <svg
    viewBox="0 0 {code.size} {code.size}"
    role="img"
    aria-label={t("share.qrCodeLabel")}
    shape-rendering="crispEdges"
  >
    <rect class="ground" width={code.size} height={code.size} />
    <path class="modules" d={code.path} />
  </svg>
  <p><b>{t("share.qrStrong")}</b>{t("share.qrAfter")}</p>
</div>

<style>
  .qr {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
  }
  svg {
    flex: none;
    width: 132px;
    height: 132px;
    border-radius: var(--gl-radius-small);
  }
  .ground {
    fill: var(--gl-qr-light);
  }
  .modules {
    fill: var(--gl-qr-dark);
  }
  p {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
  b {
    color: var(--gl-ink);
  }
</style>
