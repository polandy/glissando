<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /** The share sheet before there is a link: what a recipient gets, and for how long. */
  const { t } = getTranslator();
</script>

<ul class="about">
  <li>
    <Icon name="globe" />
    <span><b>{t("share.anyoneStrong")}</b>{t("share.anyoneAfter")}</span>
  </li>
  <li>
    <Icon name="lock" />
    <span>{t("share.privateBefore")}<b>{t("share.privateStrong")}</b>{t("share.privateAfter")}</span
    >
  </li>
  <li>
    <Icon name="sync" />
    <span>{t("share.liveBefore")}<b>{t("share.liveStrong")}</b></span>
  </li>
</ul>

<style>
  .about {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--gl-size-body);
    line-height: 1.5;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  li :global(.icon) {
    margin-top: 3px;
    color: var(--gl-muted);
  }
</style>
