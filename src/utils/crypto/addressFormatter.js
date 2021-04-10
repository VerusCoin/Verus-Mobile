import { fromBase58Check, toBase58Check } from "bitgo-utxo-lib/src/address"
import networks from "bitgo-utxo-lib/src/networks"

export const reformatAddress = (address, coinId) => {
  const idLc = coinId.toLowerCase()

  if (networks[idLc] != null) {
    return toBase58Check(fromBase58Check(address).hash, networks[idLc].pubKeyHash)
  } else throw new Error(`Cannot reformat address for unsupported network ${coinId}.`)
}