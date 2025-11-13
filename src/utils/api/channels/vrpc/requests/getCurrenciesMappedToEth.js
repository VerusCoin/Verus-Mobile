import { DEST_ETH, toBase58Check } from "verus-typescript-primitives";
import { listCurrencies } from "./listCurrencies";
import { getWeb3ProviderForNetwork } from "../../../../web3/provider";

/**
 * Returns a map of key: contract address and values: array of currencydefinitions
 * @param {string} systemId 
 * @param {string} ethNetwork
 * @returns {Promise<{result?: {contractAddressToCurrencyDefinitionMap: Map, currencyIdToContractAddressMap: Map}, error?: string}>}
 */
export const getCurrenciesMappedToEth = async (systemId, ethNetwork) => {
  // TODO: Switch to using subset getter when support is added
  const allImportedCurrencies = await listCurrencies(systemId, "imported");
  const allLocalCurrencies = await listCurrencies(systemId, "local");
  const allPbaasCurrencies = await listCurrencies(systemId, "pbaas");
  
  if (allImportedCurrencies.error) return allImportedCurrencies;
  if (allLocalCurrencies.error) return allImportedCurrencies;
  if (allPbaasCurrencies.error) return allImportedCurrencies;

  const allCurrencyMap = new Map();
  const allCurrencies = [...allImportedCurrencies.result, ...allLocalCurrencies.result, ...allPbaasCurrencies.result];

  for (const currency of allCurrencies) {
    if (!allCurrencyMap.has(currency.currencydefinition.currencyid)) {
      allCurrencyMap.set(currency.currencydefinition.currencyid, currency)
    }
  }
 
  /**
   * @type {Map<string, Map<string, any>>}
   */
  const mapped = new Map();

  /**
   * @type {Map<string, Set<string>>}
   */
  const inversemap = new Map();

  try {
    for (const currency of allImportedCurrencies.result) {
      if (
        currency.currencydefinition != null &&
        currency.currencydefinition.nativecurrencyid != null &&
        currency.currencydefinition.nativecurrencyid.type === DEST_ETH.toNumber()
      ) {

        const contractAddr = currency.currencydefinition.nativecurrencyid.address
        
        if (mapped.has(contractAddr)) {
          mapped.get(contractAddr).set(currency.currencydefinition.currencyid, currency)
        } else {
          mapped.set(contractAddr, new Map([[currency.currencydefinition.currencyid, currency]]))
        }
      }
    }

    try {
      const tokenList = await getWeb3ProviderForNetwork(ethNetwork).getVerusBridgeDelegatorContract().getTokenList.staticCall(0, 0);
      
      tokenList.forEach(tokenInfo => {
        const [iAddrBytesHex, contractAddr, nftTokenId, flags] = tokenInfo;

        const iAddrBytes = Buffer.from(iAddrBytesHex.substring(2), 'hex');
        const iAddr = toBase58Check(iAddrBytes, 102);

        if (allCurrencyMap.has(iAddr)) {
          const currency = allCurrencyMap.get(iAddr);

          if (mapped.has(contractAddr)) {
            mapped.get(contractAddr).set(currency.currencydefinition.currencyid, currency);
          } else {
            mapped.set(contractAddr, new Map([[currency.currencydefinition.currencyid, currency]]));
          }

          if (inversemap.has(iAddr)) {
            inversemap.get(iAddr).add(contractAddr);
          } else {
            inversemap.set(iAddr, new Set([contractAddr]))
          }
        }
      })
    } catch(e) {
      console.error(e)
    }
  
    return { result: {contractAddressToCurrencyDefinitionMap: mapped, currencyIdToContractAddressMap: inversemap} }
  } catch(e) {
    return { error: { code: -1, message: e.message } }
  }
}