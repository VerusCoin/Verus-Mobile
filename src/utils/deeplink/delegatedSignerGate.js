import {accountIsTestnet} from '../account/accountNetwork';

export const DELEGATED_SIGNER_ACCOUNT_REQUIRED =
  'DELEGATED_SIGNER_ACCOUNT_REQUIRED';

export const DELEGATED_SIGNER_GATE_OUTCOMES = {
  CANCELLED: 'cancelled',
  NO_MATCHING_PROFILES: 'no-matching-profiles',
  UNLOCKED: 'unlocked',
  VALIDATED: 'validated',
};

export const DELEGATED_SIGNER_SELECTION_MODES = {
  CHOOSE_PROFILE: 'choose-profile',
  SINGLE_PROFILE: 'single-profile',
};

// Every explicit app scope needs proof of control, including signer equality.
export const isDelegatedSignerRequest = request =>
  request.isSigned() && request.hasAppOrDelegatorID();

export const getDelegatedSignerUnlockPlan = (accounts, requestIsTestnet) => {
  const eligibleAccounts = (Array.isArray(accounts) ? accounts : []).filter(
    account => accountIsTestnet(account) === requestIsTestnet,
  );
  let selectionMode = null;

  if (eligibleAccounts.length === 1) {
    selectionMode = DELEGATED_SIGNER_SELECTION_MODES.SINGLE_PROFILE;
  } else if (eligibleAccounts.length > 1) {
    selectionMode = DELEGATED_SIGNER_SELECTION_MODES.CHOOSE_PROFILE;
  }

  return {
    eligibleAccounts,
    selectionMode,
  };
};

export const createDelegatedSignerAccountError = (
  message =
    'Request not signed by appOrDelegatedID or a user-controlled VerusID.',
) => {
  const error = new Error(message);
  error.code = DELEGATED_SIGNER_ACCOUNT_REQUIRED;
  return error;
};

export const isDelegatedSignerAccountError = error =>
  error?.code === DELEGATED_SIGNER_ACCOUNT_REQUIRED;

export const requestDelegatedSignerWallet = async ({
  accounts,
  requestIsTestnet,
  requestUnlock,
  unlockCancelledCode,
  unlockOptions,
}) => {
  const {eligibleAccounts, selectionMode} = getDelegatedSignerUnlockPlan(
    accounts,
    requestIsTestnet,
  );

  if (eligibleAccounts.length === 0) {
    return {
      outcome: DELEGATED_SIGNER_GATE_OUTCOMES.NO_MATCHING_PROFILES,
      eligibleAccountCount: 0,
      selectionMode,
    };
  }

  try {
    await requestUnlock({
      ...unlockOptions,
      accountHashes: eligibleAccounts.map(account => account.accountHash),
    });

    return {
      outcome: DELEGATED_SIGNER_GATE_OUTCOMES.UNLOCKED,
      eligibleAccountCount: eligibleAccounts.length,
      selectionMode,
    };
  } catch (error) {
    if (error?.code === unlockCancelledCode) {
      return {
        outcome: DELEGATED_SIGNER_GATE_OUTCOMES.CANCELLED,
        eligibleAccountCount: eligibleAccounts.length,
        selectionMode,
      };
    }

    throw error;
  }
};

export const validateWithDelegatedSignerGate = async ({
  requiresDelegatedSignerCheck,
  signedIn,
  validateRequest,
  unlockForDelegatedSigner,
}) => {
  let unlockedForDelegatedSigner = false;

  if (requiresDelegatedSignerCheck && !signedIn) {
    const unlockResult = await unlockForDelegatedSigner();

    if (unlockResult.outcome !== DELEGATED_SIGNER_GATE_OUTCOMES.UNLOCKED) {
      return unlockResult;
    }

    unlockedForDelegatedSigner = true;
  }

  try {
    await validateRequest();
  } catch (error) {
    // A signed-in profile is checked first because locked profile metadata has
    // no addresses. Only the validator's exact delegated-account mismatch may
    // open the network-filtered switcher; every other validation error remains
    // terminal. After a successful switch, rerun the complete validation.
    const canOfferWalletSwitch =
      requiresDelegatedSignerCheck &&
      signedIn &&
      !unlockedForDelegatedSigner &&
      isDelegatedSignerAccountError(error);

    if (!canOfferWalletSwitch) throw error;

    const unlockResult = await unlockForDelegatedSigner();

    if (unlockResult.outcome !== DELEGATED_SIGNER_GATE_OUTCOMES.UNLOCKED) {
      return unlockResult;
    }

    await validateRequest();
  }

  return {outcome: DELEGATED_SIGNER_GATE_OUTCOMES.VALIDATED};
};
