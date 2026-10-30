<script lang="ts" module>
  /** What the one view shows on a phone: the frames on the picture, or the preview. */
  export type PhoneView = "frame" | "play";
</script>

<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /** The phone's "Frame | Play" switch; wider screens show both views and never this. */
  let { view, onView }: { view: PhoneView; onView: (view: PhoneView) => void } = $props();

  const { t } = getTranslator();
  const OPTIONS = [
    { view: "frame", icon: "frame", label: "editor.viewFrame" },
    { view: "play", icon: "play", label: "editor.viewPlay" },
  ] as const;
</script>

<div class="view-switch" role="group" aria-label={t("editor.view")}>
  {#each OPTIONS as option (option.view)}
    <button type="button" aria-pressed={option.view === view} onclick={() => onView(option.view)}>
      <Icon name={option.icon} />{t(option.label)}
    </button>
  {/each}
</div>

<style>
  .view-switch {
    display: none;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    font-weight: 600;
    cursor: pointer;
  }
  button[aria-pressed="true"] {
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  @container (max-width: 720px) {
    .view-switch {
      display: grid;
    }
  }
</style>
