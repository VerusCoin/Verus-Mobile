import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {Buffer} from 'buffer';
import {Transaction, networks} from '@bitgo/utxo-lib';
import {
  BigNumber,
  GenericRequest,
  SPENDABLE_KEY_DETAILS_VDXF_KEY,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {
  DEEPLINK_STORAGE_INTERNAL_KEY,
  NOTIFICATIONS_STORAGE_INTERNAL_KEY,
  USER_DATA_STORAGE_INTERNAL_KEY,
} from '../../../../env';
import {saltedDecryptMGK, saltedEncryptMGK} from '../../crypto/crypto';
import {sha256} from '../../crypto/hash';
import {
  SECURE_STORE_FLAG_KEY,
  SECURE_STORE_TRANSITION_STORAGE_KEY,
  SecureStorage,
} from '../../keychain/secureStore';
import {getMnemonicEntropyBuffer} from '../../walletBackup/walletBackup';

const CREDENTIAL = 'device-secure-storage-credential';
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
const RAW_TX =
  '010000000100000000000000000000000000000000000000000000000000000000000000000000000000ffffffff0101000000000000000000000000';

const makeSpendableRequest = (marker, {pendingBroadcast = false} = {}) => {
  const detail = new SpendableKeyDetailsOrdinalVDXFObject({
    data: new SpendableKeyDetails({
      data: Buffer.concat([
        getMnemonicEntropyBuffer(MNEMONIC).subarray(0, 31),
        Buffer.from([marker]),
      ]),
      seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
      encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
    }),
  });
  const requestBufferString = new GenericRequest({details: [detail]})
    .toBuffer()
    .toString('hex');
  const now = 1700000000000 + marker;
  const request = {
    id: sha256(Buffer.from(requestBufferString, 'hex')).toString('hex'),
    requestKind: SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid,
    requestBufferString,
    uri: null,
    fromService: null,
    fqnToAutoLink: null,
    requestType: null,
    title: 'Claim spendable key',
    createdAt: now,
    updatedAt: now,
    completed: false,
    completedAt: null,
  };

  if (pendingBroadcast) {
    const txid = Transaction.fromHex(RAW_TX, networks.verus).getId();
    const kind = 'spendable-key-claim';
    request.pendingBroadcast = {
      id: sha256(Buffer.from(`${kind}:${txid}`, 'utf8')).toString('hex'),
      kind,
      createdAt: now,
      updatedAt: now,
      transactions: [
        {
          type: 'identity',
          systemId: 'i-valid-system-id',
          coinObj: null,
          identity: null,
          outputs: [],
          deltas: null,
          includesSweep: false,
          requestIsTestnet: false,
          usesIdentityFeeFunds: false,
          inputs: [],
          rawTx: RAW_TX,
          txid,
          status: 'prepared',
          attempts: 0,
          lastError: null,
        },
      ],
    };
  }

  return request;
};

const pendingPlaintext = (marker, options) =>
  JSON.stringify([makeSpendableRequest(marker, options)]);

const resetSecureStorageMemory = () => {
  SecureStorage.credential = null;
  SecureStorage.flags = new BigNumber(0);
  SecureStorage.mutationCoordinator.queue = Promise.resolve();
};

const installPersistentCredentialMock = initialCredential => {
  let storedCredential = initialCredential;

  Keychain.getGenericPassword.mockImplementation(async () =>
    storedCredential == null ? false : {password: storedCredential},
  );
  Keychain.setGenericPassword.mockImplementation(
    async (_username, password) => {
      storedCredential = password;
      return true;
    },
  );
  Keychain.resetGenericPassword.mockImplementation(async () => {
    storedCredential = null;
    return true;
  });

  return () => storedCredential;
};

describe('secure-store transition recovery', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetSecureStorageMemory();
    Keychain.getGenericPassword.mockReset();
    Keychain.setGenericPassword.mockReset();
    Keychain.resetGenericPassword.mockReset();
    installPersistentCredentialMock(CREDENTIAL);
  });

  afterEach(() => {
    AsyncStorage.multiGet.mockClear();
    AsyncStorage.multiSet.mockClear();
  });

  it('loads valid encrypted request data without creating migration state', async () => {
    const plaintext = pendingPlaintext(1, {pendingBroadcast: true});
    const encrypted = await saltedEncryptMGK(CREDENTIAL, plaintext);
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '1'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, encrypted],
    ]);

    await SecureStorage.initialize(CREDENTIAL);

    await expect(
      SecureStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(plaintext);
    expect(await AsyncStorage.getAllKeys()).toEqual([
      SECURE_STORE_FLAG_KEY,
      DEEPLINK_STORAGE_INTERNAL_KEY,
    ]);
  });

  it('propagates an interrupted notification migration and resumes it intact', async () => {
    const notifications = JSON.stringify({
      directory: {
        request: {uri: 'vrsc://sensitive-request'},
      },
    });
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '1'],
      [NOTIFICATIONS_STORAGE_INTERNAL_KEY, notifications],
    ]);
    const originalMultiSet = AsyncStorage.multiSet.getMockImplementation();
    AsyncStorage.multiSet.mockImplementationOnce(async updates => {
      await originalMultiSet(updates);
      throw new Error('simulated notification migration response loss');
    });

    await expect(SecureStorage.initialize(CREDENTIAL)).rejects.toThrow(
      'simulated notification migration response loss',
    );
    expect(
      await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY),
    ).not.toBe(notifications);

    AsyncStorage.multiSet.mockImplementation(originalMultiSet);
    resetSecureStorageMemory();
    await SecureStorage.initialize(CREDENTIAL);
    await expect(
      SecureStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(notifications);
  });

  it('serializes concurrent Keychain initialization and creates one credential', async () => {
    const readPersistentCredential = installPersistentCredentialMock(null);

    await Promise.all([
      SecureStorage.initializeWithKeychain(),
      SecureStorage.initializeWithKeychain(),
    ]);

    expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
    expect(readPersistentCredential()).toBe(SecureStorage.credential);
    expect(await AsyncStorage.getItem(SECURE_STORE_FLAG_KEY)).toBe('1');
  });

  it('does not replace a missing credential while a transition is pending', async () => {
    const plaintext = pendingPlaintext(16, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, plaintext],
    ]);
    SecureStorage.credential = CREDENTIAL;
    const originalMultiSet = AsyncStorage.multiSet.getMockImplementation();
    AsyncStorage.multiSet.mockImplementationOnce(async updates => {
      await originalMultiSet(updates);
      AsyncStorage.multiSet.mockRejectedValueOnce(
        new Error('simulated transition interruption'),
      );
    });
    await expect(SecureStorage.encryptAllStorage()).rejects.toThrow(
      'simulated transition interruption',
    );

    AsyncStorage.multiSet.mockImplementation(originalMultiSet);
    resetSecureStorageMemory();
    installPersistentCredentialMock(null);
    await expect(SecureStorage.initializeWithKeychain()).rejects.toThrow(
      'Invalid or missing credential',
    );

    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).not.toBeNull();
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      plaintext,
    );
  });

  it('does not block startup for one undecryptable auxiliary root', async () => {
    const users = JSON.stringify({users: [{id: 'wallet'}]});
    const pending = pendingPlaintext(2, {pendingBroadcast: true});
    const encryptedUsers = await saltedEncryptMGK(CREDENTIAL, users);
    const badPending = await saltedEncryptMGK(
      'different-credential',
      pending,
    );
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '1'],
      [USER_DATA_STORAGE_INTERNAL_KEY, encryptedUsers],
      [DEEPLINK_STORAGE_INTERNAL_KEY, badPending],
    ]);

    await expect(SecureStorage.initialize(CREDENTIAL)).resolves.toBeUndefined();
    await expect(
      SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(users);
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      badPending,
    );
    await expect(
      SecureStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY),
    ).rejects.toThrow(
      'Unable to decrypt encrypted wallet data',
    );
  });

  it('keeps credential and encryption transitions strict after partial startup validation', async () => {
    const users = JSON.stringify({users: [{id: 'wallet'}]});
    const pending = pendingPlaintext(3, {pendingBroadcast: true});
    const encryptedUsers = await saltedEncryptMGK(CREDENTIAL, users);
    const badPending = await saltedEncryptMGK(
      'different-credential',
      pending,
    );
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '1'],
      [USER_DATA_STORAGE_INTERNAL_KEY, encryptedUsers],
      [DEEPLINK_STORAGE_INTERNAL_KEY, badPending],
    ]);
    await SecureStorage.initialize(CREDENTIAL);

    await expect(SecureStorage.cycleCredential()).rejects.toMatchObject({
      code: 'SECURE_STORE_ENCRYPTION_STATE_MISMATCH',
    });
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).toBeNull();

    await expect(SecureStorage.decryptAllStorage()).rejects.toMatchObject({
      code: 'SECURE_STORE_ENCRYPTION_STATE_MISMATCH',
    });
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).toBeNull();
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      badPending,
    );
  });

  it('still fails when the credential cannot authenticate the wallet root', async () => {
    const users = JSON.stringify({users: [{id: 'wallet'}]});
    const pending = pendingPlaintext(4, {pendingBroadcast: true});
    const notifications = JSON.stringify({accounts: {}});
    const encryptedUsers = await saltedEncryptMGK(CREDENTIAL, users);
    const encryptedPending = await saltedEncryptMGK(
      'wrong-credential',
      pending,
    );
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '1'],
      [USER_DATA_STORAGE_INTERNAL_KEY, encryptedUsers],
      [DEEPLINK_STORAGE_INTERNAL_KEY, encryptedPending],
      [NOTIFICATIONS_STORAGE_INTERNAL_KEY, notifications],
    ]);

    await expect(
      SecureStorage.initialize('wrong-credential'),
    ).rejects.toMatchObject({
      code: 'SECURE_STORE_ENCRYPTION_STATE_MISMATCH',
    });
    expect(
      await AsyncStorage.multiGet([
        USER_DATA_STORAGE_INTERNAL_KEY,
        DEEPLINK_STORAGE_INTERNAL_KEY,
        NOTIFICATIONS_STORAGE_INTERNAL_KEY,
      ]),
    ).toEqual([
      [USER_DATA_STORAGE_INTERNAL_KEY, encryptedUsers],
      [DEEPLINK_STORAGE_INTERNAL_KEY, encryptedPending],
      [NOTIFICATIONS_STORAGE_INTERNAL_KEY, notifications],
    ]);
  });

  it('serializes a pending request write behind encryption', async () => {
    const initial = pendingPlaintext(5);
    const latest = pendingPlaintext(6, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, initial],
    ]);
    SecureStorage.credential = CREDENTIAL;

    const originalMultiGet = AsyncStorage.multiGet.getMockImplementation();
    let releaseRead;
    let markReadStarted;
    const readGate = new Promise(resolve => {
      releaseRead = resolve;
    });
    const readStarted = new Promise(resolve => {
      markReadStarted = resolve;
    });
    AsyncStorage.multiGet.mockImplementationOnce(async keys => {
      markReadStarted();
      await readGate;
      return originalMultiGet(keys);
    });

    const encryption = SecureStorage.encryptAllStorage();
    await readStarted;
    let writeSettled = false;
    const pendingWrite = SecureStorage.setItem(
      DEEPLINK_STORAGE_INTERNAL_KEY,
      latest,
    ).then(() => {
      writeSettled = true;
    });
    await Promise.resolve();
    expect(writeSettled).toBe(false);

    releaseRead();
    await Promise.all([encryption, pendingWrite]);

    expect(await AsyncStorage.getItem(SECURE_STORE_FLAG_KEY)).toBe('1');
    await expect(
      SecureStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(latest);
  });

  it('serializes a pending request write behind decryption', async () => {
    const initial = pendingPlaintext(7);
    const latest = pendingPlaintext(8, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, initial],
    ]);
    SecureStorage.credential = CREDENTIAL;
    await SecureStorage.encryptAllStorage();

    const originalMultiGet = AsyncStorage.multiGet.getMockImplementation();
    let releaseRead;
    let markReadStarted;
    const readGate = new Promise(resolve => {
      releaseRead = resolve;
    });
    const readStarted = new Promise(resolve => {
      markReadStarted = resolve;
    });
    AsyncStorage.multiGet.mockImplementationOnce(async keys => {
      markReadStarted();
      await readGate;
      return originalMultiGet(keys);
    });

    const decryption = SecureStorage.decryptAllStorage();
    await readStarted;
    let writeSettled = false;
    const pendingWrite = SecureStorage.setItem(
      DEEPLINK_STORAGE_INTERNAL_KEY,
      latest,
    ).then(() => {
      writeSettled = true;
    });
    await Promise.resolve();
    expect(writeSettled).toBe(false);

    releaseRead();
    await Promise.all([decryption, pendingWrite]);

    expect(await AsyncStorage.getItem(SECURE_STORE_FLAG_KEY)).toBe('0');
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      latest,
    );
  });

  it('resumes an interrupted encryption from its authenticated journal', async () => {
    const plaintext = pendingPlaintext(9, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, plaintext],
    ]);
    SecureStorage.credential = CREDENTIAL;

    const originalMultiSet = AsyncStorage.multiSet.getMockImplementation();
    AsyncStorage.multiSet.mockImplementationOnce(async updates => {
      if (updates.some(([key]) => key === SECURE_STORE_TRANSITION_STORAGE_KEY)) {
        await originalMultiSet(updates);
        AsyncStorage.multiSet.mockImplementationOnce(async dataUpdates => {
          const pendingUpdate = dataUpdates.find(
            ([key]) => key === DEEPLINK_STORAGE_INTERNAL_KEY,
          );
          await AsyncStorage.setItem(...pendingUpdate);
          throw new Error('simulated process loss during encryption');
        });
        return;
      }
      const pendingUpdate = updates.find(
        ([key]) => key === DEEPLINK_STORAGE_INTERNAL_KEY,
      );
      await AsyncStorage.setItem(...pendingUpdate);
      throw new Error('simulated process loss during encryption');
    });

    await expect(SecureStorage.encryptAllStorage()).rejects.toThrow(
      'simulated process loss',
    );
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).not.toBeNull();

    AsyncStorage.multiSet.mockImplementation(originalMultiSet);
    resetSecureStorageMemory();
    await SecureStorage.initialize(CREDENTIAL);

    expect(await AsyncStorage.getItem(SECURE_STORE_FLAG_KEY)).toBe('1');
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).toBeNull();
    await expect(
      SecureStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(plaintext);
  });

  it('resumes an interrupted decryption without losing durable requests', async () => {
    const plaintext = pendingPlaintext(10, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, plaintext],
    ]);
    SecureStorage.credential = CREDENTIAL;
    await SecureStorage.encryptAllStorage();

    const originalMultiSet = AsyncStorage.multiSet.getMockImplementation();
    AsyncStorage.multiSet.mockImplementationOnce(async updates => {
      if (updates.some(([key]) => key === SECURE_STORE_TRANSITION_STORAGE_KEY)) {
        await originalMultiSet(updates);
        AsyncStorage.multiSet.mockImplementationOnce(async dataUpdates => {
          const pendingUpdate = dataUpdates.find(
            ([key]) => key === DEEPLINK_STORAGE_INTERNAL_KEY,
          );
          await AsyncStorage.setItem(...pendingUpdate);
          throw new Error('simulated process loss during decryption');
        });
        return;
      }
      const pendingUpdate = updates.find(
        ([key]) => key === DEEPLINK_STORAGE_INTERNAL_KEY,
      );
      await AsyncStorage.setItem(...pendingUpdate);
      throw new Error('simulated process loss during decryption');
    });

    await expect(SecureStorage.decryptAllStorage()).rejects.toThrow(
      'simulated process loss',
    );
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      plaintext,
    );

    AsyncStorage.multiSet.mockImplementation(originalMultiSet);
    resetSecureStorageMemory();
    await SecureStorage.initialize(CREDENTIAL);

    expect(await AsyncStorage.getItem(SECURE_STORE_FLAG_KEY)).toBe('0');
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).toBeNull();
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      plaintext,
    );
  });

  it('recovers credential cycling whether Keychain still has the old key', async () => {
    const plaintext = pendingPlaintext(11, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, plaintext],
    ]);
    SecureStorage.credential = CREDENTIAL;
    await SecureStorage.encryptAllStorage();

    const readPersistentCredential = installPersistentCredentialMock(CREDENTIAL);
    Keychain.setGenericPassword.mockRejectedValueOnce(
      new Error('simulated process loss before Keychain commit'),
    );

    await expect(SecureStorage.cycleCredential()).rejects.toThrow(
      'simulated process loss',
    );
    expect(readPersistentCredential()).toBe(CREDENTIAL);
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).not.toBeNull();

    resetSecureStorageMemory();
    await SecureStorage.initializeWithKeychain();

    expect(SecureStorage.credential).not.toBe(CREDENTIAL);
    expect(readPersistentCredential()).toBe(SecureStorage.credential);
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).toBeNull();
    await expect(
      SecureStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(plaintext);
  });

  it('rejects a tampered transition journal without mutating pending data', async () => {
    const plaintext = pendingPlaintext(12, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, plaintext],
    ]);
    SecureStorage.credential = CREDENTIAL;
    const originalMultiSet = AsyncStorage.multiSet.getMockImplementation();
    AsyncStorage.multiSet.mockImplementationOnce(async updates => {
      await originalMultiSet(updates);
      AsyncStorage.multiSet.mockRejectedValueOnce(
        new Error('simulated process loss before transition write'),
      );
    });
    await expect(SecureStorage.encryptAllStorage()).rejects.toThrow(
      'simulated process loss',
    );

    const journal = JSON.parse(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    );
    const envelope = journal.envelopes[0];
    const finalCharacter = envelope.slice(-1);
    journal.envelopes[0] = `${envelope.slice(0, -1)}${
      finalCharacter === 'A' ? 'B' : 'A'
    }`;
    await AsyncStorage.setItem(
      SECURE_STORE_TRANSITION_STORAGE_KEY,
      JSON.stringify(journal),
    );
    resetSecureStorageMemory();

    await expect(SecureStorage.initialize(CREDENTIAL)).rejects.toMatchObject({
      code: 'SECURE_STORE_TRANSITION_FAILED',
    });
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      plaintext,
    );
    expect(
      await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY),
    ).not.toBeNull();
  });

  it('rejects replay of an old decrypt journal after re-encryption', async () => {
    const plaintext = pendingPlaintext(14, {pendingBroadcast: true});
    await AsyncStorage.multiSet([
      [SECURE_STORE_FLAG_KEY, '0'],
      [DEEPLINK_STORAGE_INTERNAL_KEY, plaintext],
    ]);
    SecureStorage.credential = CREDENTIAL;
    await SecureStorage.encryptAllStorage();

    const originalWriteJournal =
      SecureStorage.writeTransitionJournalUnlocked.bind(SecureStorage);
    let capturedJournal;
    const journalSpy = jest
      .spyOn(SecureStorage, 'writeTransitionJournalUnlocked')
      .mockImplementation(async (...args) => {
        await originalWriteJournal(...args);
        capturedJournal = await AsyncStorage.getItem(
          SECURE_STORE_TRANSITION_STORAGE_KEY,
        );
    });

    await SecureStorage.decryptAllStorage();
    journalSpy.mockRestore();
    const laterPlaintext = pendingPlaintext(15, {pendingBroadcast: true});
    await SecureStorage.setItem(
      DEEPLINK_STORAGE_INTERNAL_KEY,
      laterPlaintext,
    );
    await SecureStorage.encryptAllStorage();
    const newlyEncryptedPending = await AsyncStorage.getItem(
      DEEPLINK_STORAGE_INTERNAL_KEY,
    );

    await AsyncStorage.setItem(
      SECURE_STORE_TRANSITION_STORAGE_KEY,
      capturedJournal,
    );
    resetSecureStorageMemory();

    await expect(SecureStorage.initialize(CREDENTIAL)).rejects.toMatchObject({
      code: 'SECURE_STORE_TRANSITION_FAILED',
    });
    expect(await AsyncStorage.getItem(SECURE_STORE_FLAG_KEY)).toBe('1');
    expect(await AsyncStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY)).toBe(
      newlyEncryptedPending,
    );
    expect(saltedDecryptMGK(CREDENTIAL, newlyEncryptedPending)).toBe(
      laterPlaintext,
    );
  });

});
