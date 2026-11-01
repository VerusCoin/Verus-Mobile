const ADDRESS_LIST_COMMANDS = new Set(['getaddressdeltas', 'getaddressmempool']);
const MAX_QUERY_ADDRESSES = 100;

export const vrpcErrorResponse = error => ({
  result: null,
  error: {
    code: error?.code == null ? -32603 : error.code,
    message: error?.message || String(error),
  },
});

// Parameter objects can have different property insertion orders. Compare the
// values the SDK actually sends, including every option besides addresses.
const parametersKey = value => JSON.stringify(value, (key, item) => {
  if (item == null || typeof item !== 'object' || Array.isArray(item)) return item;
  return Object.keys(item).sort().reduce((sorted, name) => {
    sorted[name] = item[name];
    return sorted;
  }, {});
});

/**
 * Consolidate compatible address-list reads without changing their cache keys.
 * Balances are deliberately left alone: the daemon adds their address totals.
 */
export const planVrpcRequests = requests => {
  const groups = [];
  const addressGroups = new Map();

  requests.forEach((req, index) => {
    const params = req.getParams();
    const options = params[0];
    const addresses = options?.addresses;

    if (!ADDRESS_LIST_COMMANDS.has(req.cmd) || !Array.isArray(addresses) ||
        addresses.length === 0 || addresses.some(address => typeof address !== 'string')) {
      groups.push({req, entries: [{index}]});
      return;
    }

    const {addresses: ignored, ...otherOptions} = options;
    const key = parametersKey([req.chain, req.cmd, otherOptions, params.slice(1)]);
    let group = addressGroups.get(key);

    if (!group) {
      group = {req, params, options, entries: [], addresses: new Set()};
      addressGroups.set(key, group);
      groups.push(group);
    }

    group.entries.push({index, addresses});
    addresses.forEach(address => group.addresses.add(address));
  });

  const networkRequests = [];

  groups.forEach(group => {
    if (!group.addresses) {
      group.responseIndex = networkRequests.length;
      networkRequests.push(group.req);
      return;
    }

    group.chunks = [];
    const addresses = Array.from(group.addresses);

    for (let start = 0; start < addresses.length; start += MAX_QUERY_ADDRESSES) {
      const chunk = addresses.slice(start, start + MAX_QUERY_ADDRESSES);
      const params = [{...group.options, addresses: chunk}, ...group.params.slice(1)];
      group.chunks.push({addresses: new Set(chunk), responseIndex: networkRequests.length});

      // The SDK serializes getParams(), so preserve its exact parameter shape
      // instead of substituting an address array for the options object.
      networkRequests.push({
        chain: group.req.chain,
        cmd: group.req.cmd,
        getParams: () => params,
      });
    }
  });

  return {
    requests: networkRequests,
    splitResponses: responses => {
      const results = new Array(requests.length);

      groups.forEach(group => {
        if (!group.addresses) {
          results[group.entries[0].index] = responses[group.responseIndex];
          return;
        }

        // Index each network response once. A wallet then reads only its own
        // history instead of rescanning every linked address's history.
        const byAddress = new Map();
        let position = 0;

        group.chunks.forEach(chunk => {
          const part = {response: responses[chunk.responseIndex]};
          chunk.addresses.forEach(address => byAddress.set(address, {part, rows: []}));
          if (part.response?.error != null) return;

          const list = Array.isArray(part.response?.result)
            ? part.response.result
            : part.response?.result?.deltas;

          if (!Array.isArray(list)) {
            part.response = vrpcErrorResponse(new Error('Invalid VRPC address-list response'));
            return;
          }

          for (const row of list) {
            const address = row?.address;

            if (typeof address !== 'string') {
              part.response = vrpcErrorResponse(new Error('Invalid VRPC address-list response'));
              break;
            }

            const bucket = byAddress.get(address);
            if (chunk.addresses.has(address)) bucket.rows.push({row, position});
            position++;
          }
        });

        group.entries.forEach(entry => {
          const buckets = entry.addresses.map(address => byAddress.get(address));
          const failure = buckets.find(bucket => bucket.part.response.error != null);

          if (failure) {
            results[entry.index] = failure.part.response;
            return;
          }

          // Deltas follow the caller's address order. Repeated addresses repeat
          // their rows, matching the daemon for both deltas and mempool reads.
          const records = buckets.flatMap(bucket => bucket.rows);

          if (group.req.cmd === 'getaddressmempool' && buckets.length > 1) {
            // Mempool rows instead follow timestamp order. Original positions
            // preserve the daemon's ordering when timestamps are equal.
            records.sort((first, second) =>
              first.row.timestamp - second.row.timestamp || first.position - second.position,
            );
          }

          const rows = records.map(record => record.row);
          const first = buckets[0].part.response;
          results[entry.index] = {
            ...first,
            result: Array.isArray(first.result) ? rows : {...first.result, deltas: rows},
          };
        });
      });

      return results;
    },
  };
};
