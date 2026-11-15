#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const LIBRARIES = [
  ['verus-typescript-primitives', 'VerusCoin/verus-typescript-primitives', 'master'],
  ['verusid-ts-client', 'VerusCoin/verusid-ts-client', 'master'],
  ['verusd-rpc-ts-client', 'VerusCoin/verusd-rpc-ts-client', 'main'],
  // BitGoJS master is the upstream monorepo, not the Verus UTXO package.
  ['@bitgo/utxo-lib', 'VerusCoin/BitGoJS', 'utxo-lib-verus'],
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceOnce(text, pattern, replacement, label) {
  let matches = 0;
  const updated = text.replace(pattern, (...args) => {
    matches += 1;
    return replacement(...args);
  });
  if (matches !== 1) {
    throw new Error(`Expected exactly one ${label}; found ${matches}. No files updated.`);
  }
  return updated;
}

function updatePackageJson(text, pins) {
  const manifest = JSON.parse(text);
  let updated = text;
  for (const section of ['dependencies', 'resolutions']) {
    for (const name of Object.keys(pins)) {
      if (typeof manifest[section]?.[name] !== 'string') {
        throw new Error(`Missing package.json ${section}.${name}. No files updated.`);
      }
    }
    // These manifest sections contain flat string maps. Replace only values so
    // unrelated formatting, ordering, and dependency changes stay untouched.
    updated = replaceOnce(
      updated,
      new RegExp(`("${section}"\\s*:\\s*\\{)([^{}]*)(\\})`, 'g'),
      (_, start, body, end) => {
        for (const [name, pin] of Object.entries(pins)) {
          body = replaceOnce(
            body,
            new RegExp(`("${escapeRegExp(name)}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`, 'g'),
            (_match, prefix) => prefix + JSON.stringify(pin),
            `package.json ${section}.${name}`,
          );
        }
        return start + body + end;
      },
      `package.json ${section} section`,
    );
  }
  JSON.parse(updated);
  return updated;
}

function updateWorkspace(text, pins) {
  return replaceOnce(
    text,
    /(^overrides:[ \t]*(?:#[^\r\n]*)?\r?\n)([\s\S]*?)(?=^[^\s#]|(?![\s\S]))/gm,
    (_, start, body) => {
      for (const [name, pin] of Object.entries(pins)) {
        const key = escapeRegExp(name);
        body = replaceOnce(
          body,
          new RegExp(`^([ \\t]+(?:"${key}"|'${key}'|${key}):[ \\t]*)(?:"[^"\\r\\n]*"|'[^'\\r\\n]*'|[^#\\r\\n]+?)([ \\t]*(?:#[^\\r\\n]*)?)(?=\\r?$)`, 'gm'),
          (_match, prefix, suffix) => prefix + JSON.stringify(pin) + suffix,
          `pnpm-workspace.yaml override for ${name}`,
        );
      }
      return start + body;
    },
    'pnpm-workspace.yaml overrides section',
  );
}

function updateVerusLibs({
  root = path.resolve(__dirname, '..'),
  dryRun = false,
  run = execFileSync,
  log = console.log,
} = {}) {
  const pins = {};
  for (const [name, repository, branch] of LIBRARIES) {
    const ref = `refs/heads/${branch}`;
    const output = run('git', ['ls-remote', '--exit-code', `https://github.com/${repository}.git`, ref], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      timeout: 60000,
    }).trim();
    const match = /^([a-f0-9]{40})\s+(\S+)$/.exec(output);
    if (!match || match[2] !== ref) {
      throw new Error(`Invalid Git revision for ${repository}#${branch}. No files updated.`);
    }
    pins[name] = `github:${repository}#${match[1]}`;
    log(`${name} (${branch}): ${match[1]}`);
  }

  // Resolve every branch and validate both complete manifests before writing.
  const updates = [
    ['package.json', updatePackageJson],
    ['pnpm-workspace.yaml', updateWorkspace],
  ].map(([name, update]) => {
    const file = path.join(root, name);
    const current = fs.readFileSync(file, 'utf8');
    return { name, file, current, next: update(current, pins) };
  });

  for (const { name, file, current, next } of updates) {
    if (current !== next) {
      log(`${dryRun ? 'Would update' : 'Updating'} ${name}`);
      if (!dryRun) fs.writeFileSync(file, next);
    }
  }
  log(`${dryRun ? 'Would run' : 'Running'} pnpm install --no-frozen-lockfile`);
  if (!dryRun) {
    run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: root, stdio: 'inherit' });
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: node tools/update-verus-libs.cjs [--dry-run]\nResolve supported upstream branches, align all Verus pins, and run pnpm install.');
  } else if (args.some(arg => arg !== '--dry-run') || args.length > 1) {
    console.error('Usage: node tools/update-verus-libs.cjs [--dry-run]');
    process.exitCode = 1;
  } else {
    try {
      updateVerusLibs({ dryRun: args.includes('--dry-run') });
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { updateVerusLibs };
