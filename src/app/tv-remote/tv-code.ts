/** The letters a TV's code is made of (tv_remote/SESSIONS.md): no I, L or O to misread. */
const TV_CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ";
export const TV_CODE_LENGTH = 4;
/** The query the TV's QR code opens the app with: `/?tv=<code>`. */
const TV_CODE_PARAMETER = "tv";

/** A typed or pasted code as the TV shows it: upper case, its letters only, at most four. */
export function normaliseTvCode(typed: string): string {
  return [...typed.toUpperCase()]
    .filter((letter) => TV_CODE_LETTERS.includes(letter))
    .slice(0, TV_CODE_LENGTH)
    .join("");
}

export function isCompleteTvCode(code: string): boolean {
  return code.length === TV_CODE_LENGTH && normaliseTvCode(code) === code;
}

/**
 * The code a `?tv=` query carries (null when it is no complete code) and the search without it;
 * null when there is no such query.
 */
export function readTvCodeQuery(search: string): { code: string | null; search: string } | null {
  const parameters = new URLSearchParams(search);
  const typed = parameters.get(TV_CODE_PARAMETER);
  if (typed === null) return null;
  parameters.delete(TV_CODE_PARAMETER);
  const rest = parameters.toString();
  const code = normaliseTvCode(typed);
  return {
    code: isCompleteTvCode(code) && code.length === typed.length ? code : null,
    search: rest === "" ? "" : `?${rest}`,
  };
}
