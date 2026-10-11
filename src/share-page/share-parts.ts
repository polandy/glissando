import { PAGE_STATE_ATTRIBUTE, type PageState } from "../html-export/page-contract";
import { iconSvg, type PageView } from "../export-player/page-view";
import type { SharePageWords } from "./share-page-words";

/** What the share page adds to the player page (dev-docs/share_link/RECIPIENTS_PAGE.md, States). */
export interface ShareParts {
  /** On the "unreachable" card. */
  readonly tryAgain: HTMLButtonElement;
  /** The state last shown. */
  readonly state: PageState;
  /** Sets the page's state and shows the share page's own part for it. */
  showState(state: PageState): void;
  /** The player waits for a late picture; the chip shows while it plays. */
  showLate(late: boolean): void;
}

export function createShareParts(document: Document, words: SharePageWords): ShareParts {
  const make = <Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string,
    ...children: (Node | string)[]
  ): HTMLElementTagNameMap[Tag] => {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
  };
  const ring = () => {
    const node = make("span", "ring");
    node.setAttribute("aria-hidden", "true");
    return node;
  };
  const notice = (icon: "linkOff" | "cloudOff", title: string, text: string, ...more: Node[]) =>
    make(
      "div",
      "card notice",
      make(
        "div",
        "notice-body",
        make("span", "badge", iconSvg(document, icon)),
        make("h2", "title", title),
        make("p", "", text),
        ...more,
      ),
      make("div", "made", words.madeWith),
    );

  const tryAgain = make("button", "again", iconSvg(document, "replay"), words.tryAgain);
  tryAgain.type = "button";
  const gone = notice("linkOff", words.goneTitle, words.goneText);
  const unreachable = notice("cloudOff", words.unreachableTitle, words.unreachableText, tryAgain);
  const status = make("span", "", words.loadingFirst);
  status.setAttribute("role", "status");
  const starting = make("div", "card starting", ring(), status);
  const late = make("div", "late", ring(), words.loadingLate);
  late.setAttribute("role", "status");
  document.body.append(starting, late, gone, unreachable);

  let state: PageState = "loading";
  let waiting = false;
  const showLate = () => {
    late.hidden = !(waiting && state === "playing");
  };
  const showState = (shown: PageState) => {
    state = shown;
    document.documentElement.setAttribute(PAGE_STATE_ATTRIBUTE, state);
    gone.hidden = state !== "gone";
    unreachable.hidden = state !== "unreachable";
    starting.hidden = state !== "starting";
    showLate();
  };
  showState(state);

  return {
    tryAgain,
    get state() {
      return state;
    },
    showState,
    showLate(isLate) {
      waiting = isLate;
      showLate();
    },
  };
}

/** `view` showing the share page's parts with its states. */
export function withShareParts(view: PageView, parts: ShareParts): PageView {
  return {
    ...view,
    get state() {
      return view.state;
    },
    showState(state) {
      view.showState(state);
      parts.showState(state);
    },
  };
}
