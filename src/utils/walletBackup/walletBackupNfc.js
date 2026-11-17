import {Buffer} from 'buffer';
import BigNumber from 'bignumber.js';
import {Platform} from 'react-native';
import NfcManager, {
  Ndef,
  NdefStatus,
  NfcAdapter,
  NfcError,
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
export const NFC_CANCELLED = 'NFC_CANCELLED';
export const NFC_DISABLED = 'NFC_DISABLED';
export const NFC_TIMEOUT = 'NFC_TIMEOUT';
export const NFC_TAG_LOST = 'NFC_TAG_LOST';
export const NFC_NO_VERUS_LINK = 'NFC_NO_VERUS_LINK';
export const NFC_NO_WALLET_BACKUP = 'NFC_NO_WALLET_BACKUP';

// The steps of one card operation, in order. RELEASE is Android only: a failed
// session stays open for a short time so that the phone does not read the card
// again.
export const NFC_PHASE = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  DONE: 'done',
  RELEASE: 'release',
};

// Apple asks for "hold near" wording and no words like NFC or tag.
const IOS_SHEET_TEXT = {
  waiting: 'Hold the card near the top of your iPhone.',
  active: 'Hold still.',
};

const NFC_NO_VERUS_LINK_MESSAGE =
  'This card does not hold a Verus gift card or request.';
const NFC_NO_WALLET_BACKUP_MESSAGE =
  'This NFC card does not contain a wallet backup.';
const NFC_DISABLED_MESSAGE =
  'NFC is off. Turn it on in Settings, then try again.';
const NFC_TIMEOUT_MESSAGE =
  'Timed out waiting for an NFC card. Please try again and hold the card against the device.';

const withCode = (error, code) => {
  if (code) error.code = code;
  return error;
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const withTimeout = (promise, timeoutMs, timeoutMessage, timeoutCode) => {
  let timeout;

  const timeoutPromise = new Promise((resolve, reject) => {
    timeout = setTimeout(
      () => reject(withCode(new Error(timeoutMessage), timeoutCode)),
      timeoutMs,
    );
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

  // A timeout or cancel means no card was at the phone.
  return error.code !== NFC_TIMEOUT && error.code !== NFC_CANCELLED &&
    !/cancelled|canceled|timed out/i.test(String(error.message || ''));
};

const getAndroidNfcReleaseDelay = ({completed, error, requestStarted}) => {
  return shouldHoldAndroidNfcRelease({completed, error, requestStarted})
    ? NFC_POST_WRITE_ANDROID_HOLD_MS
    : 0;
};

const getNdefRequestOptions = (alertMessage = IOS_SHEET_TEXT.waiting) => {
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
    NFC_TIMEOUT_MESSAGE,
    NFC_TIMEOUT,
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
  unsupportedMessage,
  unsupportedCode,
) => {
  const connectedTech = await withTimeout(
    NfcManager.requestTechnology(NfcTech.Ndef, getNdefRequestOptions()),
    timeoutMs,
    NFC_TIMEOUT_MESSAGE,
    NFC_TIMEOUT,
  );

  if (connectedTech !== NfcTech.Ndef) {
    throw withCode(new Error(unsupportedMessage), unsupportedCode);
  }

  return connectedTech;
};

const isNfcErrorType = (error, name) =>
  NfcError != null && NfcError[name] != null && error instanceof NfcError[name];

// Gives library errors the codes that the screens and the release logic use.
const normalizeNfcError = error => {
  if (error?.code) return error;

  if (isNfcErrorType(error, 'UserCancel')) {
    return withCode(new Error('NFC session cancelled.'), NFC_CANCELLED);
  }

  if (isNfcErrorType(error, 'Timeout')) {
    return withCode(new Error(NFC_TIMEOUT_MESSAGE), NFC_TIMEOUT);
  }

  if (
    isNfcErrorType(error, 'TagConnectionLost') ||
    /tag\b.*\blost/i.test(String(error?.message || ''))
  ) {
    return withCode(
      new Error('The card moved away before the phone finished.'),
      NFC_TAG_LOST,
    );
  }

  return error;
};

const IOS_SHEET_FAILURE_TEXT = {
  [NFC_TIMEOUT]: 'No card found.',
  [NFC_TAG_LOST]: 'Card moved too soon.',
  [NFC_DEEPLINK_WALLET_BACKUP_DETECTED]: 'This card holds a wallet backup.',
  [NFC_NO_VERUS_LINK]: 'Nothing to claim on this card.',
  [NFC_NO_WALLET_BACKUP]: 'No wallet backup on this card.',
};

const getIosSheetFailureText = (error, fallback) =>
  IOS_SHEET_FAILURE_TEXT[error.code] || fallback;

// The iOS scan sheet text is best effort. The session still closes after it.
const showIosSheetText = async ({text, failed = false}) => {
  if (Platform.OS !== 'ios' || !text) return;

  try {
    if (failed) {
      await NfcManager.invalidateSessionWithErrorIOS(text);
    } else {
      await NfcManager.setAlertMessageIOS(text);
    }
  } catch (_) {}
};

// Return the native cleanup promise without an extra async delegation step.
const releaseNfcRequest = ({sessionPreRegistered, releaseDelayMs}) => {
  if (sessionPreRegistered) return endWalletBackupNfcSession({releaseDelayMs});
  if (Platform.OS === 'android') return NfcManager.cancelTechnologyRequest({delayMsAndroid: releaseDelayMs}).catch(() => {});
  return NfcManager.cancelTechnologyRequest().catch(() => {});
};

let nfcSessionActive = false;

// True while the app waits for or talks to a card. The iOS scan sheet makes the
// app inactive, and the app must not cover its own NFC screen then.
export const isNfcSessionActive = () => nfcSessionActive;

const assertNfcAvailable = async () => {
  const supported = await NfcManager.isSupported();
  if (!supported) throw new Error('NFC is not supported on this device.');

  const enabled = await NfcManager.isEnabled();
  if (!enabled) throw withCode(new Error(NFC_DISABLED_MESSAGE), NFC_DISABLED);
};

// Runs one card operation. onPhase reports WAITING, ACTIVE, DONE, and on
// Android RELEASE while a failed session stays open until the card is away.
// The promise settles after the session is released.
const runNfcSession = async ({
  onPhase,
  onStatus,
  messages,
  timeoutMs,
  sessionPreRegistered = false,
  requestTechnology,
  operate,
  doneSheetText,
  failedSheetText,
  availabilityChecked = false,
}) => {
  if (!availabilityChecked) await assertNfcAvailable();

  let completed = false;
  let requestStarted = false;
  let nfcError = null;

  onStatus && onStatus('Preparing NFC writer...');
  await NfcManager.start();

  try {
    onStatus && onStatus(messages.hold);
    onPhase && onPhase(NFC_PHASE.WAITING);
    requestStarted = true;
    nfcSessionActive = true;
    const connectedTech = await requestTechnology(timeoutMs);

    onPhase && onPhase(NFC_PHASE.ACTIVE);
    await showIosSheetText({text: IOS_SHEET_TEXT.active});
    onStatus && onStatus('Checking NFC card...');

    const result = await operate(connectedTech);
    completed = true;

    await showIosSheetText({text: doneSheetText});
    onPhase && onPhase(NFC_PHASE.DONE);
    onStatus && onStatus(messages.complete);

    return result;
  } catch (e) {
    nfcError = normalizeNfcError(e);

    if (nfcError.code !== NFC_CANCELLED) {
      await showIosSheetText({
        text: getIosSheetFailureText(nfcError, failedSheetText),
        failed: true,
      });
    }

    throw nfcError;
  } finally {
    const releaseDelayMs = getAndroidNfcReleaseDelay({
      completed,
      error: nfcError,
      requestStarted,
    });

    if (!completed && releaseDelayMs > 0) {
      onPhase && onPhase(NFC_PHASE.RELEASE);
      onStatus && onStatus('Move the NFC card away from the device.');
    }

    try {
      await releaseNfcRequest({sessionPreRegistered, releaseDelayMs});
    } finally {
      nfcSessionActive = false;
    }
  }
};

export const beginWalletBackupNfcSession = async () => {
  if (Platform.OS !== 'android') return false;

  await assertNfcAvailable();
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

const inspectAndWriteNdef = async ({connectedTech, bytes, beforeWrite, onStatus, messages}) => {
  if (connectedTech === NfcTech.Ndef) {
    await assertWritableStatus(bytes);

    let existingTag;

    try {
      existingTag = await NfcManager.ndefHandler.getNdefMessage();
    } catch (_) {
      throw new Error(
        'Unable to inspect the existing NFC data. Refusing to overwrite it.',
      );
    }

    await assertNfcTagCanBeOverwritten(existingTag);

    onStatus && onStatus(messages.write);
    beforeWrite && beforeWrite();
    await NfcManager.ndefHandler.writeNdefMessage(bytes, {
      reconnectAfterWrite: true,
    });
  } else if (connectedTech === NfcTech.NdefFormatable) {
    onStatus && onStatus(messages.format);
    beforeWrite && beforeWrite();
    await NfcManager.ndefFormatableHandlerAndroid.formatNdef(bytes);
  }
};

// Share both writers while retaining the redesigned phase and session contract.
const createNdefWriter = ({createBytes, doneSheetText, messages, backup = false}) => async (value, {
  onPhase, onStatus, timeoutMs = NFC_REQUEST_TIMEOUT_MS, sessionPreRegistered = false, beforeWrite,
} = {}) => {
  await assertNfcAvailable();
  const bytes = createBytes(value);
  return runNfcSession({
    availabilityChecked: true, onPhase, onStatus, messages, timeoutMs, sessionPreRegistered: backup && sessionPreRegistered, requestTechnology: requestNdefTechnology,
    doneSheetText, failedSheetText: 'Card not written.',
    operate: async connectedTech => {
      await inspectAndWriteNdef({connectedTech, bytes, beforeWrite: backup ? beforeWrite : undefined, onStatus, messages});
      return {written: true};
    },
  });
};

export const writeWalletBackupToNfc = createNdefWriter({
  createBytes: createWalletBackupNdefBytes, doneSheetText: 'Backup written.', backup: true,
  messages: {hold: 'Hold your NFC wallet backup request card against the device.', write: 'Writing wallet backup...', format: 'Formatting and writing wallet backup...', complete: 'Backup written. Move the card away from the device.'},
});
export const writeDeeplinkUriToNfc = createNdefWriter({
  createBytes: createDeeplinkUriNdefBytes, doneSheetText: 'Gift card written.',
  messages: {hold: 'Hold the NFC card against the device.', write: 'Writing gift card...', format: 'Formatting and writing gift card...', complete: 'Gift card written. Move the card away from the device.'},
});

export const readWalletBackupFromNfc = async (
  {
    onPhase,
    timeoutMs = NFC_REQUEST_TIMEOUT_MS,
    sessionPreRegistered = false,
  } = {},
) => {
  return runNfcSession({
    onPhase,
    timeoutMs,
    sessionPreRegistered,
    requestTechnology: ms =>
      requestNdefReadTechnology(
        ms,
        NFC_NO_WALLET_BACKUP_MESSAGE,
        NFC_NO_WALLET_BACKUP,
      ),
    doneSheetText: 'Backup found.',
    failedSheetText: 'Card not read.',
    operate: async () => {
      const tag = await NfcManager.ndefHandler.getNdefMessage();
      const walletBackupOrdinal = getWalletBackupOrdinalFromTag(tag);

      if (walletBackupOrdinal == null) {
        throw withCode(
          new Error(NFC_NO_WALLET_BACKUP_MESSAGE),
          NFC_NO_WALLET_BACKUP,
        );
      }

      return walletBackupOrdinal;
    },
  });
};

// Entry points that start an NFC read stay hidden on devices without NFC.
export const isNfcSupported = async () => {
  try {
    return (await NfcManager.isSupported()) === true;
  } catch (_) {
    return false;
  }
};

export const readDeeplinkUriFromNfc = async (
  {
    onPhase,
    timeoutMs = NFC_DEEPLINK_REQUEST_TIMEOUT_MS,
  } = {},
) => {
  return runNfcSession({
    onPhase,
    timeoutMs,
    requestTechnology: ms =>
      requestNdefReadTechnology(ms, NFC_NO_VERUS_LINK_MESSAGE, NFC_NO_VERUS_LINK),
    doneSheetText: 'Done.',
    failedSheetText: 'Card not read.',
    operate: async () => {
      const tag = await NfcManager.ndefHandler.getNdefMessage();
      const uri = getDeeplinkUriFromTag(tag);

      if (uri == null) {
        if (getWalletBackupOrdinalFromTag(tag) != null) {
          throw withCode(
            new Error('This NFC card holds a wallet backup.'),
            NFC_DEEPLINK_WALLET_BACKUP_DETECTED,
          );
        }

        throw withCode(
          new Error(NFC_NO_VERUS_LINK_MESSAGE),
          NFC_NO_VERUS_LINK,
        );
      }

      return uri;
    },
  });
};
