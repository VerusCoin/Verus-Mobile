#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ROOT = process.cwd();

const args = process.argv.slice(2);

const usage = () => {
  console.log(`Usage:
  node scripts/check-safe-area.js <files-or-directories>
  node scripts/check-safe-area.js --changed

Checks React Native screen files for safe-area footguns:
  - SafeAreaView imported from react-native
  - numeric bottom offsets near absolute positioning
`);
};

const isSourceFile = filePath => SOURCE_EXTENSIONS.has(path.extname(filePath));

const normalizePath = filePath =>
  path.relative(ROOT, path.resolve(ROOT, filePath));

const collectSourceFiles = target => {
  const absoluteTarget = path.resolve(ROOT, target);

  if (!fs.existsSync(absoluteTarget)) {
    return [];
  }

  const stat = fs.statSync(absoluteTarget);

  if (stat.isFile()) {
    return isSourceFile(absoluteTarget) ? [normalizePath(absoluteTarget)] : [];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(absoluteTarget, {withFileTypes: true});

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
      continue;
    }

    files.push(...collectSourceFiles(path.join(absoluteTarget, entry.name)));
  }

  return files;
};

const getChangedSourceFiles = () => {
  const output = execSync(
    'git diff --name-only --diff-filter=ACMR HEAD -- src App.js',
    {encoding: 'utf8'},
  );

  return output
    .split('\n')
    .map(file => file.trim())
    .filter(file => file.length > 0 && isSourceFile(file));
};

const findIssues = filePath => {
  const source = fs.readFileSync(path.resolve(ROOT, filePath), 'utf8');
  const lines = source.split(/\r?\n/);
  const issues = [];

  const lineForIndex = sourceIndex =>
    source.slice(0, sourceIndex).split(/\r?\n/).length;

  const reactNativeSafeAreaImport =
    /import\s*\{[\s\S]*?\bSafeAreaView\b[\s\S]*?\}\s*from\s*['"]react-native['"]/g;

  for (
    let match = reactNativeSafeAreaImport.exec(source);
    match != null;
    match = reactNativeSafeAreaImport.exec(source)
  ) {
    issues.push({
      line: lineForIndex(match.index),
      message:
        'SafeAreaView is imported from react-native; use react-native-safe-area-context for screen-edge protection.',
    });
  }

  lines.forEach((line, index) => {
    const bottomMatch = line.match(/\bbottom\s*:\s*'?(-?\d+)(?:%|px)?'?/);
    const hasRiskyBottom =
      bottomMatch != null &&
      Math.abs(Number(bottomMatch[1])) > 16 &&
      !/\bhitSlop\b/.test(line);

    if (!hasRiskyBottom) {
      return;
    }

    const nearby = lines
      .slice(Math.max(0, index - 10), Math.min(lines.length, index + 11))
      .join('\n');

    if (/\bposition\s*:\s*['"]absolute['"]/.test(nearby)) {
      issues.push({
        line: index + 1,
        message:
          'Numeric bottom offset appears near absolute positioning; prefer a normal-flow safe footer or use useSafeAreaInsets() with a comfort gap.',
      });
    }
  });

  return issues;
};

if (args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}

let files;

if (args.includes('--changed')) {
  files = getChangedSourceFiles();
} else if (args.length > 0) {
  files = args.flatMap(collectSourceFiles);
} else {
  usage();
  process.exit(0);
}

files = Array.from(new Set(files)).sort();

const findings = files.flatMap(file =>
  findIssues(file).map(issue => ({
    file,
    ...issue,
  })),
);

if (findings.length === 0) {
  console.log(`Safe-area check passed for ${files.length} file(s).`);
  process.exit(0);
}

for (const finding of findings) {
  console.error(`${finding.file}:${finding.line} ${finding.message}`);
}

process.exit(1);
