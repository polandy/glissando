<script lang="ts">
  import Dialog from "../../components/Dialog.svelte";
  import { getTranslator } from "../../i18n/context";

  /** "Delete slideshow …" confirmed; a server slideshow's says it goes for every device. */
  let {
    title,
    pictureCount,
    onServer,
    onKeep,
    onDelete,
  }: {
    title: string;
    pictureCount: number;
    onServer: boolean;
    onKeep: () => void;
    onDelete: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<Dialog
  title={t("slideshow.deleteTitle", { title })}
  message={t(onServer ? "server.deleteText" : "slideshow.deleteText", { count: pictureCount })}
  actions={[
    { label: t("slideshow.keep"), onSelect: onKeep },
    { label: t("slideshow.deleteConfirm"), tone: "danger", onSelect: onDelete },
  ]}
  onCancel={onKeep}
/>
