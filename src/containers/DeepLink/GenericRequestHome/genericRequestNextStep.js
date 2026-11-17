import {
  CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY,
  DATA_PACKET_REQUEST_VDXF_KEY,
  IDENTITY_UPDATE_REQUEST_VDXF_KEY,
  SPENDABLE_KEY_DETAILS_VDXF_KEY,
  USER_DATA_REQUEST_VDXF_KEY,
  VERUSPAY_INVOICE_DETAILS_VDXF_KEY,
} from 'verus-typescript-primitives';

// Primary action labels for a review that another review follows. Only details
// that open their own screen are listed: provisioning and app encryption are
// handled inside the sign-in step.
const CONTINUE_TO_STEP_LABELS = {
  [DATA_PACKET_REQUEST_VDXF_KEY.vdxfid]: 'Continue to sign data',
  [USER_DATA_REQUEST_VDXF_KEY.vdxfid]: 'Continue to share credentials',
  [VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid]: 'Continue to pay invoice',
  [IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid]: 'Continue to VerusID changes',
  [CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid]: 'Continue to wallet backup',
  [SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid]: 'Continue to claim funds',
};

/**
 * Names the review that opens after the current one, in the order
 * GenericRequestHome processes details.
 * @returns {string|null} The primary action label, or null when no other
 * review follows.
 */
export const getContinueToNextStepLabel = ({
  request,
  currentIndex,
  processedDetailIndices = [],
  skipWalletBackup = false,
}) => {
  const details = request?.details || [];

  for (let index = 0; index < details.length; index++) {
    if (index === currentIndex || processedDetailIndices.includes(index)) {
      continue;
    }

    const key = details[index]?.getIAddressKey?.();

    if (
      skipWalletBackup &&
      key === CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid
    ) {
      continue;
    }

    if (CONTINUE_TO_STEP_LABELS[key]) return CONTINUE_TO_STEP_LABELS[key];
  }

  return null;
};
