import {WALLET_BACKUP_NDEF_MIME} from '../../walletBackup/walletBackup';

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

import {Ndef, NdefStatus} from 'react-native-nfc-manager';
import {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
  GenericRequest,
  WalletBackup,
  WalletBackupOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {
  createWalletBackupNdefBytes,
  getWalletBackupOrdinalFromTag,
  readWalletBackupFromNfc,
  tagContainsCreateWalletBackupRequest,
  tagContainsWalletBackup,
  writeWalletBackupToNfc,
} from '../../walletBackup/walletBackupNfc';

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

  it('refuses to overwrite NFC cards that are not wallet backup requests', async () => {
    mockNfcManager.ndefHandler.getNdefMessage.mockResolvedValue({
      ndefMessage: [],
    });

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'valid Verus wallet backup request',
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

  it('refuses NdefFormatable cards because no wallet backup request can be verified', async () => {
    mockNfcManager.requestTechnology.mockResolvedValue('NdefFormatable');

    await expect(writeWalletBackupToNfc(walletBackupOrdinal)).rejects.toThrow(
      'valid Verus wallet backup request',
    );
    expect(mockNfcManager.ndefFormatableHandlerAndroid.formatNdef).not.toHaveBeenCalled();
    expect(mockNfcManager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
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
