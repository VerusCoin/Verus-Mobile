import {BN} from 'bn.js';
import {
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
  WalletBackup,
  WalletBackupOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {
  buildSeedDetails,
  getMnemonicEntropyBuffer,
  seedDetailsOrdinalToMnemonic,
} from '../../seedDetails/seedDetails';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

describe('seed details helpers', () => {
  it('decodes unencrypted wallet backup seed details', async () => {
    const backup = await buildSeedDetails({
      SeedDetailsClass: WalletBackup,
      mnemonic: MNEMONIC,
    });
    const backupOrdinal = new WalletBackupOrdinalVDXFObject({data: backup});

    expect(
      seedDetailsOrdinalToMnemonic({
        seedDetailsOrdinal: backupOrdinal,
        ExpectedOrdinalClass: WalletBackupOrdinalVDXFObject,
      }),
    ).toBe(MNEMONIC);
  });

  it('decodes encrypted spendable key seed details', async () => {
    const spendableKey = await buildSeedDetails({
      SeedDetailsClass: SpendableKeyDetails,
      mnemonic: MNEMONIC,
      password: 'claim password',
    });
    const spendableKeyOrdinal = new SpendableKeyDetailsOrdinalVDXFObject({
      data: spendableKey,
    });

    expect(
      seedDetailsOrdinalToMnemonic({
        seedDetailsOrdinal: spendableKeyOrdinal,
        ExpectedOrdinalClass: SpendableKeyDetailsOrdinalVDXFObject,
        password: 'claim password',
      }),
    ).toBe(MNEMONIC);
  });

  it('requires the password for encrypted seed details', async () => {
    const spendableKey = await buildSeedDetails({
      SeedDetailsClass: SpendableKeyDetails,
      mnemonic: MNEMONIC,
      password: 'claim password',
    });
    const spendableKeyOrdinal = new SpendableKeyDetailsOrdinalVDXFObject({
      data: spendableKey,
    });

    expect(() =>
      seedDetailsOrdinalToMnemonic({
        seedDetailsOrdinal: spendableKeyOrdinal,
        ExpectedOrdinalClass: SpendableKeyDetailsOrdinalVDXFObject,
      }),
    ).toThrow('encrypted');
  });

  it('rejects wrong passwords for encrypted seed details', async () => {
    const spendableKey = await buildSeedDetails({
      SeedDetailsClass: SpendableKeyDetails,
      mnemonic: MNEMONIC,
      password: 'claim password',
    });
    const spendableKeyOrdinal = new SpendableKeyDetailsOrdinalVDXFObject({
      data: spendableKey,
    });

    expect(() =>
      seedDetailsOrdinalToMnemonic({
        seedDetailsOrdinal: spendableKeyOrdinal,
        ExpectedOrdinalClass: SpendableKeyDetailsOrdinalVDXFObject,
        password: 'wrong password',
      }),
    ).toThrow('Unable to decrypt');
  });

  it('rejects unsupported encrypted seed detail formats', () => {
    const spendableKey = new SpendableKeyDetails({
      data: getMnemonicEntropyBuffer(MNEMONIC),
      seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
      encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
      encrypted: true,
    });
    const spendableKeyOrdinal = new SpendableKeyDetailsOrdinalVDXFObject({
      data: spendableKey,
    });

    expect(() =>
      seedDetailsOrdinalToMnemonic({
        seedDetailsOrdinal: spendableKeyOrdinal,
        ExpectedOrdinalClass: SpendableKeyDetailsOrdinalVDXFObject,
        password: 'claim password',
      }),
    ).toThrow('Unsupported seed details encryption format');
  });

  it('rejects non-BIP39 seed details', () => {
    const spendableKey = new SpendableKeyDetails({
      data: getMnemonicEntropyBuffer(MNEMONIC),
      seedFormat: new BN(2, 10),
      encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
    });
    const spendableKeyOrdinal = new SpendableKeyDetailsOrdinalVDXFObject({
      data: spendableKey,
    });

    expect(() =>
      seedDetailsOrdinalToMnemonic({
        seedDetailsOrdinal: spendableKeyOrdinal,
        ExpectedOrdinalClass: SpendableKeyDetailsOrdinalVDXFObject,
      }),
    ).toThrow('Only BIP39 seed details are supported');
  });
});
