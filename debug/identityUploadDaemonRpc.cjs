'use strict';

const path = require('path');
const {execFileSync} = require('child_process');

// Keep the live diagnostic limited to reads and synthetic data operations.
const methods = new Set([
  'getinfo',
  'getidentity',
  'getrawtransaction',
  'decoderawtransaction',
  'decodescript',
  'signdata',
  'decryptdata',
  'z_validateaddress',
  'getvdxfid',
]);
const calls = [];

function rpc(method, params = []) {
  if (process.env.VERUS_UPLOAD_DAEMON_TEST !== '1')
    throw new Error('Live daemon tests require explicit opt-in.');

  if (!methods.has(method)) throw new Error(`Forbidden live test RPC: ${method}`);

  if (method === 'signdata') {
    const request = params[0];

    // Exercise daemon descriptor construction without signing or reading files.
    if (
      params.length !== 1 ||
      request?.createmmr !== true ||
      request.address ||
      request.signature ||
      /"filename"\s*:/.test(JSON.stringify(request))
    ) {
      throw new Error(
        'Only unsigned, inline synthetic signdata requests are permitted.',
      );
    }
  }

  calls.push(method);
  const cli =
    process.env.VERUS_UPLOAD_CLI ||
    path.resolve(__dirname, '../../VerusCoin/src/verus');

  // CLI discovers existing local credentials. Never copy, print, or pass them in argv.
  // Each compact JSON argument goes through stdin; strings need CLI-style raw text.
  let output;

  try {
    output = execFileSync(
      cli,
      [
        '-testnet',
        '-rpcconnect=127.0.0.1',
        '-rpcclienttimeout=20',
        '-stdin',
        method,
      ],
      {
        input: params
          .map(
            value =>
              (typeof value === 'string' ? value : JSON.stringify(value)) + '\n',
          )
          .join(''),
        encoding: 'utf8',
        timeout: 25000,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    ).trim();
  } catch (error) {
    // execFile errors include argv/stdout; expose only the RPC's synthetic error text.
    throw new Error(
      `${method}: ${error.stderr?.toString().trim() || error.code || 'daemon request failed'}`,
    );
  }

  // verus prints JSON strings without quotes and null as an empty line. Do
  // not parse all-digit hex plaintext as a JSON number (or lose leading zeroes).
  if (!output) return null;

  return /^[\[{]/.test(output) ? JSON.parse(output) : output;
}

module.exports = {rpc, calls};
