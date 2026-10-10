<script lang="ts">
  import { onMount } from "svelte";
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import ImmichSettingsGroup from "../immich/ImmichSettingsGroup.svelte";
  import Icon from "../components/Icon.svelte";
  import RadioGroup, { type RadioOption } from "../components/RadioGroup.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import type { Language } from "../i18n/translator";
  import type { SettingsState } from "./app-settings";
  import type { LanguagePreference } from "./language";
  import type { ThemePreference } from "./theme";
  import { THIRD_PARTY_LICENSES_FILE } from "./third-party-licenses";

  let {
    state,
    immich,
    onTheme,
    onLanguage,
    onCheckImmich,
    onReload,
    onClose,
  }: {
    state: SettingsState;
    immich: ImmichAvailabilityState;
    onCheckImmich: () => void;
    /** Reloads the app, e.g. so the owner's proxy can ask for a new sign-in. */
    onReload: () => void;
    onTheme: (theme: ThemePreference) => void;
    onLanguage: (language: LanguagePreference) => void;
    /** ✕, the scrim, Esc; it should go back through history (see dev-docs/APP.md). */
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
    <ImmichSettingsGroup state={immich} onCheck={onCheckImmich} {onReload} />
    <p class="footnote">{t("settings.footnote")}</p>
    <a class="licenses" href={THIRD_PARTY_LICENSES_FILE} target="_blank" rel="noopener">
      {t("settings.licenses")}
    </a>
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
  .licenses {
    justify-self: start;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    text-underline-offset: 3px;
  }
  .licenses:hover {
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
