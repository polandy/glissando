<script lang="ts">
  import { onMount } from "svelte";
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import ImmichSettingsGroup from "../immich/ImmichSettingsGroup.svelte";
  import Icon from "../components/Icon.svelte";
  import FrameSettingsGroup from "./FrameSettingsGroup.svelte";
  import RadioGroup, { type RadioOption } from "../components/RadioGroup.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import type { Language } from "../i18n/translator";
  import type { SettingsState } from "./app-settings";
  import type { BuildInfo } from "./build-info";
  import type { LanguagePreference } from "./language";
  import {
    effectivePlaybackQuality,
    type PlaybackQuality,
    type PlaybackQualityPreference,
  } from "./playback-quality";
  import type { ThemePreference } from "./theme";
  import { DOCUMENTATION_URL, SOURCE_CODE_URL } from "./project-links";
  import { THIRD_PARTY_LICENSES_FILE } from "./third-party-licenses";
  import VersionGroup from "./VersionGroup.svelte";

  let {
    state,
    immich,
    build,
    updateWaiting,
    onUpdate,
    onTheme,
    onLanguage,
    serverOn,
    screenShortEdge,
    onPlaybackQuality,
    frameCardShown,
    onSetUpFrame,
    onFrameCardShown,
    onCheckImmich,
    onReload,
    onClose,
  }: {
    state: SettingsState;
    immich: ImmichAvailabilityState;
    build: BuildInfo;
    /** A new version waits to take over (ADR-0005). */
    updateWaiting: boolean;
    /** Lets the waiting version take over and reloads. */
    onUpdate: () => void;
    onCheckImmich: () => void;
    /** Reloads the app, e.g. so the owner's proxy can ask for a new sign-in. */
    onReload: () => void;
    onTheme: (theme: ThemePreference) => void;
    onLanguage: (language: LanguagePreference) => void;
    /** The server library is on: its slideshows' quality can be chosen. */
    serverOn: boolean;
    /** This screen's short edge in device pixels, what "auto" decides by. */
    screenShortEdge: number;
    onPlaybackQuality: (quality: PlaybackQualityPreference) => void;
    /** The start screen offers the picture frame card (`dev-docs/app/FRAME.md`). */
    frameCardShown: boolean;
    onSetUpFrame: () => void;
    onFrameCardShown: (shown: boolean) => void;
    /** ✕, the scrim, Esc; it should go back through history (see dev-docs/app/NAVIGATION.md). */
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  const CURRENTLY: Readonly<Record<Language, MessageKey>> = {
    de: "settings.currentlyGerman",
    en: "settings.currentlyEnglish",
  };

  const themes: readonly RadioOption<ThemePreference>[] = $derived([
    {
      value: "system",
      label: t("settings.themeSystem"),
      hint: t("settings.themeSystemHint"),
      icon: "monitor",
    },
    { value: "light", label: t("settings.themeLight"), icon: "sun" },
    { value: "dark", label: t("settings.themeDark"), icon: "moon" },
  ]);
  const languages: readonly RadioOption<LanguagePreference>[] = $derived([
    {
      value: "auto",
      label: t("settings.languageAuto"),
      hint: t(CURRENTLY[state.browserLanguage]),
    },
    { value: "de", label: t("settings.languageGerman") },
    { value: "en", label: t("settings.languageEnglish") },
  ]);

  const QUALITY_NAME: Readonly<Record<PlaybackQuality, MessageKey>> = {
    "1440": "prepare.quality1440",
    "4k": "prepare.quality4k",
  };
  const playbackQualities: readonly RadioOption<PlaybackQualityPreference>[] = $derived([
    {
      value: "auto",
      label: t("settings.playbackQualityAuto"),
      hint: t("settings.playbackQualityAutoHint", {
        quality: t(QUALITY_NAME[effectivePlaybackQuality("auto", screenShortEdge)]),
        // A pixel count reads like the options' "1440", without a thousands separator.
        pixels: String(screenShortEdge),
      }),
    },
    {
      value: "1440",
      label: t("settings.playbackQuality1440"),
      hint: t("settings.playbackQuality1440Hint"),
    },
    {
      value: "4k",
      label: t("settings.playbackQuality4k"),
      hint: t("settings.playbackQuality4kHint"),
    },
  ]);

  let dialog: HTMLDialogElement;

  // The native modal dialog traps focus, makes the page behind it inert and, once closed,
  // returns the focus to the gear.
  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  function closeOnScrim(event: MouseEvent): void {
    if (event.target === dialog) {
      onClose();
    }
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="settings-title"
  oncancel={cancel}
  onclick={closeOnScrim}
>
  <div class="sheet">
    <header>
      <h2 id="settings-title">{t("settings.title")}</h2>
      <button
        class="icon-btn"
        type="button"
        title={t("common.close")}
        aria-label={t("common.close")}
        onclick={onClose}
      >
        <Icon name="close" />
      </button>
    </header>
    <section class="group">
      <div class="eyebrow">{t("settings.appearance")}</div>
      <RadioGroup
        label={t("settings.appearance")}
        options={themes}
        value={state.theme}
        onSelect={onTheme}
      />
    </section>
    <section class="group">
      <div class="eyebrow">{t("settings.language")}</div>
      <RadioGroup
        label={t("settings.language")}
        options={languages}
        value={state.language}
        onSelect={onLanguage}
      />
    </section>
    {#if serverOn}
      <section class="group">
        <div class="eyebrow">{t("settings.playbackQuality")}</div>
        <RadioGroup
          label={t("settings.playbackQuality")}
          options={playbackQualities}
          value={state.playbackQuality}
          onSelect={onPlaybackQuality}
        />
      </section>
      <FrameSettingsGroup
        cardShown={frameCardShown}
        onSetUp={onSetUpFrame}
        onCardShown={onFrameCardShown}
      />
    {/if}
    <ImmichSettingsGroup state={immich} onCheck={onCheckImmich} {onReload} />
    <VersionGroup {build} {updateWaiting} {onUpdate} />
    <p class="footnote">{t("settings.footnote")}</p>
    <div class="links">
      <a href={DOCUMENTATION_URL} target="_blank" rel="noopener noreferrer"
        >{t("settings.documentation")}</a
      >
      <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer"
        >{t("settings.sourceCode")}</a
      >
      <a href={THIRD_PARTY_LICENSES_FILE} target="_blank" rel="noopener">{t("settings.licenses")}</a
      >
    </div>
  </div>
</dialog>

<style>
  dialog {
    position: fixed;
    inset: 72px 24px auto auto;
    width: 380px;
    max-width: calc(100% - 48px);
    max-height: calc(100% - 96px);
    margin: 0;
    padding: 0;
    overflow: auto;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: grid;
    gap: 18px;
    padding: 18px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h2 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-panel-title);
    letter-spacing: var(--gl-tracking-title);
  }
  .group {
    display: grid;
    gap: 8px;
  }
  .footnote {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
  }
  .links a {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    text-underline-offset: 3px;
  }
  .links a:hover {
    color: var(--gl-ink);
  }
  /* The dialog sits in the top layer, outside the screen's container, so the viewport decides;
     the app fills it, so this matches the screens' 720 px container queries. */
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      width: auto;
      max-width: none;
      max-height: 85%;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .sheet {
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
    }
  }
</style>
