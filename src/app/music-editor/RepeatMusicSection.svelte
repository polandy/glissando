<script lang="ts">
  import Switch from "../components/Switch.svelte";
  import { getTranslator } from "../i18n/context";

  /**
   * The slideshow's row, in the music editor's panel, for repeating the playlist to end with
   * longer pictures instead of letting them outlast it (ADR-0047): on while `StoredSlideshow`'s
   * `repeatMusic` is set, off otherwise, disabled while the music already outlasts the slideshow.
   */
  let {
    on,
    disabled,
    onRepeatMusic,
  }: {
    on: boolean;
    disabled: boolean;
    /** `undefined`: the playlist plays once. */
    onRepeatMusic: (repeatMusic: true | undefined) => void;
  } = $props();

  const { t } = getTranslator();

  const hint = $derived(
    disabled
      ? t("music.repeatMusicNotNeeded")
      : on
        ? t("music.repeatMusicOnHint")
        : t("music.repeatMusicOffHint"),
  );
</script>

<div>
  <dt>
    <b>{t("music.repeatMusic")}</b>
    <small>{hint}</small>
  </dt>
  <dd>
    <Switch
      checked={on}
      label={t("music.repeatMusic")}
      {disabled}
      onChange={(checked) => onRepeatMusic(checked ? true : undefined)}
    />
  </dd>
</div>

<style>
  div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid var(--gl-line);
  }
  dt {
    display: grid;
    gap: 2px;
    color: var(--gl-ink);
  }
  dt b {
    font-weight: var(--gl-weight-medium);
  }
  dt small {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
