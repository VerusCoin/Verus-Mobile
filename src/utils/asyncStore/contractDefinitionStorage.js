import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTRACT_DEFINITION_STORAGE_INTERNAL_KEY } from '../../../env/index'

export const storeContractDefinitions = async (contractDefinitions) => {
  return await AsyncStorage.setItem(CONTRACT_DEFINITION_STORAGE_INTERNAL_KEY, JSON.stringify(contractDefinitions))
};

export const getStoredContractDefinitions = async () => {
  const res = await AsyncStorage.getItem(CONTRACT_DEFINITION_STORAGE_INTERNAL_KEY);

  if (!res) return {};
  else return JSON.parse(res);
};

// Gets contract definitions, sets contractDefinitions[ethNetwork] to data, and stores the new definitions
export const storeContractDefinitionsForNetwork = async (ethNetwork, definitions) => {
  const contractDefinitions = await getStoredContractDefinitions();
  contractDefinitions[ethNetwork] = definitions;
  await storeContractDefinitions(contractDefinitions);
}

// Gets contract definitions, sets contractDefinitions[ethNetwork][contractAddress] to definition, and stores the new definitions
export const storeContractDefinitionForNetwork = async (ethNetwork, contractAddress, definition) => {
  const contractDefinitions = await getStoredContractDefinitions();

  if (!contractDefinitions[ethNetwork]) contractDefinitions[ethNetwork] = {}

  contractDefinitions[ethNetwork][contractAddress] = definition;
  await storeContractDefinitions(contractDefinitions);
}

// Gets contract definitions for ethNetwork
export const getStoredContractDefinitionsForNetwork = async (ethNetwork) => {
  const contractDefinitions = await getStoredContractDefinitions();
  return contractDefinitions[ethNetwork] ? contractDefinitions[ethNetwork] : {};
}

export const removeInactiveContractDefinitions = async (activeCoinList) => {
  let storedDefinitions = await getStoredContractDefinitions();

  const activeCoinIds = {}
  activeCoinList.map(coin => {
    activeCoinIds[coin.id] = true
  })
  
  for (const network in storedDefinitions) {
    const tokens = Object.keys(storedDefinitions[network])

    for (const contractAddress of tokens) {
      if (!activeCoinIds[contractAddress]) {
        delete storedDefinitions[network][contractAddress]
      }
    }
  }

  await storeContractDefinitions(storedDefinitions)
}

// Gets contract definition given ethNetwork and contractAddress
export const getStoredContractDefinitionForNetwork = async (
  ethNetwork,
  contractAddress,
) => {
  const contractDefinitions = await getStoredContractDefinitions();
  return contractDefinitions[ethNetwork]
    ? contractDefinitions[ethNetwork][contractAddress]
      ? contractDefinitions[ethNetwork][contractAddress]
      : null
    : {};
};
