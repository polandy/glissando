// The pure core of the unused-exports check: sources in, findings out. No file system here.
import ts from "typescript";

export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

export interface Finding {
  readonly path: string;
  readonly line: number;
  readonly name: string;
  /** "delete": nothing uses it at all. "unexport": only its own module does. */
  readonly action: "delete" | "unexport";
}

interface Declared {
  readonly name: string;
  readonly line: number;
  readonly isType: boolean;
}

const SCRIPT_BLOCK = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
const MODULE_EXTENSIONS = [".ts", ".svelte", ".js", ".mjs", "/index.ts", "/index.js"];

/** A .svelte file contributes its script blocks only; the rest is blanked so line numbers hold. */
function scriptText(file: SourceFile): string {
  if (!file.path.endsWith(".svelte")) return file.text;
  const blank = (text: string) => text.replace(/[^\n]/g, " ");
  let out = "";
  let cursor = 0;
  for (const match of file.text.matchAll(SCRIPT_BLOCK)) {
    const body = match[1] ?? "";
    const bodyStart = match.index + match[0].indexOf(body);
    out += blank(file.text.slice(cursor, bodyStart)) + body;
    cursor = bodyStart + body.length;
  }
  return out + blank(file.text.slice(cursor));
}

function parse(file: SourceFile): ts.SourceFile {
  return ts.createSourceFile(
    file.path.endsWith(".svelte") ? `${file.path}.ts` : file.path,
    scriptText(file),
    ts.ScriptTarget.Latest,
    true,
  );
}

function resolve(from: string, specifier: string, known: ReadonlySet<string>): string | null {
  if (!specifier.startsWith(".")) return null;
  const parts = from.split("/").slice(0, -1);
  for (const part of specifier.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
  }
  const base = parts.join("/");
  for (const candidate of [base, ...MODULE_EXTENSIONS.map((ext) => base + ext)]) {
    if (known.has(candidate)) return candidate;
  }
  return null;
}

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((m) => m.kind === kind) ?? false);

function declaredExports(sf: ts.SourceFile): Declared[] {
  const out: Declared[] = [];
  const add = (name: ts.Node, isType: boolean) =>
    out.push({
      name: name.getText(sf),
      line: sf.getLineAndCharacterOfPosition(name.getStart(sf)).line + 1,
      isType,
    });
  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.moduleSpecifier === undefined && stmt.exportClause !== undefined) {
        if (ts.isNamedExports(stmt.exportClause))
          stmt.exportClause.elements.forEach((e) => add(e.name, stmt.isTypeOnly || e.isTypeOnly));
      }
      continue;
    }
    if (!hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;
    if (hasModifier(stmt, ts.SyntaxKind.DefaultKeyword)) continue;
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations)
        if (ts.isIdentifier(d.name)) add(d.name, false);
    } else if ("name" in stmt && stmt.name !== undefined) {
      add(stmt.name as ts.Node, ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt));
    }
  }
  return out;
}

const STAR = "*";

/** Per target module, the names other modules take from it; "*" means "all of it". */
function collectUses(files: readonly SourceFile[], known: ReadonlySet<string>) {
  const uses = new Map<string, Set<string>>();
  const use = (target: string | null, name: string) => {
    if (target === null) return;
    const set = uses.get(target) ?? new Set<string>();
    set.add(name);
    uses.set(target, set);
  };
  for (const file of files) {
    const sf = parse(file);
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = resolve(file.path, node.moduleSpecifier.text, known);
        const clause = node.importClause;
        const bindings = clause?.namedBindings;
        if (clause === undefined) use(target, STAR);
        else {
          if (clause.name !== undefined) use(target, "default");
          if (bindings !== undefined && ts.isNamespaceImport(bindings)) use(target, STAR);
          else if (bindings !== undefined)
            bindings.elements.forEach((e) => use(target, (e.propertyName ?? e.name).text));
        }
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
        const target = resolve(file.path, (node.moduleSpecifier as ts.StringLiteral).text, known);
        if (node.exportClause === undefined || ts.isNamespaceExport(node.exportClause))
          use(target, STAR);
        else
          node.exportClause.elements.forEach((e) => use(target, (e.propertyName ?? e.name).text));
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const arg = node.arguments[0];
        if (arg !== undefined && ts.isStringLiteralLike(arg))
          use(resolve(file.path, arg.text, known), STAR);
      } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
        const lit = node.argument.literal;
        if (ts.isStringLiteral(lit)) use(resolve(file.path, lit.text, known), STAR);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return uses;
}

type LocalUse = "none" | "value" | "type-only";

function localUse(sf: ts.SourceFile, name: string): LocalUse {
  let count = 0;
  let inTypeQuery = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name) {
      count += 1;
      if (ts.isTypeQueryNode(node.parent)) inTypeQuery += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  // The declaration itself is one occurrence; an `export { name }` list adds another.
  const listed = sf.statements.some(
    (s) =>
      ts.isExportDeclaration(s) &&
      s.moduleSpecifier === undefined &&
      s.exportClause !== undefined &&
      ts.isNamedExports(s.exportClause) &&
      s.exportClause.elements.some((e) => e.name.text === name),
  );
  const uses = count - (listed ? 2 : 1);
  if (uses <= 0) return "none";
  return uses === inTypeQuery ? "type-only" : "value";
}

/**
 * Exports of `checked` files that no other file in `files` imports. `files` holds every file that
 * may use an export (src, server, e2e, scripts, config); `checked` says which of them are judged.
 */
export function findUnusedExports(
  files: readonly SourceFile[],
  isChecked: (path: string) => boolean,
): Finding[] {
  const known = new Set(files.map((f) => f.path));
  const uses = collectUses(files, known);
  const findings: Finding[] = [];
  for (const file of files) {
    if (!isChecked(file.path) || file.path.endsWith(".svelte")) continue;
    const used = uses.get(file.path);
    if (used?.has(STAR)) continue;
    const sf = parse(file);
    for (const { name, line, isType } of declaredExports(sf)) {
      if (used?.has(name)) continue;
      const local = localUse(sf, name);
      // A type in an exported signature stays nameable for callers, and a value that only
      // `typeof` reads must stay a value the linter sees as used; only the unused are flagged.
      if (local === "type-only" || (local !== "none" && isType)) continue;
      findings.push({
        path: file.path,
        line,
        name,
        action: local === "none" ? "delete" : "unexport",
      });
    }
  }
  return findings;
}
