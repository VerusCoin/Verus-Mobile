import { DLIGHT_PRIVATE, ELECTRUM, IS_PBAAS, IS_VERUS, IS_ZCASH, VERUSID, VRPC } from "../constants/intervalConstants";
import { getDefaultApps, getSystemNameFromSystemId } from "./CoinData";
import { electrumServers } from './electrum/servers';
import { ENABLE_VERUS_IDENTITIES } from '../../../env/index'
import { VerusdRpcInterface } from "verusd-rpc-ts-client";
import { VERUS_APPS, coinsList } from "./CoinsList";
import { DEFAULT_DECIMALS } from "../constants/web3Constants";

class _CoinDirectory {
  constructor(coins = {}) {
    this.coins = coins;
  }

  // Function to check if a coin with a specific ID exists in the directory
  coinExistsInDirectory(coinId) {
    return this.coins.hasOwnProperty(coinId);
  }

  // Function to find a coin object by coinId.
  findCoinObj(key, userName, useSystemId) {
    const id = useSystemId ? getSystemNameFromSystemId(key) : key;
    let coinObj = coinsList[id]
  
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
    }
    else {
      throw new Error(id + " not found in coin list!")
    }
  
    return coinObj;
  }

  // Function to add PBaaS currency. This function is not implemented.
  async addPbaasCurrency(currencyDefinition, isTestnet = false, checkEndpoint = true) {
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
      } else {
        throw new Error("Cannot deduce vrpc endpoints for " + system)
      }
    }

    const currencyCoinObj = {
      testnet: isTestnet,
      pbaas_options: currencyDefinition.options,
      id: currencyDefinition.currencyid,
      currency_id: currencyDefinition.currencyid,
      system_id: currencyDefinition.systemid,
      bitgojs_network_key: isTestnet ? 'verustest' : 'verus',
      display_ticker: currencyDefinition.name,
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

    Object.assign(this.coins, { [currencyCoinObj.id]: currencyCoinObj })
  }
}

export const CoinDirectory = new _CoinDirectory(coinsList);