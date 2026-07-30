import {
  AppEncryptionResponseDetails,
  AppEncryptionResponseOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {SaplingExtendedSpendingKey} from 'verus-typescript-primitives/dist/pbaas/SaplingExtendedSpendingKey';
import {
  assertNoPlaintextExtendedSpendingKey,
  assertSecurePostResponseUri,
} from '../../deeplink/genericResponse/responseDeliverySecurity';

describe('generic response delivery security', () => {
  it('rejects plaintext app-encryption spending keys', () => {
    const detail = new AppEncryptionResponseOrdinalVDXFObject({
      data: new AppEncryptionResponseDetails({
        extendedSpendingKey: new SaplingExtendedSpendingKey(),
      }),
    });

    expect(() =>
      assertNoPlaintextExtendedSpendingKey({details: [detail]}),
    ).toThrow('unencrypted extended spending key');
  });

  it('requires HTTPS for POST response URIs', () => {
    try {
      assertSecurePostResponseUri('http://requester.example/response');
      throw new Error('Expected insecure response URI to be rejected.');
    } catch (error) {
      expect(error).toEqual(
        expect.objectContaining({
          isResponsePostError: true,
        }),
      );
      expect(error.message).toContain('must use HTTPS');
    }

    expect(
      assertSecurePostResponseUri('https://requester.example/response'),
    ).toBe('https://requester.example/response');
  });

  it('allows HTTP for POST response URIs when explicitly enabled', () => {
    expect(
      assertSecurePostResponseUri(
        'http://requester.example/response',
        true,
      ),
    ).toBe('http://requester.example/response');
  });

  it('rejects non-HTTP protocols when HTTP responses are enabled', () => {
    expect(() =>
      assertSecurePostResponseUri(
        'ftp://requester.example/response',
        true,
      ),
    ).toThrow('must use HTTPS');
  });
});
