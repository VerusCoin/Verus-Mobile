import {WalletBackup} from 'verus-typescript-primitives';
import {
  WALLET_BACKUP_ENCRYPTION_ITERS,
  buildWalletBackupOrdinal,
  getMnemonicEntropyBuffer,
  isValid24WordBip39Mnemonic,
  walletBackupOrdinalToMnemonic,
  walletBackupRequiresPassword,
} from '../../walletBackup/walletBackup';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

describe('wallet backup payloads', () => {
  it('validates exact 24 word BIP39 mnemonics', () => {
    expect(isValid24WordBip39Mnemonic(MNEMONIC)).toBe(true);
    expect(isValid24WordBip39Mnemonic(MNEMONIC.split(' ').slice(0, 12).join(' '))).toBe(false);
    expect(isValid24WordBip39Mnemonic('not a valid mnemonic')).toBe(false);
  });

  it('builds an unencrypted BIP39 entropy backup', async () => {
    const backupOrdinal = await buildWalletBackupOrdinal({mnemonic: MNEMONIC});
    const backup = backupOrdinal.data;

    expect(backup.isValid()).toBe(true);
    expect(backup.isBIP39()).toBe(true);
    expect(backup.isEncrypted()).toBe(false);
    expect(backup.encryptionFormat.eq(WalletBackup.ENCRYPTION_FORMAT_NONE)).toBe(true);
    expect(backup.data.equals(getMnemonicEntropyBuffer(MNEMONIC))).toBe(true);
    expect(walletBackupRequiresPassword(backupOrdinal)).toBe(false);
    expect(walletBackupOrdinalToMnemonic({walletBackupOrdinal: backupOrdinal})).toBe(MNEMONIC);
  });

  it('builds a self-contained encrypted BIP39 entropy backup', async () => {
    const backupOrdinal = await buildWalletBackupOrdinal({
      mnemonic: MNEMONIC,
      password: 'correct horse battery staple',
    });
    const backup = backupOrdinal.data;

    expect(backup.isValid()).toBe(true);
    expect(backup.isEncrypted()).toBe(true);
    expect(backup.containsKDFIters()).toBe(true);
    expect(backup.KDFIters.toNumber()).toBe(WALLET_BACKUP_ENCRYPTION_ITERS);
    expect(backup.usesSaltedTaggedAes256Gcm()).toBe(true);
    expect(backup.data.length).toBe(16 + 12 + 32 + 16);
    expect(walletBackupRequiresPassword(backupOrdinal)).toBe(true);
    expect(walletBackupOrdinalToMnemonic({
      walletBackupOrdinal: backupOrdinal,
      password: 'correct horse battery staple',
    })).toBe(MNEMONIC);
    expect(() => walletBackupOrdinalToMnemonic({
      walletBackupOrdinal: backupOrdinal,
      password: 'wrong password',
    })).toThrow('Unable to decrypt wallet backup');
  });
});
