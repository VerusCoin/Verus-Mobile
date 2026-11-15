import BigNumber from 'bignumber.js';
import {
  DEST_ID,
  DEST_PKH,
  TransferDestination,
  fromBase58Check,
} from 'verus-typescript-primitives';
import {I_ADDRESS_VERSION, R_ADDRESS_VERSION} from '../constants/constants';
import {getCurrency} from '../api/channels/verusid/callCreators';

const IDENTITY_DEFINITION_FIELDS = [
  'contentmap',
  'contentMap',
  'contentmultimap',
  'contentMultiMap',
  'flags',
  'identityaddress',
  'identityAddress',
  'minimumsignatures',
  'minimumSignatures',
  'name',
  'parent',
  'primaryaddresses',
  'primaryAddresses',
  'privateaddress',
  'privateAddress',
  'recoveryauthority',
  'recoveryAuthority',
  'revocationauthority',
  'revocationAuthority',
  'systemid',
  'systemId',
  'timelock',
  'txid',
  'txout',
  'version',
  'vout',
];

const getTopLevelIdentityFields = result => {
  return IDENTITY_DEFINITION_FIELDS.reduce((fields, field) => {
    if (result?.[field] !== undefined) fields[field] = result[field];
    return fields;
  }, {});
};

export const getIdentityFromResult = result => {
  if (!result || !result.identity) return result;

  return {
    ...result.identity,
    ...getTopLevelIdentityFields(result),
  };
};

export const getIdentityPrimaryAddresses = identity => {
  const primaryAddresses =
    identity?.primaryaddresses || identity?.primaryAddresses || [];

  return Array.isArray(primaryAddresses) ? primaryAddresses : [];
};

export const toTransferDestination = address => {
  const {hash, version} = fromBase58Check(address);
  let type;

  if (version === R_ADDRESS_VERSION) {
    type = DEST_PKH;
  } else if (version === I_ADDRESS_VERSION) {
    type = DEST_ID;
  } else {
    throw new Error('Incompatible address type.');
  }

  return new TransferDestination({
    destinationBytes: hash,
    type,
    addressVersion: version,
  });
};

export const getCurrencyDisplay = async (systemId, currencyId) => {
  try {
    const currencyRes = await getCurrency(systemId, currencyId);

    if (currencyRes.error) throw new Error(currencyRes.error.message);

    return {
      currencyId,
      name: currencyRes.result.fullyqualifiedname || currencyId,
      definition: currencyRes.result,
    };
  } catch (_) {
    return {
      currencyId,
      name: currencyId,
      definition: null,
    };
  }
};

// Callers retain their own handling of destinations without getAddressString.
export const toCurrencyTransferOutputs = (outputs, getTransferDestinationKey) => {
  const outputIndexes = new Map();
  const currencyTransferOutputs = [];

  for (const {currency, satoshis, address, ...outputOptions} of outputs) {
    const outputKey = JSON.stringify({
      address: getTransferDestinationKey(address),
      outputOptions,
    });
    let outputIndex = outputIndexes.get(outputKey);

    if (outputIndex == null) {
      outputIndex = currencyTransferOutputs.length;
      outputIndexes.set(outputKey, outputIndex);
      currencyTransferOutputs.push({
        ...outputOptions,
        currencies: {},
        address,
      });
    }

    const currencyOutput = currencyTransferOutputs[outputIndex];
    const previousSatoshis = currencyOutput.currencies[currency];

    currencyOutput.currencies[currency] = previousSatoshis == null
      ? satoshis
      : BigNumber(previousSatoshis).plus(satoshis).toString();
  }

  return currencyTransferOutputs;
};
