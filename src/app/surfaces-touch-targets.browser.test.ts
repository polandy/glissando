import "../styles/tokens.css";
import "../styles/base.css";
import { createRawSnippet, type Component } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, server } from "vitest/browser";
import { chaptersOfSlideshow } from "../compose/chapters-of-slideshow";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { MAX_VIDEO_EXCERPT_MS, type StoredVideo } from "../library/own-video";
import { HtmlExportSession } from "./html-export/html-export-session";
import { FakeHtmlExportPorts } from "./html-export/testing/fake-html-export-ports";
import { VideoExportSession } from "./video-export/video-export-session";
import type { ExportPreview } from "./video-export/slideshow-video-export";
import type { VideoExportPorts } from "./video-export/export-sheet-state";
import { FakeExportPorts } from "./video-export/testing/fake-export-ports";
import { ChapterSettingsEditor } from "./editing/chapter-settings-editor";
import { ResetUndo } from "./editing/reset-undo";
import { Toaster } from "./toast/toaster";
import { FakeScheduler } from "../ui-kit/testing/fake-scheduler";
import { slideshowDetails } from "./library-views";
import Header from "./components/Header.svelte";
import ClipEditorScreen from "./clip-editor/ClipEditorScreen.svelte";
import CardSheet from "./screens/slideshow/card-sheet/CardSheet.svelte";
import { FakeClock, FakeFrameScheduler } from "../player/testing/fakes";
import FocusSheet from "./screens/slideshow/FocusSheet.svelte";
import HtmlExportSheet from "./screens/slideshow/HtmlExportSheet.svelte";
import VideoExportSheet from "./screens/slideshow/VideoExportSheet.svelte";
import ChapterSheet from "./screens/slideshow/chapter-sheet/ChapterSheet.svelte";
import StartScreen from "./screens/StartScreen.svelte";
import { view } from "./picture-editor/picture-editor-harness";
import { Navigator, type Route } from "./navigation/navigator";
import { FakeHistory } from "./testing/fake-history";
import { emulateCoarsePointer } from "./testing/coarse-pointer";
import { mountWithTranslator } from "./testing/mount-with-translator";
import { touchTargetViolations } from "./testing/touch-target";
import type { Place } from "../places/nearest-place";
import type { PicturesFocus } from "./focus/pictures-focus";

/** Firefox and WebKit cannot turn a coarse pointer on per test; Chromium can. */
const canEmulate = server.browser === "chromium";
const PHONE = { width: 390, height: 844 };
const THEMES = ["light", "dark"] as const;
// A generated 1×1 pixel stands in for every picture.
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

let destroy = () => {};
beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
  await emulateCoarsePointer(true);
});
afterEach(async () => {
  destroy();
  destroy = () => {};
  document.documentElement.removeAttribute("data-theme");
  await emulateCoarsePointer(false);
});

function mount<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const mounted = mountWithTranslator(component, props);
  destroy = mounted.destroy;
  return mounted.target;
}

const LISBON: Place = { name: "Lisbon", latitude: 38.7223, longitude: -9.1393 };
const PORTO: Place = { name: "Porto", latitude: 41.1579, longitude: -8.6291 };

function storedSlideshow(): StoredSlideshow {
  return {
    id: "show",
    title: "Trip",
    createdAt: "2025-06-01T00:00:00Z",
    pictures: ["p1", "p2", "p3"].map((id, index) => ({
      id,
      fileName: `${id}.jpg`,
      capturedAt: `2025-06-${10 + index * 5}T09:00:00Z`,
      width: 100,
      height: 100,
      colours: { veil: "#202020", accent: "#e0e0e0" },
      place: index < 2 ? LISBON : PORTO,
    })),
    songs: [],
    secondsPerPicture: 5,
  };
}

describe.skipIf(!canEmulate).each(THEMES)("surface touch targets, %s theme", (theme) => {
  beforeEach(() => document.documentElement.setAttribute("data-theme", theme));

  it("gives every control of the library's slideshow cards a 44 px square", () => {
    const summary = (id: string, title: string) => ({
      id,
      title,
      coverUrls: [PIXEL],
      pictureCount: 40,
      durationSeconds: 200,
      hasMusic: true,
    });
    const target = mount(StartScreen, {
      slideshows: [summary("lake", "Sommer am See"), summary("hike", "Wanderung Allgäu")],
      focusSearches: new Map([["lake", { done: 12, total: 40, again: false, failed: 0 }]]),
      serverFocusSearches: new Map(),
      onCreate: () => {},
      today: "2025-12-01T10:00:00Z",
      onOpen: () => {},
      onSettings: () => {},
      onOpenFile: () => {},
      notice: null,
      onDismissNotice: () => {},
      onReload: () => {},
      onSetUpFrame: () => {},
      onHideFrameCard: () => {},
      updateWaiting: false,
      statusBar: createRawSnippet(() => ({ render: () => "<footer></footer>" })),
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the app header a 44 px square", () => {
    const navigator = new Navigator(new FakeHistory());
    const show: Route = { screen: "slideshow", slideshowId: "s1" };
    navigator.open(show);
    navigator.open({ screen: "picture", slideshowId: "s1", pictureId: "p2" });
    const mounted = mountWithTranslator(
      Header,
      {
        crumbs: ["Start", "Sommer am See", "Bild 2"],
      },
      undefined,
      navigator,
    );
    destroy = mounted.destroy;

    expect(touchTargetViolations(mounted.target)).toEqual([]);
  });

  it("gives every control of the web page export sheet a 44 px square", () => {
    const session = new HtmlExportSession(
      {
        title: "Sommer am See",
        durationMs: 10_000,
        withMusic: false,
        pictureCount: 3,
        picturesFromImmich: false,
        clipCount: 0,
      },
      new FakeHtmlExportPorts(),
    );
    const target = mount(HtmlExportSheet, {
      session,
      coverUrl: "",
      thumbnailUrls: [],
      onClose: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the video export sheet a 44 px square", () => {
    const session = new VideoExportSession<ExportPreview>(
      { title: "Sommer am See", durationMs: 10_000, withMusic: false, withAudio: false },
      new FakeExportPorts() as unknown as VideoExportPorts<ExportPreview>,
    );
    const target = mount(VideoExportSheet, { session, coverUrl: "", onClose: () => {} });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the chapter sheet a 44 px square", () => {
    let current = storedSlideshow();
    const editor = new ChapterSettingsEditor(
      {
        chapterDeletedText: () => "Kapitel gelöscht",
        chapterTitleResetText: () => "Kapiteltitel wieder automatisch",
        chapterSubtitleResetText: () => "Kapitel-Untertitel wieder automatisch",
      },
      new ResetUndo(new Toaster(new FakeScheduler()), () => "Rückgängig"),
      () => current,
      (next) => (current = next),
    );
    expect(chaptersOfSlideshow(current, "de").length).toBeGreaterThan(0);
    const target = mount(ChapterSheet, {
      slideshow: slideshowDetails(current, (id) => `${id}.jpg`, "de"),
      chapterEditor: editor,
      anchorPictureId: "p3",
      onClose: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the focus sheet a 44 px square", () => {
    const focus: PicturesFocus = {
      found: new Map([
        [
          "a",
          { kind: "subject", box: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, foundBy: "face" },
        ],
        ["c", { kind: "scenery" }],
      ]),
      searching: new Set(),
      failed: new Set(["b"]),
      outdated: new Set(),
    };
    const target = mount(FocusSheet, {
      focus,
      pictures: ["a", "b", "c"].map((id) => ({ id, thumbnailUrl: PIXEL, ownMotion: id === "a" })),
      search: undefined,
      passPaused: false,
      onServer: false,
      onEdit: () => {},
      onLookAgain: () => {},
      onClose: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the card sheet a 44 px square", () => {
    const target = mount(CardSheet, {
      kind: "opening",
      card: {
        title: "Juli 2025",
        subtitle: "1.–20. Juli",
        style: "modern",
        position: "centre",
        entrance: "rise",
        background: { kind: "picture", pictureId: "p1", fade: 60, tint: "picture" },
        motion: true,
      },
      ensureCard: () => {
        throw new Error("the card is present");
      },
      pictures: storedSlideshow().pictures.map((picture) => ({
        id: picture.id,
        thumbnailUrl: PIXEL,
        capturedAt: picture.capturedAt,
        ownMotion: false,
        ownDurationMs: null,
        ownTransition: null,
        pairedWithNumber: null,
        blurredFill: false,
        alone: false,
        colours: picture.colours,
      })),
      previewPorts: { clock: new FakeClock(), frames: new FakeFrameScheduler() },
      reducedMotion: true,
      onChange: () => {},
      onRemove: () => {},
      onClose: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the clip editor a 44 px square", () => {
    const video: StoredVideo = { mediaId: "v", sourceMs: 60_000, startMs: 10_000, endMs: 25_000 };
    expect(video.endMs - video.startMs).toBeLessThanOrEqual(MAX_VIDEO_EXCERPT_MS);
    const target = mount(ClipEditorScreen, {
      slide: view(),
      video,
      wave: null,
      slideshowTitle: "Sommer am See",
      posterUrl: PIXEL,
      videoUrl: null,
      saving: false,
      onBack: () => {},
      onOpen: () => {},
      onExcerpt: () => {},
      onVolume: () => {},
      onDuckMusic: () => {},
      onReset: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });
});
