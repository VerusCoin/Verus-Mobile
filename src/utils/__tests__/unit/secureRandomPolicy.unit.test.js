const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC_ROOT = path.resolve(__dirname, '../../..');
const APPROVED_RANDOM_MODULE = path.join(
  SRC_ROOT,
  'utils',
  'crypto',
  'randomBytes.js',
);
const RAW_RANDOM_MODULES = new Set([
  'randombytes',
  'react-native-randombytes',
]);
const CRYPTO_MODULES = new Set([
  'crypto',
  'react-native-crypto',
]);
const SYNC_RANDOM_MEMBERS = new Set([
  'createRandom',
  'getRandomValues',
  'prng',
  'pseudoRandomBytes',
  'randomBytes',
  'randomFillSync',
  'randomPrivateKey',
  'randomSecretKey',
  'rng',
]);

const listSourceFiles = directory => fs.readdirSync(directory, {
  withFileTypes: true,
}).flatMap(entry => {
  const entryPath = path.join(directory, entry.name);

  if (entry.isDirectory()) {
    return entry.name === '__tests__' ? [] : listSourceFiles(entryPath);
  }

  return /\.(?:js|jsx)$/.test(entry.name) ? [entryPath] : [];
});

const getMemberName = node => {
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }

  if (node.computed && node.property.type === 'StringLiteral') {
    return node.property.value;
  }

  return null;
};

const getRequiredModule = node => {
  if (
    node &&
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'StringLiteral'
  ) {
    return node.arguments[0].value;
  }

  return null;
};

const formatViolation = (filename, node, message) => {
  const relativeFilename = path.relative(SRC_ROOT, filename);
  const line = node.loc ? node.loc.start.line : '?';
  return `${relativeFilename}:${line} ${message}`;
};

const isImportFrom = (binding, moduleName, importedName) => {
  if (!binding || binding.path.node.type !== 'ImportSpecifier') return false;

  const declaration = binding.path.parentPath.node;
  return (
    declaration.type === 'ImportDeclaration' &&
    declaration.source.value === moduleName &&
    binding.path.node.imported.name === importedName
  );
};

const isRequiredFrom = (binding, moduleName, importedName) => {
  if (!binding || binding.path.node.type !== 'VariableDeclarator') return false;

  const declaration = binding.path.node;
  if (getRequiredModule(declaration.init) !== moduleName) return false;

  if (declaration.id.type === 'Identifier') return importedName == null;
  if (declaration.id.type !== 'ObjectPattern') return false;

  return declaration.id.properties.some(property => (
    property.key && property.key.name === importedName
  ));
};

const isBip39GenerateMnemonicCall = callPath => {
  const {callee} = callPath.node;

  if (callee.type === 'Identifier') {
    const binding = callPath.scope.getBinding(callee.name);
    return (
      isImportFrom(binding, 'bip39', 'generateMnemonic') ||
      isRequiredFrom(binding, 'bip39', 'generateMnemonic')
    );
  }

  if (
    callee.type !== 'MemberExpression' ||
    getMemberName(callee) !== 'generateMnemonic'
  ) {
    return false;
  }

  if (getRequiredModule(callee.object) === 'bip39') return true;
  if (callee.object.type !== 'Identifier') return false;

  const binding = callPath.scope.getBinding(callee.object.name);
  if (isRequiredFrom(binding, 'bip39')) return true;
  if (!binding) return false;

  const bindingNode = binding.path.node;
  const declaration = binding.path.parentPath.node;
  return (
    (bindingNode.type === 'ImportDefaultSpecifier' ||
      bindingNode.type === 'ImportNamespaceSpecifier') &&
    declaration.type === 'ImportDeclaration' &&
    declaration.source.value === 'bip39'
  );
};

const isApprovedRandomProvider = (callPath, node, filename) => {
  if (!node || node.type !== 'Identifier') return false;

  const binding = callPath.scope.getBinding(node.name);
  if (!binding || binding.path.node.type !== 'ImportSpecifier') return false;

  const declaration = binding.path.parentPath.node;
  if (
    declaration.type !== 'ImportDeclaration' ||
    binding.path.node.imported.name !== 'randomBytes'
  ) {
    return false;
  }

  const importedPath = path.resolve(path.dirname(filename), declaration.source.value);
  return `${importedPath}.js` === APPROVED_RANDOM_MODULE;
};

const inspectSourceFile = filename => {
  const source = fs.readFileSync(filename, 'utf8');
  let ast;

  try {
    ast = parser.parse(source, {
      sourceType: 'unambiguous',
      plugins: [
        'classProperties',
        'decorators-legacy',
        'dynamicImport',
        'flow',
        'flowComments',
        'jsx',
        'objectRestSpread',
        'optionalChaining',
        'privateMethods',
      ],
    });
  } catch (e) {
    throw new Error(`${path.relative(SRC_ROOT, filename)}: ${e.message}`);
  }
  const violations = [];

  traverse(ast, {
    CallExpression(callPath) {
      if (
        isBip39GenerateMnemonicCall(callPath) &&
        !isApprovedRandomProvider(callPath, callPath.node.arguments[1], filename)
      ) {
        violations.push(formatViolation(
          filename,
          callPath.node,
          'bip39.generateMnemonic must receive utils/crypto/randomBytes as its RNG',
        ));
      }
    },

    ImportDeclaration(importPath) {
      const moduleName = importPath.node.source.value;

      if (RAW_RANDOM_MODULES.has(moduleName)) {
        violations.push(formatViolation(
          filename,
          importPath.node,
          `must not import ${moduleName}; use utils/crypto/randomBytes`,
        ));
      }

      if (CRYPTO_MODULES.has(moduleName)) {
        for (const specifier of importPath.node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            SYNC_RANDOM_MEMBERS.has(specifier.imported.name)
          ) {
            violations.push(formatViolation(
              filename,
              specifier,
              `must not import synchronous ${moduleName}.${specifier.imported.name}`,
            ));
          }
        }
      }
    },

    MemberExpression(memberPath) {
      const memberName = getMemberName(memberPath.node);

      if (SYNC_RANDOM_MEMBERS.has(memberName)) {
        violations.push(formatViolation(
          filename,
          memberPath.node,
          `must not access synchronous randomness through .${memberName}; use utils/crypto/randomBytes`,
        ));
      }
    },

    VariableDeclarator(declarationPath) {
      const moduleName = getRequiredModule(declarationPath.node.init);

      if (RAW_RANDOM_MODULES.has(moduleName)) {
        violations.push(formatViolation(
          filename,
          declarationPath.node,
          `must not require ${moduleName}; use utils/crypto/randomBytes`,
        ));
      }

      if (
        CRYPTO_MODULES.has(moduleName) &&
        declarationPath.node.id.type === 'ObjectPattern'
      ) {
        for (const property of declarationPath.node.id.properties) {
          const propertyName = property.key && property.key.name;

          if (SYNC_RANDOM_MEMBERS.has(propertyName)) {
            violations.push(formatViolation(
              filename,
              property,
              `must not require synchronous ${moduleName}.${propertyName}`,
            ));
          }
        }
      }
    },
  });

  return violations;
};

describe('secure randomness source policy', () => {
  it('keeps first-party randomness behind the fail-closed async wrapper', () => {
    const violations = listSourceFiles(SRC_ROOT)
      .filter(filename => filename !== APPROVED_RANDOM_MODULE)
      .flatMap(inspectSourceFile);

    expect(violations).toEqual([]);
  });
});
