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
import { ApiRequest } from 'verus-typescript-primitives';
import { coinsList } from '../CoinData/CoinsList';
import { Alert } from 'react-native';
import { CoinDirectory } from '../CoinData/CoinDirectory';

class CachedVerusdRpcInterface extends VerusdRpcInterface {
  static CACHED_REQUESTS = [
    'getaddressbalance',
    'getaddressdeltas',
    'getaddressmempool',
    'getcurrency',
    'listcurrencies',
    'getidentity',
    'getinfo'
  ];

  static DEFAULT_MS_BEFORE_UPDATE = 60000;
  static MS_BEFORE_UPDATE = {
    getaddressbalance: 5000,
    getaddressdeltas: 10000,
    getaddressmempool: 10000,
    listcurrencies: 600000,
    getinfo: 1000
  };

  static CALL_DELAY_MS = 500;

  endpoint;
  
  callswaiting = {};

  /**
   * @param {string} systemId 
   * @param {string} endpoint
   * @param {(id: string, time: number) => void} setLastTime 
   * @param {(id: string) => number} getLastTime 
   */
  constructor(systemId, endpoint, setLastTime, getLastTime) {
    super(systemId, endpoint)
    this.endpoint = endpoint;
    this.lastheight = 0;
    this.lasttime = 0;
    this.setLastTime = setLastTime;
    this.getLastTime = getLastTime;
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
          const lasttime = this.getLastTime(cacheId)
          this.setLastTime(cacheId, Date.now())
      
          const cmd = req.cmd;
          const saveToCache = CachedVerusdRpcInterface.CACHED_REQUESTS.includes(cmd);
          const elapsed = this.getLastTime(cacheId) - lasttime;
          const getFromCache =
            saveToCache &&
            elapsed <
              (CachedVerusdRpcInterface.MS_BEFORE_UPDATE[cmd]
                ? CachedVerusdRpcInterface.MS_BEFORE_UPDATE[cmd]
                : CachedVerusdRpcInterface.DEFAULT_MS_BEFORE_UPDATE);
    
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

  lastRequestTimes = new Map();

  static getEndpointId(systemId, endpoint) {
    return hashAccountId(`${systemId}:${endpoint}`).toString('hex');
  }

  /**
   * Sets the last called time for a specified call id
   * @param {string} id 
   * @param {number} time 
   */
  setLastTime(id, time) {
    this.lastRequestTimes.set(id, time)
  }

  /**
   * Gets the last called time for a specified call id
   * @param {string} id 
   * @returns number
   */
  getLastTIme(id) {
    return this.lastRequestTimes.has(id) ? this.lastRequestTimes.get(id) : 0
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

    if (!this.cacheInterfaces[id]) this.cacheInterfaces[id] = new CachedVerusdRpcInterface(
      systemId,
      endpoint,
      (...params) => this.setLastTime(...params),
      (...params) => this.getLastTIme(...params)
    )
    
    this.systemEndpointIds[systemId].push(id);
  }

  getEndpointAddressForChain(systemId) {
    if (this.systemEndpointIds[systemId] == null) this.systemEndpointIds[systemId] = [];
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
    return new VerusIdInterface(systemId, endpoint)
  }

  addDefaultEndpoints = () => {
    this.initEndpoint(coinsList.VRSC.system_id, CoinDirectory.getVrpcEndpoints("VRSC")[0]);
    this.initEndpoint(coinsList.VRSCTEST.system_id, CoinDirectory.getVrpcEndpoints("VRSCTEST")[0]); 
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