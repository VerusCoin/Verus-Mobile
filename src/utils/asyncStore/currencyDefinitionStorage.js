import { CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY } from '../../../env/index'
import { SecureStorage } from '../keychain/secureStore';

export const storeCurrencyDefinitions = async (currencyDefinitions) => {
  return await SecureStorage.setItem(CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY, JSON.stringify(currencyDefinitions))
};

export const getStoredCurrencyDefinitions = async () => {
  const res = await SecureStorage.getItem(CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY);

  if (!res) return {};
  else return JSON.parse(res);
};

// Gets currency definitions, sets currencyDefinitions[rootSystemId] to data, and stores the new currencyDefinitions
export const storeCurrencyDefinitionsForSystemId = async (rootSystemId, definitions) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();
  currencyDefinitions[rootSystemId] = definitions;
  await storeCurrencyDefinitions(currencyDefinitions);
}

// Gets currency definitions, sets currencyDefinitions[rootSystemId][currencyId] to definition, and stores the new currencyDefinitions
export const storeCurrencyDefinitionForCurrencyId = async (rootSystemId, currencyId, definition) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();

  if (!currencyDefinitions[rootSystemId]) currencyDefinitions[rootSystemId] = {}

  currencyDefinitions[rootSystemId][currencyId] = definition;
  await storeCurrencyDefinitions(currencyDefinitions);
}

// Gets currency definitions for rootSystemId
export const getStoredCurrencyDefinitionsForSystemId = async (rootSystemId) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();
  return currencyDefinitions[rootSystemId] ? currencyDefinitions[rootSystemId] : {};
}

export const removeInactiveCurrencyDefinitions = async (activeCoinList) => {
  let storedDefinitions = await getStoredCurrencyDefinitions();

  const activeCoinIds = {}
  const activeSystems = {}
  activeCoinList.map(coin => {
    activeCoinIds[coin.id] = true
    activeSystems[coin.system_id] = true
  })
  
  for (const rootSystem in storedDefinitions) {
    const currencies = Object.keys(storedDefinitions[rootSystem])

    for (const currencyId of currencies) {
      if (!activeCoinIds[currencyId] && !activeSystems[currencyId]) {
        delete storedDefinitions[rootSystem][currencyId]
      }
    }
  }

  await storeCurrencyDefinitions(storedDefinitions)
}

// Gets currency definition given rootSystemId and currencyId
export const getStoredCurrencyDefinitionForCurrencyId = async (
  rootSystemId,
  currencyId,
) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();
  return currencyDefinitions[rootSystemId]
    ? currencyDefinitions[rootSystemId][currencyId]
      ? currencyDefinitions[rootSystemId][currencyId]
      : null
    : {};
};
