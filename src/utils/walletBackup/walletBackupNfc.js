import {Buffer} from 'buffer';
import BigNumber from 'bignumber.js';
import {Platform} from 'react-native';
import NfcManager, {
  Ndef,
  NdefStatus,
  NfcAdapter,
  NfcTech,
} from 'react-native-nfc-manager';
import {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
  GenericRequest,
  OrdinalVDXFObject,
  SpendableKeyDetailsOrdinalVDXFObject,
  WalletBackupOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {WALLET_BACKUP_NDEF_MIME} from './walletBackup';
import store from '../../store';
import {
  getPendingDeeplinkId,
  loadPendingDeeplinkRequests,
} from '../deeplink/pendingDeeplinkStorage';
import {
  discoverSpendableKeyClaims,
  spendableKeyDetailsOrdinalToMnemonic,
} from '../spendableKey/spendableKey';
import {REQUEST_TIMEOUT_MS} from '../../../env/index';

const NFC_REQUEST_TIMEOUT_MS = 300000;
const NFC_DEEPLINK_REQUEST_TIMEOUT_MS = 60000;
const NFC_POST_WRITE_ANDROID_HOLD_MS = 5000;
export const NFC_DEEPLINK_WALLET_BACKUP_DETECTED =
  'NFC_DEEPLINK_WALLET_BACKUP_DETECTED';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeout;

  const timeoutPromise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeout);
  });
};

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

export const createDeeplinkUriNdefBytes = uri => {
  if (typeof uri !== 'string' || !uri.toLowerCase().startsWith('verus://')) {
    throw new Error('Only verus:// deeplinks can be written to NFC cards.');
  }

  return Ndef.encodeMessage([Ndef.uriRecord(uri)]);
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

const getUriFromRecord = record => {
  if (!record) return null;

  try {
    if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
      return Ndef.uri.decodePayload(toByteArray(record.payload));
    }

    if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
      return Ndef.text.decodePayload(toByteArray(record.payload)).trim();
    }

    if (record.tnf === Ndef.TNF_ABSOLUTE_URI) {
      return getRecordTypeString(record).trim();
    }
  } catch (e) {
    return null;
  }

  return null;
};

const getDeeplinkUrisFromTag = tag => {
  const records = tag && Array.isArray(tag.ndefMessage)
    ? [...tag.ndefMessage]
    : [];
  const uris = [];

  for (let index = 0; index < records.length; index++) {
    const record = records[index];

    if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_SMART_POSTER)) {
      try {
        records.push(...Ndef.decodeMessage(toByteArray(record.payload)));
      } catch (e) {}
    }

    const uri = getUriFromRecord(record);

    if (uri && uri.toLowerCase().startsWith('verus://')) {
      uris.push(uri);
    }
  }

  return uris;
};

export const getDeeplinkUriFromTag = tag => {
  return getDeeplinkUrisFromTag(tag)[0] || null;
};

const isCreateWalletBackupRequestDetail = detail => {
  return (
    detail instanceof CreateWalletBackupDetailsOrdinalVDXFObject &&
    detail.data != null &&
    detail.data.isValid() &&
    detail.data.backupType != null &&
    detail.data.backupType.eq(CreateWalletBackupDetails.NFC_NDEF_BACKUP)
  );
};

export const getCreateWalletBackupRequestFromTag = tag => {
  const uri = getDeeplinkUriFromTag(tag);

  if (uri == null) return null;

  try {
    const request = GenericRequest.fromWalletDeeplinkUri(uri);

    if (
      request.isValidVersion() &&
      Array.isArray(request.details) &&
      request.details.some(isCreateWalletBackupRequestDetail)
    ) {
      return request;
    }
  } catch (e) {
    return null;
  }

  return null;
};

export const tagContainsCreateWalletBackupRequest = tag => {
  return getCreateWalletBackupRequestFromTag(tag) != null;
};

export const tagContainsVerusDeeplink = tag => {
  return getDeeplinkUriFromTag(tag) != null;
};

const getSpendableKeyRequestsFromTag = tag => {
  const spendableKeyRequests = [];

  for (const uri of getDeeplinkUrisFromTag(tag)) {
    try {
      const request = GenericRequest.fromWalletDeeplinkUri(uri);
      const spendableKeyOrdinals = (request.details || []).filter(
        detail => detail instanceof SpendableKeyDetailsOrdinalVDXFObject,
      );

      if (spendableKeyOrdinals.length > 0) {
        for (const spendableKeyOrdinal of spendableKeyOrdinals) {
          spendableKeyRequests.push({request, spendableKeyOrdinal});
        }
      }
    } catch (_) {}
  }

  return spendableKeyRequests;
};

export const getSpendableKeyRequestFromTag = tag => {
  return getSpendableKeyRequestsFromTag(tag)[0] || null;
};

const assertFundedSpendableKeyWasSaved = async ({
  request,
  spendableKeyOrdinal,
}) => {
  const requestBufferString = request.toBuffer().toString('hex');
  const requestId = getPendingDeeplinkId(requestBufferString);
  let pendingRequests;

  try {
    pendingRequests = await withTimeout(
      loadPendingDeeplinkRequests(),
      REQUEST_TIMEOUT_MS,
      'Timed out while checking saved spendable keys.',
    );
  } catch (_) {
    throw new Error(
      'Unable to verify whether this spendable key was saved. Refusing to overwrite it.',
    );
  }

  const saved = pendingRequests.some(
    pendingRequest =>
      pendingRequest.id === requestId &&
      pendingRequest.requestBufferString === requestBufferString,
  );

  // Saving the exact bearer-key request is the user's durable acknowledgement
  // that it can be recovered after this tag is overwritten. This also permits
  // encrypted requests without asking for their password during an NFC write.
  if (saved) return;

  let claims;

  try {
    const mnemonic = spendableKeyDetailsOrdinalToMnemonic({
      spendableKeyOrdinal,
    });
    const state = store.getState();

    claims = await withTimeout(
      discoverSpendableKeyClaims({
        mnemonic,
        requestIsTestnet: request.isTestnet(),
        activeCoinsForUser: state.coins?.activeCoinsForUser || [],
        // Check inactive systems known and supported by this installation as
        // well as the active profile. The discovery result only marks this
        // bounded universe complete when every system check succeeds.
        includeKnownSystems: true,
      }),
      REQUEST_TIMEOUT_MS,
      'Timed out while checking spendable-key funds.',
    );
  } catch (_) {
    throw new Error(
      'Unable to establish whether this NFC spendable key contains funds. Refusing to overwrite it.',
    );
  }

  if (!Array.isArray(claims?.systems) || claims.systems.length === 0) {
    throw new Error(
      'Unable to establish whether this NFC spendable key contains funds. Refusing to overwrite it.',
    );
  }

  const hasFundsOrIdentities = claims.hasClaims === true || claims.systems.some(
    system =>
      (system?.identities || []).length > 0 ||
      (system?.observedUtxos || system?.utxos || []).some(utxo => {
        const hasNativeValue = BigNumber(utxo?.satoshis || 0).isGreaterThan(0);
        const hasCurrencyValue = Object.values(utxo?.currencyvalues || {}).some(
          value => BigNumber(value || 0).isGreaterThan(0),
        );

        return hasNativeValue || hasCurrencyValue;
      }),
  );

  if (!hasFundsOrIdentities) {
    const identityStatusUnknown = (claims?.systems || []).some(
      system =>
        system?.identityLookupSucceeded === false ||
        system?.identityLookupError,
    );

    if (identityStatusUnknown) {
      throw new Error(
        'Unable to establish whether this NFC spendable key contains VerusIDs. Refusing to overwrite it.',
      );
    }

    if (claims.scanUniverseComplete !== true) {
      throw new Error(
        'Unable to exhaustively establish that this NFC spendable key has no funds. Save it to pending requests before overwriting it.',
      );
    }

    return;
  }

  throw new Error(
    'This NFC card contains a funded spendable key that has not been saved to pending requests. Refusing to overwrite it.',
  );
};

export const assertNfcTagCanBeOverwritten = async tag => {
  if (tagContainsWalletBackup(tag)) {
    throw new Error(
      'This NFC card already contains a wallet backup. Refusing to overwrite it.',
    );
  }

  for (const spendableKeyRequest of getSpendableKeyRequestsFromTag(tag)) {
    await assertFundedSpendableKeyWasSaved(spendableKeyRequest);
  }
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

const shouldHoldAndroidNfcRelease = ({completed, error, requestStarted}) => {
  if (Platform.OS !== 'android') return false;
  if (completed) return true;
  if (!requestStarted || error == null) return false;

  const message = String(error.message || error).toLowerCase();

  return !message.includes('timed out waiting') && !message.includes('cancel');
};

const getAndroidNfcReleaseDelay = ({completed, error, requestStarted}) => {
  return shouldHoldAndroidNfcRelease({completed, error, requestStarted})
    ? NFC_POST_WRITE_ANDROID_HOLD_MS
    : 0;
};

const showAndroidMoveAwayStatus = ({onStatus, completed, releaseDelayMs}) => {
  if (Platform.OS === 'android' && !completed && releaseDelayMs > 0) {
    onStatus && onStatus('Move the NFC card away from the device.');
  }
};

const getNdefRequestOptions = (
  alertMessage = 'Hold your NFC card near the device.',
) => {
  if (Platform.OS !== 'android') {
    return {
      alertMessage,
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

const requestNdefReadTechnology = async (
  timeoutMs,
  unsupportedMessage = 'This NFC card does not contain an NDEF wallet backup.',
  alertMessage,
) => {
  const connectedTech = await withTimeout(
    NfcManager.requestTechnology(NfcTech.Ndef, getNdefRequestOptions(alertMessage)),
    timeoutMs,
    'Timed out waiting for an NFC card. Please try again and hold the card against the device.',
  );

  if (connectedTech !== NfcTech.Ndef) {
    throw new Error(unsupportedMessage);
  }

  return connectedTech;
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

export const cancelWalletBackupNfcRequest = async () => {
  if (Platform.OS === 'android') {
    await NfcManager.cancelTechnologyRequest({delayMsAndroid: 0}).catch(() => {});
  } else {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
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
  let backupWriteCompleted = false;
  let nfcRequestStarted = false;
  let nfcError = null;

  onStatus && onStatus('Preparing NFC writer...');
  await NfcManager.start();

  try {
    onStatus &&
      onStatus('Hold your NFC wallet backup request card against the device.');
    nfcRequestStarted = true;
    const connectedTech = await requestNdefTechnology(timeoutMs);

    onStatus && onStatus('Checking NFC card...');

    if (connectedTech === NfcTech.Ndef) {
      await assertWritableStatus(backupBytes);

      let existingTag;

      try {
        existingTag = await NfcManager.ndefHandler.getNdefMessage();
      } catch (_) {
        throw new Error(
          'Unable to inspect the existing NFC data. Refusing to overwrite it.',
        );
      }

      await assertNfcTagCanBeOverwritten(existingTag);

      onStatus && onStatus('Writing wallet backup...');
      await NfcManager.ndefHandler.writeNdefMessage(backupBytes, {
        reconnectAfterWrite: true,
      });
    } else if (connectedTech === NfcTech.NdefFormatable) {
      onStatus && onStatus('Formatting and writing wallet backup...');
      await NfcManager.ndefFormatableHandlerAndroid.formatNdef(backupBytes);
    }
    backupWriteCompleted = true;

    onStatus && onStatus('Backup written. Move the card away from the device.');

    return {written: true};
  } catch (e) {
    nfcError = e;
    throw e;
  } finally {
    const releaseDelayMs = getAndroidNfcReleaseDelay({
      completed: backupWriteCompleted,
      error: nfcError,
      requestStarted: nfcRequestStarted,
    });

    showAndroidMoveAwayStatus({
      onStatus,
      completed: backupWriteCompleted,
      releaseDelayMs,
    });

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

export const writeDeeplinkUriToNfc = async (
  uri,
  {
    onStatus,
    timeoutMs = NFC_REQUEST_TIMEOUT_MS,
  } = {},
) => {
  const supported = await NfcManager.isSupported();
  if (!supported) throw new Error('NFC is not supported on this device.');

  const enabled = await NfcManager.isEnabled();
  if (!enabled) throw new Error('NFC is disabled on this device.');

  const deeplinkBytes = createDeeplinkUriNdefBytes(uri);
  let deeplinkWriteCompleted = false;
  let nfcRequestStarted = false;
  let nfcError = null;

  onStatus && onStatus('Preparing NFC writer...');
  await NfcManager.start();

  try {
    onStatus && onStatus('Hold the NFC card against the device.');
    nfcRequestStarted = true;
    const connectedTech = await requestNdefTechnology(timeoutMs);

    onStatus && onStatus('Checking NFC card...');

    if (connectedTech === NfcTech.Ndef) {
      await assertWritableStatus(deeplinkBytes);

      let existingTag;

      try {
        existingTag = await NfcManager.ndefHandler.getNdefMessage();
      } catch (_) {
        throw new Error(
          'Unable to inspect the existing NFC data. Refusing to overwrite it.',
        );
      }

      await assertNfcTagCanBeOverwritten(existingTag);

      onStatus && onStatus('Writing gift card...');
      await NfcManager.ndefHandler.writeNdefMessage(deeplinkBytes, {
        reconnectAfterWrite: true,
      });
    } else if (connectedTech === NfcTech.NdefFormatable) {
      onStatus && onStatus('Formatting and writing gift card...');
      await NfcManager.ndefFormatableHandlerAndroid.formatNdef(deeplinkBytes);
    }

    deeplinkWriteCompleted = true;
    onStatus && onStatus('Gift card written. Move the card away from the device.');

    return {written: true};
  } catch (e) {
    nfcError = e;
    throw e;
  } finally {
    const releaseDelayMs = getAndroidNfcReleaseDelay({
      completed: deeplinkWriteCompleted,
      error: nfcError,
      requestStarted: nfcRequestStarted,
    });

    showAndroidMoveAwayStatus({
      onStatus,
      completed: deeplinkWriteCompleted,
      releaseDelayMs,
    });

    if (Platform.OS === 'android') {
      await NfcManager.cancelTechnologyRequest({
        delayMsAndroid: releaseDelayMs,
      }).catch(() => {});
    } else {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
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
  let nfcRequestStarted = false;
  let nfcError = null;

  onStatus && onStatus('Preparing NFC reader...');
  await NfcManager.start();

  try {
    onStatus && onStatus('Hold your NFC backup card against the device.');
    nfcRequestStarted = true;
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
  } catch (e) {
    nfcError = e;
    throw e;
  } finally {
    const releaseDelayMs = getAndroidNfcReleaseDelay({
      completed: backupReadCompleted,
      error: nfcError,
      requestStarted: nfcRequestStarted,
    });

    showAndroidMoveAwayStatus({
      onStatus,
      completed: backupReadCompleted,
      releaseDelayMs,
    });

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

export const readDeeplinkUriFromNfc = async (
  {
    onStatus,
    timeoutMs = NFC_DEEPLINK_REQUEST_TIMEOUT_MS,
  } = {},
) => {
  const supported = await NfcManager.isSupported();
  if (!supported) throw new Error('NFC is not supported on this device.');

  const enabled = await NfcManager.isEnabled();
  if (!enabled) throw new Error('NFC is disabled on this device.');

  let deeplinkReadCompleted = false;
  let nfcRequestStarted = false;
  let nfcError = null;

  onStatus && onStatus('Preparing NFC reader...');
  await NfcManager.start();

  try {
    onStatus && onStatus('Hold the NFC card with the Verus deeplink against the device.');
    nfcRequestStarted = true;
    await requestNdefReadTechnology(
      timeoutMs,
      'This NFC card does not contain an NDEF deeplink.',
      'Hold the NFC card with the Verus deeplink near the device.',
    );

    onStatus && onStatus('Reading NFC deeplink...');
    const tag = await NfcManager.ndefHandler.getNdefMessage();
    const uri = getDeeplinkUriFromTag(tag);

    if (uri == null) {
      if (getWalletBackupOrdinalFromTag(tag) != null) {
        const walletBackupError = new Error(
          'This NFC card contains a wallet backup, not a verus:// deeplink.',
        );
        walletBackupError.code = NFC_DEEPLINK_WALLET_BACKUP_DETECTED;
        throw walletBackupError;
      }

      throw new Error('This NFC card does not contain a verus:// deeplink.');
    }

    deeplinkReadCompleted = true;
    onStatus && onStatus('Verus deeplink found. Move the card away from the device.');

    return uri;
  } catch (e) {
    nfcError = e;
    throw e;
  } finally {
    const releaseDelayMs = getAndroidNfcReleaseDelay({
      completed: deeplinkReadCompleted,
      error: nfcError,
      requestStarted: nfcRequestStarted,
    });

    showAndroidMoveAwayStatus({
      onStatus,
      completed: deeplinkReadCompleted,
      releaseDelayMs,
    });

    if (Platform.OS === 'android') {
      await NfcManager.cancelTechnologyRequest({
        delayMsAndroid: releaseDelayMs,
      }).catch(() => {});
    } else {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }
};
