// The exported page's script (dev-docs/HTML_EXPORT.md): reads the page's data blocks and plays
// the slideshow with Glissando's own engine (`createPagePlayer`). Built into one self-contained
// script by build/export-player-plugin.ts; never imports Svelte.
import { canFullscreen } from "../ui-kit/fullscreen";
import { MEDIA_TYPE_ATTRIBUTE } from "../html-export/page-contract";
import { createMusicAudioContext } from "../player/browser/platform";
import { VideoElementPool } from "../player/browser/video-element-pool";
import { MutableMusicOutput } from "./mutable-music-output";
import { readPageData, withSongUrls, type PageBlock } from "./page-data";
import { createPagePlayer } from "./page-player";
import { loadCaptionFont, showStartFailure } from "./page-start";
import { createPageView } from "./page-view";
import "./page.css";

function readBlock(id: string): PageBlock | null {
  const element = document.getElementById(id);
  return element === null
    ? null
    : { text: element.textContent, mimeType: element.getAttribute(MEDIA_TYPE_ATTRIBUTE) };
}

async function startPage(): Promise<void> {
  const data = readPageData(readBlock);
  // Each embedded song becomes one `blob:` URL for the page's lifetime.
  const slideshow = withSongUrls(data.slideshow, data.songs, (song) => URL.createObjectURL(song));
  const view = createPageView(document, {
    title: data.slideshow.title,
    copy: data.copy,
    withFullScreen: canFullscreen(),
    withMusic: slideshow.music !== undefined,
  });
  await loadCaptionFont();
  const music = new MutableMusicOutput(createMusicAudioContext);
  const videoElementPool = new VideoElementPool();
  createPagePlayer(view, music, {}, videoElementPool).show({
    slideshow,
    openPicture: data.openPicture,
    readVideo: data.readVideo,
  });
  // Only now is a click on Play heard; an error the player raised meanwhile stays shown.
  if (view.state === "loading") view.showState("start");
}

startPage().catch(showStartFailure);
