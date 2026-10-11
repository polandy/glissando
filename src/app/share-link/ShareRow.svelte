<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /**
   * The info panel's row under the server row (share_link/IN_THE_APP.md): opens the share sheet
   * of a server slideshow; a device slideshow's row only says how it could be shared.
   */
  let {
    link,
    onOpen,
  }: {
    /** "device": not on the server; null: not shared (or not yet known); else the link. */
    link: "device" | string | null;
    /** Opens the share sheet; a device slideshow's row opens nothing. */
    onOpen?: () => void;
  } = $props();

  const { t } = getTranslator();
  /** The row shows the link without its scheme: the host and the token are what tell links apart. */
  const SCHEME = /^https?:\/\//;

  let button = $state<HTMLButtonElement>();

  /** The share sheet closed: focus goes back to the row it was opened from. */
  export function focus(): void {
    button?.focus();
  }
</script>

{#if link === "device"}
  <div class="share-row device">
    <Icon name="link" />
    <span class="text">
      <strong>{t("share.rowTitle")}</strong>
      <small>{t("share.deviceHint")}</small>
    </span>
  </div>
{:else}
  <button bind:this={button} class="share-row" type="button" onclick={() => onOpen?.()}>
    <Icon name="link" />
    <span class="text">
      {#if link === null}
        <strong>{t("share.rowTitle")}</strong>
        <small>{t("share.rowText")}</small>
      {:else}
        <strong>{t("share.rowSharedTitle")}</strong>
        <small class="mono url">{link.replace(SCHEME, "")}</small>
      {/if}
    </span>
    <span class="go">
      {#if link !== null}
        <span class="on-pill"><i></i>{t("share.on")}</span>
      {/if}
      <Icon name="chevronRight" />
    </span>
  </button>
{/if}

<style>
  .share-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  button.share-row:hover {
    background: var(--gl-hover);
  }
  .device {
    border-style: dashed;
    background: transparent;
    color: var(--gl-faint);
    cursor: default;
  }
  .text {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
    font-size: var(--gl-size-meta);
  }
  strong {
    font-weight: var(--gl-weight-semibold);
  }
  .device strong {
    font-weight: var(--gl-weight-medium);
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .url {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .go {
    display: flex;
    flex: none;
    align-items: center;
    gap: 6px;
    color: var(--gl-muted);
  }
  .on-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint-tint);
    color: var(--gl-ink);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .on-pill i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gl-mint);
  }
</style>
