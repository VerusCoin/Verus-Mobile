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

export const readDeeplinkFromNfc = async ({
  onWalletBackupDetected,
} = {}) => {
  let cancelled = false;

  const cancelScan = () => {
    cancelled = true;
    closeLoadingModal();
    cancelWalletBackupNfcRequest();
  };

  try {
    const uri = await readDeeplinkUriFromNfc({
      onStatus: message => {
        if (!cancelled) openLoadingModal(message, 442, cancelScan, 'Cancel');
      },
    });

    if (cancelled) return;

    closeLoadingModal();
    store.dispatch(setDeeplinkUrl(uri));
  } catch (e) {
    if (cancelled) return;

    closeLoadingModal();

    if (
      e.code === NFC_DEEPLINK_WALLET_BACKUP_DETECTED &&
      onWalletBackupDetected != null
    ) {
      createAlert(
        'Wallet Backup Detected',
        'This NFC card contains a wallet backup, not a verus:// deeplink.\n\nContinue profile creation, then choose Import using NFC when you are asked how to set up your wallet seed.',
        [
          {
            text: 'Cancel',
            onPress: () => resolveAlert(false),
          },
          {
            text: 'Continue',
            onPress: () => {
              resolveAlert(true);
              onWalletBackupDetected();
            },
          },
        ],
      );
      return;
    }

    createAlert(
      'NFC Deeplink Failed',
      e.message || 'Unable to read a Verus deeplink from this NFC card.',
    );
  }
};
