#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const parser = require('@babel/parser');

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ROOT = process.cwd();
const SHARED_SEARCH_FIELD = 'src/components/AppSearchField.js';
const EXEMPTIONS = new Map([
  [
    'src/containers/AddCoin/AddCoin.js',
    'Legacy AddCoin route used only when the signed-in redesign is disabled.',
  ],
  [
    'src/containers/Identity/PersonalInfo/View.js',
    'Legacy Identity Personal Information stack.',
  ],
  [
    'src/containers/Identity/PersonalInfo/ClaimCategoryDetails/View.js',
    'Legacy Identity Personal Information stack.',
  ],
  [
    'src/containers/Identity/PersonalInfo/ClaimDetails/View.js',
    'Legacy Identity Personal Information stack.',
  ],
  [
    'src/containers/Identity/PersonalInfo/ClaimManager/View.js',
    'Legacy Identity Personal Information stack.',
  ],
  [
    'src/containers/Identity/PersonalInfo/RequestAttestation/View.js',
    'Legacy Identity Personal Information stack.',
  ],
  [
    'src/components/SearchableList.js',
    'Legacy Convert card modal.',
  ],
  [
    'src/containers/Services/ServiceComponents/PbaasPreconvertService/PbaasPreconvertServiceOverview/PbaasPreconvertServiceOverview.js',
    'Disabled PBaaS preconvert service search.',
  ],
  [
    'src/containers/SendWizard/components/WizardUI.js',
    'Currently unused WizardSearch export.',
  ],
]);
const args = process.argv.slice(2);

const usage = () => {
  console.log(`Usage:
  node scripts/check-search-fields.js <files-or-directories>
  node scripts/check-search-fields.js --changed

Rejects new hand-rolled search inputs. Reachable searches must use
AppSearchField, and search-shaped navigation controls must use
AppSearchLauncher. Documented legacy exemptions are listed in this script.
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
  const tracked = execSync(
    'git diff --name-only --diff-filter=ACMR HEAD -- src App.js',
    {encoding: 'utf8'},
  );
  const untracked = execSync(
    'git ls-files --others --exclude-standard -- src App.js',
    {encoding: 'utf8'},
  );

  return `${tracked}\n${untracked}`
    .split('\n')
    .map(file => file.trim())
    .filter(file => file.length > 0 && isSourceFile(file));
};

const importedName = specifier => {
  if (specifier.imported?.name) return specifier.imported.name;
  if (specifier.imported?.value) return specifier.imported.value;
  return null;
};

const attributeText = attribute => {
  if (attribute.value == null) return '';
  if (attribute.value.type === 'StringLiteral') return attribute.value.value;

  const expression = attribute.value.expression;
  if (expression?.type === 'StringLiteral') return expression.value;
  if (expression?.type === 'TemplateLiteral') {
    return expression.quasis.map(part => part.value.cooked || '').join(' ');
  }

  return '';
};

const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;

  visit(node);

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const child = node[key];

    if (Array.isArray(child)) {
      child.forEach(item => walk(item, visit));
    } else {
      walk(child, visit);
    }
  }
};

const findIssues = filePath => {
  if (filePath === SHARED_SEARCH_FIELD || EXEMPTIONS.has(filePath)) {
    return [];
  }

  const source = fs.readFileSync(path.resolve(ROOT, filePath), 'utf8');
  let ast;

  try {
    ast = parser.parse(source, {
      sourceType: 'unambiguous',
      plugins: [
        'classProperties',
        'dynamicImport',
        'flow',
        'jsx',
        'nullishCoalescingOperator',
        'objectRestSpread',
        'optionalChaining',
      ],
    });
  } catch (error) {
    return [
      {
        line: error.loc?.line || 1,
        message: `Could not parse file while checking search fields: ${error.message}`,
      },
    ];
  }

  const rawTextInputs = new Set();
  const rawSearchBars = new Set();
  const appTextInputs = new Set();

  ast.program.body.forEach(node => {
    if (node.type !== 'ImportDeclaration') return;

    const moduleName = node.source.value;
    node.specifiers.forEach(specifier => {
      if (specifier.type !== 'ImportSpecifier') return;

      const imported = importedName(specifier);
      if (
        (moduleName === 'react-native' ||
          moduleName === 'react-native-paper') &&
        imported === 'TextInput'
      ) {
        rawTextInputs.add(specifier.local.name);
      }

      if (imported === 'SearchBar' || imported === 'Searchbar') {
        rawSearchBars.add(specifier.local.name);
      }
    });

    if (
      /(?:^|\/)AppTextInput(?:\.js)?$/.test(moduleName) &&
      node.specifiers[0]?.local?.name
    ) {
      appTextInputs.add(node.specifiers[0].local.name);
    }
  });

  const issues = [];

  walk(ast.program, node => {
    if (
      node.type !== 'JSXOpeningElement' ||
      node.name.type !== 'JSXIdentifier'
    ) {
      return;
    }

    const tagName = node.name.name;
    if (rawSearchBars.has(tagName)) {
      issues.push({
        line: node.loc.start.line,
        message:
          'Raw SearchBar/Searchbar usage is not allowed; use AppSearchField.',
      });
      return;
    }

    if (!rawTextInputs.has(tagName) && !appTextInputs.has(tagName)) {
      return;
    }

    const attributes = node.attributes.filter(
      attribute => attribute.type === 'JSXAttribute',
    );
    const isSearch = attributes.some(attribute => {
      const name = attribute.name.name;
      const value = attributeText(attribute);

      return (
        (name === 'returnKeyType' && value.toLowerCase() === 'search') ||
        (['accessibilityLabel', 'label', 'placeholder'].includes(name) &&
          /\b(search|find)\b/i.test(value))
      );
    });

    if (isSearch) {
      issues.push({
        line: node.loc.start.line,
        message:
          'Hand-rolled search input is not allowed; use AppSearchField.',
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
  const exemptionCount = files.filter(file => EXEMPTIONS.has(file)).length;
  console.log(
    `Search-field check passed for ${files.length} file(s); ${exemptionCount} documented legacy exemption(s) skipped.`,
  );
  process.exit(0);
}

for (const finding of findings) {
  console.error(`${finding.file}:${finding.line} ${finding.message}`);
}

process.exit(1);
