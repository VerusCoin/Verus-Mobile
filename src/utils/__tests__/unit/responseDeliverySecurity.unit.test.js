import {
  AppEncryptionResponseDetails,
  AppEncryptionResponseOrdinalVDXFObject,
  DataDescriptor,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {SaplingExtendedSpendingKey} from 'verus-typescript-primitives/dist/pbaas/SaplingExtendedSpendingKey';
import {
  assertNoPlaintextAppEncryptionResponse,
  assertSecurePostResponseUri,
} from '../../deeplink/genericResponse/responseDeliverySecurity';

describe('generic response delivery security', () => {
  it.each([false, true])('rejects plaintext app encryption responses with spending key %s', returnESK => {
    const detail = new AppEncryptionResponseOrdinalVDXFObject({
      data: new AppEncryptionResponseDetails({
        extendedSpendingKey: returnESK ? new SaplingExtendedSpendingKey() : undefined,
      }),
    });

    expect(() =>
      assertNoPlaintextAppEncryptionResponse({details: [detail]}),
    ).toThrow('unencrypted app encryption response');
  });

  it('allows an encrypted app encryption response wrapper', () => {
    const detail = new DataResponseOrdinalVDXFObject({
      data: new DataResponseDetails({
        data: new DataDescriptor({
          flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
          objectdata: Buffer.from('encrypted'),
          epk: Buffer.alloc(32, 1),
        }),
      }),
    });

    expect(() =>
      assertNoPlaintextAppEncryptionResponse({details: [detail]}),
    ).not.toThrow();
  });

  it('requires HTTPS for POST response URIs', () => {
    try {
      assertSecurePostResponseUri(
        'http://requester.example/response',
        false,
      );
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
      assertSecurePostResponseUri(
        'https://requester.example/response',
        false,
      ),
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
