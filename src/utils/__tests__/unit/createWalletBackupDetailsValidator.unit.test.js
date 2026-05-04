import {BN} from 'bn.js';
import {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {validateCreateWalletBackupDetailsVDXFObject} from '../../deeplink/validator/createWalletBackupDetailsValidator';

const requestForDetail = detail => ({
  getDetails: () => detail,
});

describe('create wallet backup details validator', () => {
  it('accepts NFC NDEF backup requests', async () => {
    const detail = new CreateWalletBackupDetailsOrdinalVDXFObject({
      data: new CreateWalletBackupDetails({
        backupType: CreateWalletBackupDetails.NFC_NDEF_BACKUP,
      }),
    });

    await expect(
      validateCreateWalletBackupDetailsVDXFObject(requestForDetail(detail), 0),
    ).resolves.toBeUndefined();
  });

  it('rejects unsupported backup types', async () => {
    const detail = new CreateWalletBackupDetailsOrdinalVDXFObject({
      data: new CreateWalletBackupDetails({
        backupType: new BN(2, 10),
      }),
    });

    await expect(
      validateCreateWalletBackupDetailsVDXFObject(requestForDetail(detail), 0),
    ).rejects.toThrow('Unsupported wallet backup type');
  });
});
