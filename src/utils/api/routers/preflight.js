import { ELECTRUM, ETH, ERC20 } from '../../constants/intervalConstants'
import * as electrum from '../channels/electrum/callCreators'
import * as eth from '../channels/eth/callCreator'
import * as erc20 from '../channels/erc20/callCreator'

const PREFLIGHT_FUNCTION_MAP = {
  [ELECTRUM]: electrum.txPreflight,
  [ETH]: eth.txPreflight,
  [ERC20]: erc20.txPreflight
}

/**
 * Creates and returns an object describing a potential transaction without sending the transaction. 
 * Returns an error object if the transaction were to fail.
 * @param {Object} coinObj The coin object describing the chain to send on
 * @param {Object} activeUser The user object of the user performing the send
 * @param {String} address The destination address
 * @param {BigNumber} amount The amount to send (in BigNumber form from bignumber.js)
 * @param {String} channel The channel to send on (e.g. ETH/ELECTRUM/ERC20)
 * @param {Object} params Any other parameters specific to the send channel's preflight function
 */
export const preflight = async (coinObj, activeUser, address, amount, channel, params) => {
  if (PREFLIGHT_FUNCTION_MAP[channel] == null) throw new Error(`No preflight function available for channel ${channel}`)
  else return await PREFLIGHT_FUNCTION_MAP[channel](coinObj, activeUser, address, amount, params)
}