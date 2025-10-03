import { getSynchronizerInstance } from 'react-native-verus'

// Get the current chain blockheight
export const getBlockCount = (coinId, accountHash, coinProto) => {
  const sync = getSynchronizerInstance(accountHash, coinId);
  return new Promise((resolve, reject) => {
    synchronizer.getLatestNetworkHeight(coinId)
      .then(res => {
        resolve(res);
      })
      .catch(err => {
          reject(err);
      });
  })
}
