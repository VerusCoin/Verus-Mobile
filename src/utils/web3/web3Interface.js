import ethers from 'ethers';
import { DEFAULT_ERC20_ABI } from '../constants/abi';
import { VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT } from '../constants/web3Constants';
import { VERUS_BRIDGE_DELEGATOR_GOERLI_ABI } from '../constants/abis/verusBridgeDelegatorAbi';
import { coinsList } from '../CoinData/CoinsList';

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

  getVerusBridgeDelegatorContract = () => {
    switch (this.network) {
      case 'goerli':
        return new ethers.Contract(
          VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT,
          VERUS_BRIDGE_DELEGATOR_GOERLI_ABI,
          this.DefaultProvider
        );
      default:
        throw new Error("No Verus bridge delegator for network " + this.network)
    }
  }

  getVrscSystem = () => {
    switch (this.network) {
      case 'homestead':
        return coinsList.VRSC.currency_id;
      default:
        return coinsList.VRSCTEST.currency_id;
    }
  }
}

export default Web3Interface