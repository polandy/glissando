<script lang="ts">
  import Icon from "./Icon.svelte";
  import { getTranslator } from "../i18n/context";

  const { t } = getTranslator();

  /** "Back to automatic": looks off and says why while the setting is already automatic. */
  let {
    automatic,
    alreadyAutomatic,
    label = t("editor.reset"),
    wide = false,
    onReset,
  }: {
    automatic: boolean;
    /** Why it is off, e.g. "The duration is already automatic". */
    alreadyAutomatic: string;
    /** What the reset leads back to; "Back to automatic" unless given. */
    label?: string;
    /** Fills the width of its row. */
    wide?: boolean;
    onReset: () => void;
  } = $props();
</script>

<button
  class="btn small ghost"
  class:wide
  type="button"
  aria-disabled={automatic}
  title={automatic ? alreadyAutomatic : undefined}
  onclick={() => {
    if (!automatic) {
      onReset();
    }
  }}
>
  <Icon name="replay" />{label}
</button>

<style>
  .wide {
    width: 100%;
  }
</style>
