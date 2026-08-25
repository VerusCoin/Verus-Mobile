const fs = require('fs');
const path = require('path');

const MODULE_PATH = path.resolve(
  __dirname,
  '../../../../android/app/src/main/java/com/verusmobile/VerusBiometricEnrollmentModule.java',
);

const methodBody = (source, start, end) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe('Android biometric prompt security policy', () => {
  const source = fs.readFileSync(MODULE_PATH, 'utf8');

  it('keeps caller settlement separate from the AndroidX terminal callback', () => {
    expect(source).toContain(
      'final AtomicBoolean clientSettled = new AtomicBoolean(false);',
    );
    expect(source).toContain(
      'final AtomicBoolean terminalCallbackReceived = new AtomicBoolean(false);',
    );

    const rejectBody = methodBody(
      source,
      'private void rejectPendingAuthentication(',
      'private void handleAuthenticationError(',
    );
    expect(rejectBody).toContain(
      'waitForTerminalCallback = pending.promptLaunchAttempted;',
    );
    expect(rejectBody).toContain(
      'if (!waitForTerminalCallback) {',
    );
    expect(rejectBody).toContain('requestPromptCancellation(pending);');

    const getBody = methodBody(
      source,
      'public void getEnrollmentBoundCredential(String title, Promise promise)',
      '@Override\n  public void invalidate()',
    );
    expect(getBody).toContain('if (activeAuthentication != null) {');
  });

  it('binds success to the exact launched Cipher before state or storage work', () => {
    const successBody = methodBody(
      source,
      'private void handleAuthenticationSuccess(',
      'private void startBiometricAuthentication(',
    );
    const exactCipherCheck = successBody.indexOf(
      'authenticatedCipher != pending.expectedCipher',
    );
    const generationCheck = successBody.indexOf(
      'pending.generation != credentialGeneration',
    );
    const storageCheck = successBody.indexOf(
      'readCanonicalCiphertext(preferences())',
    );
    const decrypt = successBody.indexOf('authenticatedCipher.doFinal(');

    expect(exactCipherCheck).toBeGreaterThanOrEqual(0);
    expect(generationCheck).toBeGreaterThan(exactCipherCheck);
    expect(storageCheck).toBeGreaterThan(generationCheck);
    expect(decrypt).toBeGreaterThan(storageCheck);
    expect(successBody).toContain(
      'if (!pending.clientSettled.compareAndSet(false, true)) return;',
    );
  });

  it('allows AndroidX to reuse its retained fragment across prompt sessions', () => {
    const startBody = methodBody(
      source,
      'private void startBiometricAuthentication(',
      'public void getEnrollmentBoundCredential(String title, Promise promise)',
    );
    const constructor = startBody.indexOf('new BiometricPrompt(');
    const authenticate = startBody.indexOf('createdPrompt.authenticate(');
    const terminalRecheck = startBody.indexOf(
      '!pending.terminalCallbackReceived.get()',
      authenticate,
    );
    const watchdogPost = startBody.indexOf(
      'mainHandler.postDelayed(',
      authenticate,
    );

    expect(constructor).toBeGreaterThanOrEqual(0);
    expect(terminalRecheck).toBeGreaterThan(authenticate);
    expect(watchdogPost).toBeGreaterThan(terminalRecheck);
    expect(source).not.toContain('ANDROIDX_BIOMETRIC_FRAGMENT_TAG');
    expect(startBody).not.toContain('findFragmentByTag(');
    expect(source).not.toContain('PRE_NATIVE_SENTINEL_ALIAS');
  });

  it('cancels on background without releasing the prompt slot before terminal', () => {
    const stopBody = methodBody(
      source,
      'private void handleAuthenticationActivityStopped(',
      'private void handleAuthenticationSuccess(',
    );
    expect(stopBody).toContain('rejectPendingAuthentication(');
    expect(stopBody).toContain('true\n    );');

    const observerBody = methodBody(
      source,
      'final LifecycleEventObserver observer = (source, event) -> {',
      'BiometricPrompt createdPrompt = null;',
    );
    expect(observerBody).toContain('Lifecycle.Event.ON_STOP');
    expect(observerBody).toContain(
      'handleAuthenticationActivityStopped(pending);',
    );
    expect(observerBody).toContain('Lifecycle.Event.ON_DESTROY');
    expect(observerBody).toContain(
      'handleAuthenticationActivityDestroyed(pending);',
    );

    const destroyBody = methodBody(
      source,
      'private void handleAuthenticationActivityDestroyed(',
      'private void handleAuthenticationActivityStopped(',
    );
    const configurationGuard = destroyBody.indexOf(
      'pending.activity.isChangingConfigurations()',
    );
    const terminalClaim = destroyBody.indexOf(
      'pending.terminalCallbackReceived.compareAndSet(false, true)',
    );
    expect(configurationGuard).toBeGreaterThanOrEqual(0);
    expect(terminalClaim).toBeGreaterThan(configurationGuard);
    expect(destroyBody).toContain('rejectPendingAuthentication(');
  });
});
