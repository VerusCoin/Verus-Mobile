import {getVerusPayInvoiceSignerContext} from '../../deeplink/handlers/verusPayInvoiceDetailsHandler';

describe('VerusPay invoice signer context', () => {
  it('keeps signer system and signature in their correct fields', () => {
    const signature = Buffer.from('signed invoice');
    const request = {
      signature: {
        identityID: {toIAddress: () => 'identity-id'},
        systemID: {toIAddress: () => 'system-id'},
        signatureAsVch: signature,
      },
    };

    expect(getVerusPayInvoiceSignerContext(request)).toEqual({
      signingID: 'identity-id',
      signerSystemID: 'system-id',
      signatureAsVch: signature.toString('base64'),
    });
  });
});
