import {
  GetAddressBalanceRequest,
  GetAddressDeltasRequest,
  GetAddressMempoolRequest,
  GetInfoRequest,
} from 'verus-typescript-primitives';
import {
  API_GET_BALANCES,
  API_GET_TRANSACTIONS,
  VRPC,
} from '../constants/intervalConstants';
import VrpcProvider from './vrpcInterface';

const errorResponse = error => ({
  result: null,
  error: {message: error?.message || String(error)},
});

/**
 * Prepare all address reads for a refresh before starting any network work.
 * Coins on the same system share requests for the same address, while their
 * existing update functions still format balances and transactions separately.
 */
export const createVrpcRefresh = (jobs, {isCurrent = () => true} = {}) => {
  const systems = new Map();
  const balances = new Map();
  const transactions = new Map();
  let execution;

  const prepare = request => {
    if (!systems.has(request.chain)) systems.set(request.chain, new Map());

    const requests = systems.get(request.chain);
    const key = JSON.stringify([request.cmd, request.getParams()]);

    if (!requests.has(key)) {
      let resolve;
      const response = new Promise(settle => {
        resolve = settle;
      });

      // These promises resolve even on failure, just like an RPC error response.
      // A planned channel may be skipped later without leaving a rejected promise.
      requests.set(key, {request, response, resolve});
    }

    return requests.get(key).response;
  };

  for (const {channels, updateId} of jobs) {
    if (updateId !== API_GET_BALANCES && updateId !== API_GET_TRANSACTIONS) continue;

    for (const channelId of channels) {
      const [channel, address, systemId] = channelId.split('.');

      if (channel !== VRPC) continue;

      if (updateId === API_GET_BALANCES && !balances.has(channelId)) {
        balances.set(channelId, prepare(new GetAddressBalanceRequest(systemId, {
          addresses: [address],
          friendlynames: undefined,
        })));
      }

      if (updateId === API_GET_TRANSACTIONS && !transactions.has(channelId)) {
        const params = {addresses: [address], friendlynames: true, verbosity: 1};

        transactions.set(channelId, Promise.all([
          prepare(new GetAddressDeltasRequest(systemId, params)),
          prepare(new GetInfoRequest(systemId)),
          prepare(new GetAddressMempoolRequest(systemId, params)),
        ]));
      }
    }
  }

  const executeSystem = async (systemId, requests) => {
    const entries = [...requests.values()];

    try {
      if (!isCurrent()) throw new Error('Wallet refresh session has ended');

      // Pick one endpoint for the entire system so cache checks and all misses
      // reach the same server. requestMany sends misses immediately as one batch.
      const endpoint = VrpcProvider.getEndpoint(systemId);
      const responses = await endpoint.requestMany(entries.map(entry => entry.request));

      entries.forEach((entry, index) => entry.resolve(
        responses[index] || errorResponse(new Error('Missing VRPC response')),
      ));
    } catch (error) {
      const response = errorResponse(error);

      entries.forEach(entry => entry.resolve(response));
    }
  };

  return {
    getBalance: channelId => balances.get(channelId),
    getTransactions: channelId => transactions.get(channelId),
    execute: () => {
      // Starting normal wallet updates before execute lets them retain their
      // session/request bookkeeping without triggering individual network calls.
      if (!execution) {
        execution = Promise.all(
          [...systems].map(([systemId, requests]) => executeSystem(systemId, requests)),
        );
      }

      return execution;
    },
  };
};
