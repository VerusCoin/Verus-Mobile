import { unpackOutput } from "@bitgo/utxo-lib/dist/src/smart_transactions";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressUtxos = (systemId, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(systemId).getAddressUtxos({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}

export const getSpendableUtxos = async (systemId, currency, addresses) => {
  const utxosRes = await getAddressUtxos(systemId, addresses);

  if (utxosRes.error) throw new Error(utxosRes.error.message);

  const utxoList = []

  utxosRes.result.forEach((inputUtxo) => {
    if (inputUtxo.isspendable && 
      (inputUtxo.satoshis != 0 || 
        (inputUtxo.currencyvalues != null && Object.keys(inputUtxo.currencyvalues).includes(currency))
      )) {
      const _script = Buffer.from(inputUtxo.script, 'hex')
      const _value = inputUtxo.satoshis

      try {
        unpackOutput({ value: _value, script: _script }, systemId, true)
        utxoList.push(inputUtxo)
      } catch (e) {
        console.warn(e.message)
      }
    }
  })

  return utxoList;
}