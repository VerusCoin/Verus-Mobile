/*
  Routing guard for the ID-1 link failure paths: the touched consumers must
  route manual/fallback linking through the shared LinkExistingVerusIdSheet and
  must not reach the legacy SendModal link UI.
*/

const fs = require('fs');
const path = require('path');

const readSource = relativePath =>
  fs.readFileSync(path.join(__dirname, '../../..', relativePath), 'utf8');

describe('ID-1 link failure routing', () => {
  it('routes the Authentication passthrough fallback into the shared manual sheet', () => {
    const source = readSource(
      'containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js',
    );

    expect(source).not.toMatch(/openLinkIdentityModal/);
    expect(source).toMatch(/openPassthroughLinkFallback/);
    expect(source).toMatch(/setIdentitySheetInitialManualValue/);
    expect(source).toMatch(/initialManualValue=\{identitySheetInitialManualValue\}/);
  });

  it('keeps the AppEncryption manual link in the shared sheet', () => {
    const source = readSource(
      'containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo.js',
    );

    expect(source).not.toMatch(/openLinkIdentityModal/);
    expect(source).not.toMatch(/onManualLink=\{/);
  });
});
