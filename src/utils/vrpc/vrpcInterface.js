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
import {GetBlockHashRequest} from 'verus-typescript-primitives';
import { coinsList } from '../CoinData/CoinsList';
import {createAlert} from '../../actions/actions/alert/dispatchers/alert';
import { CoinDirectory } from '../CoinData/CoinDirectory';
import { VRPC_API_KEYS, VRPC_API_APP_ID } from '../../../env/index';
import { getUrlKey } from '../url';
import {
  CACHED_VRPC_REQUESTS,
  VRPC_ADDRESS_CACHE_REQUESTS,
  DEFAULT_VRPC_CACHE_MAX_AGE_MS,
  VRPC_CACHE_MAX_AGE_MS,
  isVrpcResponseCacheable,
  shouldUseCachedVrpcResponse,
} from './vrpcCachePolicy';
import {getManyUtxoFundRawTransactionError} from './fundRawTransactionError';
import VrpcRequestBatcher from './vrpcRequestBatcher';
import {planVrpcRequests, vrpcErrorResponse} from './vrpcRequestMany';
import {compatibleGetBlockRequest} from './getBlockRequest';

export const VRPC_REQUEST_TIMEOUT_MS = 30000;
const VRPC_CLIENT_CONFIG = {timeout: VRPC_REQUEST_TIMEOUT_MS};

class CachedVerusdRpcInterface extends VerusdRpcInterface {
  static CACHED_REQUESTS = CACHED_VRPC_REQUESTS;

  static DEFAULT_MS_BEFORE_UPDATE = DEFAULT_VRPC_CACHE_MAX_AGE_MS;
  static MS_BEFORE_UPDATE = VRPC_CACHE_MAX_AGE_MS;

  static CALL_DELAY_MS = 50;

  endpoint;
  
  callswaiting = {};
  pendingBatchRequests = new Map();
  addressCacheIds = new Set();
  addressCacheGeneration = 0;

  expireAddressResponses() {
    this.addressCacheGeneration++;
    for (const cacheId of this.addressCacheIds) {
      this.setLastNetworkResponseTime(cacheId, 0);
      this.pendingBatchRequests.delete(cacheId);
    }
  }

  trackAddressRequest(req, cacheId) {
    if (VRPC_ADDRESS_CACHE_REQUESTS.includes(req.cmd)) this.addressCacheIds.add(cacheId);
    return this.addressCacheGeneration;
  }

  addressRequestIsCurrent(req, generation) {
    return !VRPC_ADDRESS_CACHE_REQUESTS.includes(req.cmd) || generation === this.addressCacheGeneration;
  }

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
      super(systemId, endpoint, VRPC_CLIENT_CONFIG, undefined, APIAuth)
    } else {
      super(systemId, endpoint, VRPC_CLIENT_CONFIG)
    }
    
    this.endpoint = endpoint;
    this.lastheight = 0;
    this.lasttime = 0;
    this.setLastNetworkResponseTime = setLastNetworkResponseTime;
    this.getLastNetworkResponseTime = getLastNetworkResponseTime;
    this.requestBatcher = new VrpcRequestBatcher(
      endpoint,
      req => super.request(req),
      CachedVerusdRpcInterface.CALL_DELAY_MS,
    );
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

  async getCachedResponse(req, cacheId, generation = this.addressCacheGeneration) {
    if (!shouldUseCachedVrpcResponse({
      command: req.cmd,
      lastNetworkResponseAt: this.getLastNetworkResponseTime(cacheId),
    })) return null;

    try {
      const cached = await getCachedVrpcResponse(this.chain, this.endpoint, req);
      return this.addressRequestIsCurrent(req, generation) ? cached : null;
    } catch (error) {
      console.log('Failed to get cached request:', error.message);
      return null;
    }
  }

  async cacheResponse(req, cacheId, response, generation = this.addressCacheGeneration) {
    if (isVrpcResponseCacheable(req.cmd) && response.error == null && this.addressRequestIsCurrent(req, generation)) {
      try {
        await setCachedVrpcResponse(this.chain, this.endpoint, req, response);
        this.setLastNetworkResponseTime(cacheId, this.addressRequestIsCurrent(req, generation) ? Date.now() : 0);
      } catch (error) {
        console.log('Failed to save cached response:', error.message);
      }
    }

    return response;
  }

  shareRead(cacheId, pending) {
    // Keep sharing until the cache write finishes, including requests made by
    // another refresh or by the ordinary single-request API.
    const shared = pending.finally(() => {
      if (this.pendingBatchRequests.get(cacheId) === shared) this.pendingBatchRequests.delete(cacheId);
    });
    this.pendingBatchRequests.set(cacheId, shared);
    return shared;
  }

  /**
   * Execute an explicit read group without a collection delay. Cache entries and
   * in-flight reads belong to the original requests, never the merged queries.
   * Each result settles independently so one failed history read cannot discard
   * a successful balance update from the same batch. Callers can restrict cache
   * reuse; fresh verification reads also bypass previously started requests.
   */
  async requestMany(requests, {cacheMethods = CACHED_VRPC_REQUESTS} = {}) {
    requests = requests.map(compatibleGetBlockRequest);
    const owned = [];
    const results = requests.map(req => {
      if (!this.requestBatcher.supportsExplicit(req.cmd)) {
        return vrpcErrorResponse({code: -32601, message: `Unsupported batch method: ${req.cmd}`});
      }

      const cacheId = getVrpcResponseCacheKey(this.chain, this.endpoint, req);
      const cacheable = isVrpcResponseCacheable(req.cmd) && cacheMethods.includes(req.cmd);
      let pending = cacheable ? this.pendingBatchRequests.get(cacheId) : null;

      if (!pending) {
        const entry = {req, cacheId, cacheable, generation: this.trackAddressRequest(req, cacheId)};
        pending = new Promise((resolve, reject) => {
          entry.resolve = resolve;
          entry.reject = reject;
        });
        if (cacheable) pending = this.shareRead(cacheId, pending);
        owned.push(entry);
      }

      return pending.catch(vrpcErrorResponse);
    });

    // Reserve every key before the first await, then read caches concurrently.
    // Filtering afterward keeps network order independent of storage latency.
    const cached = await Promise.all(owned.map(entry =>
      entry.cacheable ? this.getCachedResponse(entry.req, entry.cacheId, entry.generation) : null,
    ));
    const misses = owned.filter((entry, index) => {
      if (cached[index] == null) return true;
      entry.resolve(cached[index]);
      return false;
    });

    try {
      const plan = planVrpcRequests(misses.map(entry => entry.req));
      const responses = plan.splitResponses(await this.requestBatcher.requestMany(plan.requests));

      await Promise.all(misses.map(async (entry, index) => {
        try {
          const response = responses[index];
          entry.resolve(entry.cacheable
            ? await this.cacheResponse(entry.req, entry.cacheId, response, entry.generation)
            : response);
        } catch (error) {
          entry.reject(error);
        }
      }));
    } catch (error) {
      misses.forEach(entry => entry.reject(error));
    }

    return Promise.all(results);
  }

  /** Keep the single-request API and its throwing behavior for transport errors. */
  async request(req, {skipCache = false} = {}) {
    if (Array.isArray(req)) return this.requestMany(req, skipCache ? {cacheMethods: []} : undefined);
    req = compatibleGetBlockRequest(req);

    const cacheId = getVrpcResponseCacheKey(this.chain, this.endpoint, req);
    const generation = this.trackAddressRequest(req, cacheId);

    // Currency definitions share cache/in-flight reads with registration batches,
    // but a lone lookup still starts immediately without a collection timer.
    if (this.requestBatcher.supportsRefresh(req.cmd) || req.cmd === 'getcurrency') {
      if (!skipCache && this.pendingBatchRequests.has(cacheId)) {
        return this.pendingBatchRequests.get(cacheId);
      }

      const pending = (async () => {
        const cached = skipCache ? null : await this.getCachedResponse(req, cacheId, generation);
        if (cached != null) return cached;

        const response = await this.requestBatcher.request(req);
        return this.cacheResponse(req, cacheId, response, generation);
      })();
      return skipCache ? pending : this.shareRead(cacheId, pending);
    }

    // Preserve serialization and error handling for operations outside the
    // shared cached reads above, particularly transaction creation.
    const callDelay = this.registerCallStart(cacheId);

    try {
      await new Promise(resolve => setTimeout(resolve, callDelay));
      const cached = skipCache ? null : await this.getCachedResponse(req, cacheId, generation);
      if (cached != null) return cached;

      const response = await super.request(req);
      const fundingError = req.cmd === 'fundrawtransaction'
        ? getManyUtxoFundRawTransactionError(response.error, req.utxos)
        : null;

      if (fundingError) throw fundingError;
      if (req.cmd === 'sendrawtransaction' && response.error == null) {
        VerusMobileVrpcInterface.expireAddressResponses(this.chain);
      }
      return await this.cacheResponse(req, cacheId, response, generation);
    } catch (error) {
      const fundingError = req.cmd === 'fundrawtransaction'
        ? getManyUtxoFundRawTransactionError(error, req.utxos)
        : null;
      const requestError = fundingError || error;
      console.error(requestError);
      throw requestError;
    } finally {
      this.registerCallComplete(cacheId);
    }
  }
}

class VrpcInterface {
  systemEndpointIds = {};
  endpointConnections = {};

  cacheInterfaces = {};

  lastNetworkResponseTimes = new Map();

  expireAddressResponses(systemId) {
    for (const rpc of Object.values(this.cacheInterfaces)) {
      if (rpc.chain === systemId) rpc.expireAddressResponses();
    }
  }

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
    this.endpointConnections = {};
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

    let verusIdInterface;

    if (VRPC_API_KEYS[urlKey]) {
      verusIdInterface = new VerusIdInterface(systemId, endpoint, VRPC_CLIENT_CONFIG, undefined, {
        id: VRPC_API_APP_ID,
        key: VRPC_API_KEYS[urlKey]
      });
    } else {
      verusIdInterface = new VerusIdInterface(systemId, endpoint, VRPC_CLIENT_CONFIG)
    }

    // Preserve fundrawtransaction errors raised while the VerusID client builds
    // identity transactions instead of letting the client replace the RPC detail.
    const cachedInterface = this.cacheInterfaces[id];
    verusIdInterface.interface.fundRawTransaction =
      cachedInterface.fundRawTransaction.bind(cachedInterface);
    // SDK registration broadcasts must expire the same caches as wallet sends.
    verusIdInterface.interface.sendRawTransaction = (...args) =>
      cachedInterface.sendRawTransaction(...args);

    // Reuse namespace definitions while keeping tip, authority and spendability
    // verification fresh. The SDK supplies independent reads as explicit groups;
    // the shared transport handles batch limits and unsupported-server fallback.
    verusIdInterface.interface.getCurrency = cachedInterface.getCurrency.bind(cachedInterface);
    verusIdInterface.interface.getBlock = cachedInterface.getBlock.bind(cachedInterface);
    verusIdInterface.interface.requestMany = requests =>
      cachedInterface.requestMany(requests, {cacheMethods: ['getcurrency']});

    return verusIdInterface;
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
    createAlert("Error initializing Verus lite mode", e.message)
  }  
})

export default VerusMobileVrpcInterface;
