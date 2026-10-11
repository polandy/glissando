import {
  SHARE_PAGE_LANGUAGES,
  SHARE_TEXT_KEYS,
  type SharePageLanguages,
  type SharePageWords,
} from "./share-page-words";

/** A share page whose words block is missing or broken: a build fault, never the link's. */
export class ShareWordsError extends Error {
  override readonly name = "ShareWordsError";
}

const PLURAL_KEY = "pictures";

/** The share page's words block (`SHARE_WORDS_BLOCK_ID`), both languages. */
export function readShareWords(text: string | null): SharePageLanguages {
  if (text === null) throw new ShareWordsError("the share page holds no words block");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error: unknown) {
    throw new ShareWordsError("the share page's words block is no JSON", { cause: error });
  }
  const [de, en] = SHARE_PAGE_LANGUAGES.map((language) =>
    readWords(field(json, language), language),
  );
  if (de === undefined || en === undefined) {
    throw new ShareWordsError("the share page speaks German and English");
  }
  return { de, en };
}

function readWords(json: unknown, language: string): SharePageWords {
  const text = (key: string, value: unknown) => {
    if (typeof value !== "string") {
      throw new ShareWordsError(`the share page's ${language} words need "${key}" as text`);
    }
    return value;
  };
  const plural = field(json, PLURAL_KEY);
  const texts = Object.fromEntries(
    SHARE_TEXT_KEYS.map((key) => [key, text(key, field(json, key))]),
  );
  return {
    ...(texts as Record<(typeof SHARE_TEXT_KEYS)[number], string>),
    pictures: {
      one: text(`${PLURAL_KEY}.one`, field(plural, "one")),
      other: text(`${PLURAL_KEY}.other`, field(plural, "other")),
    },
  };
}

function field(json: unknown, key: string): unknown {
  return typeof json === "object" && json !== null ? Reflect.get(json, key) : undefined;
}
