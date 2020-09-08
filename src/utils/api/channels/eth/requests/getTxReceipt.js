import store from '../../../../../store/index';
import { saveEthTxReceipt } from '../../../../../actions/actionCreators';
import { MIN_ETH_TX_CONFS } from '../../../../../../env/main.json'
import Web3Provider from '../../../../web3/provider'

export const getTxReceipt = async (txid) => {
  let cachedReceipts = store.getState().ethtxreceipts.txReceipts;

  //If already loaded into redux store (from cache), get data from there and avoid call
  if (cachedReceipts[txid]) {
    return cachedReceipts[txid]
  } 

  const txReceipt = await Web3Provider.DefaultProvider.getTransactionReceipt(txid)

  if (txReceipt.confirmations >= MIN_ETH_TX_CONFS) await saveEthTxReceipt(txReceipt, txid, store)

  return txReceipt
}