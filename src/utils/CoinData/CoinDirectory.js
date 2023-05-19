import { DLIGHT_PRIVATE, ELECTRUM, IS_PBAAS, IS_VERUS, IS_ZCASH, VERUSID, VRPC, WYRE_SERVICE } from "../constants/intervalConstants";
import { getDefaultApps, getSystemNameFromSystemId } from "./CoinData";
import { electrumServers } from './electrum/servers';
import { ENABLE_VERUS_IDENTITIES } from '../../../env/index'
import { VerusdRpcInterface } from "verusd-rpc-ts-client";
import { VERUS_APPS, coinsList } from "./CoinsList";
import { DEFAULT_DECIMALS } from "../constants/web3Constants";
import { getStoredCurrencyDefinitions, storeCurrencyDefinitionForCurrencyId } from "../asyncStore/currencyDefinitionStorage";

class _CoinDirectory {
  fullCoinList = [];
  testCoinList = [];
  supportedCoinList = [];
  disabledNameList = [];
  enabledNameList = [];

  constructor(coins = {}) {
    this.coins = coins;
    this.updateCoinLists();
  }

  updateCoinLists() {
    this.fullCoinList = Object.values(this.coins).map(function(coin) {
      return coin.id;
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
    return this.coins.hasOwnProperty(coinId);
  }

  // Function to find a coin object by coinId.
  findCoinObj(key, userName, useSystemId) {
    const id = useSystemId ? getSystemNameFromSystemId(key) : key;
    let coinObj = this.coins[id]
  
    if (coinObj) {
      coinObj.electrum_endpoints = coinObj.compatible_channels.includes(ELECTRUM) ? electrumServers[id.toLowerCase()].serverList : []
      coinObj.users = userName != null ? [userName] : [];
      
      if (!coinObj.compatible_channels.includes(DLIGHT_PRIVATE)) {
        coinObj.overrideCoinSettings = {
          privateAddrs: 0
        }
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

  findSystemCoinObj(id) {
    const coinObj = this.findCoinObj(id)
    const system = coinObj.system_id

    try {
      const systemObj = this.findCoinObj(system, null, true);
      return systemObj;
    } catch(e) {
      if (this.coinExistsInDirectory(system)) {
        return this.findCoinObj(system);
      } else {
        throw new Error("Cannot find system " + system)
      }
    }
  }

  // Function to add PBaaS currency. This function is not implemented.
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

    try {
      const systemObj = this.findCoinObj(system, null, true);
      endpoints = systemObj.vrpc_endpoints;
      secondsPerBlock = systemObj.seconds_per_block;
    } catch(e) {
      if (this.coinExistsInDirectory(system)) {
        endpoints = this.coins[system].vrpc_endpoints;
        secondsPerBlock = this.coins[system].seconds_per_block;
      } else if (currencyDefinition.nodes) {
        const firstNode = currencyDefinition.nodes[0].networkaddress
        secondsPerBlock = currencyDefinition.blocktime

        const firstNodeSplit = firstNode.split(':')
        const firstNodePort = firstNodeSplit[firstNodeSplit.length - 1]

        if (isNaN(firstNodePort)) throw new Error("Cannot deduce vrpc endpoint with port" + firstNodePort + " for " + system)

        firstNodeSplit[firstNodeSplit.length - 1] = (Number(firstNodePort) + 1).toString()

        const endpoint = firstNodeSplit.join(':')

        if (checkEndpoint) {
          const testInterface = new VerusdRpcInterface(system, endpoint);

          const testResult = await testInterface.getInfo()

          if (testResult.result && testResult.result.chainid === system) {
            endpoints = [endpoint]
          } else throw new Error("Failed to connect to " + endpoint + " for " + system)
        } else endpoints = [endpoint]
      } else if (trySystemFallback) {
        // Fallback to trying to see currency system from VRSC/VRSCTEST and get nodes from there
        const currencyInterface = new VerusdRpcInterface(
          isTestnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id,
          isTestnet
            ? coinsList.VRSCTEST.vrpc_endpoints[0]
            : coinsList.VRSC.vrpc_endpoints[0],
        );

        const systemDefinition = await currencyInterface.getCurrency(system)

        if (
          systemDefinition.result &&
          systemDefinition.result.currencyid &&
          systemDefinition.result.nodes
        ) {
          await this.addPbaasCurrency(systemDefinition.result, isTestnet, checkEndpoint);
          endpoints = this.coins[systemDefinition.result.currencyid].vrpc_endpoints;
          secondsPerBlock = this.coins[systemDefinition.result.currencyid].seconds_per_block;
        } else {
          throw new Error('Failed to connect to find ' + system);
        }
      } else { throw new Error("Cannot deduce vrpc endpoints for " + system) }
    }

    const currencyCoinObj = {
      testnet: isTestnet,
      pbaas_options: currencyDefinition.options,
      id: currencyDefinition.currencyid,
      currency_id: currencyDefinition.currencyid,
      system_id: currencyDefinition.systemid,
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
      apps: VERUS_APPS
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

  async populateCurrencyDefinitionsFromStorage() {
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
}

export const CoinDirectory = new _CoinDirectory(JSON.parse(JSON.stringify(coinsList)));