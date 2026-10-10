// Deep, not the engine's index: the index brings in `createPlayer` and its worker file.
import {
  MusicOutput,
  type CreateMusicAudioContext,
  type GainNodeLike,
  type MusicAudioContext,
  type MusicVolume,
  type VolumeElement,
} from "../player/browser/music-output";

export interface MutableElement extends VolumeElement {
  muted: boolean;
}

interface MasterGain<Element extends VolumeElement> {
  readonly node: GainNodeLike;
  readonly context: MusicAudioContext<Element>;
}

const SILENT = 0;
const FULL = 1;

/**
 * The page's music output with a mute: a master gain in front of the speakers, because the
 * player sets each element's own gain every frame; without Web Audio, the element's `muted`.
 */
export class MutableMusicOutput<
  Element extends MutableElement = HTMLMediaElement,
> extends MusicOutput<Element> {
  readonly #elements: Element[] = [];
  /** The one master gain, once the context exists. */
  readonly #masters: readonly MasterGain<Element>[];
  #muted = false;

  constructor(createContext: CreateMusicAudioContext<Element>) {
    const master: MasterGain<Element>[] = [];
    super(() => {
      const context = createContext();
      if (context === null) {
        return null;
      }
      const node = context.createGain();
      node.connect(context.destination);
      master.push({ node, context });
      return withDestination(context, node);
    });
    this.#masters = master;
  }

  get muted(): boolean {
    return this.#muted;
  }

  set muted(muted: boolean) {
    this.#muted = muted;
    for (const element of this.#elements) {
      element.muted = muted;
    }
    for (const { node, context } of this.#masters) {
      node.gain.setValueAtTime(muted ? SILENT : FULL, context.currentTime);
    }
  }

  override route(element: Element): MusicVolume {
    this.#elements.push(element);
    element.muted = this.#muted;
    return super.route(element);
  }
}

/** `context` with `destination` in place of its speakers. */
function withDestination<Element extends VolumeElement>(
  context: MusicAudioContext<Element>,
  destination: GainNodeLike,
): MusicAudioContext<Element> {
  return {
    get currentTime() {
      return context.currentTime;
    },
    get state() {
      return context.state;
    },
    destination,
    resume: () => context.resume(),
    createMediaElementSource: (element) => context.createMediaElementSource(element),
    createGain: () => context.createGain(),
  };
}
