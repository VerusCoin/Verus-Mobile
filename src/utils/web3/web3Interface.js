import ethers from 'ethers'

class Web3Interface {
  constructor(network, apiKeys) {
    this.network = network

    this.DefaultProvider = new ethers.getDefaultProvider(this.network, apiKeys)

    this.EtherscanProvider = new ethers.providers.EtherscanProvider(
      this.network,
      apiKeys.etherscan
    );

    this.contracts = {}
  }

  initContract = async (contractAddress) => {
    try {
      if (this.contracts[contractAddress]) throw new Error("Cannot initialize existing contract " + contractAddress)
      const abi = await this.EtherscanProvider.perform('getabi', {address: contractAddress})

      this.contracts[contractAddress] = new ethers.Contract(address, abi, this.DefaultProvider);
    } catch(e) {
      console.error(e)
      throw e
    }
  }

  getContract = (contractAddress) => {
    if (!this.contracts[contractAddress]) throw new Error(`ERC20 contract ${contractAddress} not initialized`)
    return this.contracts[contractAddress]
  }
}

export default Web3Interface