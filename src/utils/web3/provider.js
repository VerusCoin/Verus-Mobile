import Web3Interface from './web3Interface'

// Change the provider here to change ETH provider
export default new Web3Interface('homestead', {
  etherscan: 'ETHERSCAN_API_KEY', //DELET
  infura: 'INFURA_PROJECT_ID', //DELET
})