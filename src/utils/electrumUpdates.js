import { ELECTRUM_PROTOCOL_CHANGE } from './constants/constants'
import bitcoin from '@bitgo/utxo-lib'

export const pubToElectrumScriptHashHex = (address, network) => {
  let script = bitcoin.address.toOutputScript(address, network);
  
  const hash = bitcoin.crypto.sha256(script);
  const reversedHash = Buffer.from(hash.reverse());

  return reversedHash.toString('hex');
};

//If params contain an address, and electrum server version is 1.4, convert the address to
//scripthash
export const updateParamObj = (params, network, version) => {  
  if (version >= ELECTRUM_PROTOCOL_CHANGE) {
    if (params.hasOwnProperty('address')) {
      params.address = pubToElectrumScriptHashHex(params.address, network)
    }

    params.eprotocol = version
  }
}