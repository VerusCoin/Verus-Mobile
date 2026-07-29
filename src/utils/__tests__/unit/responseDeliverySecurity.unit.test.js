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
    expect(() =>
      assertSecurePostResponseUri('http://requester.example/response'),
    ).toThrow('must use HTTPS');
    expect(
      assertSecurePostResponseUri('https://requester.example/response'),
    ).toBe('https://requester.example/response');
  });
});
