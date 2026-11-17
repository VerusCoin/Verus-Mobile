import {GetBlockRequest} from 'verus-typescript-primitives';

// Plain verusd requires string heights and boolean verbosity. Normalize at
// the transport boundary too: the registration SDK constructs its own reads.
export const compatibleGetBlockRequest = request => {
  if (request.cmd !== 'getblock') return request;
  const [hashOrHeight, verbosity] = request.getParams();
  return new GetBlockRequest(request.chain, String(hashOrHeight),
    verbosity === 1 ? true : verbosity === 0 ? false : verbosity);
};
