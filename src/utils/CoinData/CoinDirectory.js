import { DLIGHT_PRIVATE, ELECTRUM, ERC20, GENERAL, IS_PBAAS, IS_VERUS, IS_ZCASH, VERUSID, VRPC, WYRE_SERVICE } from "../constants/intervalConstants";
import { getDefaultApps, getSystemNameFromSystemId } from "./CoinData";
import { electrumServers } from './electrum/servers';
import { ENABLE_VERUS_IDENTITIES } from '../../../env/index'
import { VerusdRpcInterface } from "verusd-rpc-ts-client";
import { VERUS_APPS, coinsList } from "./CoinsList";
import { DEFAULT_DECIMALS, VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT, VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT } from "../constants/web3Constants";
import { getStoredCurrencyDefinitions, storeCurrencyDefinitionForCurrencyId } from "../asyncStore/currencyDefinitionStorage";
import { timeout } from "../promises";
import { getStoredContractDefinitions, storeContractDefinitionForNetwork } from "../asyncStore/contractDefinitionStorage";
import { DEST_ETH, FLAG_MASK } from "verus-typescript-primitives";
import { BN } from "bn.js";
import { getWeb3ProviderForNetwork } from "../web3/provider";

class _CoinDirectory {
  fullCoinList = [];
  testCoinList = [];
  supportedCoinList = [];
  disabledNameList = [];
  enabledNameList = [];

  vrpcOverrides = {};

  constructor(coins = {}) {
    this.coins = coins;
    this.updateCoinLists();
  }

  getBasicCoinObj(id) {
    let searchId = id

    // Hack for backwards compat with VRSCTEST and VRSC coin IDs being names
    if (id === 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq') searchId = 'VRSCTEST'
    else if (id === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV') searchId = 'VRSC'

    if (this.coinExistsInDirectory(searchId)) return this.coins[searchId]
    else {
      throw new Error(searchId + " not found in coin list!")
    }
  }

  updateCoinLists() {
    this.fullCoinList = Object.values(this.coins).map(function(coin) {
      return coin.id;
    }).filter(x => {
      return this.coins[x];
    });
    
    this.testCoinList = this.fullCoinList.filter(x => {
      return this.coins[x].testnet;
    })
    
    this.supportedCoinList = this.fullCoinList.filter(x => {
      return !this.coins[x].testnet && x !== 'OOT' && x !== 'ZILLA' && x !== 'RFOX'
    });
    
    this.disabledNameList = this.supportedCoinList.filter(x => {
      return this.coins[x].compatible_channels.includes(WYRE_SERVICE);
    });
    
    this.enabledNameList = this.supportedCoinList.filter(
      x => !this.disabledNameList.includes(x),
    );
  }

  // Function to check if a coin with a specific ID exists in the directory
  coinExistsInDirectory(coinId) {
    return (
      this.coins.hasOwnProperty(coinId) ||
      coinId === 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq' ||
      coinId === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'
    );
  }

  // Function to find a coin object by coinId.
  findSimpleCoinObj(key, userName, useSystemId) {
    const id = useSystemId
      ? getSystemNameFromSystemId(key)
      : key === 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'
      ? 'VRSCTEST'
      : key === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'
      ? 'VRSC'
      : key;

    let coinObj = this.coins[id]
  
    if (coinObj) {
      coinObj.electrum_endpoints = coinObj.compatible_channels.includes(ELECTRUM) ? electrumServers[id.toLowerCase()].serverList : []
      coinObj.users = userName != null ? [userName] : [];
      
      if (!coinObj.compatible_channels.includes(DLIGHT_PRIVATE)) {
        coinObj.overrideCoinSettings = {
          privateAddrs: 0
        }
      }

      if (coinObj.vrpc_endpoints) {
        coinObj.vrpc_endpoints = this.getVrpcEndpoints(coinObj.id);
      }
      
      if (!coinObj.apps || Object.keys(coinObj.apps).length === 0) {
        const defaultApps = getDefaultApps(coinObj)
        
        if (
          ENABLE_VERUS_IDENTITIES &&
          (coinObj.id === 'VRSC' ||
            coinObj.id === 'VRSCTEST' ||
            coinObj.id === 'ZECTEST')
        ) {
          coinObj.apps = {...identityApp, ...defaultApps.apps};
        } else {
          coinObj.apps = defaultApps.apps;
        }
  
        if (!coinObj.default_app) coinObj.default_app = defaultApps.default_app
      } else if (!coinObj.default_app) {
        coinObj.default_app = Object.keys(coinObj.apps)[0]
      }
    } else {
      throw new Error(id + " not found in coin list!")
    }
  
    return coinObj;
  }

  setVrpcOverrides(overrides) {
    this.vrpcOverrides = overrides ? overrides : {};
  }

  getVrpcEndpoints(coinId) {
    if (this.vrpcOverrides && this.vrpcOverrides.hasOwnProperty(coinId)) {
      return this.vrpcOverrides[coinId];
    }

    const simpleCoinObj = this.getBasicCoinObj(coinId);
    
    if (this.vrpcOverrides && this.vrpcOverrides.hasOwnProperty(simpleCoinObj.system_id)) {
      return this.vrpcOverrides[simpleCoinObj.system_id];
    } else if (simpleCoinObj && simpleCoinObj.vrpc_endpoints) {
      return simpleCoinObj.vrpc_endpoints;
    } else throw new Error("Cannot find VRPC endpoints for " + simpleCoinObj.id);
  }

  findSystemCoinObj(id) {
    const coinObj = this.findSimpleCoinObj(id)
    const system = coinObj.system_id

    try {
      const systemObj = this.findSimpleCoinObj(system, null, true);
      return systemObj;
    } catch(e) {
      if (this.coinExistsInDirectory(system)) {
        return this.findSimpleCoinObj(system);
      } else {
        throw new Error("Cannot find system " + system)
      }
    }
  }

  findCoinObj(key, userName, useSystemId) {
    const coinObj = this.findSimpleCoinObj(key, userName, useSystemId);
    
    if (coinObj.proto === 'vrsc' && (coinObj.compatible_channels.includes(VRPC) || coinObj.compatible_channels.includes(VERUSID))) {
      const systemObj = this.findSystemCoinObj(coinObj.id);

      coinObj.system_options = systemObj.pbaas_options;
      coinObj.vrpc_endpoints = systemObj.vrpc_endpoints;
      coinObj.seconds_per_block = systemObj.seconds_per_block;
    }

    return coinObj;
  }

  // Function to add PBaaS currency
  async addPbaasCurrency(currencyDefinition, isTestnet = false, checkEndpoint = true, trySystemFallback = true, storeResults = true) {
    const id = currencyDefinition.currencyid
    const system = currencyDefinition.systemid

    if (this.coinExistsInDirectory(id)) {
      if (!!(this.coins[id].testnet) === isTestnet) {
        return;
      } else {
        throw new Error(
          'Currency already exists in directory as ' +
            +(this.coins[id].testnet ? 'testnet' : 'mainnet') +
            ' currency',
        );
      }
    }

    let endpoints = [];
    let secondsPerBlock = 60;
    let systemOptions;

    const isMapped =
      currencyDefinition.proofprotocol === 3 &&
      currencyDefinition.nativecurrencyid != null;
    let mappedCurrencyId = null;
    const delegatorContractAddr = isTestnet
      ? VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT
      : VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT;

    try {
      if (isMapped) {
        const nativeCurrencyIdTypeNoFlags = new BN(
          currencyDefinition.nativecurrencyid.type,
        ).and(FLAG_MASK.notn(FLAG_MASK.bitLength()));
  
        if (nativeCurrencyIdTypeNoFlags.eq(DEST_ETH) && delegatorContractAddr != null) {
          const contractAddress = currencyDefinition.nativecurrencyid.address;
  
          if (contractAddress === delegatorContractAddr) {
            mappedCurrencyId = isTestnet ? coinsList.GETH.id : coinsList.ETH.id;
          } else {
            const mappedCoin = Object.values(this.coins).find(x => x.currency_id === contractAddress);
            if (mappedCoin != null) {
              mappedCurrencyId = mappedCoin.id;
            } else {
              const network = isTestnet ? 'goerli' : 'homestead'
              const { name, symbol, decimals } = await getWeb3ProviderForNetwork(network).getContractInfo(contractAddress);
  
              this.addErc20Token({ address: contractAddress, symbol, name, decimals }, network, true);
              mappedCurrencyId = contractAddress;
            }
          }
        }
      }
    } catch(e) {
      console.warn(e)
    }

    try {
      const systemObj = this.findCoinObj(system, null, true);
      endpoints = systemObj.vrpc_endpoints;
      secondsPerBlock = systemObj.seconds_per_block;
      systemOptions = systemObj.pbaas_options;
    } catch(e) {
      if (this.coinExistsInDirectory(system)) {
        endpoints = this.getVrpcEndpoints(system);
        secondsPerBlock = this.coins[system].seconds_per_block;
        systemOptions = this.coins[system].pbaas_options;
      } else if (currencyDefinition.nodes) {
        secondsPerBlock = currencyDefinition.blocktime;
        systemOptions = currencyDefinition.options;

        let endpoint;

        try {
          endpoint = this.getVrpcEndpoints(system)[0];
        } catch(e) {
          const firstNode = currencyDefinition.nodes[0].networkaddress;
          const firstNodeSplit = firstNode.split(':')
          const firstNodePort = firstNodeSplit[firstNodeSplit.length - 1]
  
          if (isNaN(firstNodePort)) throw new Error("Cannot deduce vrpc endpoint with port" + firstNodePort + " for " + system)
  
          const baseServer = isTestnet ? this.getVrpcEndpoints("VRSCTEST")[0] : this.getVrpcEndpoints("VRSC")[0]
          endpoint = `${baseServer}:${(Number(firstNodePort) + 1).toString()}`
        }

        if (checkEndpoint) {
          try {
            const testInterface = new VerusdRpcInterface(system, endpoint);

            const testResult = await timeout(10000, testInterface.getInfo());
  
            if (testResult.result && testResult.result.chainid === system) {
              endpoints = [endpoint]
            } else throw new Error("Failed to connect to " + endpoint + " for " + currencyDefinition.fullyqualifiedname);
          } catch(e) {
            throw new Error(`${e.message}. Most likely, ${currencyDefinition.fullyqualifiedname} is not yet supported in lite mode.`)
          }
        } else endpoints = [endpoint]
      } else if (trySystemFallback) {
        // Fallback to trying to see currency system from VRSC/VRSCTEST and get nodes from there
        const currencyInterface = new VerusdRpcInterface(
          isTestnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id,
          isTestnet
            ? this.getVrpcEndpoints("VRSCTEST")[0]
            : this.getVrpcEndpoints("VRSC")[0],
        );

        const systemDefinition = await currencyInterface.getCurrency(system)

        if (
          systemDefinition.result &&
          systemDefinition.result.currencyid &&
          systemDefinition.result.nodes
        ) {
          await this.addPbaasCurrency(systemDefinition.result, isTestnet, checkEndpoint);
          endpoints = this.getVrpcEndpoints(systemDefinition.result.currencyid);
          secondsPerBlock = this.coins[systemDefinition.result.currencyid].seconds_per_block;
          systemOptions = this.coins[systemDefinition.result.currencyid].pbaas_options;
        } else {
          throw new Error('Failed to connect to find ' + system);
        }
      } else { throw new Error("Cannot deduce vrpc endpoints for " + system) }
    }

    const currencyCoinObj = {
      testnet: isTestnet,
      pbaas_options: currencyDefinition.options,
      system_options: systemOptions,
      id: currencyDefinition.currencyid,
      currency_id: currencyDefinition.currencyid,
      system_id: currencyDefinition.systemid,
      launch_system_id: currencyDefinition.launchsystemid,
      bitgojs_network_key: isTestnet ? 'verustest' : 'verus',
      display_ticker: currencyDefinition.fullyqualifiedname,
      display_name: currencyDefinition.fullyqualifiedname,
      alt_names: [],
      theme_color: '#232323',
      compatible_channels: [VERUSID, VRPC],
      tags: [IS_VERUS, IS_ZCASH, IS_PBAAS],
      proto: 'vrsc',
      vrpc_endpoints: endpoints,
      decimals: DEFAULT_DECIMALS,
      seconds_per_block: secondsPerBlock,
      default_app: 'wallet',
      apps: VERUS_APPS,
      mapped_to: mappedCurrencyId
    }

    if (storeResults) {
      await storeCurrencyDefinitionForCurrencyId(
        isTestnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id,
        currencyDefinition.currencyid,
        currencyDefinition,
      );
    }
    
    Object.assign(this.coins, { [currencyCoinObj.id]: currencyCoinObj });
    this.updateCoinLists();
  }

  /**
   * Adds a custom ERC20 token
   * @param {{ address: string, symbol: string, name: string, decimals: number }} contractDefinition 
   * @param {string} network 
   * @param {boolean} storeResults 
   * @returns 
   */
  async addErc20Token(contractDefinition, network = 'homestead', storeResults = true) {
    const id = contractDefinition.address;

    if (this.coinExistsInDirectory(id)) {
      if (this.coins[id].network === network) {
        return;
      } else {
        throw new Error(
          'Currency already exists in directory on ' +
            + this.coins[id].network +
            ' network',
        );
      }
    }

    const tokenCoinObj = {
      id: contractDefinition.address,
      currency_id: contractDefinition.address,
      system_id: '.eth',
      display_ticker: contractDefinition.symbol,
      display_name: contractDefinition.name,
      alt_names: [],
      theme_color: '#141C30',
      compatible_channels: [ERC20],
      dominant_channel: ERC20,
      decimals: contractDefinition.decimals,
      tags: [],
      proto: 'erc20',
      network,
      testnet: network !== 'homestead',
      unlisted: true
    }

    if (storeResults) {
      await storeContractDefinitionForNetwork(
        network,
        contractDefinition.address,
        contractDefinition,
      );
    }
    
    Object.assign(this.coins, { [tokenCoinObj.id]: tokenCoinObj });
    this.updateCoinLists();
  }

  async populatePbaasCurrencyDefinitionsFromStorage() {
    const storedDefinitions = await getStoredCurrencyDefinitions()
    const mainnetCurrencies = storedDefinitions[coinsList.VRSC.currency_id]
      ? storedDefinitions[coinsList.VRSC.currency_id]
      : {};
    const testnetCurrencies = storedDefinitions[coinsList.VRSCTEST.currency_id]
      ? storedDefinitions[coinsList.VRSCTEST.currency_id]
      : {};

    for (const key in mainnetCurrencies) {
      if (this.coinExistsInDirectory(key)) continue;

      await this.addPbaasCurrency(
        mainnetCurrencies[key], 
        false, 
        false,
        false,
        false
      )
    }

    for (const key in testnetCurrencies) {
      if (this.coinExistsInDirectory(key)) continue;

      await this.addPbaasCurrency(
        testnetCurrencies[key], 
        true, 
        false,
        false,
        false
      )
    }
  }

  async populateEthereumContractDefinitionsFromStorage() {
    const storedDefinitions = await getStoredContractDefinitions()
    const mainnetTokens = storedDefinitions[coinsList.ETH.network]
      ? storedDefinitions[coinsList.ETH.network]
      : {};
    const testnetTokens = storedDefinitions[coinsList.GETH.network]
      ? storedDefinitions[coinsList.GETH.network]
      : {};

    for (const key in mainnetTokens) {
      if (this.coinExistsInDirectory(key)) continue;

      await this.addErc20Token(
        mainnetTokens[key],
        coinsList.ETH.network,
        false
      )
    }

    for (const key in testnetTokens) {
      if (this.coinExistsInDirectory(key)) continue;

      await this.addErc20Token(
        testnetTokens[key],
        coinsList.GETH.network,
        false
      )
    }
  }
}

export const CoinDirectory = new _CoinDirectory(JSON.parse(JSON.stringify(coinsList)));