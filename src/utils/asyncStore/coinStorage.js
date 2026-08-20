import { COIN_STORAGE_INTERNAL_KEY } from '../../../env/index'
import { CoinDirectory } from '../CoinData/CoinDirectory';
import { SecureStorage } from '../keychain/secureStore';
// react-native's version of local storage

// Keep the coordinator outside this module instance so React Native Fast
// Refresh cannot create a second read/modify/write queue while an operation
// started by the previous module instance is still in flight.
const COIN_STORAGE_MUTATION_COORDINATOR_KEY = Symbol.for(
  'verus.mobile.coinStorageMutationCoordinator.v1',
);
if (globalThis[COIN_STORAGE_MUTATION_COORDINATOR_KEY] == null) {
  globalThis[COIN_STORAGE_MUTATION_COORDINATOR_KEY] = {
    queue: Promise.resolve(),
  };
}
const coinStorageMutationCoordinator =
  globalThis[COIN_STORAGE_MUTATION_COORDINATOR_KEY];

export const queueCoinStorageMutation = mutation => {
  const result = coinStorageMutationCoordinator.queue.then(
    mutation,
    mutation,
  );
  coinStorageMutationCoordinator.queue = result.catch(() => {});
  return result;
};

export const awaitCoinStorageMutations = () =>
  coinStorageMutationCoordinator.queue;

//Clear user from coin, or delete user from all if no coin specified
export const deleteUserFromCoin = (userID, coinID) =>
  queueCoinStorageMutation(async () => {
    const coinList = await getActiveCoinList();
    const newList = coinList.map(coin =>
      coinID === null || coin.id === coinID
        ? {...coin, users: coin.users.filter(name => name !== userID)}
        : {...coin, users: [...coin.users]},
    );
    return storeCoins(newList);
  });

export const purgeUnusedCoins = () =>
  queueCoinStorageMutation(async () => {
    const coins = await getActiveCoinList();
    const coinsUsed = coins
      .filter(x => x.users.length > 0)
      .map(coin => ({...coin, users: [...coin.users]}));

    await storeCoins(coinsUsed);
    return coinsUsed;
  });

//Set storage to hold list of activated coins
export const storeCoins = (coins) => {
  let _coins = coins ? coins.slice() : []
  let _toStore = {coins: _coins}

  return new Promise((resolve, reject) => {
    SecureStorage.setItem(COIN_STORAGE_INTERNAL_KEY, JSON.stringify(_toStore))
      .then(() => {
        resolve(true);
      })
      .catch(err => reject(err));
  }) 
};

export const getActiveCoinList = () => {
  return new Promise((resolve, reject) => {
    SecureStorage.getItem(COIN_STORAGE_INTERNAL_KEY)
      .then(res => {
        if (!res) {
          let coinsList = {coins: []};
          resolve(coinsList.coins);
        }
        else {
          const parsed = JSON.parse(res);
          resolve(parsed.coins);
        }
      })
      .catch(err => reject(err));
  });
};

export const updateActiveCoinList = () =>
  queueCoinStorageMutation(() =>
    new Promise((resolve, reject) => {
      SecureStorage.getItem(COIN_STORAGE_INTERNAL_KEY)
        .then((res) => {
          let coinList = []
          let newCoinList = []

          if (res) {
            coinList = JSON.parse(res).coins;
          }

          coinList.forEach((coin) => {
            try {
              const newCoinObj = CoinDirectory.findCoinObj(coin.id, "")
              newCoinList.push({...newCoinObj, users: [...coin.users]})
            } catch(e) {
              console.warn(e)
            }
          })

          return storeCoins(newCoinList)
        })
        .then(() => {
          resolve(true)
        })
        .catch(err => reject(err));
    }),
  );
