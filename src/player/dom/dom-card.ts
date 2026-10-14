import { BACKDROP_BLUR_RADIUS_SHARE } from "../backdrop-blur";
import { canvasCardMeasure } from "../card-measure";
import { cardStyles, type CardStyles } from "../card-style";
import { CARD_STYLE_SPECS } from "../card-style-table";
import type { Size } from "../ken-burns";
import type { CardVisual, PictureSlideLayer } from "../ports";
import type { Card } from "../slideshow";

/** Veil amounts below this draw nothing: no filter, no tint (ADR-0032). */
const VEIL_NEGLIGIBLE_AMOUNT = 0;
const VEIL_SATURATION_SHARE = 0.6;
const VEIL_CONTRAST_SHARE = 0.35;
const VEIL_TINT_OPACITY_SHARE = 0.35;

const GROUND_ATTRIBUTE = "data-ground";
const VEIL_TINT_ATTRIBUTE = "data-veil-tint";
const CARD_ATTRIBUTE = "data-card";

/**
 * The DOM elements a title card draws beyond its slide's own picture or ground (ADR-0032,
 * `dev-docs/player/TITLE_CARDS.md`): the ground colour, the veil's filter and tint, and the
 * title/subtitle lines, each kept across frames and keyed by the stored `Card` so a slide's
 * elements are created once and released with it, as captions are keyed by their picture.
 */
export class CardOverlay {
  readonly #host: HTMLElement;
  readonly #grounds = new Map<Card, HTMLElement>();
  readonly #veilTints = new Map<Card, HTMLElement>();
  readonly #cardNodes = new Map<Card, HTMLElement>();
  readonly #layoutCache = new Map<Card, { readonly stage: Size; readonly styles: CardStyles }>();

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  /** True for a node this class placed, which the renderer's generic sweep must not remove. */
  isExtra(node: ChildNode): boolean {
    return (
      node instanceof HTMLElement &&
      (node.hasAttribute(GROUND_ATTRIBUTE) ||
        node.hasAttribute(VEIL_TINT_ATTRIBUTE) ||
        node.hasAttribute(CARD_ATTRIBUTE))
    );
  }

  /** The ground slide's own element: a solid colour filling the stage. Returns it as the anchor. */
  placeGround(ground: string, card: Card, opacity: number): HTMLElement {
    const element = this.#elementFor(this.#grounds, card, GROUND_ATTRIBUTE);
    Object.assign(element.style, {
      position: "absolute",
      inset: "0",
      backgroundColor: ground,
      opacity: String(opacity),
    });
    this.#append(element);
    return element;
  }

  /**
   * The veil over a picture layer's own node (`anchor`): a CSS filter on `anchor` itself, plus a
   * tint overlay, returned so the caller orders it on screen. Both clear at amount 0, when this
   * returns `undefined`.
   */
  placeVeil<Picture extends Size>(
    anchor: HTMLElement,
    layer: PictureSlideLayer<Picture>,
    card: Card,
  ): HTMLElement | undefined {
    const amount = layer.card?.veilAmount ?? VEIL_NEGLIGIBLE_AMOUNT;
    const tint = layer.card?.card.veil?.tint;
    if (amount <= VEIL_NEGLIGIBLE_AMOUNT || tint === undefined) {
      anchor.style.filter = "";
      this.#veilTints.get(card)?.remove();
      this.#veilTints.delete(card);
      return undefined;
    }
    const blurPx = BACKDROP_BLUR_RADIUS_SHARE * Math.max(layer.picture.width, layer.picture.height) * amount;
    anchor.style.filter = `blur(${blurPx}px) saturate(${1 - VEIL_SATURATION_SHARE * amount}) contrast(${1 - VEIL_CONTRAST_SHARE * amount})`;
    const tintElement = this.#elementFor(this.#veilTints, card, VEIL_TINT_ATTRIBUTE);
    Object.assign(tintElement.style, {
      position: "absolute",
      inset: "0",
      backgroundColor: tint,
      opacity: String(VEIL_TINT_OPACITY_SHARE * amount),
    });
    return tintElement;
  }

  /** The title/subtitle lines, faded and drifted per `cardVisual`, for the caller to order on screen. */
  placeText(cardVisual: CardVisual, layerOpacity: number, stage: Size): HTMLElement {
    const container = this.#elementFor(this.#cardNodes, cardVisual.card, CARD_ATTRIBUTE);
    Object.assign(container.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      opacity: String(cardVisual.textOpacity * layerOpacity),
    });
    const styles = this.#stylesFor(cardVisual.card, stage);
    this.#fillLines(container, styles.titleLines, cardVisual.driftEm, "title");
    this.#fillLines(container, styles.subtitleLines, cardVisual.driftEm, "subtitle");
    return container;
  }

  /** Drops every ground, veil tint and card kept for a `Card` not in `shown`. */
  sweep(shown: ReadonlySet<Card>): void {
    for (const [card, element] of this.#grounds) {
      if (!shown.has(card)) {
        element.remove();
        this.#grounds.delete(card);
      }
    }
    for (const [card, element] of this.#veilTints) {
      if (!shown.has(card)) {
        element.remove();
        this.#veilTints.delete(card);
      }
    }
    for (const [card, element] of this.#cardNodes) {
      if (!shown.has(card)) {
        element.remove();
        this.#cardNodes.delete(card);
        this.#layoutCache.delete(card);
      }
    }
  }

  #fillLines(
    container: HTMLElement,
    lines: CardStyles["titleLines"],
    driftEm: number,
    part: "title" | "subtitle",
  ): void {
    const existing = [...container.querySelectorAll<HTMLElement>(`[data-card-${part}]`)];
    lines.forEach((line, index) => {
      const element = existing[index] ?? this.#newLine(container, part);
      Object.assign(element.style, line.declarations, {
        transform: `${line.declarations.transform} translateY(${driftEm}em)`,
      });
      if (element.textContent !== line.text) {
        element.textContent = line.text;
      }
    });
    for (const extra of existing.slice(lines.length)) {
      extra.remove();
    }
  }

  #newLine(container: HTMLElement, part: "title" | "subtitle"): HTMLElement {
    const element = document.createElement("div");
    element.setAttribute(`data-card-${part}`, "");
    container.append(element);
    return element;
  }

  #stylesFor(card: Card, stage: Size): CardStyles {
    const cached = this.#layoutCache.get(card);
    if (cached !== undefined && cached.stage.width === stage.width && cached.stage.height === stage.height) {
      return cached.styles;
    }
    const spec = CARD_STYLE_SPECS[card.style];
    const styles = cardStyles(
      card,
      stage,
      canvasCardMeasure(spec.title, stage),
      canvasCardMeasure(spec.subtitle, stage),
    );
    this.#layoutCache.set(card, { stage, styles });
    return styles;
  }

  #elementFor(map: Map<Card, HTMLElement>, card: Card, attribute: string): HTMLElement {
    const existing = map.get(card);
    if (existing !== undefined) {
      return existing;
    }
    const element = document.createElement("div");
    element.setAttribute(attribute, "");
    map.set(card, element);
    return element;
  }

  #append(element: HTMLElement): void {
    if (element.parentElement !== this.#host) {
      this.#host.append(element);
    }
  }
}
