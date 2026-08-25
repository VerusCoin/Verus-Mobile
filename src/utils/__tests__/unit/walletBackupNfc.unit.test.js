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
    mockNfcManager.isSupported.mockResolvedValue(true);
    mockNfcManager.isEnabled.mockResolvedValue(true);
    mockNfcManager.start.mockResolvedValue();
    mockNfcManager.requestTechnology.mockResolvedValue('Ndef');
    mockNfcManager.cancelTechnologyRequest.mockResolvedValue();
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
});
