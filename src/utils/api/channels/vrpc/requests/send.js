import {requestPrivKey} from '../../../../auth/authBox';
import {
  networks,
  Transaction,
  ECPair,
  smarttxs
} from '@bitgo/utxo-lib';
import {VRPC} from '../../../../constants/intervalConstants';
import {sendRawTransaction} from './sendRawTransaction';
import {
  BROADCAST_STATUS_UNKNOWN_MESSAGE,
  VRPC_TRANSPORT_ERROR_CODE,
} from '../../../../network/connectionErrors';
const { getFundedTxBuilder } = smarttxs;

export const send = async (
  coinObj,
  activeUser,
  address,
  amount,
  params,
  channelId,
) => {
  try {
    const { hex, inputs } = params;
    return await sendCurrencyTransfer(coinObj, channelId, hex, inputs);
  } catch (e) {
    return {
      err: true,
      result: e.message,
    };
  }
};

export const sendCurrencyTransfer = async (
  coinObj,
  channelId,
  txHex,
  inputs
) => {
  try {
    const network = networks.verus;
    let keyPair;
    const [channelName, address, systemId] = channelId.split('.');

    try {
      const spendingKey = await requestPrivKey(coinObj.id, VRPC);
      keyPair = ECPair.fromWIF(spendingKey, network);
    } catch (e) {
      throw new Error(
        'Cannot spend transaction because user priv keys failed to decrypt.',
      );
    }

    const txb = getFundedTxBuilder(txHex, network, inputs.map(x => Buffer.from(x.script, 'hex')));

    for (let i = 0; i < txb.inputs.length; i++) {
      txb.sign(
        i,
        keyPair,
        null,
        Transaction.SIGHASH_ALL,
        inputs[i].satoshis,
      );
    }

    const signedTxHex = txb.build().toHex();

    const sendRes = await sendRawTransaction(systemId, signedTxHex);

    // The request may have reached the node before the connection failed or
    // timed out, so the transaction may exist. Never report it as not sent.
    if (sendRes.error?.code === VRPC_TRANSPORT_ERROR_CODE) {
      console.warn(`VRPC broadcast status unknown: ${sendRes.error.message}`);
      return {
        err: true,
        result: BROADCAST_STATUS_UNKNOWN_MESSAGE,
        ambiguousBroadcast: true,
      };
    } else if (sendRes.error) {
      throw new Error(sendRes.error.message);
    } else {
      return {
        err: false,
        result: {
          txid: sendRes.result,
        },
      };
    }
  } catch (e) {
    return {
      err: true,
      result: e.message,
    };
  }
};
