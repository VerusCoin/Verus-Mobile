import * as Keychain from 'react-native-keychain';
import {
  getPersistentCredential,
  saveNewPersistentCredential,
} from '../../keychain/keychain';

describe('persistent keychain credential', () => {
  beforeEach(() => {
    Keychain.getGenericPassword.mockReset();
    Keychain.setGenericPassword.mockReset();
    Keychain.resetGenericPassword.mockReset();

    Keychain.setGenericPassword.mockResolvedValue(true);
    Keychain.resetGenericPassword.mockResolvedValue(true);
  });

  it('returns null when the persistent credential has not been created', async () => {
    Keychain.getGenericPassword.mockResolvedValue(false);

    await expect(getPersistentCredential()).resolves.toBeNull();
  });

  it('creates the first persistent credential without requiring an existing one', async () => {
    const credential = Buffer.from('first persistent credential');
    const credentialString = credential.toString('base64');

    Keychain.getGenericPassword
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ password: credentialString });

    await expect(saveNewPersistentCredential(credential)).resolves.toBe(
      credentialString,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'Verus_Mobile',
      credentialString,
      {
        service: 'Verus_Mobile_Persistent',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  });

  it('removes an unverified first persistent credential', async () => {
    const credential = Buffer.from('first persistent credential');

    Keychain.getGenericPassword
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ password: 'unexpected credential' });

    await expect(saveNewPersistentCredential(credential)).rejects.toThrow(
      'Loaded credential does not equal set credential, reset cred',
    );

    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'Verus_Mobile_Persistent',
    });
  });

  it('restores an existing persistent credential when replacement verification fails', async () => {
    const originalCredential = 'original-credential';
    const newCredential = Buffer.from('replacement credential');
    const newCredentialString = newCredential.toString('base64');

    Keychain.getGenericPassword
      .mockResolvedValueOnce({ password: originalCredential })
      .mockResolvedValueOnce({ password: 'unexpected credential' });

    await expect(saveNewPersistentCredential(newCredential)).rejects.toThrow(
      'Loaded credential does not equal set credential, reset cred',
    );

    expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
      1,
      'Verus_Mobile',
      newCredentialString,
      {
        service: 'Verus_Mobile_Persistent',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
    expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
      2,
      'Verus_Mobile',
      originalCredential,
      {
        service: 'Verus_Mobile_Persistent',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  });
});
