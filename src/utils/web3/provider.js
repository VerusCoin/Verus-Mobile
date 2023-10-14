import Web3Interface from './web3Interface'
import {
  ETH_HOMESTEAD,
  ETH_GOERLI,
  ETHERSCAN_API_KEY,
  INFURA_PROJECT_ID,
} from "../../../env/index";

const Web3Providers = {
  [ETH_HOMESTEAD]: new Web3Interface(ETH_HOMESTEAD, {
    etherscan: ETHERSCAN_API_KEY,
    infura: INFURA_PROJECT_ID
  }),
  [ETH_GOERLI]: new Web3Interface(ETH_GOERLI, {
    etherscan: ETHERSCAN_API_KEY,
    infura: INFURA_PROJECT_ID
  }),
}

Object.freeze(Web3Providers);

export const getWeb3ProviderForNetwork = (network = ETH_HOMESTEAD) => {
  if (Web3Providers.hasOwnProperty(network)) {
    return Web3Providers[network];
  } else {
    throw new Error(`No web3 provider for network ${network}`);
  }
};

export const deleteAllWeb3Contracts = () => {
  for (const network in Web3Providers) {
    Web3Providers[network].deleteAllContracts()
  }
}