import {Platform} from 'react-native';
import store from '../../../../store';
import {closeNfcTap, showNfcTap} from '../../nfcTap/dispatchers/nfcTap';
import {
  cancelWalletBackupNfcRequest,
  NFC_DEEPLINK_WALLET_BACKUP_DETECTED,
  NFC_PHASE,
  readDeeplinkUriFromNfc,
} from '../../../../utils/walletBackup/walletBackupNfc';
import {
  getNfcTapFailure,
  getNfcTapText,
  NFC_TAP_TASK,
} from '../../../../utils/walletBackup/nfcTapText';
import {setDeeplinkUrl} from '../creators/deeplink';

let pendingRead = null;

// Closing the tap screen while it still fades in leaves its native view on
// screen (seen on iOS), so it stays open at least this long.
const MIN_OPEN_MS = 500;
// How long the check stays on screen before the claim screen opens.
const DONE_HOLD_MS = 900;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const performDeeplinkRead = async ({onWalletBackupDetected} = {}) => {
  const openedAt = Date.now();
  let closed = false;

  const close = async () => {
    if (closed) return;
    closed = true;
    const remaining = MIN_OPEN_MS - (Date.now() - openedAt);
    if (remaining > 0) await delay(remaining);
    closeNfcTap();
  };

  const show = (phase, text, actions = []) => {
    showNfcTap({phase, title: text.title, detail: text.detail, actions});
  };

  // Shows a result step and waits for one of its actions.
  const choose = (step, actions) =>
    new Promise(resolve => {
      let chosen = false;
      show(
        step.phase,
        step,
        actions.map(action => ({
          ...action,
          onPress: () => {
            if (chosen) return;
            chosen = true;
            resolve(action.value);
          },
        })),
      );
    });

  try {
    for (;;) {
      let cancelled = false;
      let cancellation = null;
      let doneAt = null;

      const cancelAction = {
        cancel: true,
        label: 'Cancel',
        onPress: () => {
          if (cancelled) return;
          cancelled = true;
          cancellation = cancelWalletBackupNfcRequest();
        },
      };
      const showPhase = phase => {
        if (phase === NFC_PHASE.DONE) doneAt = Date.now();
        // iOS has its own Cancel in the scan sheet.
        const canCancel =
          phase === NFC_PHASE.WAITING && Platform.OS === 'android';
        show(
          phase,
          getNfcTapText(NFC_TAP_TASK.CLAIM, phase),
          canCancel ? [cancelAction] : [],
        );
      };

      showPhase(NFC_PHASE.WAITING);

      let uri;

      try {
        uri = await readDeeplinkUriFromNfc({onPhase: showPhase});
      } catch (e) {
        await cancellation;
        const failure = getNfcTapFailure(NFC_TAP_TASK.CLAIM, e);
        if (cancelled || failure == null) return;

        if (e.code === NFC_DEEPLINK_WALLET_BACKUP_DETECTED) {
          // Signed out, the caller can open the restore flow. Signed in,
          // restoring means adding a wallet from the sign-in screen.
          if (onWalletBackupDetected == null) {
            await choose(
              {
                ...failure,
                detail:
                  'To restore it, add a wallet from the sign-in screen and choose Restore from NFC backup.',
              },
              [{cancel: true, label: 'Close', value: 'close', variant: 'primary'}],
            );
            return;
          }

          const choice = await choose(
            {...failure, detail: 'Restore the wallet from this card?'},
            [
              {label: 'Restore wallet', value: 'restore', variant: 'primary'},
              {cancel: true, label: 'Cancel', value: 'close'},
            ],
          );

          if (choice === 'restore') {
            await close();
            onWalletBackupDetected();
          }
          return;
        }

        const choice = await choose(failure, [
          {label: 'Try again', value: 'retry', variant: 'primary'},
          {cancel: true, label: 'Cancel', value: 'close'},
        ]);

        if (choice === 'retry') continue;
        return;
      }

      if (cancelled) return;

      // The claim screen opens under the tap screen, which then fades out.
      const shownFor = doneAt == null ? 0 : Date.now() - doneAt;
      if (shownFor < DONE_HOLD_MS) await delay(DONE_HOLD_MS - shownFor);

      store.dispatch(setDeeplinkUrl(uri, {fromNfc: true}));
      return;
    }
  } finally {
    await close();
  }
};

export const readDeeplinkFromNfc = (options = {}) => {
  if (pendingRead != null) return pendingRead;

  // Acquire before any native request or status callback can run. Duplicates
  // share the first caller's scan, including its result step and cleanup.
  const operation = Promise.resolve().then(() => performDeeplinkRead(options));
  pendingRead = operation;
  const release = () => {
    if (pendingRead === operation) pendingRead = null;
  };
  operation.then(release, release);
  return operation;
};
