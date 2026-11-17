import { createAlert, resolveAlert } from "../../../alert/dispatchers/alert"

// Private transactions, and VerusID management on VRSC, depend on this sync.
const privateFeatures = (chainTicker) =>
  chainTicker === 'VRSC'
    ? 'private transactions and VerusID management'
    : 'private transactions'

export const canRetryDlightInitialization = (chainTicker) => {
  return createAlert(
    `Retry the ${chainTicker} sync?`,
    `The wallet could not sync with the ${chainTicker} blockchain. Until it does, ${privateFeatures(chainTicker)} may not work.`,
    [
      {
        text: 'Not now',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Retry', onPress: () => resolveAlert(true)},
    ],
  )
}

export const canShowSeed = () => {
  return createAlert(
    'Show your recovery secrets?',
    'The next screen shows your recovery secrets and private keys in plain text. Anyone who sees them can take your funds.',
    [
      {
        text: 'Not now',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Show secrets', onPress: () => resolveAlert(true)},
    ],
  )
}

export const canCopySeed = () => {
  return createAlert(
    "Use the same recovery secret?",
    "Would you like to use the same recovery secret as both your primary and secondary recovery secrets?" +
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

// Resolves true when the user asks to try stopping the sync again.
export const blockchainQuitError = (chainTicker) => {
  return createAlert(
    `Try to stop the ${chainTicker} sync again?`,
    `The wallet could not stop syncing with the ${chainTicker} blockchain. If ${privateFeatures(chainTicker)} fail later, restart Verus Mobile.`,
    [
      {
        text: 'Not now',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Try again', onPress: () => resolveAlert(true)},
    ],
  )
}
