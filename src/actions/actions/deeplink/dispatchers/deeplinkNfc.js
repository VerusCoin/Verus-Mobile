import store from '../../../../store';
import {createAlert, resolveAlert} from '../../alert/dispatchers/alert';
import {
  closeLoadingModal,
  openLoadingModal,
} from '../../loadingModal/dispatchers/loadingModal';
import {
  cancelWalletBackupNfcRequest,
  NFC_DEEPLINK_WALLET_BACKUP_DETECTED,
  readDeeplinkUriFromNfc,
} from '../../../../utils/walletBackup/walletBackupNfc';
import {setDeeplinkUrl} from '../creators/deeplink';

let pendingRead = null;

const performDeeplinkRead = async ({
  onWalletBackupDetected,
} = {}) => {
  let cancelled = false;
  let finished = false;
  let cancellation;

  const cancelScan = () => {
    if (cancelled || finished) return;
    cancelled = true;
    closeLoadingModal();
    cancellation = cancelWalletBackupNfcRequest();
  };

  try {
    const uri = await readDeeplinkUriFromNfc({
      onStatus: message => {
        if (!cancelled) openLoadingModal(message, 442, cancelScan, 'Cancel');
      },
    });

    if (cancelled) return;

    closeLoadingModal();
    store.dispatch(setDeeplinkUrl(uri, {fromNfc: true}));
  } catch (e) {
    if (cancelled) return;

    closeLoadingModal();

    if (
      e.code === NFC_DEEPLINK_WALLET_BACKUP_DETECTED &&
      onWalletBackupDetected != null
    ) {
      const shouldContinue = await createAlert(
        'Wallet Backup Detected',
        'This NFC card contains a wallet backup, not a verus:// deeplink.\n\nContinue profile creation, then choose Import using NFC when you are asked how to set up your wallet seed.',
        [
          {
            text: 'Cancel',
            onPress: () => resolveAlert(false),
          },
          {
            text: 'Continue',
            onPress: () => resolveAlert(true),
          },
        ],
      );
      if (shouldContinue) onWalletBackupDetected();
      return;
    }

    await createAlert(
      'NFC Deeplink Failed',
      e.message || 'Unable to read a Verus deeplink from this NFC card.',
    );
  } finally {
    finished = true;
    await cancellation;
  }
};

export const readDeeplinkFromNfc = (options = {}) => {
  if (pendingRead != null) return pendingRead;

  // Acquire before any native request or status callback can run. Duplicates
  // share the first caller's scan, including its prompt and session cleanup.
  const operation = Promise.resolve().then(() => performDeeplinkRead(options));
  pendingRead = operation;
  const release = () => {
    if (pendingRead === operation) pendingRead = null;
  };
  operation.then(release, release);
  return operation;
};
