import type { de } from "./catalogue-de";

/** Plural forms German and English need; picked with `Intl.PluralRules`, `{count}` is the number. */
export interface PluralMessage {
  readonly one: string;
  readonly other: string;
}

export type Message = string | PluralMessage;

type GermanCatalogue = typeof de;

/** The German catalogue defines the key set; every other language has exactly these keys. */
export type MessageKey = keyof GermanCatalogue;

export type Catalogue = {
  readonly [Key in MessageKey]: GermanCatalogue[Key] extends string ? string : PluralMessage;
};

type Placeholders<Text extends string> = Text extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;

export type ParamValue = string | number;

type ParamsOf<M> = M extends PluralMessage
  ? { readonly count: number } & {
      readonly [Name in Exclude<Placeholders<M["one"] | M["other"]>, "count">]: ParamValue;
    }
  : M extends string
    ? { readonly [Name in Placeholders<M>]: ParamValue }
    : never;

export type MessageParams<Key extends MessageKey> = ParamsOf<GermanCatalogue[Key]>;

/** A message without placeholders takes no argument; one with placeholders requires them all. */
export type MessageArgs<Key extends MessageKey> = keyof MessageParams<Key> extends never
  ? []
  : [params: MessageParams<Key>];
