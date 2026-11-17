import {Platform} from 'react-native';
import {
  NFC_CANCELLED,
  NFC_DEEPLINK_WALLET_BACKUP_DETECTED,
  NFC_DISABLED,
  NFC_NO_VERUS_LINK,
  NFC_NO_WALLET_BACKUP,
  NFC_PHASE,
  NFC_TAG_LOST,
  NFC_TIMEOUT,
} from './walletBackupNfc';

// The steps that the NFC tap screen shows. PREPARING comes before the card
// session; FAILED and NOTICE come after it. NOTICE means the card was read but
// holds something else.
export const NFC_TAP_PHASE = {
  PREPARING: 'preparing',
  ...NFC_PHASE,
  FAILED: 'failed',
  NOTICE: 'notice',
};

export const NFC_TAP_TASK = {
  CLAIM: 'claim',
  RESTORE: 'restore',
  BACKUP: 'backup',
  GIFT_CARD: 'giftCard',
};

// iPhone reads at its top edge, where the tap screen shows the symbol. Most
// Android phones read near the middle of the back.
const WAITING_TITLE = Platform.select({
  ios: 'Hold the card here',
  default: 'Hold the card to the back of your phone',
});

const HOLD_HINT = Platform.select({
  ios: 'Hold the card near the top of your iPhone.',
  default: 'Hold the card to the back of your phone.',
});

const DONE_TITLES = {
  [NFC_TAP_TASK.CLAIM]: 'Done',
  [NFC_TAP_TASK.RESTORE]: 'Backup found',
  [NFC_TAP_TASK.BACKUP]: 'Backup written',
  [NFC_TAP_TASK.GIFT_CARD]: 'Gift card written',
};

// The step for a phase: {phase, title, detail}.
export const getNfcTapText = (task, phase) => ({
  phase,
  ...getPhaseText(task, phase),
});

const getPhaseText = (task, phase) => {
  switch (phase) {
    case NFC_TAP_PHASE.PREPARING:
      return {title: 'Preparing backup', detail: "Don't hold the card yet."};
    case NFC_TAP_PHASE.WAITING:
      return {title: WAITING_TITLE, detail: null};
    case NFC_TAP_PHASE.ACTIVE:
      return {title: 'Hold still', detail: null};
    case NFC_TAP_PHASE.RELEASE:
      return {title: 'Move the card away', detail: null};
    case NFC_TAP_PHASE.DONE:
      // Android keeps the session open for a few seconds after a success.
      return {
        title: DONE_TITLES[task],
        detail: Platform.OS === 'android' ? 'Move the card away.' : null,
      };
    default:
      return {title: null, detail: null};
  }
};

const FAILED_TITLES = {
  [NFC_TAP_TASK.CLAIM]: 'Card not read',
  [NFC_TAP_TASK.RESTORE]: 'Card not read',
  [NFC_TAP_TASK.BACKUP]: 'Backup not written',
  [NFC_TAP_TASK.GIFT_CARD]: 'Gift card not written',
};

// The app's own errors explain the problem. Library and program errors do not,
// so they get the general hint.
const hasUserMessage = error =>
  error?.constructor === Error &&
  typeof error.message === 'string' &&
  error.message.length > 0;

// The tap screen for a failed session, or null when the user cancelled it.
export const getNfcTapFailure = (task, error) => {
  switch (error?.code) {
    case NFC_CANCELLED:
      return null;
    case NFC_DISABLED:
      return {
        phase: NFC_TAP_PHASE.FAILED,
        title: 'NFC is off',
        detail: 'Turn on NFC in Settings, then try again.',
      };
    case NFC_TIMEOUT:
      return {
        phase: NFC_TAP_PHASE.FAILED,
        title: 'No card found',
        detail: HOLD_HINT,
      };
    case NFC_TAG_LOST:
      return {
        phase: NFC_TAP_PHASE.FAILED,
        title: 'Card moved too soon',
        detail: 'Hold it still until you see the check.',
      };
    case NFC_NO_VERUS_LINK:
      return {
        phase: NFC_TAP_PHASE.NOTICE,
        title: 'Nothing to claim',
        detail: 'This card does not hold a Verus gift card or request.',
      };
    case NFC_NO_WALLET_BACKUP:
      return {
        phase: NFC_TAP_PHASE.NOTICE,
        title: 'No wallet backup',
        detail: 'This card does not hold a wallet backup.',
      };
    case NFC_DEEPLINK_WALLET_BACKUP_DETECTED:
      return {
        phase: NFC_TAP_PHASE.NOTICE,
        title: 'Wallet backup found',
        detail: 'This card holds a wallet backup, not funds to claim.',
      };
    default:
      break;
  }

  return {
    phase: NFC_TAP_PHASE.FAILED,
    title: FAILED_TITLES[task],
    detail: hasUserMessage(error)
      ? error.message
      : 'Hold the card still until you see the check.',
  };
};
