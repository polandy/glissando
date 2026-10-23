// `index.html`'s script inside a `.glissando` file (ADR-0038): plays the unpacked folder around
// it with Glissando's own engine (`createPagePlayer`), reading the folder by itself where the
// browser lets it and through the folder picker where it does not. Built into one script by
// build/file-page-plugin.ts; never imports Svelte.
import { canFullscreen } from "../ui-kit/fullscreen";
import { createMusicAudioContext } from "../player/browser/platform";
import { MutableMusicOutput } from "../export-player/mutable-music-output";
import { createPagePlayer } from "../export-player/page-player";
import { loadCaptionFont, showStartFailure } from "../export-player/page-start";
import { createPageView } from "../export-player/page-view";
import "../export-player/page.css";
import { pageCopyFor, shareLanguage } from "../share-page/share-page-words";
import type { GlissandoManifest } from "../glissando-file/glissando-manifest";
import { checkFolder } from "./check-folder";
import { createChooseCard } from "./choose-card";
import { FILE_WORDS_BLOCK_ID, folderProblemText, readFileWords } from "./file-page-words";
import { folderShow } from "./folder-show";
import { fetchedFolder, pickedFolder, type FolderSource } from "./folder-source";
import "./file-page.css";

async function startPage(): Promise<void> {
  const languages = readFileWords(
    document.getElementById(FILE_WORDS_BLOCK_ID)?.textContent ?? null,
  );
  const language = shareLanguage(navigator.language);
  document.documentElement.lang = language;
  const words = languages[language];

  const play = async (manifest: GlissandoManifest, folder: FolderSource): Promise<void> => {
    // Each song played becomes one `blob:` URL for the page's lifetime.
    const show = await folderShow(manifest, folder, (song) => URL.createObjectURL(song), language);
    document.title = show.title;
    const view = createPageView(document, {
      title: show.title,
      copy: pageCopyFor(words, language, show.summary),
      withFullScreen: canFullscreen(),
      withMusic: show.page.slideshow.music !== undefined,
    });
    await loadCaptionFont();
    createPagePlayer(view, new MutableMusicOutput(createMusicAudioContext)).show(show.page);
    // Only now is a click on Play heard; an error the player raised meanwhile stays shown.
    if (view.state === "loading") view.showState("start");
  };

  const chooseCard = createChooseCard(document, words, document.title, (entries) => {
    const picked = pickedFolder(entries);
    checkFolder(picked)
      .then(async (check) => {
        if (check.kind === "ok") {
          chooseCard.hide();
          return play(check.manifest, picked);
        }
        // A picked folder is always readable; one without glissando.json says so.
        chooseCard.show(
          check.kind === "unreadable" ? words.noManifest : folderProblemText(words, check),
        );
      })
      .catch(showStartFailure);
  });

  const beside = fetchedFolder((path) => fetch(path));
  const check = await checkFolder(beside);
  if (check.kind === "ok") return play(check.manifest, beside);
  chooseCard.show(check.kind === "unreadable" ? null : folderProblemText(words, check));
}

startPage().catch(showStartFailure);
