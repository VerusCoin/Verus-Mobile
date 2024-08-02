import ethers from 'ethers';
import { DEFAULT_ERC20_ABI } from '../constants/abi';
import { ETHERS, VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT, VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT } from '../constants/web3Constants';
import { VERUS_BRIDGE_DELEGATOR_ABI } from '../constants/abis/verusBridgeDelegatorAbi';
import { coinsList } from '../CoinData/CoinsList';
import { ERC20 } from '../constants/intervalConstants';

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

  getContractInfo = async (contractAddress) => {
    if (!ethers.utils.isAddress(contractAddress)) throw new Error("Invalid contract address '" + contractAddress + "'")

    const contract = this.getUnitializedContractInstance(contractAddress);
    let name, symbol, decimals;

    for (const key in coinsList) {
      if (
        coinsList[key].proto === ERC20 &&
        ((!!coinsList[key].testnet && this.network === 'goerli') ||
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

      if (typeof decimals !== 'number') throw new Error("Decimals is not number");
    } catch(e) {
      decimals = ETHERS;
    }

    return {
      name,
      symbol,
      decimals
    }
  }

  getVerusBridgeDelegatorContract = () => {
    switch (this.network) {
      case 'goerli':
        return new ethers.Contract(
          VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT,
          VERUS_BRIDGE_DELEGATOR_ABI,
          this.DefaultProvider
        );
      case 'homestead':
        return new ethers.Contract(
          VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT,
          VERUS_BRIDGE_DELEGATOR_ABI,
          this.DefaultProvider
        );
      default:
        throw new Error("No Verus bridge delegator for network " + this.network)
    }
  }

  isVerusBridgeDelegatorActive = () => {
    const delegatorContract = this.getVerusBridgeDelegatorContract();
    const signer = new ethers.VoidSigner(delegatorContract.address, this.DefaultProvider);
    
    return delegatorContract.connect(signer).callStatic.bridgeConverterActive();
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