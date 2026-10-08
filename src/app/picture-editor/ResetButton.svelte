<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /** "Back to automatic": looks off and says why while the setting is already automatic. */
  let {
    automatic,
    alreadyAutomatic,
    onReset,
  }: {
    automatic: boolean;
    /** Why it is off, e.g. "The duration is already automatic". */
    alreadyAutomatic: string;
    onReset: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<button
  class="btn small ghost"
  type="button"
  aria-disabled={automatic}
  title={automatic ? alreadyAutomatic : undefined}
  onclick={() => {
    if (!automatic) {
      onReset();
    }
  }}
>
  <Icon name="replay" />{t("editor.reset")}
</button>
