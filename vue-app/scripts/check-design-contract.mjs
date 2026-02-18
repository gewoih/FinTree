import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const PROJECT_ROOT = process.cwd();
const TARGET_DIRS = [
  join(PROJECT_ROOT, 'src/pages'),
  join(PROJECT_ROOT, 'src/components'),
  join(PROJECT_ROOT, 'src/ui'),
];
const FILE_EXTENSIONS = new Set(['.vue', '.css', '.scss']);
const STYLE_BLOCK_REGEX = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const THEME_SELECTOR_REGEX = /\.(light-mode|dark-mode)\b/g;
const HEX_COLOR_REGEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/g;
const COLOR_FUNCTION_REGEX = /\b(?:rgb|rgba|hsl|hsla)\s*\(/g;
const TRANSITION_DECLARATION_REGEX = /\btransition(?:-duration)?\s*:\s*([^;]+);/g;
const LITERAL_DURATION_REGEX = /\b\d*\.?\d+m?s\b/;

const walk = (dir) => {
  const files = [];

  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (FILE_EXTENSIONS.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
};

const getLineNumber = (source, index, startLine = 1) => {
  const lineDelta = source.slice(0, index).split('\n').length - 1;
  return startLine + lineDelta;
};

const getLineText = (source, lineNumber, startLine = 1) => {
  const lineIndex = lineNumber - startLine;
  if (lineIndex < 0) return '';

  const lines = source.split('\n');
  return lines[lineIndex]?.trim() ?? '';
};

const findViolations = (region, checks) => {
  const violations = [];

  for (const check of checks) {
    check.regex.lastIndex = 0;
    let match = check.regex.exec(region.source);

    while (match) {
      if (check.isViolation && !check.isViolation(match)) {
        match = check.regex.exec(region.source);
        continue;
      }

      const line = getLineNumber(region.source, match.index, region.startLine);

      violations.push({
        file: region.file,
        line,
        rule: check.rule,
        message: check.message,
        hint: check.hint,
        snippet: getLineText(region.source, line, region.startLine),
      });

      match = check.regex.exec(region.source);
    }
  }

  return violations;
};

const createRegions = (filePath, source) => {
  const regions = [];
  const file = relative(PROJECT_ROOT, filePath).replaceAll('\\', '/');
  const extension = extname(filePath);

  if (extension === '.vue') {
    let match = STYLE_BLOCK_REGEX.exec(source);
    while (match) {
      const block = match[1];
      const blockStart = match.index + match[0].indexOf(block);
      const startLine = getLineNumber(source, blockStart, 1);

      regions.push({
        file,
        source: block,
        startLine,
      });

      match = STYLE_BLOCK_REGEX.exec(source);
    }

    return regions;
  }

  regions.push({
    file,
    source,
    startLine: 1,
  });

  return regions;
};

const checks = [
  {
    rule: 'theme-selector',
    regex: THEME_SELECTOR_REGEX,
    message: 'Theme selector found in feature/UI layer.',
    hint: 'Move theme variance to semantic tokens in src/assets/design-tokens.css and consume --ft-* tokens only.',
  },
  {
    rule: 'raw-color-literal',
    regex: HEX_COLOR_REGEX,
    message: 'Raw hex color literal found.',
    hint: 'Replace with a semantic --ft-* token. Add/update token definitions in src/assets/design-tokens.css if needed.',
  },
  {
    rule: 'raw-color-literal',
    regex: COLOR_FUNCTION_REGEX,
    message: 'Raw rgb/hsl color function found.',
    hint: 'Use semantic --ft-* color tokens (or tokenized color-mix values) instead of literal rgb/hsl values.',
  },
  {
    rule: 'transition-duration-literal',
    regex: TRANSITION_DECLARATION_REGEX,
    isViolation: (match) => LITERAL_DURATION_REGEX.test(match[1]),
    message: 'Literal transition duration found.',
    hint: 'Replace with --ft-transition-fast/base/slow token values.',
  },
];

const violations = [];

for (const dir of TARGET_DIRS) {
  if (!existsSync(dir)) continue;

  for (const filePath of walk(dir)) {
    const source = readFileSync(filePath, 'utf8');
    const regions = createRegions(filePath, source);

    for (const region of regions) {
      violations.push(...findViolations(region, checks));
    }
  }
}

if (violations.length > 0) {
  violations.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    return a.rule.localeCompare(b.rule);
  });

  console.error('Design contract violations found in src/pages, src/components, src/ui.');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    console.error(`  Hint: ${violation.hint}`);
    if (violation.snippet) {
      console.error(`  Code: ${violation.snippet}`);
    }
  }
  process.exit(1);
}

console.log('Design contract check passed.');
