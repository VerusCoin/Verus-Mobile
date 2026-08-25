import {
  GenericRequest,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {validateSpendableKeyDetailsVDXFObject} from '../../deeplink/validator/spendableKeyDetailsValidator';
import {isRequestRequiredSignature} from '../../deeplink/validator/envelopeValidator';
import {getMnemonicEntropyBuffer} from '../../walletBackup/walletBackup';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

const requestForDetail = detail => ({
  getDetails: () => detail,
});

describe('spendable key details validator', () => {
  it('accepts valid BIP39 spendable key details', async () => {
    const detail = new SpendableKeyDetailsOrdinalVDXFObject({
      data: new SpendableKeyDetails({
        data: getMnemonicEntropyBuffer(MNEMONIC),
        seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
        encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
      }),
    });

    await expect(
      validateSpendableKeyDetailsVDXFObject(requestForDetail(detail), 0),
    ).resolves.toBeUndefined();
  });

  it('rejects non spendable key details', async () => {
    await expect(
      validateSpendableKeyDetailsVDXFObject(requestForDetail({}), 0),
    ).rejects.toThrow('SpendableKeyDetails');
  });

  it('does not require signatures for spendable-key-only generic requests', () => {
    const detail = new SpendableKeyDetailsOrdinalVDXFObject({
      data: new SpendableKeyDetails({
        data: getMnemonicEntropyBuffer(MNEMONIC),
        seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
        encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
      }),
    });
    const request = new GenericRequest({details: [detail]});

    expect(isRequestRequiredSignature(request)).toBe(false);
  });
});
