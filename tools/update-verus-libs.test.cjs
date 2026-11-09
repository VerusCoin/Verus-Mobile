const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { updateVerusLibs } = require('./update-verus-libs.cjs');

const libraries = [
  ['verus-typescript-primitives', 'VerusCoin/verus-typescript-primitives', 'master'],
  ['verusid-ts-client', 'VerusCoin/verusid-ts-client', 'master'],
  ['verusd-rpc-ts-client', 'VerusCoin/verusd-rpc-ts-client', 'main'],
  ['@bitgo/utxo-lib', 'VerusCoin/BitGoJS', 'utxo-lib-verus'],
];
const sha = 'a'.repeat(40);

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'update-verus-libs-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const pins = Object.fromEntries(libraries.map(([name, repo]) => [name, `github:${repo}#old`]));
  const manifest = `${JSON.stringify({
    scripts: { unrelated: 'keep this spacing' },
    dependencies: { unrelated: '1.2.3', ...pins },
    resolutions: { ...pins, 'verusid-ts-client/bn.js': '5.2.3' },
  }, null, 4)}\n`;
  const workspace = [
    'packages:\n  - "."\n',
    'overrides: # preserve comments',
    ...Object.entries(pins).map(([name, pin], i) => `  ${i % 2 ? JSON.stringify(name) : name}: "${pin}" # keep`),
    '  "verusid-ts-client>bn.js": "5.2.3"',
    '\nallowBuilds:\n  unrelated: true\n',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'package.json'), manifest);
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), workspace);
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  return { root, manifest, workspace, read };
}

function fakeGit(command, args) {
  assert.equal(command, 'git');
  assert.deepEqual(args.slice(0, 2), ['ls-remote', '--exit-code']);
  const entry = libraries.find(([, repo]) => args[2] === `https://github.com/${repo}.git`);
  assert.ok(entry, `Unexpected repository ${args[2]}`);
  assert.equal(args[3], `refs/heads/${entry[2]}`);
  return `${sha}\t${args[3]}\n`;
}

test('aligns all three pin locations, preserves other content, then installs', t => {
  const { root, manifest, workspace, read } = fixture(t);
  const calls = [];
  const expectedManifest = manifest.replaceAll('#old', `#${sha}`);
  const expectedWorkspace = workspace.replaceAll('#old', `#${sha}`);
  updateVerusLibs({ root, log: () => {}, run: (command, args, options) => {
    calls.push(command);
    assert.equal(options.cwd, root);
    if (command === 'git') return fakeGit(command, args);
    assert.equal(command, 'pnpm');
    assert.deepEqual(args, ['install', '--no-frozen-lockfile']);
    assert.equal(read('package.json'), expectedManifest);
    assert.equal(read('pnpm-workspace.yaml'), expectedWorkspace);
  } });
  assert.deepEqual(calls, ['git', 'git', 'git', 'git', 'pnpm']);
});

test('dry run resolves every branch without changing files or installing', t => {
  const { root, manifest, workspace, read } = fixture(t);
  let calls = 0;
  updateVerusLibs({ root, dryRun: true, log: () => {}, run: (...args) => {
    calls += 1;
    return fakeGit(...args);
  } });
  assert.equal(calls, 4);
  assert.equal(read('package.json'), manifest);
  assert.equal(read('pnpm-workspace.yaml'), workspace);
});

for (const output of ['invalid-sha\trefs/heads/utxo-lib-verus', `${sha}\trefs/heads/master`, '']) {
  test(`invalid final Git response leaves both manifests untouched: ${JSON.stringify(output)}`, t => {
    const { root, manifest, workspace, read } = fixture(t);
    let calls = 0;
    assert.throws(() => updateVerusLibs({ root, log: () => {}, run: (...args) => {
      calls += 1;
      return calls === 4 ? output : fakeGit(...args);
    } }), /Invalid Git revision/);
    assert.equal(read('package.json'), manifest);
    assert.equal(read('pnpm-workspace.yaml'), workspace);
  });
}

test('missing workspace override fails before writing package.json', t => {
  const { root, manifest, workspace, read } = fixture(t);
  const invalidWorkspace = workspace.replace(/^.*verusid-ts-client.*\n/gm, '');
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), invalidWorkspace);
  assert.throws(() => updateVerusLibs({ root, log: () => {}, run: fakeGit }), /override for verusid-ts-client/);
  assert.equal(read('package.json'), manifest);
  assert.equal(read('pnpm-workspace.yaml'), invalidWorkspace);
});
