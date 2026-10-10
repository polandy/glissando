<script lang="ts">
  import type { SlideshowHome } from "../../server-library/server-library-memory";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import type { IconName } from "../../ui-kit/icons";

  /** "Where should it live?": this device or the Glissando server (`dev-docs/SERVER_LIBRARY.md`). */
  let {
    home,
    locked,
    onChoose,
  }: {
    home: SlideshowHome;
    /** A picture is in: the choice is fixed for this slideshow. */
    locked: boolean;
    onChoose: (home: SlideshowHome) => void;
  } = $props();

  const OPTIONS: readonly {
    home: SlideshowHome;
    icon: IconName;
    label: MessageKey;
    text: MessageKey;
  }[] = [
    { home: "device", icon: "device", label: "server.whereDevice", text: "server.whereDeviceText" },
    { home: "server", icon: "server", label: "server.whereServer", text: "server.whereServerText" },
  ];

  const { t } = getTranslator();
</script>

<section class="where" aria-labelledby="where-title">
  <h2 id="where-title" class="eyebrow">{t("server.whereTitle")}</h2>
  <div class="options">
    {#each OPTIONS as option (option.home)}
      <button
        class="option"
        type="button"
        aria-pressed={option.home === home}
        disabled={locked}
        onclick={() => onChoose(option.home)}
      >
        <Icon name={option.icon} />
        <span>
          <b>{t(option.label)}</b>
          <small>{t(option.text)}</small>
        </span>
      </button>
    {/each}
  </div>
  {#if locked}
    <small class="chosen">{t("server.whereChosen")}</small>
  {/if}
</section>

<style>
  .where {
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .eyebrow {
    margin: 0;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }
  .option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border: 1.5px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .option[aria-pressed="true"] {
    border-color: var(--gl-accent);
    background: color-mix(in srgb, var(--gl-accent) 12%, var(--gl-surface));
  }
  .option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .option b {
    display: block;
    font-weight: var(--gl-weight-semibold);
  }
  .option small,
  .chosen {
    display: block;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    line-height: 1.35;
  }
</style>
