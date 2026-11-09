// Explicit development tool, never imported by the wallet. Builds/serves only
// the synthetic diagnostic entry; launching/closing a test app is separate.
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

async function main() {
  const platform = process.argv[2];
  const port = Number(process.argv[3] || 8081);

  if (
    !['ios', 'android'].includes(platform) ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535
  ) {
    throw new Error(
      'Usage: node debug/runIdentityUploadNativeValidation.cjs ios|android [port]',
    );
  }

  const root = path.resolve(__dirname, '..');
  process.chdir(root);

  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'identity-upload-native-'),
  );
  const bundle = path.join(directory, 'index.bundle.js');
  const entry = path.join(__dirname, 'identityUploadNativeValidation.js');

  // Use an isolated entry and output directory so the wallet bundle is untouched.
  const config = await require('../metro.config');
  config.watchFolders = [root];
  config.resolver.useWatchman = false;
  config.maxWorkers = 2;

  await require('metro').runBuild(config, {
    entry,
    out: path.join(directory, 'index.bundle'),
    platform,
    dev: true,
    minify: false,
  });

  // Serve the diagnostic through the development app's normal bundle endpoint.
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url.startsWith('/status')) {
      response.end('packager-status:running');
    } else if (request.method === 'GET' && request.url.startsWith('/index.bundle')) {
      response.setHeader('Content-Type', 'application/javascript');
      fs.createReadStream(bundle).pipe(response);
    } else if (request.method === 'POST' && request.url === '/native-result') {
      let body = '';

      request.on('data', chunk => {
        body += chunk;
        if (body.length > 4096) request.destroy();
      });

      request.on('end', () => {
        try {
          const result = JSON.parse(body);

          if (typeof result.stage === 'string') console.log(result.stage);
          else if (typeof result.ok === 'boolean') {
            // Bind the report to the exact diagnostic source used for this run.
            const report = {
              ...result,
              platform,
              diagnosticEntry: path.relative(root, entry),
              diagnosticSha256: crypto
                .createHash('sha256')
                .update(fs.readFileSync(entry))
                .digest('hex'),
            };

            fs.writeFileSync(
              path.join(directory, 'result.json'),
              JSON.stringify(report, null, 2) + '\n',
            );

            console.log(JSON.stringify(report));
            console.log(`Result: ${path.join(directory, 'result.json')}`);
            console.log(
              'Validation finished. Close the diagnostic app, then stop this server with Ctrl-C.',
            );
          }

          response.end('{}');
        } catch (_) {
          response.writeHead(400).end();
        }
      });
    } else response.writeHead(404).end();
  });

  server.on('error', error => {
    console.error(error.message);
    process.exitCode = 1;
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(
      `Standalone ${platform} diagnostic ready on localhost:${port}; normal app entry is unchanged.`,
    );

    if (platform === 'android')
      console.log(`For the test device: adb reverse tcp:8081 tcp:${port}`);

    console.log(
      'Launch the installed development app to run disposable-key checks. No wallet data is loaded.',
    );
  });
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
