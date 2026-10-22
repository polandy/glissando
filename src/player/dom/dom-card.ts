import { BACKDROP_BLUR_RADIUS_SHARE } from "../backdrop-blur";
import { cardItemSlices } from "../card-item-layout";
import type { CardItemLayouts } from "../card-item-layouts";
import { itemGranularity } from "../card-items";
import { canvasCardMeasure } from "../card-measure";
import { layoutCard } from "../card-layout";
import { cardStyles, type CardStyles } from "../card-style";
import { CARD_STYLE_SPECS } from "../card-style-table";
import { CARD_FOCUS_BLUR_SHARE, cardItemTimingAt } from "../card-timing";
import { VEIL_CONTRAST_SHARE, VEIL_SATURATION_SHARE, VEIL_TINT_OPACITY_SHARE } from "../card-veil";
import { placeItemText } from "./dom-card-items";
import type { Size } from "../ken-burns";
import type { CardVisual, PictureSlideLayer } from "../ports";
import type { Card } from "../slideshow";

/** Veil amounts below this draw nothing: no filter, no tint (ADR-0032). */
const VEIL_NEGLIGIBLE_AMOUNT = 0;

const GROUND_ATTRIBUTE = "data-ground";
const VEIL_TINT_ATTRIBUTE = "data-veil-tint";
const CARD_ATTRIBUTE = "data-card";
const BLOCK_SHARP_ATTRIBUTE = "data-card-block-sharp";
const BLOCK_BLUR_ATTRIBUTE = "data-card-block-blur";

interface CachedLayout {
  readonly stage: Size;
  readonly styles: CardStyles;
  /** The tight box's centre around every line, `focus`'s scale pivot (ADR-0032). */
  readonly pivot: { readonly x: number; readonly y: number };
}

/**
 * The DOM elements a title card draws beyond its slide's own picture or ground (ADR-0032,
 * `dev-docs/player/TITLE_CARDS.md`): the ground colour, the veil's filter and tint, and the
 * title/subtitle lines, each kept across frames and keyed by the stored `Card` so a slide's
 * elements are created once and released with it, as captions are keyed by their picture.
 */
export class CardOverlay {
  readonly #host: HTMLElement;
  readonly #cardItemLayouts: CardItemLayouts;
  readonly #grounds = new Map<Card, HTMLElement>();
  readonly #veilTints = new Map<Card, HTMLElement>();
  readonly #cardNodes = new Map<Card, HTMLElement>();
  readonly #layoutCache = new Map<Card, CachedLayout>();

  constructor(host: HTMLElement, cardItemLayouts: CardItemLayouts) {
    this.#host = host;
    this.#cardItemLayouts = cardItemLayouts;
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
   * The veil over a picture layer's own node (`anchor`): a CSS filter on `anchor` itself, after
   * `lookFilter` (ADR-0044), plus a tint overlay, returned so the caller orders it on screen.
   * The veil clears at amount 0, when this returns `undefined`, but `lookFilter` still applies.
   */
  placeVeil<Picture extends Size>(
    anchor: HTMLElement,
    layer: PictureSlideLayer<Picture>,
    card: Card,
    lookFilter: string,
  ): HTMLElement | undefined {
    const amount = layer.card?.veilAmount ?? VEIL_NEGLIGIBLE_AMOUNT;
    const tint = layer.card?.card.veil?.tint;
    if (amount <= VEIL_NEGLIGIBLE_AMOUNT || tint === undefined) {
      anchor.style.filter = lookFilter;
      this.#veilTints.get(card)?.remove();
      this.#veilTints.delete(card);
      return undefined;
    }
    const blurPx =
      BACKDROP_BLUR_RADIUS_SHARE * Math.max(layer.picture.width, layer.picture.height) * amount;
    const veilFilter = `blur(${blurPx}px) saturate(${1 - VEIL_SATURATION_SHARE * amount}) contrast(${1 - VEIL_CONTRAST_SHARE * amount})`;
    anchor.style.filter = [lookFilter, veilFilter].filter((fragment) => fragment !== "").join(" ");
    const tintElement = this.#elementFor(this.#veilTints, card, VEIL_TINT_ATTRIBUTE);
    Object.assign(tintElement.style, {
      position: "absolute",
      inset: "0",
      backgroundColor: tint,
      opacity: String(VEIL_TINT_OPACITY_SHARE * amount),
    });
    return tintElement;
  }

  /**
   * The card's text, faded, drifted and (for `words`/`letters`) staggered per item, for the
   * caller to order on screen (ADR-0032, `dev-docs/player/TITLE_CARDS.md` § Entrances).
   */
  placeText(cardVisual: CardVisual, layerOpacity: number, stage: Size): HTMLElement {
    const container = this.#elementFor(this.#cardNodes, cardVisual.card, CARD_ATTRIBUTE);
    Object.assign(container.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    if (itemGranularity(cardVisual.card.entrance) === "block") {
      this.#placeBlockText(container, cardVisual, layerOpacity, stage);
    } else {
      placeItemText(container, this.#cardItemLayouts, cardVisual, layerOpacity, stage);
    }
    return container;
  }

  /**
   * `rise`/`focus`/`slow-fade`'s single item: the existing per-line nodes, scaled about the
   * text's own tight box, plus (`focus` only) a second copy with a static blur filter, cross-
   * faded in as the sharp copy fades out.
   */
  #placeBlockText(
    container: HTMLElement,
    cardVisual: CardVisual,
    layerOpacity: number,
    stage: Size,
  ): void {
    const card = cardVisual.card;
    const visual = cardItemTimingAt(card, 0, 1, cardVisual.slideTimeMs, cardVisual.reducedMotion);
    const { styles, pivot } = this.#stylesFor(card, stage);
    const origin = `${pivot.x}px ${pivot.y}px`;

    const sharp = this.#blockNode(container, BLOCK_SHARP_ATTRIBUTE);
    Object.assign(sharp.style, {
      position: "absolute",
      inset: "0",
      opacity: String(visual.opacity * layerOpacity),
      transform: `scale(${visual.scale})`,
      transformOrigin: origin,
    });
    this.#fillLines(sharp, styles.titleLines, visual.driftEm, "title");
    this.#fillLines(sharp, styles.subtitleLines, visual.driftEm, "subtitle");

    const blur = this.#blockNode(container, BLOCK_BLUR_ATTRIBUTE);
    Object.assign(blur.style, {
      position: "absolute",
      inset: "0",
      opacity: String(visual.blurOpacity * layerOpacity),
      transform: `scale(${visual.scale})`,
      transformOrigin: origin,
      filter: `blur(${CARD_FOCUS_BLUR_SHARE * stage.height}px)`,
    });
    this.#fillLines(blur, styles.titleLines, visual.driftEm, "title");
    this.#fillLines(blur, styles.subtitleLines, visual.driftEm, "subtitle");
  }

  #blockNode(container: HTMLElement, attribute: string): HTMLElement {
    const existing = container.querySelector<HTMLElement>(`[${attribute}]`);
    if (existing !== null) {
      return existing;
    }
    const element = document.createElement("div");
    element.setAttribute(attribute, "");
    container.append(element);
    return element;
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

  #stylesFor(card: Card, stage: Size): CachedLayout {
    const cached = this.#layoutCache.get(card);
    if (
      cached !== undefined &&
      cached.stage.width === stage.width &&
      cached.stage.height === stage.height
    ) {
      return cached;
    }
    const spec = CARD_STYLE_SPECS[card.style];
    const measureTitle = canvasCardMeasure(spec.title, stage);
    const measureSubtitle = canvasCardMeasure(spec.subtitle, stage);
    const styles = cardStyles(card, stage, measureTitle, measureSubtitle);
    const layout = layoutCard(card, stage, measureTitle, measureSubtitle);
    const [block] = cardItemSlices(card, layout, stage, measureTitle, measureSubtitle);
    const pivot = {
      x: (block?.x ?? 0) + (block?.width ?? 0) / 2,
      y: (block?.y ?? 0) + (block?.height ?? 0) / 2,
    };
    const result: CachedLayout = { stage, styles, pivot };
    this.#layoutCache.set(card, result);
    return result;
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
