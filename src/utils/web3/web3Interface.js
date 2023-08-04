import ethers from 'ethers';
import { DEFAULT_ERC20_ABI } from '../constants/abi';

class Web3Interface {
  constructor(network, apiKeys) {
    this.network = network;
    this.keys = apiKeys;

    this.web3Contracts = {}; // { [key: contractAddress]: Array[contractAddress, contractAbi]}

    this.DefaultProvider = new ethers.getDefaultProvider(this.network, apiKeys);

    this.EtherscanProvider = new ethers.providers.EtherscanProvider(
      this.network,
      apiKeys.etherscan
    );
    
    this.InfuraProvider = new ethers.providers.InfuraProvider(
      this.network,
      apiKeys.infura
    );
  }

  initContract = async (contractAddress) => {
    try {
      if (this.web3Contracts[contractAddress])
        throw new Error(
          "Cannot initialize existing contract " + contractAddress
        );

      const abi = DEFAULT_ERC20_ABI

      this.web3Contracts[contractAddress] = [contractAddress, abi];
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  deleteContract = (contractAddress) => {
    try {
      if (!this.web3Contracts[contractAddress])
        throw new Error(
          "Cannot delete uninitialized contract " + contractAddress
        );

      delete this.web3Contracts[contractAddress];
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  deleteAllContracts = () => {
    this.web3Contracts = {};
  }

  getContract = (contractAddress, customAbiFragment) => {
    const params = this.web3Contracts[contractAddress]

    if (!params)
      throw new Error(`ERC20 contract ${contractAddress} not initialized`);
    return new ethers.Contract(
      params[0],
      customAbiFragment != null ? customAbiFragment : params[1],
      this.DefaultProvider
    );
  };

  getUnitializedContractInstance = (contractAddress) => {
    const abi = DEFAULT_ERC20_ABI

    return new ethers.Contract(
      contractAddress,
      abi,
      this.DefaultProvider
    );
  };
}

export default Web3Interface