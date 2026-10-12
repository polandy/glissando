import { describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../../immich/immich-client";
import { PictureMissingFromImmichError } from "../../../server-library/server-slideshow-store";
import type { PlaybackQuality } from "../../settings/playback-quality";
import { PrepareFlow, type PrepareView } from "./prepare-flow";
import { FakeRenditions, ManualClock } from "./testing/fake-renditions";

const IDS = Array.from({ length: 30 }, (_, index) => `p${String(index)}`);

/** Slides of `seconds` each, one per picture. */
function evenSlides(count: number, seconds: number) {
  return {
    starts: Array.from({ length: count }, (_, index) => index * seconds),
    duration: count * seconds,
  };
}

function flowFor(quality: PlaybackQuality = "4k") {
  const renditions: Partial<Record<PlaybackQuality, FakeRenditions>> = {};
  const asked: PlaybackQuality[] = [];
  const clock = new ManualClock();
  const missing: string[] = [];
  const flow = new PrepareFlow({
    ids: IDS,
    quality,
    renditionFor: (asking) => {
      asked.push(asking);
      const fake = new FakeRenditions();
      renditions[asking] = fake;
      return fake.prepare;
    },
    clock: clock.now,
    onMissing: (id) => missing.push(id),
  });
  const views: PrepareView[] = [];
  let viewChanged: () => void = () => undefined;
  flow.subscribe((view) => {
    views.push(view);
    viewChanged();
  });
  /** Settles at the next view the flow announces. */
  const nextView = () => new Promise<void>((resolve) => (viewChanged = resolve));
  flow.setSlides(evenSlides(IDS.length, 5));
  const fake = (of: PlaybackQuality): FakeRenditions => {
    const found = renditions[of];
    if (found === undefined) throw new Error(`no ${of} renditions were asked for`);
    return found;
  };
  /** Answers request `index` of `of` after `seconds`. */
  const answer = async (index: number, seconds: number, of: PlaybackQuality = quality) => {
    const request = await fake(of).request(index);
    clock.advance(seconds * 1000);
    request.answer();
    await fake(of).request(index + 1);
  };
  return { flow, views, nextView, fake, answer, asked, missing };
}

describe("PrepareFlow", () => {
  it("measures the first two pictures, then plays at once when one is ready faster than a slide", async () => {
    const { flow, views, answer } = flowFor("1440");

    await answer(0, 1);
    await answer(1, 1);

    expect(views.map((view) => view.stage)).toEqual(["measuring", "measuring", "playing"]);
    expect(views[1]).toMatchObject({ stage: "measuring", measured: 1, measuring: 2 });
    expect(flow.view).toEqual({ stage: "playing", quality: "1440" });
  });

  it("prepares before playing when a picture takes longer than a slide, then plays by itself", async () => {
    const { flow, answer } = flowFor("4k");

    for (let index = 0; index < 6; index += 1) await answer(index, 6);

    // 6 s a picture, 5 s a slide, 30 slides: 6 + 29 · 1 · 1.2 = 40.8 s, 7 pictures.
    expect(flow.view).toEqual<PrepareView>({
      stage: "preparing",
      quality: "4k",
      ready: 6,
      target: 7,
      pictureCount: 30,
      secondsPerPicture: 6,
      secondsPerSlide: 5,
      secondsLeft: 6,
    });
    await answer(6, 6);
    expect(flow.view.stage).toBe("playing");
  });

  it("aims for more pictures once they take longer", async () => {
    const { flow, answer } = flowFor("4k");
    await answer(0, 6);
    await answer(1, 6);
    expect(flow.view).toMatchObject({ stage: "preparing", target: 7 });

    await answer(2, 10);
    await answer(3, 10);

    // The last four average 8 s: 8 + 29 · 3 · 1.2 = 112.4 s, 15 pictures.
    expect(flow.view).toMatchObject({ stage: "preparing", target: 15, secondsPerPicture: 8 });
  });

  it("plays at once when asked and goes on preparing behind the slides", async () => {
    const { flow, fake, answer } = flowFor("4k");
    await answer(0, 6);
    await answer(1, 6);

    flow.startNow();

    expect(flow.view.stage).toBe("playing");
    expect(await (await flow.openPicture("p0")).text()).toBe("rendition p0");
    expect((await fake("4k").request(2)).id).toBe("p2");
  });

  it("plays this time in 1440 when asked, cancelling the 4K preparation", async () => {
    const { flow, fake, answer, asked } = flowFor("4k");
    await answer(0, 6);
    const underWay = await fake("4k").request(1);

    flow.playInPreview();

    expect(underWay.signal.aborted).toBe(true);
    expect(flow.view).toMatchObject({ stage: "measuring", quality: "1440", measured: 0 });
    await answer(0, 1, "1440");
    await answer(1, 1, "1440");
    expect(flow.view).toEqual({ stage: "playing", quality: "1440" });
    expect(asked).toEqual(["4k", "1440"]);
  });

  it("cancels the picture under way once closed", async () => {
    const { flow, fake } = flowFor("4k");
    const underWay = await fake("4k").request(0);

    flow.close();

    expect(underWay.signal.aborted).toBe(true);
    expect(fake("4k").requests).toHaveLength(1);
  });

  it("reports a picture Immich no longer has and measures without it", async () => {
    const { flow, fake, answer, missing } = flowFor("1440");

    (await fake("1440").request(0)).fail(new PictureMissingFromImmichError("p0"));
    await answer(1, 1);

    expect(missing).toEqual(["p0"]);
    expect(flow.view).toMatchObject({ stage: "measuring", measured: 1 });
  });

  it("fails when Immich does not answer while preparing", async () => {
    const { flow, fake, views, nextView } = flowFor("4k");
    const unavailable = new ImmichUnavailableError("unreachable");
    const request = await fake("4k").request(0);
    const failed = nextView();

    request.fail(unavailable);
    await failed;

    expect(views.map((view) => view.stage)).toEqual(["measuring", "failed"]);
    expect(flow.view).toEqual({ stage: "failed", error: unavailable });
  });

  it("leaves a picture found missing while playing to the player", async () => {
    const { flow, fake, answer, missing } = flowFor("1440");
    await answer(0, 1);
    await answer(1, 1);
    expect(flow.view.stage).toBe("playing");

    (await fake("1440").request(2)).fail(new PictureMissingFromImmichError("p2"));
    await fake("1440").request(3);

    expect(await flow.openPicture("p2").catch((error: unknown) => error)).toBeInstanceOf(
      PictureMissingFromImmichError,
    );
    expect(missing).toEqual([]);
  });
});
