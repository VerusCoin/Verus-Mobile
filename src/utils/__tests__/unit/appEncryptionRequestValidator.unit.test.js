import {BN} from 'bn.js';
import {AppEncryptionRequestDetails} from 'verus-typescript-primitives';
import {validateAppEncryptionRequestDetails} from '../../deeplink/validator/appEncryptionRequestValidator';

describe('app encryption request validator', () => {
  it('rejects spending-key requests without an encrypted reply address', async () => {
    const details = new AppEncryptionRequestDetails({
      derivationNumber: new BN(0),
      flags: AppEncryptionRequestDetails.FLAG_RETURN_ESK,
    });

    await expect(
      validateAppEncryptionRequestDetails({}, details, 0),
    ).rejects.toThrow('must specify encryptResponseToAddress');
  });

  it('continues to allow viewing-key-only responses without encryption', async () => {
    const details = new AppEncryptionRequestDetails({
      derivationNumber: new BN(0),
    });

    await expect(
      validateAppEncryptionRequestDetails({}, details, 0),
    ).resolves.toBeUndefined();
  });
});
