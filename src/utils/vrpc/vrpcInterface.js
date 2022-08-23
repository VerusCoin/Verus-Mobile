import { VerusdRpcInterface } from 'verusd-rpc-ts-client';
import Store from '../../store';
import {
  ADD_VRPC_ENDPOINT,
  CLEAR_VRPC_ENDPOINTS,
  REMOVE_VRPC_ENDPOINT,
} from "../constants/storeType";
import { hashAccountId } from '../crypto/hash';

class VrpcInterface {
  chainEnpoints = {};

  static getEndpointId(chain, endpoint) {
    return hashAccountId(`${chain}:${endpoint}`).toString('hex');
  }

  removeChainEndpoint(chain, endpoint) {
    if (this.chainEndpoints[chain] == null) this.chainEnpoints[chain] = [];
    const id = VrpcInterface.getEndpointId(chain, endpoint);

    this.chainEnpoints[chain] = this.chainEnpoints[chain].filter(x => x !== id);
  }

  saveChainEndpoint(chain, endpoint) {
    if (this.chainEndpoints[chain] == null) this.chainEnpoints[chain] = [];

    this.chainEnpoints[chain].push(
      VrpcInterface.getEndpointId(chain, endpoint),
    );
  }

  getEndpointAddressForChain(chain) {
    if (this.chainEndpoints[chain] == null) this.chainEnpoints[chain] = [];

    return this.chainEndpoints[chain][
      Math.floor(Math.random() * this.chainEndpoints[chain].length)
    ];
  }

  initEndpoint = async (chain, endpoint) => {
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(chain, endpoint);

    try {
      if (endpoints[id])
        throw new Error(
          'Cannot initialize existing vrpc endpoint ' +
            endpoint +
            ' for chain ' +
            chain,
        );
      
      this.saveChainEndpoint(chain, endpoint)

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

      this.removeChainEndpoint(chain, endpoint)

      Store.dispatch({
        type: REMOVE_VRPC_ENDPOINT,
        payload: {
          endpointId: id,
        },
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  deleteAllEndpoints = () => {
    Store.dispatch({type: CLEAR_VRPC_ENDPOINTS});
    this.chainEnpoints = {}
  }

  getEndpoint = (chain) => {
    const endpoint = this.getEndpointAddressForChain(chain)
    const endpoints = Store.getState().channelStore_vrpc.vrpcEndpoints;
    const id = VrpcInterface.getEndpointId(chain, endpoint);
    const params = endpoints[id];

    if (!params)
      throw new Error(
        `Verus RPC endpoint ${endpoint} not initialized for chain ${chain}`,
      );
    return new VerusdRpcInterface(chain, endpoint);
  };
}

export default new VrpcInterface()