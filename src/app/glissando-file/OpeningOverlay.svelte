<script lang="ts">
  import BlockingOverlay from "../components/BlockingOverlay.svelte";
  import { getTranslator } from "../i18n/context";
  import type { Opening } from "./open-flow";

  /** Blocks the app while a file opens: the slideshow exists only once it is written. */
  let { opening, onCancel }: { opening: Opening; onCancel: () => void } = $props();

  const { t } = getTranslator();
  const line = $derived(opening.line);
</script>

<BlockingOverlay
  title={t("glissandoFile.openingTitle")}
  detail={line.kind === "checking"
    ? t("glissandoFile.checking")
    : line.kind === "picture"
      ? t("glissandoFile.picture", { number: line.number, count: line.count })
      : t("glissandoFile.music")}
  progress={opening.fraction}
  note={opening.fileName}
  {onCancel}
/>
