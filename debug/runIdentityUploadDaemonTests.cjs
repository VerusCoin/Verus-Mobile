#!/usr/bin/env node
'use strict';

// Opt-in integration runner. No wallet writes, funding, signing or broadcast.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const daemon = path.resolve(
  process.env.VERUS_COIN_ROOT || path.join(root, '../VerusCoin'),
);

// Link against the daemon build's libraries so the comparison uses its crypto.
const depends =
  process.env.VERUS_DEPENDS_PREFIX ||
  path.join(
    daemon,
    'depends',
    process.platform === 'darwin'
      ? `${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}-apple-darwin`
      : `${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}-unknown-linux-gnu`,
  );

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-upload-daemon-'));
const binary = path.join(temp, 'crypto');

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {cwd: root, env, stdio: 'inherit'});

  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${path.basename(command)} exited ${result.status}`);
}

try {
  run(process.env.CC || 'cc', [
    '-O2',
    `-I${path.join(depends, 'include')}`,
    path.join(__dirname, 'identityUploadDaemonCrypto.c'),
    path.join(depends, 'lib/librustzcash.a'),
    path.join(depends, 'lib/libsodium.a'),
    ...(process.platform === 'darwin'
      ? ['-framework', 'Security', '-framework', 'CoreFoundation']
      : ['-ldl', '-lpthread', '-lm']),
    '-o',
    binary,
  ]);

  // Only the selected suites receive the explicit live-test opt-in and adapter.
  run(
    process.execPath,
    [
      path.join(root, 'node_modules/jest/bin/jest.js'),
      '--runInBand',
      '--watchman=false',
      '--runTestsByPath',
      'src/utils/__tests__/integration/identityUploadDaemon.integration.test.js',
      'src/utils/__tests__/integration/identityUploadDaemonContainers.integration.test.js',
      ...process.argv.slice(2),
    ],
    {
      ...process.env,
      VERUS_UPLOAD_DAEMON_TEST: '1',
      VERUS_UPLOAD_NATIVE_CRYPTO: binary,
      VERUS_UPLOAD_CLI: path.join(daemon, 'src/verus'),
    },
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Remove the compiled adapter even when a build or test fails.
  fs.rmSync(temp, {recursive: true, force: true});
}
