import { VerusdRpcInterface } from 'verusd-rpc-ts-client';
import { VerusIdInterface } from 'verusid-ts-client';
import Store from '../../store';
import {
  ADD_VRPC_ENDPOINT,
  CLEAR_VRPC_ENDPOINTS,
  REMOVE_VRPC_ENDPOINT,
} from "../constants/storeType";
import { hashAccountId } from '../crypto/hash';
import { getCachedVrpcResponse, setCachedVrpcResponse } from '../asyncStore/asyncStore';
import { ApiRequest } from 'verus-typescript-primitives';

class CachedVerusdRpcInterface extends VerusdRpcInterface {
  static CACHED_REQUESTS = [
    'getaddressbalance',
    'getaddressdeltas',
    'getaddressmempool',
    'getcurrency',
    'listcurrencies',
  ];

  static DEFAULT_MS_BEFORE_UPDATE = 60000;
  static MS_BEFORE_UPDATE = {
    getaddressbalance: 5000,
    getaddressdeltas: 5000,
    getaddressmempool: 5000,
    listcurrencies: 600000,
    getaddressmempool: 10000
  };

  endpoint;

  /**
   * @param {string} systemId 
   * @param {string} endpoint
   * @param {(time: number) => void} setLastTime 
   * @param {() => number} getLastTime 
   */
  constructor(systemId, endpoint, setLastTime, getLastTime) {
    super(systemId, endpoint)
    this.endpoint = endpoint;
    this.lastheight = 0;
    this.lasttime = 0;
    this.setLastTime = setLastTime;
    this.getLastTime = getLastTime;
  }

  /**
   * @param {ApiRequest} req 
   * @returns 
   */
  async request(req) {
    try {
      const lasttime = this.getLastTime()
      this.setLastTime(Date.now())
  
      const cmd = req.cmd;
      const saveToCache = CachedVerusdRpcInterface.CACHED_REQUESTS.includes(cmd);
      const elapsed = this.getLastTime() - lasttime;
      const getFromCache =
        saveToCache &&
        elapsed <
          (CachedVerusdRpcInterface.MS_BEFORE_UPDATE[cmd]
            ? CachedVerusdRpcInterface.MS_BEFORE_UPDATE[cmd]
            : CachedVerusdRpcInterface.DEFAULT_MS_BEFORE_UPDATE);

      if (getFromCache) {
        try {
          const cachedRes = await getCachedVrpcResponse(this.chain, this.endpoint, req);
    
          if (cachedRes != null) return cachedRes;
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
  
      return res;
    } catch(e) {
      console.error(e)
    }
  }
}

class VrpcInterface {
  systemEndpointIds = {};
  endpointConnections = {};

  cacheInterfaces = {};

  lasttime = 0;

  static getEndpointId(systemId, endpoint) {
    return hashAccountId(`${systemId}:${endpoint}`).toString('hex');
  }

  setLastTime(time) {
    this.lasttime = time;
  }

  getLastTIme() {
    return this.lasttime
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
      this.setLastTime,
      this.getLastTIme
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

  initEndpoint = async (systemId, endpoint) => {
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
}

export default new VrpcInterface()