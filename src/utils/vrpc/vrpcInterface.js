import { VerusdRpcInterface } from 'verusd-rpc-ts-client';
import { VerusIdInterface } from 'verusid-ts-client';
import Store from '../../store';
import {
  ADD_VRPC_ENDPOINT,
  CLEAR_VRPC_ENDPOINTS,
  REMOVE_VRPC_ENDPOINT,
} from "../constants/storeType";
import { hashAccountId } from '../crypto/hash';
import { getCachedVrpcResponse, getVrpcResponseCacheKey, setCachedVrpcResponse } from '../asyncStore/asyncStore';
import {
  ApiRequest,
  GetBlockHashRequest,
} from 'verus-typescript-primitives';
import { coinsList } from '../CoinData/CoinsList';
import { Alert } from 'react-native';
import { CoinDirectory } from '../CoinData/CoinDirectory';
import { VRPC_API_KEYS, VRPC_API_APP_ID } from '../../../env/index';
import { getUrlKey } from '../url';
import {
  CACHED_VRPC_REQUESTS,
  DEFAULT_VRPC_CACHE_MAX_AGE_MS,
  VRPC_CACHE_MAX_AGE_MS,
  isVrpcResponseCacheable,
  shouldUseCachedVrpcResponse,
} from './vrpcCachePolicy';

class CachedVerusdRpcInterface extends VerusdRpcInterface {
  static CACHED_REQUESTS = CACHED_VRPC_REQUESTS;

  static DEFAULT_MS_BEFORE_UPDATE = DEFAULT_VRPC_CACHE_MAX_AGE_MS;
  static MS_BEFORE_UPDATE = VRPC_CACHE_MAX_AGE_MS;

  static CALL_DELAY_MS = 500;

  endpoint;
  
  callswaiting = {};

  /**
   * @param {string} systemId 
   * @param {string} endpoint
   * @param {(id: string, time: number) => void} setLastNetworkResponseTime
   * @param {(id: string) => number} getLastNetworkResponseTime
   * @param {import('verusd-rpc-ts-client/lib/VerusdRpcInterface').APIAuthData} APIAuth
   */
  constructor(
    systemId,
    endpoint,
    setLastNetworkResponseTime,
    getLastNetworkResponseTime,
    APIAuth,
  ) {
    if (APIAuth) {
      super(systemId, endpoint, undefined, undefined, APIAuth)
    } else {
      super(systemId, endpoint)
    }
    
    this.endpoint = endpoint;
    this.lastheight = 0;
    this.lasttime = 0;
    this.setLastNetworkResponseTime = setLastNetworkResponseTime;
    this.getLastNetworkResponseTime = getLastNetworkResponseTime;
  }

  registerCallStart(cacheId) {
    const waitingFor = this.callswaiting[cacheId];
    
    this.callswaiting[cacheId] = waitingFor != null ? waitingFor + 1 : 1;

    const callDelayMultiplier = waitingFor == null ? 0 : waitingFor;
    const callDelay = CachedVerusdRpcInterface.CALL_DELAY_MS * callDelayMultiplier;

    return callDelay;
  }

  registerCallComplete(cacheId) {
    this.callswaiting[cacheId] = this.callswaiting[cacheId] - 1;
    if (this.callswaiting[cacheId] == 0) delete this.callswaiting[cacheId];
  }

  getBlockHash(height) {
    return this.request(new GetBlockHashRequest(this.chain, height));
  }

  /**
   * This is a hack implemented when multicurrency was added to 
   * ensure that multiple simultaneous calls to getwalletinfo or getaddressdeltas
   * or any other API request that returns information about multiple wallet currencies
   * with one set of parameters doesn't needlessly get called multiple times when the wallet
   * updates multiple currencies at the same time. A much better way to implement this would be 
   * to refactor the way update polling/intervals work so that multiple PBaaS currencies can 
   * fetch info from one interval as long as they exist on the same system (TODO)
   * @param {ApiRequest} req 
   * @returns 
   */
  async request(req) {
    const cacheId = getVrpcResponseCacheKey(this.chain, this.endpoint, req);
    const callDelay = this.registerCallStart(cacheId);

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const cmd = req.cmd;
          const saveToCache = isVrpcResponseCacheable(cmd);
          const getFromCache = shouldUseCachedVrpcResponse({
            command: cmd,
            lastNetworkResponseAt: this.getLastNetworkResponseTime(cacheId),
          });
    
          if (getFromCache) {
            try {
              const cachedRes = await getCachedVrpcResponse(this.chain, this.endpoint, req);
        
              if (cachedRes != null) {
                this.registerCallComplete(cacheId);
                resolve(cachedRes);
                return;
              }
            } catch(e) {
              console.log("Failed to get cached request:")
              console.log(e.message)
            }
          }
          
          const res = await super.request(req);
      
          if (saveToCache && res.error == null) {
            try {
              await setCachedVrpcResponse(this.chain, this.endpoint, req, res);
              this.setLastNetworkResponseTime(cacheId, Date.now());
            } catch(e) {
              console.log("Failed to save cached response:")
              console.log(e.message)
            }
          }
      
          this.registerCallComplete(cacheId);
          resolve(res);
        } catch(e) {
          console.error(e)
          this.registerCallComplete(cacheId);
          reject(e)
        }
      }, callDelay)
    })
  }
}

class VrpcInterface {
  systemEndpointIds = {};
  endpointConnections = {};

  cacheInterfaces = {};

  lastNetworkResponseTimes = new Map();

  static getEndpointId(systemId, endpoint) {
    return hashAccountId(`${systemId}:${endpoint}`).toString('hex');
  }

  /**
   * Sets the last successful cached network response time for a call id.
   * @param {string} id 
   * @param {number} time 
   */
  setLastNetworkResponseTime(id, time) {
    this.lastNetworkResponseTimes.set(id, time)
  }

  /**
   * Gets the last successful cached network response time for a call id.
   * @param {string} id 
   * @returns number
   */
  getLastNetworkResponseTime(id) {
    return this.lastNetworkResponseTimes.has(id)
      ? this.lastNetworkResponseTimes.get(id)
      : 0
  }

  isSystemIdActivated(systemId) {
    return this.systemEndpointIds.hasOwnProperty(systemId);
  }

  removeChainEndpoint(systemId, endpoint) {
    if (this.systemEndpointIds[systemId] == null) this.systemEndpointIds[systemId] = [];
    const id = VrpcInterface.getEndpointId(systemId, endpoint);

    delete this.cacheInterfaces[id];

    this.systemEndpointIds[systemId] = this.systemEndpointIds[systemId].filter(
      x => x !== id,
    );
  }

  saveChainEndpoint(systemId, endpoint) {
    if (this.systemEndpointIds[systemId] == null) this.systemEndpointIds[systemId] = [];

    const id = VrpcInterface.getEndpointId(systemId, endpoint)

    if (!this.cacheInterfaces[id]) {
      const urlKey = getUrlKey(endpoint);

      if (VRPC_API_KEYS[urlKey]) {
        this.cacheInterfaces[id] = new CachedVerusdRpcInterface(
          systemId,
          endpoint,
          (...params) => this.setLastNetworkResponseTime(...params),
          (...params) => this.getLastNetworkResponseTime(...params),
          {
            id: VRPC_API_APP_ID,
            key: VRPC_API_KEYS[urlKey]
          }
        )
      } else {
        this.cacheInterfaces[id] = new CachedVerusdRpcInterface(
          systemId,
          endpoint,
          (...params) => this.setLastNetworkResponseTime(...params),
          (...params) => this.getLastNetworkResponseTime(...params)
        )
      }
    }
    
    this.systemEndpointIds[systemId].push(id);
  }

  getEndpointAddressForChain(systemId) {
    if (this.systemEndpointIds[systemId] == null) this.systemEndpointIds[systemId] = [];
    const overrideEndpoints =
      CoinDirectory.vrpcOverrides && CoinDirectory.vrpcOverrides[systemId]
        ? CoinDirectory.vrpcOverrides[systemId]
        : null;

    if (overrideEndpoints && overrideEndpoints.length > 0) {
      for (const endpoint of overrideEndpoints) {
        this.initEndpoint(systemId, endpoint);
      }

      const newEndpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;

      const allowed = new Set(overrideEndpoints);
      this.systemEndpointIds[systemId] = this.systemEndpointIds[systemId].filter(
        id => newEndpoints[id] && allowed.has(newEndpoints[id][1]),
      );
    }

    if (this.systemEndpointIds[systemId].length === 0) {
      throw new Error(`No VRPC endpoints initialized for systemId ${systemId}`);
    }

    const randomId =
      this.systemEndpointIds[systemId][
        Math.floor(Math.random() * this.systemEndpointIds[systemId].length)
      ];

    return Store.getState().channelStore_vrpc.vrpcEndpoints[randomId][1];
  }

  recordEndpointConnection(id) {
    if (this.endpointConnections[id] != null) this.endpointConnections[id]++;
    else this.endpointConnections[id] = 1;
  }

  endEndpointConnection(id) {
    if (this.endpointConnections[id] != null) this.endpointConnections[id]--;
    else this.endpointConnections[id] = 0;
  }

  initEndpoint = (systemId, endpoint) => {
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(systemId, endpoint);

    try {
      this.recordEndpointConnection(id);
      if (endpoints[id]) return;

      this.saveChainEndpoint(systemId, endpoint);

      Store.dispatch({
        type: ADD_VRPC_ENDPOINT,
        payload: {
          endpointId: id,
          endpoint: [systemId, endpoint],
        },
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  deleteEndpoint = (systemId, endpoint) => {
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(systemId, endpoint);

    try {
      if (!endpoints[id])
        throw new Error(
          'Cannot delete uninitialized endpoint ' +
            endpoint +
            ' for systemId ' +
            systemId,
        );

      this.endEndpointConnection(id);

      if (this.endpointConnections[id] == 0) {
        this.removeChainEndpoint(systemId, endpoint);

        Store.dispatch({
          type: REMOVE_VRPC_ENDPOINT,
          payload: {
            endpointId: id,
          },
        });
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  deleteAllEndpoints = () => {
    Store.dispatch({type: CLEAR_VRPC_ENDPOINTS});
    this.systemEndpointIds = {};
    this.cacheInterfaces = {};
  };

  getEndpoint = systemId => {
    const endpoint = this.getEndpointAddressForChain(systemId);
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(systemId, endpoint);
    const params = endpoints[id];

    if (!params)
      throw new Error(
        `Verus RPC endpoint ${endpoint} not initialized for systemId ${systemId}`,
      );
    return this.cacheInterfaces[id];
  };

  getVerusIdInterface = systemId => {
    const endpoint = this.getEndpointAddressForChain(systemId);
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(systemId, endpoint);
    const params = endpoints[id];

    if (!params)
      throw new Error(
        `Verus RPC endpoint ${endpoint} not initialized for systemId ${systemId}`,
      );

    const urlKey = getUrlKey(endpoint);

    if (VRPC_API_KEYS[urlKey]) {
      return new VerusIdInterface(systemId, endpoint, undefined, undefined, {
        id: VRPC_API_APP_ID,
        key: VRPC_API_KEYS[urlKey]
      });
    } else {
      return new VerusIdInterface(systemId, endpoint)
    }
  }

  addDefaultEndpoints = () => {
    const vrscEndpoints = CoinDirectory.getVrpcEndpoints("VRSC");
    const vrsctestEndpoints = CoinDirectory.getVrpcEndpoints("VRSCTEST");

    for (const endpoint of vrscEndpoints) {
      this.initEndpoint(coinsList.VRSC.system_id, endpoint);
    }

    for (const endpoint of vrsctestEndpoints) {
      this.initEndpoint(coinsList.VRSCTEST.system_id, endpoint);
    }
  }
}

const VerusMobileVrpcInterface = new VrpcInterface();

setImmediate(() => {
  try {
    // Initialize VRSC and VRSCTEST endpoints to support App functions
    // that make calls to vrpc even if VRSC/VRSCTEST isn't added as a coin
    VerusMobileVrpcInterface.addDefaultEndpoints() 
  } catch(e) {
    Alert.alert("Error initializing Verus lite mode", e.message)
  }  
})

export default VerusMobileVrpcInterface;
