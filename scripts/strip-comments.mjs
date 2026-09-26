import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const CHECK = process.argv.slice(2).includes("--check");

const SCRIPT_EXTENSIONS = new Map([
  [".ts", ts.ScriptKind.TS],
  [".mts", ts.ScriptKind.TS],
  [".cts", ts.ScriptKind.TS],
  [".tsx", ts.ScriptKind.TSX],
  [".js", ts.ScriptKind.JS],
  [".mjs", ts.ScriptKind.JS],
  [".cjs", ts.ScriptKind.JS],
  [".jsx", ts.ScriptKind.JSX],
]);

const STYLE_EXTENSIONS = new Set([".css"]);

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "test-results",
  "playwright-report",
  "_generated",
]);

const GENERATED_FILE_PATTERNS = [/\.d\.[cm]?[jt]sx?$/, /\.gen\.[cm]?[jt]sx?$/];

function isIgnoredDirectory(name) {
  return name.startsWith(".") || IGNORED_DIRECTORIES.has(name);
}

function isGeneratedFile(name) {
  return GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

function collectTargets(directory, targets) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!isIgnoredDirectory(entry.name)) {
        collectTargets(fullPath, targets);
      }
      continue;
    }

    if (!entry.isFile() || isGeneratedFile(entry.name)) {
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (SCRIPT_EXTENSIONS.has(extension) || STYLE_EXTENSIONS.has(extension)) {
      targets.push(fullPath);
    }
  }
}

function collectAstRanges(sourceFile) {
  const protectedRanges = [];
  const emptyJsxContainers = [];

  const visit = (node) => {
    if (
      node.kind === ts.SyntaxKind.JsxText ||
      node.kind === ts.SyntaxKind.RegularExpressionLiteral
    ) {
      protectedRanges.push([node.getStart(sourceFile), node.getEnd()]);
    }
    if (node.kind === ts.SyntaxKind.JsxExpression && node.expression === undefined) {
      emptyJsxContainers.push([node.getStart(sourceFile), node.getEnd()]);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { protectedRanges, emptyJsxContainers };
}

function overlaps(start, end, ranges) {
  return ranges.some(([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart);
}

function collectScriptCommentRanges(text, scriptKind) {
  const sourceFile = ts.createSourceFile(
    "source",
    text,
    ts.ScriptTarget.Latest,
    false,
    scriptKind,
  );
  const { protectedRanges, emptyJsxContainers } = collectAstRanges(sourceFile);
  const variant =
    scriptKind === ts.ScriptKind.JSX || scriptKind === ts.ScriptKind.TSX
      ? ts.LanguageVariant.JSX
      : ts.LanguageVariant.Standard;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, variant, text);
  const ranges = [];

  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      continue;
    }

    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    if (!overlaps(start, end, protectedRanges)) {
      ranges.push([start, end]);
    }
  }

  for (const [start, end] of emptyJsxContainers) {
    const holdsComment = ranges.some((range) => range[0] >= start && range[1] <= end);
    if (holdsComment) {
      ranges.push([start, end]);
    }
  }

  return ranges;
}

function skipQuoted(text, start) {
  const quote = text[start];
  let index = start + 1;

  while (index < text.length) {
    if (text[index] === "\\") {
      index += 2;
      continue;
    }
    if (text[index] === quote) {
      return index + 1;
    }
    index += 1;
  }

  return index;
}

function collectStyleCommentRanges(text) {
  const ranges = [];
  let index = 0;

  while (index < text.length) {
    const character = text[index];

    if (character === '"' || character === "'") {
      index = skipQuoted(text, index);
      continue;
    }

    if (character === "/" && text[index + 1] === "*") {
      const close = text.indexOf("*/", index + 2);
      const end = close === -1 ? text.length : close + 2;
      ranges.push([index, end]);
      index = end;
      continue;
    }

    index += 1;
  }

  return ranges;
}

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }

  return merged;
}

function expandRange(text, start, end) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const prefix = text.slice(lineStart, start);

  if (/^[ \t]*$/.test(prefix)) {
    const newline = text.indexOf("\n", end);
    const suffix = newline === -1 ? text.slice(end) : text.slice(end, newline);

    if (/^[ \t\r]*$/.test(suffix)) {
      return [lineStart, newline === -1 ? text.length : newline + 1];
    }

    return [lineStart, end];
  }

  let trimmedStart = start;
  while (
    trimmedStart > lineStart &&
    (text[trimmedStart - 1] === " " || text[trimmedStart - 1] === "\t")
  ) {
    trimmedStart -= 1;
  }

  return [trimmedStart, end];
}

function removeRanges(text, ranges) {
  const merged = mergeRanges(ranges);
  let result = "";
  let cursor = 0;

  for (const [rawStart, rawEnd] of merged) {
    const [start, end] = expandRange(text, rawStart, rawEnd);
    const from = Math.max(start, cursor);
    const to = Math.max(end, cursor);

    if (from > cursor) {
      result += text.slice(cursor, from);
    }

    cursor = to;
  }

  result += text.slice(cursor);
  return result;
}

function stripFile(path) {
  const text = readFileSync(path, "utf8");
  const extension = extname(path).toLowerCase();
  const ranges = STYLE_EXTENSIONS.has(extension)
    ? collectStyleCommentRanges(text)
    : collectScriptCommentRanges(text, SCRIPT_EXTENSIONS.get(extension));

  if (ranges.length === 0) {
    return { changed: false, removed: 0 };
  }

  const output = removeRanges(text, ranges);

  if (output === text) {
    return { changed: false, removed: 0 };
  }

  if (!CHECK) {
    writeFileSync(path, output);
  }

  return { changed: true, removed: ranges.length };
}

const targets = [];
collectTargets(ROOT, targets);

let changedFiles = 0;
let removedComments = 0;

for (const file of targets) {
  const result = stripFile(file);

  if (!result.changed) {
    continue;
  }

  changedFiles += 1;
  removedComments += result.removed;
  process.stdout.write(`${relative(ROOT, file).split("\\").join("/")}: ${result.removed}\n`);
}

const verb = CHECK ? "would be updated" : "updated";
process.stdout.write(
  `\n${changedFiles} file(s) ${verb}, ${removedComments} comment(s) removed, ${targets.length} scanned.\n`,
);

if (CHECK && changedFiles > 0) {
  process.exitCode = 1;
}
