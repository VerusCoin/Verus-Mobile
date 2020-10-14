import AlertAsync from "react-native-alert-async"

export const canRetryDlightInitialization = (chainTicker) => {
  return AlertAsync(
    'Blockchain Sync Failed',
    'Something went wrong while trying to synchronize with the ' + chainTicker + ' blockchain. This may cause issues with private transactions' +
    (chainTicker === 'VRSC' ? ' and Verus identity management.' : '.') + '\n\nWould you like to retry?\n\nThis can always be done later in settings.',
    [
      {
        text: 'No',
        onPress: () => Promise.resolve(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => Promise.resolve(true)},
    ],
    {
      cancelable: false,
    },
  )
}

export const blockchainQuitError = (chainTicker) => {
  return AlertAsync(
    'Blockchain Stop Failed',
    'Something went wrong while trying to stop synchronizing with the ' + chainTicker + ' blockchain. This may cause issues with private transactions' +
    chainTicker === 'VRSC' ? ' and Verus identity management.' : '.' + '\n\nIf they occur, try restarting Verus mobile.',
    [
      {
        text: 'No',
        onPress: () => Promise.resolve(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => Promise.resolve(true)},
    ],
    {
      cancelable: false,
    },
  )
}