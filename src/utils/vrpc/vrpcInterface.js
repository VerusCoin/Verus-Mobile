import { VerusdRpcInterface } from 'verusd-rpc-ts-client';
import { VerusIdInterface } from 'verusid-ts-client';
import Store from '../../store';
import {
  ADD_VRPC_ENDPOINT,
  CLEAR_VRPC_ENDPOINTS,
  REMOVE_VRPC_ENDPOINT,
} from "../constants/storeType";
import { hashAccountId } from '../crypto/hash';

class VrpcInterface {
  systemEndpointIds = {};
  endpointConnections = {};

  static getEndpointId(systemId, endpoint) {
    return hashAccountId(`${systemId}:${endpoint}`).toString('hex');
  }

  removeChainEndpoint(systemId, endpoint) {
    if (this.systemEndpointIds[systemId] == null) this.systemEndpointIds[systemId] = [];
    const id = VrpcInterface.getEndpointId(systemId, endpoint);

    this.systemEndpointIds[systemId] = this.systemEndpointIds[systemId].filter(
      x => x !== id,
    );
  }

  saveChainEndpoint(systemId, endpoint) {
    if (this.systemEndpointIds[systemId] == null) this.systemEndpointIds[systemId] = [];

    this.systemEndpointIds[systemId].push(
      VrpcInterface.getEndpointId(systemId, endpoint),
    );
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
    return new VerusdRpcInterface(systemId, endpoint);
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