// Free of imports, so the export player's build can check its bundle with it as well.

/**
 * What would end an inline `<script>` early (`</script`) or switch the HTML parser into its
 * escaped state, where a later `<script` hides the real end tag (`<!--`). A script is put into
 * the page unchanged, never rewritten: no escape is safe in every place such a sequence can
 * occur in JavaScript (a `u`-flag regular expression, `String.raw`, a template literal).
 */
const UNSAFE_INLINE_SCRIPT = /<\/script|<!--/i;

/** Throws when `script` cannot be inlined unchanged into the page; `source` names it. */
export function assertInlineableScript(script: string, source: string): void {
  const found = UNSAFE_INLINE_SCRIPT.exec(script);
  if (found !== null) {
    throw new Error(
      `${source} holds "${found[0]}" at ${found.index} and cannot be inlined into the page's ` +
        `<script>; write it without that sequence, e.g. "<" + "/script"`,
    );
  }
}
