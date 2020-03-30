import { pubToElectrumScriptHashHex } from 'agama-wallet-lib/src/keys';
import { ELECTRUM_PROTOCOL_CHANGE } from './constants/constants'

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