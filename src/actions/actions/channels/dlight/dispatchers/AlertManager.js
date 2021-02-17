import { BIOMETRY_WARNING } from "../../../../../utils/constants/constants"
import { createAlert, resolveAlert } from "../../../alert/dispatchers/alert"

export const canRetryDlightInitialization = (chainTicker) => {
  return createAlert(
    'Blockchain Sync Failed',
    'Something went wrong while trying to synchronize with the ' + chainTicker + ' blockchain. This may cause issues with private transactions' +
    (chainTicker === 'VRSC' ? ' and Verus identity management.' : '.') + '\n\nWould you like to retry?\n\nThis can always be done later in settings.',
    [
      {
        text: 'No',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => resolveAlert(true)},
    ],
    {
      cancelable: false,
    },
  )
}

export const canEnableBiometry = () => {
  return createAlert(
    "Enable biometric authentication?",
    BIOMETRY_WARNING,
    [
      {
        text: "No",
        onPress: () => resolveAlert(false),
        style: "cancel",
      },
      { text: "Yes", onPress: () => resolveAlert(true) },
    ],
    {
      cancelable: false,
    }
  )
}

export const canShowSeed = () => {
  return createAlert(
    'Warning',
    "The next screen will display your unencrypted wallet seed in plain text.\n\n" + 
    "Be careful and take into consideration the fact that anyone with access to " + 
    "this seed will have access to all the funds in its wallet.\n\nAre you sure you " +
    "would like to proceed?",
    [
      {
        text: 'No',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => resolveAlert(true)},
    ],
    {
      cancelable: false,
    },
  )
}

export const canCopySeed = () => {
  return createAlert(
    "Copy Seed?",
    "Would you like to use the same seed as both your primary seed, and secondary seed?." +
      "\n\n" +
      "If you use private addresses and transactions, this would make your private addresses derived from the same source as your transparent addresses.",
    [
      {
        text: "No",
        onPress: () => resolveAlert(false),
        style: "cancel",
      },
      { text: "Yes", onPress: () => resolveAlert(true) },
    ],
    {
      cancelable: false,
    }
  );
}

export const blockchainQuitError = (chainTicker) => {
  return createAlert(
    'Blockchain Stop Failed',
    'Something went wrong while trying to stop synchronizing with the ' + chainTicker + ' blockchain. This may cause issues with private transactions' +
    chainTicker === 'VRSC' ? ' and Verus identity management.' : '.' + '\n\nIf they occur, try restarting Verus mobile.',
    [
      {
        text: 'No',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => resolveAlert(true)},
    ],
    {
      cancelable: false,
    },
  )
}