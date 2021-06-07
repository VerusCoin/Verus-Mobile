import Web3Interface from './web3Interface'
import {
  ETH_NETWORK,
  ETHERSCAN_API_KEY,
  INFURA_PROJECT_ID,
} from "../../../env/index";

// Change the provider here to change ETH provider
export default new Web3Interface(ETH_NETWORK, {
  etherscan: ETHERSCAN_API_KEY,
  infura: INFURA_PROJECT_ID
})