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
  chainEndpointIds = {};
  endpointConnections = {};

  static getEndpointId(chain, endpoint) {
    return hashAccountId(`${chain}:${endpoint}`).toString('hex');
  }

  removeChainEndpoint(chain, endpoint) {
    if (this.chainEndpointIds[chain] == null) this.chainEndpointIds[chain] = [];
    const id = VrpcInterface.getEndpointId(chain, endpoint);

    this.chainEndpointIds[chain] = this.chainEndpointIds[chain].filter(
      x => x !== id,
    );
  }

  saveChainEndpoint(chain, endpoint) {
    if (this.chainEndpointIds[chain] == null) this.chainEndpointIds[chain] = [];

    this.chainEndpointIds[chain].push(
      VrpcInterface.getEndpointId(chain, endpoint),
    );
  }

  getEndpointAddressForChain(chain) {
    if (this.chainEndpointIds[chain] == null) this.chainEndpointIds[chain] = [];
    const randomId =
      this.chainEndpointIds[chain][
        Math.floor(Math.random() * this.chainEndpointIds[chain].length)
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

  initEndpoint = async (chain, endpoint) => {
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(chain, endpoint);

    try {
      this.recordEndpointConnection(id);
      if (endpoints[id]) return;

      this.saveChainEndpoint(chain, endpoint);

      Store.dispatch({
        type: ADD_VRPC_ENDPOINT,
        payload: {
          endpointId: id,
          endpoint: [chain, endpoint],
        },
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  deleteEndpoint = (chain, endpoint) => {
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(chain, endpoint);

    try {
      if (!endpoints[id])
        throw new Error(
          'Cannot delete uninitialized endpoint ' +
            endpoint +
            ' for chain ' +
            chain,
        );

      this.endEndpointConnection(id);

      if (this.endpointConnections[id] == 0) {
        this.removeChainEndpoint(chain, endpoint);

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
    this.chainEndpointIds = {};
  };

  getEndpoint = chain => {
    const endpoint = this.getEndpointAddressForChain(chain);
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(chain, endpoint);
    const params = endpoints[id];

    if (!params)
      throw new Error(
        `Verus RPC endpoint ${endpoint} not initialized for chain ${chain}`,
      );
    return new VerusdRpcInterface(chain, endpoint);
  };

  getVerusIdInterface = chain => {
    const endpoint = this.getEndpointAddressForChain(chain);
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(chain, endpoint);
    const params = endpoints[id];

    if (!params)
      throw new Error(
        `Verus RPC endpoint ${endpoint} not initialized for chain ${chain}`,
      );
    return new VerusIdInterface(chain, endpoint)
  }
}

export default new VrpcInterface()