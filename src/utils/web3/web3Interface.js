import { ethers } from 'ethers';
import { DEFAULT_ERC20_ABI } from '../constants/abi';
import { ETHERS, ETH_SEPOLIA, VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT } from '../constants/web3Constants';
import { VERUS_BRIDGE_DELEGATOR_ABI } from '../constants/abis/verusBridgeDelegatorAbi';
import { coinsList } from '../CoinData/CoinsList';
import { ERC20 } from '../constants/intervalConstants';
import { HistorySupportingEtherscanProvider } from './etherscan';
import { getTestnetBridgeDelegator } from '../testnetEnvironment';

class Web3Interface {
  constructor(network, apiKeys) {
    this.network = network;
    this.keys = apiKeys;

    this.web3Contracts = {}; // { [key: contractAddress]: Array[contractAddress, contractAbi]}

    /** @type {import('ethers').Provider} */
    this.DefaultProvider = this.createDefaultProvider()

    /** @type {HistorySupportingEtherscanProvider} */
    this.EtherscanProvider = new HistorySupportingEtherscanProvider(
      this.network,
      apiKeys.etherscan
    )
    
    /** @type {import('ethers').InfuraProvider} */
    this.InfuraProvider = new ethers.InfuraProvider(
      this.network,
      apiKeys.infura
    )
  }

  createDefaultProvider() {
    return new ethers.getDefaultProvider(this.network, {
      etherscan: this.keys.etherscan,
      infura: this.keys.infura,
      exclusive: [ "etherscan", "infura" ]
    })
  }

  // The ethers 6 FallbackProvider keeps the result of its first network
  // check. One made while offline fails every later call, so a failed call
  // replaces it and the next call starts fresh.
  renewDefaultProvider = () => {
    this.DefaultProvider = this.createDefaultProvider()
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

  /**
   * Returns an ethers contract instance for the contract you're trying to get
   * @param {string} contractAddress 
   * @param {ethers.Interface | ethers.InterfaceAbi} customAbiFragment 
   * @param {ethers.ContractRunner} provider 
   * @returns {ethers.Contract}
   */
  getContract = (contractAddress, customAbiFragment, provider = this.DefaultProvider) => {
    const params = this.web3Contracts[contractAddress]

    if (!params)
      throw new Error(`ERC20 contract ${contractAddress} not initialized`);
    
    return new ethers.Contract(
      params[0],
      customAbiFragment != null ? customAbiFragment : params[1],
      provider
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

  getContractInfo = async (contractAddress) => {
    if (!ethers.isAddress(contractAddress)) throw new Error("Invalid contract address '" + contractAddress + "'")

    const contract = this.getUnitializedContractInstance(contractAddress);
    let name, symbol, decimals;

    for (const key in coinsList) {
      if (
        coinsList[key].proto === ERC20 &&
        ((!!coinsList[key].testnet && this.network === ETH_SEPOLIA) ||
          (!coinsList[key].testnet && this.network === 'homestead')) &&
        coinsList[key].currency_id.toLowerCase() === contractAddress.toLowerCase()
      ) {
        return {
          name: coinsList[key].display_name,
          symbol: coinsList[key].display_ticker,
          decimals: coinsList[key].decimals,
        };
      }
    }

    try {
      name = await contract.name();

      if (typeof name !== 'string') throw new Error("Name is not string");
    } catch(e) {
      name = contractAddress;
    }

    try {
      symbol = await contract.symbol();

      if (typeof name !== 'string') throw new Error("Symbol is not string");
    } catch(e) {
      symbol = contractAddress.substring(0, 6);
    }

    try {
      decimals = await contract.decimals();

      if (typeof decimals !== 'bigint' && typeof decimals !== 'number') throw new Error("Decimals is not number");

      decimals = Number(decimals);
    } catch(e) {
      decimals = ETHERS;
    }

    return {
      name,
      symbol,
      decimals
    }
  }

  getVerusBridgeDelegatorContract = (provider = this.DefaultProvider) => {
    switch (this.network) {
      case ETH_SEPOLIA:
        return new ethers.Contract(
          getTestnetBridgeDelegator(),
          VERUS_BRIDGE_DELEGATOR_ABI,
          provider
        );
      case 'homestead':
        return new ethers.Contract(
          VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT,
          VERUS_BRIDGE_DELEGATOR_ABI,
          provider
        );
      default:
        throw new Error("No Verus bridge delegator for network " + this.network)
    }
  }

  isVerusBridgeDelegatorActive = () => {
    const delegatorContract = this.getVerusBridgeDelegatorContract();
    const signer = new ethers.VoidSigner(
      this.network === 'homestead' ? VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT : getTestnetBridgeDelegator(), 
      this.DefaultProvider
    );

    return delegatorContract.connect(signer).bridgeConverterActive.staticCall();
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