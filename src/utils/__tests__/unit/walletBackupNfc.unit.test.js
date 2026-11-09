const {WALLET_BACKUP_NDEF_MIME} = require('../../walletBackup/walletBackup');
const {getMnemonicEntropyBuffer} = require('../../walletBackup/walletBackup');

const mockDiscoverSpendableKeyClaims = jest.fn();
const mockSpendableKeyDetailsOrdinalToMnemonic = jest.fn();
const mockLoadPendingDeeplinkRequests = jest.fn();
const mockGetPendingDeeplinkId = jest.fn(() => 'pending-spendable-key');
const SPENDABLE_KEY_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

jest.mock('../../spendableKey/spendableKey', () => ({
  discoverSpendableKeyClaims: mockDiscoverSpendableKeyClaims,
  spendableKeyDetailsOrdinalToMnemonic:
    mockSpendableKeyDetailsOrdinalToMnemonic,
}));

jest.mock('../../deeplink/pendingDeeplinkStorage', () => ({
  getPendingDeeplinkId: mockGetPendingDeeplinkId,
  loadPendingDeeplinkRequests: mockLoadPendingDeeplinkRequests,
}));

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: () => ({coins: {activeCoinsForUser: []}}),
  },
}));

const mockNfcManager = {
  isSupported: jest.fn(),
  isEnabled: jest.fn(),
  start: jest.fn(),
  requestTechnology: jest.fn(),
  cancelTechnologyRequest: jest.fn(),
  unregisterTagEvent: jest.fn(),
  ndefHandler: {
    getNdefStatus: jest.fn(),
    getNdefMessage: jest.fn(),
    writeNdefMessage: jest.fn(),
    makeReadOnly: jest.fn(),
  },
  ndefFormatableHandlerAndroid: {
    formatNdef: jest.fn(),
  },
};

jest.mock('react-native-nfc-manager', () => {
  const Ndef = require('react-native-nfc-manager/ndef-lib');

  return {
    __esModule: true,
    default: mockNfcManager,
    Ndef,
    NdefStatus: {
      NotSupported: 1,
      ReadWrite: 2,
      ReadOnly: 3,
    },
    NfcAdapter: {
      FLAG_READER_NFC_A: 0x1,
      FLAG_READER_NFC_B: 0x2,
      FLAG_READER_NFC_F: 0x4,
      FLAG_READER_NFC_V: 0x8,
      FLAG_READER_NFC_BARCODE: 0x10,
      FLAG_READER_NO_PLATFORM_SOUNDS: 0x20,
    },
    NfcTech: {
      Ndef: 'Ndef',
      NdefFormatable: 'NdefFormatable',
    },
  };
});

const {Ndef, NdefStatus} = require('react-native-nfc-manager');
const {Platform} = require('react-native');
const {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
  GenericRequest,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
  WalletBackup,
  WalletBackupOrdinalVDXFObject,
} = require('verus-typescript-primitives');
const {
  createWalletBackupNdefBytes,
  createDeeplinkUriNdefBytes,
  getWalletBackupOrdinalFromTag,
  readWalletBackupFromNfc,
  readDeeplinkUriFromNfc,
  NFC_DEEPLINK_WALLET_BACKUP_DETECTED,
  tagContainsCreateWalletBackupRequest,
  tagContainsVerusDeeplink,
  tagContainsWalletBackup,
  writeDeeplinkUriToNfc,
  writeWalletBackupToNfc,
} = require('../../walletBackup/walletBackupNfc');

const walletBackupOrdinal = {
  toBuffer: () => Buffer.from('010203', 'hex'),
};

const createWalletBackupRequestTag = (
  detail = new CreateWalletBackupDetailsOrdinalVDXFObject({
    data: new CreateWalletBackupDetails({
      backupType: CreateWalletBackupDetails.NFC_NDEF_BACKUP,
    }),
  }),
) => {
  const request = new GenericRequest({
    details: [detail],
  });

  return {
    ndefMessage: [Ndef.uriRecord(request.toWalletDeeplinkUri())],
  };
};

const createSpendableKeyTag = () => {
  const detail = new SpendableKeyDetailsOrdinalVDXFObject({
    data: new SpendableKeyDetails({
      data: getMnemonicEntropyBuffer(
        SPENDABLE_KEY_MNEMONIC,
      ),
      seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
      encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
    }),
  });
  const request = new GenericRequest({details: [detail]});

  return {
    request,
    requestBufferString: request.toBuffer().toString('hex'),
    tag: {
      ndefMessage: [Ndef.uriRecord(request.toWalletDeeplinkUri())],
    },
  };
};

describe('wallet backup NFC writer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockNfcManager.isSupported.mockResolvedValue(true);
    mockNfcManager.isEnabled.mockResolvedValue(true);
    mockNfcManager.start.mockResolvedValue();
    mockNfcManager.requestTechnology.mockResolvedValue('Ndef');
    mockNfcManager.cancelTechnologyRequest.mockResolvedValue();
    mockNfcManager.unregisterTagEvent.mockResolvedValue();
    mockNfcManager.ndefHandler.getNdefStatus.mockResolvedValue({
      status: NdefStatus.ReadWrite,
      capacity: 1024,
    });
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(
      createWalletBackupRequestTag(),
    );
    mockNfcManager.ndefHandler.writeNdefMessage.mockResolvedValue();
    mockNfcManager.ndefFormatableHandlerAndroid.formatNdef.mockResolvedValue();
    mockSpendableKeyDetailsOrdinalToMnemonic.mockReturnValue(
      SPENDABLE_KEY_MNEMONIC,
    );
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: false,
      scanUniverseComplete: true,
      systems: [{identityLookupError: null}],
    });
    mockLoadPendingDeeplinkRequests.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('detects an existing wallet backup MIME record', () => {
    const tag = {
      ndefMessage: [Ndef.mimeMediaRecord(WALLET_BACKUP_NDEF_MIME, [1, 2, 3])],
    };

    expect(tagContainsWalletBackup(tag)).toBe(true);
  });

  it('detects a raw WalletBackup ordinal payload', () => {
    const backup = new WalletBackupOrdinalVDXFObject({
      data: new WalletBackup({
        data: Buffer.alloc(32),
      }),
    });
    const tag = {
      ndefMessage: [Ndef.mimeMediaRecord('application/octet-stream', Array.from(backup.toBuffer()))],
    };

    expect(tagContainsWalletBackup(tag)).toBe(true);
  });

  it('extracts a wallet backup ordinal from an NFC MIME record', () => {
    const backup = new WalletBackupOrdinalVDXFObject({
      data: new WalletBackup({
        data: Buffer.alloc(32),
      }),
    });
    const tag = {
      ndefMessage: [Ndef.mimeMediaRecord(WALLET_BACKUP_NDEF_MIME, Array.from(backup.toBuffer()))],
    };

    expect(getWalletBackupOrdinalFromTag(tag)).toBeInstanceOf(WalletBackupOrdinalVDXFObject);
  });

  it('does not treat CreateWalletBackupDetails request payloads as completed backups', () => {
    const requestDetail = new CreateWalletBackupDetailsOrdinalVDXFObject();
    const tag = {
      ndefMessage: [Ndef.mimeMediaRecord('application/octet-stream', Array.from(requestDetail.toBuffer()))],
    };

    expect(tagContainsWalletBackup(tag)).toBe(false);
  });

  it('detects a valid CreateWalletBackupDetails generic request deeplink', () => {
    expect(
      tagContainsCreateWalletBackupRequest(createWalletBackupRequestTag()),
    ).toBe(true);
  });

  it('detects Verus deeplink URI tags', () => {
    const tag = {
      ndefMessage: [Ndef.uriRecord('verus://1/test')],
    };

    expect(tagContainsVerusDeeplink(tag)).toBe(true);
  });

  it('refuses to overwrite an existing wallet backup', async () => {
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [Ndef.mimeMediaRecord(WALLET_BACKUP_NDEF_MIME, [1, 2, 3])],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'already contains a wallet backup',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
  });

  it('overwrites blank writable NFC cards', async () => {
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).resolves.toEqual({
      written: true,
    });
    expect(mockNfcManager.ndefHandler.writeNdefMessage).toHaveBeenCalled();
  });

  it('overwrites a spendable-key tag after confirming it has no funds', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).resolves.toEqual({
      written: true,
    });
    expect(mockDiscoverSpendableKeyClaims).toHaveBeenCalled();
    expect(mockLoadPendingDeeplinkRequests).toHaveBeenCalled();
    expect(mockDiscoverSpendableKeyClaims).toHaveBeenCalledWith(
      expect.objectContaining({includeKnownSystems: true}),
    );
  });

  it('refuses an unsaved empty key when the scan universe is not exhaustive', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: false,
      scanUniverseComplete: false,
      systems: [{identityLookupError: null, identities: [], observedUtxos: []}],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'Unable to exhaustively establish',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('refuses a funded spendable-key tag that was not saved as pending', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: true,
      systems: [{identityLookupError: null}],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'funded spendable key that has not been saved',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('finds a funded spendable key even when another deeplink record comes first', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [
        Ndef.uriRecord('verus://1/not-a-generic-request'),
        ...tag.ndefMessage,
      ],
    });
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: true,
      systems: [{identityLookupError: null}],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'funded spendable key that has not been saved',
    );
  });

  it('checks every spendable-key record before overwriting a tag', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [...tag.ndefMessage, ...tag.ndefMessage],
    });
    mockDiscoverSpendableKeyClaims
      .mockResolvedValueOnce({
        hasClaims: false,
        scanUniverseComplete: true,
        systems: [{identityLookupError: null}],
      })
      .mockResolvedValueOnce({
        hasClaims: true,
        systems: [{identityLookupError: null}],
      });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'funded spendable key that has not been saved',
    );
    expect(mockDiscoverSpendableKeyClaims).toHaveBeenCalledTimes(2);
  });

  it('treats below-fee UTXOs as funds even when no claim is economical', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: false,
      systems: [
        {
          identityLookupError: null,
          identities: [],
          utxos: [{satoshis: 1}],
        },
      ],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'funded spendable key that has not been saved',
    );
  });

  it('protects funds that are visible but not currently spendable', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: false,
      systems: [
        {
          identityLookupError: null,
          identities: [],
          utxos: [],
          observedUtxos: [{satoshis: 50000, isspendable: false}],
        },
      ],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'funded spendable key that has not been saved',
    );
  });

  it('overwrites a funded spendable-key tag after the exact request was saved', async () => {
    const {requestBufferString, tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: true,
      systems: [{identityLookupError: null}],
    });
    mockLoadPendingDeeplinkRequests.mockResolvedValue([
      {
        id: 'pending-spendable-key',
        requestBufferString,
      },
    ]);

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).resolves.toEqual({
      written: true,
    });
    expect(mockDiscoverSpendableKeyClaims).not.toHaveBeenCalled();
  });

  it('allows an exact saved key without requiring mnemonic decryption', async () => {
    const {requestBufferString, tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockLoadPendingDeeplinkRequests.mockResolvedValue([
      {
        id: 'pending-spendable-key',
        requestBufferString,
      },
    ]);
    mockSpendableKeyDetailsOrdinalToMnemonic.mockImplementation(() => {
      throw new Error('This spendable key is encrypted.');
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).resolves.toEqual({
      written: true,
    });
    expect(mockSpendableKeyDetailsOrdinalToMnemonic).not.toHaveBeenCalled();
    expect(mockDiscoverSpendableKeyClaims).not.toHaveBeenCalled();
  });

  it('fails closed when spendable-key funding status cannot be loaded', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockRejectedValue(new Error('network down'));

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'Unable to establish whether this NFC spendable key contains funds',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('fails closed when empty-fund results cannot establish VerusID status', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: false,
      systems: [{identityLookupError: 'id index unavailable'}],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'Unable to establish whether this NFC spendable key contains VerusIDs',
    );
  });

  it('fails closed when pending-key storage cannot be read', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: true,
      systems: [{identityLookupError: null}],
    });
    mockLoadPendingDeeplinkRequests.mockRejectedValue(
      new Error('secure storage unavailable'),
    );

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'Unable to verify whether this spendable key was saved',
    );
    expect(mockDiscoverSpendableKeyClaims).not.toHaveBeenCalled();
  });

  it('fails closed when existing NFC content cannot be inspected', async () => {
    mockNfcManager.ndefHandler.getNdefMessage.mockRejectedValue(
      new Error('read failed'),
    );

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'Unable to inspect the existing NFC data',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('rejects read-only cards before writing', async () => {
    mockNfcManager.ndefHandler.getNdefStatus.mockResolvedValue({
      status: NdefStatus.ReadOnly,
      capacity: 1024,
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'read-only',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('writes the NFC card without locking it read-only', async () => {
    const result = await writeWalletBackupToNfc(walletBackupOrdinal);

    expect(result).toEqual({written: true});
    expect(mockNfcManager.ndefHandler.writeNdefMessage).toHaveBeenCalledTimes(1);
    expect(mockNfcManager.ndefHandler.writeNdefMessage.mock.calls[0][0]).toEqual(
      createWalletBackupNdefBytes(walletBackupOrdinal),
    );
    expect(mockNfcManager.ndefHandler.makeReadOnly).not.toHaveBeenCalled();
  });

  it('formats blank NdefFormatable cards for wallet backups', async () => {
    mockNfcManager.requestTechnology.mockResolvedValue('NdefFormatable');

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).resolves.toEqual({
      written: true,
    });
    expect(mockNfcManager.ndefFormatableHandlerAndroid.formatNdef).toHaveBeenCalledWith(
      createWalletBackupNdefBytes(walletBackupOrdinal),
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it.each(['Ndef', 'NdefFormatable'])(
    'checks the backup account after waiting for an NFC %s card',
    async technology => {
      let accountChanged = false;
      mockNfcManager.requestTechnology.mockImplementationOnce(async () => {
        accountChanged = true;
        return technology;
      });
      const beforeWrite = jest.fn(() => {
        if (accountChanged) throw new Error('Account changed before backup write.');
      });

      await expect(writeWalletBackupToNfc(walletBackupOrdinal, {beforeWrite}))
        .rejects.toThrow('Account changed before backup write.');

      expect(beforeWrite).toHaveBeenCalledTimes(1);
      expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
      expect(mockNfcManager.ndefFormatableHandlerAndroid.formatNdef).not.toHaveBeenCalled();
      expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
    },
  );

  it('checks the backup account after asynchronous NFC overwrite checks', async () => {
    let accountChanged = false;
    const spendableKeyTag = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(spendableKeyTag.tag);
    mockDiscoverSpendableKeyClaims.mockImplementationOnce(async () => {
      accountChanged = true;
      return {
        hasClaims: false,
        scanUniverseComplete: true,
        systems: [{identityLookupError: null}],
      };
    });
    const beforeWrite = jest.fn(() => {
      if (accountChanged) throw new Error('Account changed before backup write.');
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal, {beforeWrite}))
      .rejects.toThrow('Account changed before backup write.');

    expect(beforeWrite).toHaveBeenCalledTimes(1);
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
  });

  it('writes gift card deeplink URI records to blank writable NFC cards', async () => {
    const tag = {
      ndefMessage: [],
    };

    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);

    const result = await writeDeeplinkUriToNfc('verus://1/test');

    expect(result).toEqual({written: true});
    expect(mockNfcManager.ndefHandler.writeNdefMessage).toHaveBeenCalledWith(
      createDeeplinkUriNdefBytes('verus://1/test'),
      {reconnectAfterWrite: true},
    );
  });

  it('refuses to replace a wallet backup with a deeplink', async () => {
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [Ndef.mimeMediaRecord(WALLET_BACKUP_NDEF_MIME, [1, 2, 3])],
    });

    await expect(writeDeeplinkUriToNfc('verus://1/new')).rejects.toThrow(
      'already contains a wallet backup',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('refuses to replace an unsaved funded spendable key with a deeplink', async () => {
    const {tag} = createSpendableKeyTag();
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue(tag);
    mockDiscoverSpendableKeyClaims.mockResolvedValue({
      hasClaims: true,
      systems: [{identityLookupError: null}],
    });

    await expect(writeDeeplinkUriToNfc('verus://1/new')).rejects.toThrow(
      'funded spendable key that has not been saved',
    );
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('overwrites existing non-spendable Verus deeplinks', async () => {
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [Ndef.uriRecord('verus://1/existing')],
    });

    await expect(writeDeeplinkUriToNfc('verus://1/new')).resolves.toEqual({
      written: true,
    });
    expect(mockNfcManager.ndefHandler.writeNdefMessage).toHaveBeenCalled();
  });

  it('formats blank NdefFormatable cards when writing gift card deeplinks', async () => {
    mockNfcManager.requestTechnology.mockResolvedValue('NdefFormatable');

    const result = await writeDeeplinkUriToNfc('verus://1/new');

    expect(result).toEqual({written: true});
    expect(mockNfcManager.ndefFormatableHandlerAndroid.formatNdef).toHaveBeenCalledWith(
      createDeeplinkUriNdefBytes('verus://1/new'),
    );
  });

  it('reads a wallet backup from an NFC card', async () => {
    const backup = new WalletBackupOrdinalVDXFObject({
      data: new WalletBackup({
        data: Buffer.alloc(32),
      }),
    });

    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [Ndef.mimeMediaRecord(WALLET_BACKUP_NDEF_MIME, Array.from(backup.toBuffer()))],
    });

    const result = await readWalletBackupFromNfc();

    expect(result).toBeInstanceOf(WalletBackupOrdinalVDXFObject);
    expect(mockNfcManager.requestTechnology).toHaveBeenCalledWith(
      'Ndef',
      expect.any(Object),
    );
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
  });

  it.each([
    ['backup', writeWalletBackupToNfc],
    ['deeplink', writeDeeplinkUriToNfc],
  ])('checks NFC availability before validating a %s payload', async (_, write) => {
    mockNfcManager.isSupported.mockResolvedValueOnce(false);
    await expect(write(null)).rejects.toThrow('NFC is not supported on this device.');
    expect(mockNfcManager.isEnabled).not.toHaveBeenCalled();

    mockNfcManager.isEnabled.mockResolvedValueOnce(false);
    await expect(write(null)).rejects.toThrow('NFC is disabled on this device.');
    expect(mockNfcManager.start).not.toHaveBeenCalled();
    expect(mockNfcManager.cancelTechnologyRequest).not.toHaveBeenCalled();
  });

  it.each([
    ['backup', options => writeWalletBackupToNfc(walletBackupOrdinal, options)],
    ['deeplink', options => writeDeeplinkUriToNfc('verus://1/test', options)],
  ])('does not cancel a %s request when starting the NFC manager fails', async (_, write) => {
    const error = new Error('NFC startup failed');
    mockNfcManager.start.mockRejectedValueOnce(error);
    const onStatus = jest.fn();

    await expect(write({onStatus})).rejects.toBe(error);
    expect(onStatus.mock.calls).toEqual([['Preparing NFC writer...']]);
    expect(mockNfcManager.requestTechnology).not.toHaveBeenCalled();
    expect(mockNfcManager.cancelTechnologyRequest).not.toHaveBeenCalled();
  });

  it.each(['Ndef', 'NdefFormatable'])(
    'does not yield between the account guard and the native %s write',
    async technology => {
      mockNfcManager.requestTechnology.mockResolvedValueOnce(technology);
      const events = [];
      const beforeWrite = () => {
        events.push('guard');
        Promise.resolve().then(() => events.push('next microtask'));
      };
      const nativeWrite = technology === 'Ndef'
        ? mockNfcManager.ndefHandler.writeNdefMessage
        : mockNfcManager.ndefFormatableHandlerAndroid.formatNdef;
      nativeWrite.mockImplementationOnce(async () => events.push('native write'));

      await writeWalletBackupToNfc(walletBackupOrdinal, {beforeWrite});

      expect(events).toEqual(['guard', 'native write', 'next microtask']);
    },
  );

  it.each([
    ['backup', options => writeWalletBackupToNfc(walletBackupOrdinal, options),
      'Hold your NFC wallet backup request card against the device.',
      'Writing wallet backup...', 'Backup written. Move the card away from the device.'],
    ['deeplink', options => writeDeeplinkUriToNfc('verus://1/test', options),
      'Hold the NFC card against the device.',
      'Writing gift card...', 'Gift card written. Move the card away from the device.'],
  ])('preserves %s write statuses and waits for cancellation before resolving',
    async (_, write, holdMessage, writeMessage, successMessage) => {
      let releaseCancellation;
      let signalCancellation;
      const cancellationStarted = new Promise(resolve => { signalCancellation = resolve; });
      mockNfcManager.cancelTechnologyRequest.mockImplementationOnce(() => {
        signalCancellation();
        return new Promise(resolve => { releaseCancellation = resolve; });
      });
      const onStatus = jest.fn();
      const settled = jest.fn();
      const writing = write({onStatus}).then(settled);

      await cancellationStarted;
      expect(onStatus.mock.calls.flat()).toEqual([
        'Preparing NFC writer...', holdMessage, 'Checking NFC card...',
        writeMessage, successMessage,
      ]);
      expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalledWith();
      expect(settled).not.toHaveBeenCalled();

      releaseCancellation();
      await writing;
      expect(settled).toHaveBeenCalledWith({written: true});
    },
  );

  it.each([
    ['Card communication failed', 5000],
    ['User cancelled request', 0],
    ['Timed out waiting for an NFC card', 0],
  ])('preserves Android release handling for %s', async (message, releaseDelayMs) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const error = new Error(message);
    mockNfcManager.requestTechnology.mockRejectedValueOnce(error);
    mockNfcManager.cancelTechnologyRequest.mockRejectedValueOnce(new Error('cleanup failed'));
    const onStatus = jest.fn();

    await expect(writeDeeplinkUriToNfc('verus://1/test', {onStatus})).rejects.toBe(error);
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalledWith({delayMsAndroid: releaseDelayMs});
    expect(onStatus.mock.calls.flat().includes('Move the NFC card away from the device.'))
      .toBe(releaseDelayMs > 0);
  });

  it('releases a preregistered Android backup session after the card-removal delay', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.useFakeTimers();
    const writing = writeWalletBackupToNfc(walletBackupOrdinal, {sessionPreRegistered: true});

    await jest.advanceTimersByTimeAsync(0);
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalledWith({delayMsAndroid: 0});
    expect(mockNfcManager.unregisterTagEvent).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(5000);
    await expect(writing).resolves.toEqual({written: true});
    expect(mockNfcManager.unregisterTagEvent).toHaveBeenCalledTimes(1);
  });

  it('keeps preregistered backup cleanup a no-op on iOS', async () => {
    await writeWalletBackupToNfc(walletBackupOrdinal, {sessionPreRegistered: true});
    expect(mockNfcManager.cancelTechnologyRequest).not.toHaveBeenCalled();
    expect(mockNfcManager.unregisterTagEvent).not.toHaveBeenCalled();
  });

  it('ignores backup-only options for deeplink writes', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const beforeWrite = jest.fn(() => { throw new Error('Backup-only guard'); });

    await writeDeeplinkUriToNfc('verus://1/test', {beforeWrite, sessionPreRegistered: true});

    expect(beforeWrite).not.toHaveBeenCalled();
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalledWith({delayMsAndroid: 5000});
    expect(mockNfcManager.unregisterTagEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['backup read', () => readWalletBackupFromNfc(), 300000],
    ['deeplink read', () => readDeeplinkUriFromNfc(), 60000],
    ['backup write', () => writeWalletBackupToNfc(walletBackupOrdinal), 300000],
    ['deeplink write', () => writeDeeplinkUriToNfc('verus://1/test'), 300000],
  ])('preserves the default %s timeout', async (_, operation, timeoutMs) => {
    jest.useFakeTimers();
    mockNfcManager.requestTechnology.mockImplementationOnce(() => new Promise(() => {}));
    const result = operation();
    const rejection = expect(result).rejects.toThrow('Timed out waiting for an NFC card.');

    await jest.advanceTimersByTimeAsync(timeoutMs - 1);
    expect(mockNfcManager.cancelTechnologyRequest).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await rejection;
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
  });

  it('preserves the wallet-backup error code when reading a deeplink', async () => {
    const backup = new WalletBackupOrdinalVDXFObject({
      data: new WalletBackup({data: Buffer.alloc(32)}),
    });
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValueOnce({
      ndefMessage: [Ndef.mimeMediaRecord(WALLET_BACKUP_NDEF_MIME, Array.from(backup.toBuffer()))],
    });

    await expect(readDeeplinkUriFromNfc()).rejects.toMatchObject({
      code: NFC_DEEPLINK_WALLET_BACKUP_DETECTED,
    });
    expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
  });
});
