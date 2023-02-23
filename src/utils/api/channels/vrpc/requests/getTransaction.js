import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getTransaction = (coinObj, txid, verbosity = 1) => {
  return VrpcProvider.getEndpoint(coinObj.id).getRawTransaction(txid, verbosity);
}

export const waitForTransactionConfirm = (
  coinObj,
  txid,
  interval = 10000,
  tries = 60,
) => {
  return new Promise(async (resolve, reject) => {
    let triesLeft = tries;

    const wait_interval = setInterval(async () => {
      try {
        triesLeft--;

        if (tries > 0) {
          const tx = await getTransaction(coinObj, txid, 1);

          if (tx.error != null) {
            clearInterval(wait_interval);
            reject(new Error(tx.error.message));
          } else if (
            tx.result &&
            tx.result.confirmations != null &&
            tx.result.confirmations > 0
          ) {
            clearInterval(wait_interval);
            resolve(txid);
          }
        } else {
          reject(
            new Error('Timed out while waiting for provisioning transaction.'),
          );
          clearInterval(wait_interval);
        }
      } catch (e) {
        reject(e);
      }
    }, interval);
  });
};