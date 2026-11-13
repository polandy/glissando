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

function flowFor(
  quality: PlaybackQuality = "4k",
  start?: { slide: number; picture: string; first?: string },
  ids: readonly string[] = IDS,
) {
  const renditions: Partial<Record<PlaybackQuality, FakeRenditions>> = {};
  const asked: PlaybackQuality[] = [];
  const clock = new ManualClock();
  const missing: string[] = [];
  const flow = new PrepareFlow({
    ids,
    ...(start === undefined ? {} : { startPicture: start.picture }),
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
  flow.setSlides(evenSlides(ids.length, 5), start?.slide, start?.first);
  const fake = (of: PlaybackQuality): FakeRenditions => {
    const found = renditions[of];
    if (found === undefined) throw new Error(`no ${of} renditions were asked for`);
    return found;
  };
  const answered: Partial<Record<PlaybackQuality, number>> = {};
  /** Answers the requests of `of` under way, each after `seconds`, and waits for the next one. */
  const round = async (seconds: number, of: PlaybackQuality = quality) => {
    const underWay = fake(of).requests.slice(answered[of] ?? 0);
    answered[of] = fake(of).requests.length;
    clock.advance(seconds * 1000);
    for (const request of underWay) request.answer();
    await fake(of).request(fake(of).requests.length);
  };
  const requested = (of: PlaybackQuality = quality) => fake(of).requests.map(({ id }) => id);
  return { flow, views, nextView, fake, clock, round, requested, asked, missing };
}

describe("PrepareFlow", () => {
  it("asks for three previews at once, two 4K pictures", async () => {
    expect((await flowFor("1440").fake("1440").request(2)).id).toBe("p2");
    expect((await flowFor("4k").fake("4k").request(1)).id).toBe("p1");
    expect(flowFor("4k").fake("4k").requests).toHaveLength(2);
  });

  it("measures the first two pictures, then prepares the pre-roll of six and plays by itself", async () => {
    const { flow, views, fake, nextView, clock, round } = flowFor("1440");

    clock.advance(1000);
    for (const index of [0, 1, 2]) {
      const changed = nextView();
      (await fake("1440").request(index)).answer();
      await changed;
    }

    expect(views.map((view) => view.stage)).toEqual([
      "measuring",
      "measuring",
      "preparing",
      "preparing",
    ]);
    expect(views[1]).toMatchObject({ stage: "measuring", measured: 1, measuring: 2 });
    expect(flow.view).toEqual<PrepareView>({
      stage: "preparing",
      quality: "1440",
      ready: 3,
      target: 6,
      pictureCount: 30,
      secondsLeft: 1,
    });
    await round(1);
    expect(flow.view).toEqual({ stage: "playing", quality: "1440" });
  });

  it("keeps the pre-roll within a short slideshow", async () => {
    const { flow, round } = flowFor("1440", undefined, IDS.slice(0, 4));

    await round(1);

    expect(flow.view).toMatchObject({ stage: "preparing", ready: 3, target: 4, pictureCount: 4 });
  });

  it("prepares more than the pre-roll when a round of pictures takes longer than its slides", async () => {
    const { flow, round } = flowFor("4k");

    await round(12);

    // 12 s a picture, two at a time, 5 s a slide, 30 slides: 12 + 28 · 1.2 = 45.6 s, 8 pictures.
    expect(flow.view).toEqual<PrepareView>({
      stage: "preparing",
      quality: "4k",
      ready: 2,
      target: 8,
      pictureCount: 30,
      secondsLeft: 36,
    });
    await round(12);
    await round(12);
    await round(12);
    expect(flow.view.stage).toBe("playing");
  });

  it("aims for more pictures once they take longer", async () => {
    const { flow, round } = flowFor("4k");
    await round(12);
    expect(flow.view).toMatchObject({ stage: "preparing", target: 8 });

    await round(20);

    // The last four average 16 s: 16 + (14 · 16 − 28 · 5) · 1.2 = 116.8 s, 16 pictures.
    expect(flow.view).toMatchObject({ stage: "preparing", target: 16 });
  });

  it("plays at once when asked and goes on preparing behind the slides", async () => {
    const { flow, round, requested } = flowFor("4k");
    await round(12);

    flow.startNow();

    expect(flow.view.stage).toBe("playing");
    expect(await (await flow.openPicture("p0")).text()).toBe("rendition p0");
    expect(requested()).toEqual(["p0", "p1", "p2", "p3"]);
  });

  it("plays this time in 1440 when asked, cancelling the 4K pictures under way", async () => {
    const { flow, fake, round, asked } = flowFor("4k");
    const underWay = [await fake("4k").request(0), await fake("4k").request(1)];

    flow.playInPreview();

    expect(underWay.map(({ signal }) => signal.aborted)).toEqual([true, true]);
    expect(flow.view).toMatchObject({ stage: "measuring", quality: "1440", measured: 0 });
    await round(1, "1440");
    await round(1, "1440");
    expect(flow.view).toEqual({ stage: "playing", quality: "1440" });
    expect(asked).toEqual(["4k", "1440"]);
  });

  it("cancels the pictures under way once closed", async () => {
    const { flow, fake } = flowFor("4k");
    const underWay = [await fake("4k").request(0), await fake("4k").request(1)];

    flow.close();

    expect(underWay.map(({ signal }) => signal.aborted)).toEqual([true, true]);
    expect(fake("4k").requests).toHaveLength(2);
  });

  it("reports a picture Immich no longer has and measures without it", async () => {
    const { flow, fake, missing } = flowFor("1440");

    (await fake("1440").request(0)).fail(new PictureMissingFromImmichError("p0"));
    (await fake("1440").request(1)).answer();
    await fake("1440").request(4);

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
    const { flow, fake, round, missing } = flowFor("1440");
    await round(1);
    await round(1);
    expect(flow.view.stage).toBe("playing");

    (await fake("1440").request(6)).fail(new PictureMissingFromImmichError("p6"));

    expect(await flow.openPicture("p6").catch((error: unknown) => error)).toBeInstanceOf(
      PictureMissingFromImmichError,
    );
    expect(missing).toEqual([]);
  });

  it("prepares from the start slide: the pictures before it are never asked for", async () => {
    const { flow, round, requested } = flowFor("4k", { slide: 20, picture: "p20" });

    await round(30);

    // 30 s a picture, two at a time, ten slides of 5 s left: 30 + (4 · 30 − 8 · 5) · 1.2 = 126 s,
    // five rounds: every picture left.
    expect(requested()).toEqual(["p20", "p21", "p22", "p23"]);
    expect(flow.view).toMatchObject({
      stage: "preparing",
      ready: 2,
      target: 10,
      pictureCount: 10,
    });
  });

  it("prepares the first picture of a pair whose partner was chosen", async () => {
    const { round, requested } = flowFor("4k", { slide: 20, picture: "p21", first: "p20" });

    expect(requested()).toEqual(["p21", "p22"]);
    await round(6);

    expect(requested()).toEqual(["p21", "p22", "p20", "p23"]);
  });
});
