import {
  SHARE_PAGE_LANGUAGES,
  SHARE_TEXT_KEYS,
  type PlayerPageWords,
  type SharePageLanguage,
  type SharePageLanguages,
} from "./share-page-words";

/** A page whose words block is missing or broken: a build fault, never the visitor's. */
export class PageWordsError extends Error {
  override readonly name = "PageWordsError";
}

const PLURAL_KEY = "pictures";

/** The share page's words block (`SHARE_WORDS_BLOCK_ID`), both languages. */
export function readShareWords(text: string | null): SharePageLanguages {
  return readPageWords(text, SHARE_TEXT_KEYS, "the share page");
}

/** The words, plain texts `textKeys` and the `pictures` plural, of `page`'s block. */
export function readPageWords<Key extends string>(
  text: string | null,
  textKeys: readonly Key[],
  page: string,
): Readonly<Record<SharePageLanguage, Record<Key, string> & Pick<PlayerPageWords, "pictures">>> {
  if (text === null) throw new PageWordsError(`${page} holds no words block`);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error: unknown) {
    throw new PageWordsError(`${page}'s words block is no JSON`, { cause: error });
  }
  const [de, en] = SHARE_PAGE_LANGUAGES.map((language) =>
    readWords(field(json, language), textKeys, `${page}'s ${language} words`),
  );
  if (de === undefined || en === undefined) {
    throw new PageWordsError(`${page} speaks German and English`);
  }
  return { de, en };
}

function readWords<Key extends string>(
  json: unknown,
  textKeys: readonly Key[],
  words: string,
): Record<Key, string> & Pick<PlayerPageWords, "pictures"> {
  const text = (key: string, value: unknown) => {
    if (typeof value !== "string") {
      throw new PageWordsError(`${words} need "${key}" as text`);
    }
    return value;
  };
  const plural = field(json, PLURAL_KEY);
  const texts = Object.fromEntries(textKeys.map((key) => [key, text(key, field(json, key))]));
  return {
    ...(texts as Record<Key, string>),
    pictures: {
      one: text(`${PLURAL_KEY}.one`, field(plural, "one")),
      other: text(`${PLURAL_KEY}.other`, field(plural, "other")),
    },
  };
}

function field(json: unknown, key: string): unknown {
  return typeof json === "object" && json !== null ? Reflect.get(json, key) : undefined;
}
