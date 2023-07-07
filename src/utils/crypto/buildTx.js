import bitcoin from 'bitgo-utxo-lib';

/** This is for legacy electrum networks ONLY */
export const buildSignedTx = (
  sendTo,
  changeAddress,
  wif,
  network,
  utxo,
  changeValue,
  spendValue,
  maxFeeRate = 2500
) => {
  let key = bitcoin.ECPair.fromWIF(wif, network);
  let tx = new bitcoin.TransactionBuilder(network, maxFeeRate);

  for (let i = 0; i < utxo.length; i++) {
    tx.addInput(utxo[i].txid, utxo[i].vout);
  }

  tx.addOutput(sendTo, Number(spendValue));

  if (changeValue > 0) {
    tx.addOutput(changeAddress, Number(changeValue));
  }

  if (network.coin === "kmd") {
    const _locktime = Math.floor(Date.now() / 1000) - 777;
    tx.setLockTime(_locktime);
  }

  let versionNum;

  if (network.version) {
    versionNum = network.version;
  } else {
    versionNum = 1;
  }

  tx.setVersion(versionNum);

  for (let i = 0; i < utxo.length; i++) {
    if (
      bitcoin.coins.isBitcoinCash(network) ||
      bitcoin.coins.isBitcoinGold(network)
    ) {
      const hashType =
        bitcoin.Transaction.SIGHASH_ALL |
        bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143;
      tx.sign(i, key, null, hashType, utxo[i].value);
    } else {
      tx.sign(i, key, "", null, utxo[i].value);
    }
  }

  const rawtx = tx.build().toHex();

  return rawtx;
};
