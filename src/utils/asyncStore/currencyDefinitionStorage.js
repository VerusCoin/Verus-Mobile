import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY } from '../../../env/index'

export const storeCurrencyDefinitions = (currencyDefinitions) => {
  return AsyncStorage.setItem(CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY, JSON.stringify(currencyDefinitions))
};

export const getStoredCurrencyDefinitions = async () => {
  const res = AsyncStorage.getItem(CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY)

  if (!res) return {};
  else return JSON.parse(res);
};

// Gets currency definitions, sets currencyDefinitions[systemId] to data, and stores the new currencyDefinitions
export const storeCurrencyDefinitionForSystemId = async (systemId, definitions) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();
  currencyDefinitions[systemId] = definitions;
  await storeCurrencyDefinitions(currencyDefinitions);
}

// Gets currency definitions, sets currencyDefinitions[systemId][currencyId] to definition, and stores the new currencyDefinitions
export const storeCurrencyDefinitionForCurrencyId = async (systemId, currencyId, definition) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();

  if (!currencyDefinitions[systemId]) currencyDefinitions[systemId] = {}

  currencyDefinitions[systemId][currencyId] = definition;
  await storeCurrencyDefinitions(currencyDefinitions);
}

// Gets currency definitions for systemId
export const getStoredCurrencyDefinitionsForSystemId = async (systemId) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();
  return currencyDefinitions[systemId] ? currencyDefinitions[systemId] : {};
}

// Gets currency definition given systemId and currencyId
export const getStoredCurrencyDefinitionForCurrencyId = async (
  systemId,
  currencyId,
) => {
  const currencyDefinitions = await getStoredCurrencyDefinitions();
  return currencyDefinitions[systemId]
    ? currencyDefinitions[systemId][currencyId]
      ? currencyDefinitions[systemId][currencyId]
      : null
    : {};
};
