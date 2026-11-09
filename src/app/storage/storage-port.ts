/** The slice of Web Storage the app's small preference stores need. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;
