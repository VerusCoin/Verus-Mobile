import {Buffer} from 'buffer';
import {Platform} from 'react-native';
import NfcManager, {
  Ndef,
  NdefStatus,
  NfcAdapter,
  NfcTech,
} from 'react-native-nfc-manager';
import {
  OrdinalVDXFObject,
  WalletBackupOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {WALLET_BACKUP_NDEF_MIME} from './walletBackup';

const NFC_REQUEST_TIMEOUT_MS = 30000;
const NFC_POST_WRITE_ANDROID_HOLD_MS = 5000;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const toByteArray = value => {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return Array.from(Buffer.from(value, 'utf8'));
  return Array.from(value);
};

const getRecordTypeString = record => {
  if (!record || record.type == null) return '';

  if (typeof record.type === 'string') return record.type;

  return Buffer.from(toByteArray(record.type)).toString('utf8');
};

export const createWalletBackupNdefBytes = walletBackupOrdinal => {
  const payload = Array.from(walletBackupOrdinal.toBuffer());

  return Ndef.encodeMessage([
    Ndef.mimeMediaRecord(WALLET_BACKUP_NDEF_MIME, payload),
  ]);
};

export const getWalletBackupOrdinalFromPayload = payload => {
  try {
    const buffer = Buffer.from(payload);
    const parsed = OrdinalVDXFObject.createFromBuffer(buffer, 0);

    if (
      parsed.offset === buffer.length &&
      parsed.obj instanceof WalletBackupOrdinalVDXFObject &&
      parsed.obj.data &&
      parsed.obj.data.isValid()
    ) {
      return parsed.obj;
    }
  } catch (e) {
    return null;
  }

  return null;
};

export const isWalletBackupPayload = payload => {
  return getWalletBackupOrdinalFromPayload(payload) != null;
};

export const getWalletBackupOrdinalFromTag = tag => {
  const records = tag && Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];

  for (const record of records) {
    const type = getRecordTypeString(record);
    const walletBackupOrdinal = getWalletBackupOrdinalFromPayload(
      toByteArray(record.payload),
    );

    if (type === WALLET_BACKUP_NDEF_MIME && walletBackupOrdinal != null) {
      return walletBackupOrdinal;
    } else if (walletBackupOrdinal != null) {
      return walletBackupOrdinal;
    }
  }

  return null;
};

export const tagContainsWalletBackup = tag => {
  const records = tag && Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];

  return records.some(record => {
    const type = getRecordTypeString(record);

    if (type === WALLET_BACKUP_NDEF_MIME) return true;

    return isWalletBackupPayload(toByteArray(record.payload));
  });
};

const assertWritableStatus = async ndefBytes => {
  const status = await NfcManager.ndefHandler.getNdefStatus();

  if (!status || status.status === NdefStatus.NotSupported) {
    throw new Error('This NFC card does not support NDEF backups.');
  }

  if (status.status === NdefStatus.ReadOnly) {
    throw new Error('This NFC card is read-only and cannot be used for backup.');
  }

  if (status.capacity != null && status.capacity > 0 && ndefBytes.length > status.capacity) {
    throw new Error('This NFC card does not have enough space for the wallet backup.');
  }
};

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeout;

  const timeoutPromise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeout);
  });
};

const getNdefRequestOptions = () => {
  if (Platform.OS !== 'android') {
    return {
      alertMessage: 'Hold your NFC card near the device.',
    };
  }

  return {
    isReaderModeEnabled: true,
    readerModeFlags:
      NfcAdapter.FLAG_READER_NFC_A |
      NfcAdapter.FLAG_READER_NFC_B |
      NfcAdapter.FLAG_READER_NFC_F |
      NfcAdapter.FLAG_READER_NFC_V |
      NfcAdapter.FLAG_READER_NFC_BARCODE |
      NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
    readerModeDelay: 500,
  };
};

const getRequestedTechnologies = () => {
  if (Platform.OS === 'android') {
    return [NfcTech.Ndef, NfcTech.NdefFormatable];
  }

  return NfcTech.Ndef;
};

const requestNdefTechnology = async timeoutMs => {
  const connectedTech = await withTimeout(
    NfcManager.requestTechnology(getRequestedTechnologies(), getNdefRequestOptions()),
    timeoutMs,
    'Timed out waiting for an NFC card. Please try again and hold the card against the device.',
  );

  if (
    connectedTech !== NfcTech.Ndef &&
    connectedTech !== NfcTech.NdefFormatable
  ) {
    throw new Error('This NFC card is not NDEF formatted and cannot be used for this backup.');
  }

  return connectedTech;
};

const requestNdefReadTechnology = async timeoutMs => {
  const connectedTech = await withTimeout(
    NfcManager.requestTechnology(NfcTech.Ndef, getNdefRequestOptions()),
    timeoutMs,
    'Timed out waiting for an NFC card. Please try again and hold the card against the device.',
  );

  if (connectedTech !== NfcTech.Ndef) {
    throw new Error('This NFC card does not contain an NDEF wallet backup.');
  }

  return connectedTech;
};

const eraseNdefCard = async () => {
  await NfcManager.ndefHandler.writeNdefMessage(
    Ndef.encodeMessage([Ndef.emptyRecord()]),
    {reconnectAfterWrite: true},
  );
};

const formatNdefCard = async backupBytes => {
  try {
    await NfcManager.ndefFormatableHandlerAndroid.formatNdef(backupBytes, {
      readOnly: true,
    });

    return {madeReadOnly: true, readOnlyWarning: null};
  } catch (_) {
    await NfcManager.ndefFormatableHandlerAndroid.formatNdef(backupBytes, {
      readOnly: false,
    });

    return {
      madeReadOnly: false,
      readOnlyWarning:
        'The NFC card was formatted and written, but it could not be made read-only.',
    };
  }
};

export const beginWalletBackupNfcSession = async ({onStatus} = {}) => {
  if (Platform.OS !== 'android') return false;

  const supported = await NfcManager.isSupported();
  if (!supported) throw new Error('NFC is not supported on this device.');

  const enabled = await NfcManager.isEnabled();
  if (!enabled) throw new Error('NFC is disabled on this device.');

  onStatus && onStatus('Preparing NFC scanner. Do not tap the card yet.');
  await NfcManager.start();
  await NfcManager.registerTagEvent(getNdefRequestOptions());

  return true;
};

export const endWalletBackupNfcSession = async ({releaseDelayMs = 0} = {}) => {
  if (Platform.OS !== 'android') return;

  await NfcManager.cancelTechnologyRequest({delayMsAndroid: 0}).catch(() => {});
  if (releaseDelayMs > 0) await delay(releaseDelayMs);
  await NfcManager.unregisterTagEvent().catch(() => {});
};

export const writeWalletBackupToNfc = async (
  walletBackupOrdinal,
  {
    onStatus,
    timeoutMs = NFC_REQUEST_TIMEOUT_MS,
    sessionPreRegistered = false,
  } = {},
) => {
  const supported = await NfcManager.isSupported();
  if (!supported) throw new Error('NFC is not supported on this device.');

  const enabled = await NfcManager.isEnabled();
  if (!enabled) throw new Error('NFC is disabled on this device.');

  const backupBytes = createWalletBackupNdefBytes(walletBackupOrdinal);
  let madeReadOnly = false;
  let readOnlyWarning = null;
  let backupWriteCompleted = false;

  onStatus && onStatus('Preparing NFC writer...');
  await NfcManager.start();

  try {
    onStatus && onStatus('Hold your NFC card against the device.');
    const connectedTech = await requestNdefTechnology(timeoutMs);

    if (connectedTech === NfcTech.NdefFormatable) {
      onStatus && onStatus('Formatting NFC card...');
      const formatResult = await formatNdefCard(backupBytes);

      backupWriteCompleted = true;
      onStatus && onStatus('Backup written. Move the card away from the device.');

      return formatResult;
    }

    onStatus && onStatus('Checking NFC card...');
    await assertWritableStatus(backupBytes);

    let existingTag = null;

    try {
      existingTag = await NfcManager.ndefHandler.getNdefMessage();
    } catch (_) {
      existingTag = null;
    }

    if (tagContainsWalletBackup(existingTag)) {
      throw new Error('This NFC card already contains a wallet backup. Refusing to overwrite it.');
    }

    onStatus && onStatus('Erasing NFC card...');
    await eraseNdefCard();

    onStatus && onStatus('Writing wallet backup...');
    await NfcManager.ndefHandler.writeNdefMessage(backupBytes, {
      reconnectAfterWrite: true,
    });
    backupWriteCompleted = true;

    onStatus && onStatus('Locking NFC card read-only...');
    try {
      const lockResult = await NfcManager.ndefHandler.makeReadOnly();
      madeReadOnly = lockResult == null ? true : lockResult === true;

      if (!madeReadOnly) {
        readOnlyWarning = 'The NFC card was written, but it could not be made read-only.';
      }
    } catch (e) {
      readOnlyWarning =
        'The NFC card was written, but this card or device could not make it read-only.';
    }

    onStatus && onStatus('Backup written. Move the card away from the device.');

    return {madeReadOnly, readOnlyWarning};
  } finally {
    const releaseDelayMs =
      Platform.OS === 'android' && backupWriteCompleted
        ? NFC_POST_WRITE_ANDROID_HOLD_MS
        : 0;

    if (sessionPreRegistered) {
      await endWalletBackupNfcSession({releaseDelayMs});
    } else {
      if (Platform.OS === 'android') {
        await NfcManager.cancelTechnologyRequest({
          delayMsAndroid: releaseDelayMs,
        }).catch(() => {});
      } else {
        await NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    }
  }
};

export const readWalletBackupFromNfc = async (
  {
    onStatus,
    timeoutMs = NFC_REQUEST_TIMEOUT_MS,
    sessionPreRegistered = false,
  } = {},
) => {
  const supported = await NfcManager.isSupported();
  if (!supported) throw new Error('NFC is not supported on this device.');

  const enabled = await NfcManager.isEnabled();
  if (!enabled) throw new Error('NFC is disabled on this device.');

  let backupReadCompleted = false;

  onStatus && onStatus('Preparing NFC reader...');
  await NfcManager.start();

  try {
    onStatus && onStatus('Hold your NFC backup card against the device.');
    await requestNdefReadTechnology(timeoutMs);

    onStatus && onStatus('Reading wallet backup...');
    const tag = await NfcManager.ndefHandler.getNdefMessage();
    const walletBackupOrdinal = getWalletBackupOrdinalFromTag(tag);

    if (walletBackupOrdinal == null) {
      throw new Error('This NFC card does not contain a wallet backup.');
    }

    backupReadCompleted = true;
    onStatus && onStatus('Wallet backup found. Move the card away from the device.');

    return walletBackupOrdinal;
  } finally {
    const releaseDelayMs =
      Platform.OS === 'android' && backupReadCompleted
        ? NFC_POST_WRITE_ANDROID_HOLD_MS
        : 0;

    if (sessionPreRegistered) {
      await endWalletBackupNfcSession({releaseDelayMs});
    } else {
      if (Platform.OS === 'android') {
        await NfcManager.cancelTechnologyRequest({
          delayMsAndroid: releaseDelayMs,
        }).catch(() => {});
      } else {
        await NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    }
  }
};
