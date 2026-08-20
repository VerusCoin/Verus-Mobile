import BigNumber from 'bignumber.js';
import {
  DEST_ID,
  DEST_PKH,
  EVALS,
  SpendableKeyDetailsOrdinalVDXFObject,
  TransferDestination,
  fromBase58Check,
} from 'verus-typescript-primitives';
import {
  ECPair,
  Transaction,
  networks,
  smarttxs,
} from '@bitgo/utxo-lib';
import {unpackOutput} from '@bitgo/utxo-lib/dist/src/smart_transactions';
import VrpcProvider from '../vrpc/vrpcInterface';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {coinsList} from '../CoinData/CoinsList';
import {deriveKeyPair} from '../keys';
import {IS_PBAAS, VRPC} from '../constants/intervalConstants';
import {I_ADDRESS_VERSION, R_ADDRESS_VERSION} from '../constants/constants';
import {coinsToSats, satsToCoins} from '../math';
import {
  getAddressDeltas,
  getAddressUtxos,
  getInfo,
} from '../api/channels/vrpc/callCreators';
import {
  getCurrency,
  getFriendlyNameMap,
  getIdentity,
} from '../api/channels/verusid/callCreators';
import {
  createUpdateIdentityWithCurrencyTransferTx,
  createUpdateIdentityTxWithUtxos,
  getUpdatableIdentity,
  signUpdateIdentityTx,
} from '../api/channels/verusid/requests/updateIdentity';
import {
  seedDetailsOrdinalToMnemonic,
  seedDetailsRequiresPassword,
} from '../seedDetails/seedDetails';
import {VerusIdInterface} from 'verusid-ts-client';
import {
  broadcastPendingTransactions,
  createPendingBroadcast,
  createPendingBroadcastTransaction,
} from './durableBroadcast';

const {
  getFundedTxBuilder,
  validateFundedCurrencyTransfer,
} = smarttxs;

export const SPENDABLE_KEY_CLAIM_FEE_SATS = BigNumber(10000);
export const SPENDABLE_KEY_CLAIM_FEE_COINS = 0.0001;
export const SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_SATS = BigNumber(20000);
export const SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS = 0.0002;
export const SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_SATS = BigNumber(20000);
export const SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_COINS = 0.0002;
const VETH_SYSTEM_ID = 'i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X';
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

const utxoKey = utxo => `${utxo.txid}:${utxo.outputIndex}`;

const getTopLevelIdentityFields = result => {
  return IDENTITY_DEFINITION_FIELDS.reduce((fields, field) => {
    if (result?.[field] !== undefined) fields[field] = result[field];
    return fields;
  }, {});
};

const toTransferDestination = address => {
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

const normalizeIdentityResults = result => {
  if (result == null) return [];

  const results = Array.isArray(result) ? result : [result];

  return results
    .map(identityResult => {
      if (identityResult == null) return null;

      return {
        ...identityResult,
        txid: identityResult.txout?.txid || identityResult.txid,
        vout:
          identityResult.txout?.voutnum == null
            ? identityResult.vout
            : identityResult.txout.voutnum,
      };
    })
    .filter(identityResult => identityResult != null);
};

const getIdentityFromResult = result => {
  if (!result || !result.identity) return result;

  return {
    ...result.identity,
    ...getTopLevelIdentityFields(result),
  };
};

const getIdentityAddress = identity => {
  return identity?.identityaddress || identity?.identityAddress;
};

const getIdentityPrimaryAddresses = identity => {
  const primaryAddresses =
    identity?.primaryaddresses || identity?.primaryAddresses || [];

  return Array.isArray(primaryAddresses) ? primaryAddresses : [];
};

const getIdentityDisplayName = (result, identity, systemId) => {
  if (result.fullyqualifiedname || result.friendlyname) {
    return result.fullyqualifiedname || result.friendlyname;
  }

  if (identity.fullyqualifiedname || identity.friendlyname) {
    return identity.fullyqualifiedname || identity.friendlyname;
  }

  if (
    identity.name &&
    (identity.parent == null || identity.parent === systemId)
  ) {
    return `${identity.name}@`;
  }

  return undefined;
};

const getIdentityAuthorityAddresses = identity => {
  const identityAddress = getIdentityAddress(identity);
  const addresses = [];

  for (const authority of [
    identity.recoveryauthority || identity.recoveryAuthority,
    identity.revocationauthority || identity.revocationAuthority,
  ]) {
    if (
      authority &&
      authority !== identityAddress &&
      !addresses.includes(authority)
    ) {
      addresses.push(authority);
    }
  }

  return addresses;
};

const getIdentityAuthorityNames = async (systemId, identityResult) => {
  const identity = getIdentityFromResult(identityResult);
  const authorityAddresses = getIdentityAuthorityAddresses(identity);

  if (authorityAddresses.length === 0) return {};

  try {
    const names = await getFriendlyNameMap(
      systemId,
      identityResult,
      [...authorityAddresses],
    );

    return authorityAddresses.reduce((mappedNames, authorityAddress) => {
      if (names[authorityAddress]) {
        mappedNames[authorityAddress] = names[authorityAddress];
      }

      return mappedNames;
    }, {});
  } catch (e) {
    console.warn(e.message);
    return {};
  }
};

const enrichIdentityResult = async (systemId, identityResult) => {
  const identity = getIdentityFromResult(identityResult);
  const identityAddress = getIdentityAddress(identity);

  if (!identity || !identityAddress) return identityResult;

  try {
    const identityRes = await getIdentity(systemId, identityAddress);

    if (identityRes.error) throw new Error(identityRes.error.message);

    const directResult = identityRes.result || {};
    const directIdentity = getIdentityFromResult(directResult) || {};
    const enrichedIdentityResult = {
      ...directResult,
      ...identityResult,
      blockheight: identityResult.blockheight || directResult.blockheight,
      friendlyname: identityResult.friendlyname || directResult.friendlyname,
      fullyqualifiedname:
        identityResult.fullyqualifiedname || directResult.fullyqualifiedname,
      status: identityResult.status || directResult.status,
      cansignfor: identityResult.cansignfor ?? directResult.cansignfor,
      canspendfor: identityResult.canspendfor ?? directResult.canspendfor,
      identity: {
        ...directIdentity,
        ...identity,
      },
      txid: identityResult.txid || directResult.txid,
      vout:
        identityResult.vout == null
          ? directResult.vout
          : identityResult.vout,
    };

    return {
      ...enrichedIdentityResult,
      authorityNames: await getIdentityAuthorityNames(
        systemId,
        enrichedIdentityResult,
      ),
    };
  } catch (e) {
    console.warn(e.message);
    return identityResult;
  }
};

const enrichIdentityResults = (systemId, identityResults) => {
  return Promise.all(
    identityResults.map(identityResult =>
      enrichIdentityResult(systemId, identityResult),
    ),
  );
};

const getIdentitiesWithPrimaryAddress = async (systemId, address) => {
  const endpoint = VrpcProvider.getEndpoint(systemId);
  const res = await endpoint.getIdentitiesWithAddress({address, unspent: true});

  if (res.error) {
    throw new Error(res.error.message);
  }

  return normalizeIdentityResults(res.result);
};

const getIdentityTransferUtxos = async (systemId, identityAddress, knownUtxos) => {
  const res = await getAddressUtxos(systemId, [identityAddress], true);

  if (res.error) throw new Error(res.error.message);

  const knownUtxoKeys = new Set((knownUtxos || []).map(utxoKey));

  return (res.result || []).filter(
    utxo =>
      !knownUtxoKeys.has(utxoKey(utxo)) &&
      isTransferUtxo(systemId, utxo),
  );
};

const getCurrencyDisplay = async (systemId, currencyId) => {
  try {
    const currencyRes = await getCurrency(systemId, currencyId);

    if (currencyRes.error) throw new Error(currencyRes.error.message);

    return {
      currencyId,
      name: currencyRes.result.fullyqualifiedname || currencyId,
      definition: currencyRes.result,
    };
  } catch (e) {
    return {
      currencyId,
      name: currencyId,
      definition: null,
    };
  }
};

const unpackUtxoOutput = (systemId, utxo, allowNonTransferEvals = false) => {
  return unpackOutput(
    {value: Number(utxo.satoshis || 0), script: Buffer.from(utxo.script, 'hex')},
    systemId,
    true,
    allowNonTransferEvals,
  );
};

const isTransferUtxo = (systemId, utxo) => {
  if (!utxo) return false;

  try {
    unpackUtxoOutput(systemId, utxo);
    return true;
  } catch (e) {
    // This is a type probe. Identity outputs and other non-transfer evals are
    // expected here and are handled separately when discovering identities.
    return false;
  }
};

const isSpendableUtxo = (systemId, utxo) => {
  if (!utxo || !(utxo.isspendable === true || utxo.isspendable === 1)) {
    return false;
  }

  return isTransferUtxo(systemId, utxo);
};

const getCurrencyValueSats = value => coinsToSats(BigNumber(value));

const getUtxoNativeSatoshis = (systemId, utxo) => {
  const nativeSats = BigNumber(utxo.satoshis || 0);

  if (nativeSats.isGreaterThan(0)) return nativeSats;

  const nativeCurrencyValue = (utxo.currencyvalues || {})[systemId];

  return nativeCurrencyValue == null
    ? BigNumber(0)
    : getCurrencyValueSats(nativeCurrencyValue);
};

const hasPositiveNonNativeCurrencyValue = (systemId, currencyValues = {}) => {
  return Object.keys(currencyValues).some(currencyId => {
    return (
      currencyId !== systemId &&
      getCurrencyValueSats(currencyValues[currencyId]).isGreaterThan(0)
    );
  });
};

const isNativeUtxo = systemId => utxo => {
  return (
    isTransferUtxo(systemId, utxo) &&
    getUtxoNativeSatoshis(systemId, utxo).isGreaterThan(0)
  );
};

const isPureNativeUtxo = systemId => utxo => {
  return (
    isNativeUtxo(systemId)(utxo) &&
    !hasPositiveNonNativeCurrencyValue(systemId, utxo.currencyvalues)
  );
};

const sumUtxoBalances = (systemId, utxos) => {
  const balances = new Map();

  for (const utxo of utxos) {
    if (!isTransferUtxo(systemId, utxo)) continue;

    const nativeSats = getUtxoNativeSatoshis(systemId, utxo);
    if (nativeSats.isGreaterThan(0)) {
      balances.set(
        systemId,
        (balances.get(systemId) || BigNumber(0)).plus(nativeSats),
      );
    }

    const currencyValues = utxo.currencyvalues || {};
    for (const currencyId of Object.keys(currencyValues)) {
      if (currencyId === systemId) continue;

      const sats = getCurrencyValueSats(currencyValues[currencyId]);
      balances.set(
        currencyId,
        (balances.get(currencyId) || BigNumber(0)).plus(sats),
      );
    }
  }

  return balances;
};

const selectUtxosForAmount = (
  utxos,
  amountSats,
  getUtxoSats = utxo => BigNumber(utxo.satoshis || 0),
) => {
  if (BigNumber(amountSats).isLessThanOrEqualTo(0)) {
    return [];
  }

  const selected = [];
  let total = BigNumber(0);

  for (const utxo of utxos) {
    selected.push(utxo);
    total = total.plus(getUtxoSats(utxo));

    if (total.isGreaterThanOrEqualTo(amountSats)) {
      return selected;
    }
  }

  return null;
};

const getUsedUtxos = (txHex, candidates) => {
  const tx = Transaction.fromHex(txHex, networks.verus);

  return tx.ins.map(input => {
    const txid = Buffer.from(input.hash).reverse().toString('hex');
    const found = candidates.find(
      utxo => utxo.txid === txid && utxo.outputIndex === input.index,
    );

    if (!found) {
      throw new Error(`Cannot find transaction input ${txid}:${input.index}`);
    }

    return found;
  });
};

const removeUtxos = (utxos, used) => {
  const usedKeys = new Set(used.map(utxoKey));
  return utxos.filter(utxo => !usedKeys.has(utxoKey(utxo)));
};

const uniqueUtxos = utxos => {
  const seen = new Set();
  const unique = [];

  for (const utxo of utxos) {
    const key = utxoKey(utxo);

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(utxo);
    }
  }

  return unique;
};

const addBalanceMap = (target, source) => {
  for (const [currencyId, sats] of source.entries()) {
    target.set(currencyId, (target.get(currencyId) || BigNumber(0)).plus(sats));
  }
};

const subtractBalanceMap = (target, currencyId, sats) => {
  const currentSats = target.get(currencyId) || BigNumber(0);
  const nextSats = currentSats.minus(sats);

  target.set(currencyId, nextSats.isGreaterThan(0) ? nextSats : BigNumber(0));
};

const getNativeBalance = (systemId, utxos) => {
  return sumUtxoBalances(systemId, utxos).get(systemId) || BigNumber(0);
};

const hasNonNativeBalance = (systemId, utxos) => {
  const balanceMap = sumUtxoBalances(systemId, utxos);

  return Array.from(balanceMap.entries()).some(
    ([currencyId, sats]) => currencyId !== systemId && sats.isGreaterThan(0),
  );
};

const hasPositiveBalance = (systemId, utxos) => {
  return Array.from(sumUtxoBalances(systemId, utxos).values()).some(sats =>
    sats.isGreaterThan(0),
  );
};

const getSweepClaimFee = (hasNonNative, includesIdentityUpdate = false) => {
  if (includesIdentityUpdate) {
    return {
      feeSats: SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_SATS,
      feeCoins: SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_COINS,
    };
  }

  return {
    feeSats: hasNonNative
      ? SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_SATS
      : SPENDABLE_KEY_CLAIM_FEE_SATS,
    feeCoins: hasNonNative
      ? SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS
      : SPENDABLE_KEY_CLAIM_FEE_COINS,
  };
};

const shouldCombineIdentityWithSweep = ({
  systemId,
  availableUtxos,
  identity,
  isLastIdentity,
}) => {
  if (!isLastIdentity) return false;
  const hasNonNative = hasNonNativeBalance(systemId, availableUtxos);
  const nativeBalance = getNativeBalance(systemId, availableUtxos);
  const combinedFeeSats = SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_SATS;

  if (hasNonNative && nativeBalance.isGreaterThanOrEqualTo(combinedFeeSats)) {
    return true;
  }

  if (!hasNonNative && nativeBalance.isGreaterThan(combinedFeeSats)) {
    return true;
  }

  if (!hasPositiveBalance(systemId, availableUtxos)) return false;

  const identityFeeUtxos = getIdentityFeeUtxos(
    systemId,
    identity,
    combinedFeeSats,
    nativeBalance,
  );

  if (identityFeeUtxos == null) return false;

  const totalNative = nativeBalance.plus(
    getNativeBalance(systemId, identityFeeUtxos),
  );

  return (
    hasNonNative ||
    totalNative.isGreaterThan(combinedFeeSats)
  );
};

const getIdentityFeeUtxos = (
  systemId,
  identity,
  feeSats,
  nativeSatsAvailable = BigNumber(0),
) => {
  const identityFeeCandidates = (identity.utxos || []).filter(
    isNativeUtxo(systemId),
  );
  const requiredFeeSats = BigNumber(feeSats)
    .minus(nativeSatsAvailable)
    .integerValue(BigNumber.ROUND_CEIL);

  return selectUtxosForAmount(
    identityFeeCandidates,
    requiredFeeSats,
    utxo => getUtxoNativeSatoshis(systemId, utxo),
  );
};

const getDisplayFeeSats = ({
  systemId,
  spendableUtxos,
  identities,
}) => {
  let availableUtxos = [...spendableUtxos];
  let displayFeeSats = BigNumber(0);
  const claimableIdentities = identities.filter(
    identity => !identity.unsupportedReason,
  );

  for (let i = 0; i < claimableIdentities.length; i++) {
    const identity = claimableIdentities[i];
    const feeCandidates = availableUtxos.filter(isPureNativeUtxo(systemId));
    const feeUtxos = selectUtxosForAmount(
      feeCandidates,
      SPENDABLE_KEY_CLAIM_FEE_SATS,
      utxo => getUtxoNativeSatoshis(systemId, utxo),
    );
    const combineIdentityWithSweep = shouldCombineIdentityWithSweep({
      systemId,
      availableUtxos,
      identity,
      isLastIdentity: i === claimableIdentities.length - 1,
    });

    if (combineIdentityWithSweep) {
      const hasNonNative = hasNonNativeBalance(systemId, availableUtxos);
      const {feeSats} = getSweepClaimFee(hasNonNative, true);

      displayFeeSats = displayFeeSats.plus(feeSats);
      availableUtxos = [];
      continue;
    }

    if (feeUtxos == null) {
      const identityFeeUtxos = getIdentityFeeUtxos(
        systemId,
        identity,
        SPENDABLE_KEY_CLAIM_FEE_SATS,
      );

      if (identityFeeUtxos != null) {
        displayFeeSats = displayFeeSats.plus(SPENDABLE_KEY_CLAIM_FEE_SATS);

        if (!hasNonNativeBalance(systemId, availableUtxos)) {
          availableUtxos = [];
        }
      }

      continue;
    }

    displayFeeSats = displayFeeSats.plus(SPENDABLE_KEY_CLAIM_FEE_SATS);
    availableUtxos = removeUtxos(availableUtxos, feeUtxos);
  }

  if (availableUtxos.length > 0) {
    const nativeBalance = getNativeBalance(systemId, availableUtxos);

    if (nativeBalance.isGreaterThan(0)) {
      const hasNonNative = hasNonNativeBalance(systemId, availableUtxos);
      const {feeSats} = getSweepClaimFee(hasNonNative);

      displayFeeSats = displayFeeSats.plus(feeSats);
    }
  }

  return displayFeeSats;
};

const isVrpcScanCandidate = coinObj => {
  return (
    coinObj &&
    coinObj.system_id !== VETH_SYSTEM_ID &&
    coinObj.currency_id === coinObj.system_id &&
    Array.isArray(coinObj.tags) &&
    coinObj.tags.includes(IS_PBAAS) &&
    Array.isArray(coinObj.compatible_channels) &&
    coinObj.compatible_channels.includes(VRPC)
  );
};

const getScanSystems = (
  requestIsTestnet,
  activeCoinsForUser,
  includeKnownSystems = false,
) => {
  const rootCoin = requestIsTestnet ? coinsList.VRSCTEST : coinsList.VRSC;
  const systems = new Map([[rootCoin.system_id, rootCoin]]);
  let scanUniverseComplete = includeKnownSystems;
  const scanCandidates = [
    ...(activeCoinsForUser || []),
    ...(includeKnownSystems
      ? Object.values(CoinDirectory.coins || {})
      : []),
  ];

  for (const coinObj of scanCandidates) {
    if (!!coinObj.testnet !== !!requestIsTestnet) continue;
    if (!isVrpcScanCandidate(coinObj)) continue;

    try {
      // Every candidate is itself a PBaaS system (currency_id === system_id),
      // so resolve it by its actual directory key. System-ID name lookup only
      // maps the Verus main/test roots and rejects independent systems such as
      // vARRR, CHIPS, and vDEX.
      const systemCoin = CoinDirectory.findCoinObj(coinObj.id);

      if (
        systemCoin &&
        systemCoin.vrpc_endpoints &&
        systemCoin.vrpc_endpoints.length > 0
      ) {
        systems.set(systemCoin.system_id, systemCoin);
      } else if (includeKnownSystems) {
        scanUniverseComplete = false;
      }
    } catch (e) {
      console.warn(e.message);
      if (includeKnownSystems) scanUniverseComplete = false;
    }
  }

  return {
    systems: Array.from(systems.values()),
    scanUniverseComplete,
  };
};

export const deriveSpendableKeyAddresses = async ({
  mnemonic,
  requestIsTestnet,
  activeCoinsForUser,
}) => {
  const systems = [];
  const {systems: scanSystems} = getScanSystems(
    requestIsTestnet,
    activeCoinsForUser,
  );

  for (const coinObj of scanSystems) {
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

    const keyPair = await deriveKeyPair(mnemonic, coinObj, VRPC);
    const claimAddress = keyPair.addresses && keyPair.addresses[0];

    if (!claimAddress || !keyPair.privKey) {
      throw new Error(`Unable to derive spendable key address for ${coinObj.display_ticker || coinObj.id}.`);
    }

    systems.push({
      systemId: coinObj.system_id,
      coinObj,
      claimAddress,
      claimWif: keyPair.privKey,
    });
  }

  return {
    requestIsTestnet,
    systems,
    addressesBySystem: systems.reduce((addresses, system) => {
      addresses[system.systemId] = system.claimAddress;
      return addresses;
    }, {}),
  };
};

const getClaimableIdentities = (identityResults, claimAddress, systemId) => {
  return identityResults
    .filter(result => {
      const identity = getIdentityFromResult(result);
      const primaryAddresses = getIdentityPrimaryAddresses(identity);

      return primaryAddresses.includes(claimAddress);
    })
    .map(result => {
      const identity = getIdentityFromResult(result);
      const primaryAddresses = getIdentityPrimaryAddresses(identity);
      const minimumSignatures = Number(
        identity.minimumsignatures || identity.minimumSignatures || 0,
      );
      const active = result.status == null || result.status === 'active';
      let unsupportedReason = null;

      if (!active) {
        unsupportedReason = 'Identity is not active.';
      } else if (minimumSignatures !== 1) {
        unsupportedReason = 'Identity requires multiple signatures.';
      } else if (primaryAddresses.length === 0) {
        unsupportedReason = 'Identity has no primary addresses.';
      }

      return {
        identityAddress: getIdentityAddress(identity),
        fullyQualifiedName: getIdentityDisplayName(result, identity, systemId),
        authorityNames: result.authorityNames || {},
        result,
        unsupportedReason,
      };
    });
};

const getClaimableIdentitiesFromUtxos = async (systemId, utxos, claimAddress) => {
  const identityResults = [];

  for (const utxo of utxos) {
    try {
      const output = unpackUtxoOutput(systemId, utxo, true);
      const entries = [output.master, ...(output.params || [])];

      for (const entry of entries) {
        if (
          entry &&
          entry.eval === EVALS.EVAL_IDENTITY_PRIMARY &&
          entry.data &&
          typeof entry.data.toJson === 'function'
        ) {
          const identity = entry.data.toJson();

          identityResults.push({
            status: 'active',
            txid: utxo.txid,
            vout: utxo.outputIndex,
            blockheight: utxo.height,
            fullyqualifiedname:
              utxo.fullyqualifiedname ||
              utxo.friendlyname,
            identity,
          });
        }
      }
    } catch (e) {
      console.warn(e.message);
    }
  }

  const enrichedIdentityResults = await enrichIdentityResults(
    systemId,
    identityResults,
  );

  return getClaimableIdentities(
    enrichedIdentityResults,
    claimAddress,
    systemId,
  );
};

const mergeIdentityClaims = (...identityLists) => {
  const byAddress = new Map();

  for (const identityList of identityLists) {
    for (const identity of identityList) {
      if (!identity.identityAddress) continue;
      const previous = byAddress.get(identity.identityAddress) || {};

      byAddress.set(identity.identityAddress, {
        ...previous,
        ...identity,
        result: {
          ...(previous.result || {}),
          ...(identity.result || {}),
        },
      });
    }
  }

  return Array.from(byAddress.values());
};

export const spendableKeyDetailsRequiresPassword = spendableKeyOrdinal => {
  return seedDetailsRequiresPassword(spendableKeyOrdinal);
};

export const spendableKeyDetailsOrdinalToMnemonic = ({
  spendableKeyOrdinal,
  password,
}) => {
  return seedDetailsOrdinalToMnemonic({
    seedDetailsOrdinal: spendableKeyOrdinal,
    ExpectedOrdinalClass: SpendableKeyDetailsOrdinalVDXFObject,
    password,
    invalidMessage: 'Request does not contain valid spendable key details.',
    passwordRequiredMessage:
      'This spendable key is encrypted. Enter the claim password.',
    decryptErrorMessage:
      'Unable to decrypt spendable key. Check the password and try again.',
  });
};

export const discoverSpendableKeyClaims = async ({
  mnemonic,
  requestIsTestnet,
  activeCoinsForUser,
  cachedSystems,
  includeKnownSystems = false,
}) => {
  const systems = [];
  const {
    systems: scanSystems,
    scanUniverseComplete: selectedScanUniverseComplete,
  } = getScanSystems(
    requestIsTestnet,
    activeCoinsForUser,
    includeKnownSystems,
  );
  const cachedSystemsById = new Map(
    (cachedSystems || []).map(system => [system.systemId, system]),
  );

  for (const coinObj of scanSystems) {
    const cachedSystem = cachedSystemsById.get(coinObj.system_id);

    if (cachedSystem != null) {
      systems.push({
        ...cachedSystem,
        coinObj,
      });
      continue;
    }

    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

    const keyPair = await deriveKeyPair(mnemonic, coinObj, VRPC);
    const claimAddress = keyPair.addresses && keyPair.addresses[0];

    if (!claimAddress || !keyPair.privKey) {
      throw new Error(`Unable to derive spendable key address for ${coinObj.display_ticker || coinObj.id}.`);
    }

    const utxosRes = await getAddressUtxos(coinObj.system_id, [claimAddress], true);
    if (utxosRes.error) throw new Error(utxosRes.error.message);

    const spendableUtxos = (utxosRes.result || []).filter(utxo =>
      isSpendableUtxo(coinObj.system_id, utxo),
    );

    const identitiesFromUtxos = await getClaimableIdentitiesFromUtxos(
      coinObj.system_id,
      utxosRes.result || [],
      claimAddress,
    );
    let identitiesFromRpc = [];
    let identityLookupError = null;
    let identityLookupSucceeded = false;

    try {
      const identityResults = await getIdentitiesWithPrimaryAddress(
        coinObj.system_id,
        claimAddress,
      );
      const enrichedIdentityResults = await enrichIdentityResults(
        coinObj.system_id,
        identityResults,
      );
      identitiesFromRpc = getClaimableIdentities(
        enrichedIdentityResults,
        claimAddress,
        coinObj.system_id,
      );
      identityLookupSucceeded = true;
    } catch (e) {
      identityLookupError = e?.message || String(e || 'Identity lookup failed.');
      console.warn(identityLookupError);
    }
    const identities = await Promise.all(
      mergeIdentityClaims(identitiesFromUtxos, identitiesFromRpc).map(
        async identity => {
          const identityUtxos = await getIdentityTransferUtxos(
            coinObj.system_id,
            identity.identityAddress,
            spendableUtxos,
          );

          return {
            ...identity,
            utxos: identityUtxos,
          };
        },
      ),
    );
    const balanceMap = sumUtxoBalances(coinObj.system_id, spendableUtxos);

    for (const identity of identities) {
      addBalanceMap(
        balanceMap,
        sumUtxoBalances(coinObj.system_id, identity.utxos || []),
      );
    }

    subtractBalanceMap(
      balanceMap,
      coinObj.system_id,
      getDisplayFeeSats({
        systemId: coinObj.system_id,
        spendableUtxos,
        identities,
      }),
    );

    const currencies = [];

    for (const [currencyId, sats] of balanceMap.entries()) {
      if (sats.isLessThanOrEqualTo(0)) continue;

      currencies.push({
        currencyId,
        satoshis: sats.toString(),
        amount: satsToCoins(sats).toString(),
        display: await getCurrencyDisplay(coinObj.system_id, currencyId),
      });
    }

    systems.push({
      systemId: coinObj.system_id,
      coinObj,
      claimAddress,
      claimWif: keyPair.privKey,
      // Preserve every unspent output for callers that must distinguish an
      // actually empty key from one holding funds that are not spendable yet.
      observedUtxos: utxosRes.result || [],
      utxos: spendableUtxos,
      currencies,
      identities,
      identityLookupError,
      identityLookupSucceeded,
    });
  }

  return {
    requestIsTestnet,
    systems,
    // NFC overwrite policy uses the complete locally supported PBaaS universe,
    // not merely the active profile. Selection failures or any failed identity
    // query make this false; UTXO query failures reject the whole scan above.
    scanUniverseComplete:
      selectedScanUniverseComplete &&
      systems.length === scanSystems.length &&
      systems.every(system => system.identityLookupSucceeded === true),
    hasClaims: systems.some(
      system => system.currencies.length > 0 || system.identities.length > 0,
    ),
  };
};

export const discoverSpendableKeyAddressClaims = async ({
  addressesBySystem,
  requestIsTestnet,
  activeCoinsForUser,
  expectedIdentities = [],
  subtractDisplayFees = false,
}) => {
  const systems = [];
  const {systems: scanSystems} = getScanSystems(
    requestIsTestnet,
    activeCoinsForUser,
  );

  for (const coinObj of scanSystems) {
    const claimAddress = addressesBySystem && addressesBySystem[coinObj.system_id];

    if (!claimAddress) continue;

    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

    const utxosRes = await getAddressUtxos(coinObj.system_id, [claimAddress], true);
    if (utxosRes.error) throw new Error(utxosRes.error.message);

    const deltasRes = await getAddressDeltas(coinObj.system_id, [claimAddress], true, 1);
    if (deltasRes.error) throw new Error(deltasRes.error.message);

    const spendableUtxos = (utxosRes.result || []).filter(utxo =>
      isSpendableUtxo(coinObj.system_id, utxo),
    );

    const identitiesFromUtxos = await getClaimableIdentitiesFromUtxos(
      coinObj.system_id,
      utxosRes.result || [],
      claimAddress,
    );
    let identitiesFromRpc = [];
    let identityLookupError = null;

    try {
      const identityResults = await getIdentitiesWithPrimaryAddress(
        coinObj.system_id,
        claimAddress,
      );
      const enrichedIdentityResults = await enrichIdentityResults(
        coinObj.system_id,
        identityResults,
      );
      identitiesFromRpc = getClaimableIdentities(
        enrichedIdentityResults,
        claimAddress,
        coinObj.system_id,
      );
    } catch (e) {
      identityLookupError = e.message;
      console.warn(e.message);
    }
    let identitiesFromExpected = [];
    const expectedIdentitiesForSystem = (expectedIdentities || []).filter(
      identity =>
        identity &&
        identity.identityAddress &&
        identity.systemId === coinObj.system_id,
    );

    for (const expectedIdentity of expectedIdentitiesForSystem) {
      try {
        const identityRes = await getIdentity(
          coinObj.system_id,
          expectedIdentity.identityAddress,
        );

        if (identityRes.error) throw new Error(identityRes.error.message);

        identitiesFromExpected.push(
          ...getClaimableIdentities(
            [identityRes.result],
            claimAddress,
            coinObj.system_id,
          ),
        );
      } catch (e) {
        console.warn(e.message);
      }
    }

    const identities = await Promise.all(
      mergeIdentityClaims(
        identitiesFromUtxos,
        identitiesFromRpc,
        identitiesFromExpected,
      ).map(async identity => {
          const identityUtxos = await getIdentityTransferUtxos(
            coinObj.system_id,
            identity.identityAddress,
            spendableUtxos,
          );

          return {
            ...identity,
            utxos: identityUtxos,
          };
        },
      ),
    );
    const balanceMap = sumUtxoBalances(coinObj.system_id, spendableUtxos);

    for (const identity of identities) {
      addBalanceMap(
        balanceMap,
        sumUtxoBalances(coinObj.system_id, identity.utxos || []),
      );
    }

    if (subtractDisplayFees) {
      subtractBalanceMap(
        balanceMap,
        coinObj.system_id,
        getDisplayFeeSats({
          systemId: coinObj.system_id,
          spendableUtxos,
          identities,
        }),
      );
    }

    const currencies = [];

    for (const [currencyId, sats] of balanceMap.entries()) {
      if (sats.isLessThanOrEqualTo(0)) continue;

      currencies.push({
        currencyId,
        satoshis: sats.toString(),
        amount: satsToCoins(sats).toString(),
        display: await getCurrencyDisplay(coinObj.system_id, currencyId),
      });
    }

    const deltas = deltasRes.result || [];
    const deltaCount = Array.isArray(deltas) ? deltas.length : 0;

    systems.push({
      systemId: coinObj.system_id,
      coinObj,
      claimAddress,
      utxos: spendableUtxos,
      currencies,
      identities,
      deltas,
      deltaCount,
      identityLookupError,
      redeemed:
        currencies.length === 0 &&
        identities.length === 0 &&
        deltaCount > 0,
    });
  }

  return {
    requestIsTestnet,
    systems,
    hasClaims: systems.some(
      system => system.currencies.length > 0 || system.identities.length > 0,
    ),
    redeemed: systems.length > 0 && systems.every(system => system.redeemed),
  };
};

const getSweepOutputPlan = ({
  system,
  destinationAddress,
  availableUtxos,
  includesIdentityUpdate = false,
}) => {
  const balanceMap = sumUtxoBalances(system.systemId, availableUtxos);
  const nativeBalance = balanceMap.get(system.systemId) || BigNumber(0);
  const hasNonNative = Array.from(balanceMap.entries()).some(
    ([currencyId, sats]) => currencyId !== system.systemId && sats.isGreaterThan(0),
  );
  const {feeSats, feeCoins} = getSweepClaimFee(
    hasNonNative,
    includesIdentityUpdate,
  );

  if (nativeBalance.isLessThanOrEqualTo(0)) {
    if (hasNonNative) {
      throw new Error(`Spendable key on ${system.coinObj.display_ticker || system.coinObj.id} has assets but no native funds for fees.`);
    }

    return {
      balanceMap,
      feeCoins,
      feeSats,
      hasNonNative,
      nativeBalance,
      outputs: [],
    };
  }

  if (
    nativeBalance.isLessThan(feeSats) ||
    (!hasNonNative && nativeBalance.isLessThanOrEqualTo(feeSats))
  ) {
    throw new Error(`Spendable key on ${system.coinObj.display_ticker || system.coinObj.id} does not contain enough native funds to pay the sweep fee.`);
  }

  const destination = toTransferDestination(destinationAddress);
  const outputs = [];

  for (const [currencyId, sats] of balanceMap.entries()) {
    if (sats.isLessThanOrEqualTo(0)) continue;

    if (currencyId === system.systemId) {
      const nativeOut = sats.minus(feeSats);

      if (nativeOut.isGreaterThan(0)) {
        outputs.push({
          currency: currencyId,
          satoshis: nativeOut.toString(),
          address: destination,
        });
      }
    } else {
      outputs.push({
        currency: currencyId,
        satoshis: sats.toString(),
        address: destination,
      });
    }
  }

  return {
    balanceMap,
    feeCoins,
    feeSats,
    hasNonNative,
    nativeBalance,
    outputs,
  };
};

const getTransferDestinationKey = address => {
  if (address && typeof address.getAddressString === 'function') {
    return address.getAddressString();
  }

  return JSON.stringify(address);
};

const toCurrencyTransferOutputs = outputs => {
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

const toOutputSummaries = outputs => {
  return outputs.map(output => ({
    currencyId: output.currency,
    satoshis: output.satoshis,
    amount: satsToCoins(BigNumber(output.satoshis)).toString(),
  }));
};

const getIdentityBalanceOutputSummaries = (
  system,
  identity,
  excludedUtxos = [],
) => {
  const excludedKeys = new Set(excludedUtxos.map(utxoKey));
  const retainedUtxos = (identity.utxos || []).filter(
    utxo => !excludedKeys.has(utxoKey(utxo)),
  );

  return Array.from(
    sumUtxoBalances(system.systemId, retainedUtxos).entries(),
  )
    .filter(([, sats]) => sats.isGreaterThan(0))
    .map(([currencyId, sats]) => ({
      currencyId,
      satoshis: sats.toString(),
      amount: satsToCoins(sats).toString(),
    }));
};

const getNativeFeeSatsFromDeltas = (deltas, systemId, fallbackFeeSats) => {
  const nativeDelta = deltas && typeof deltas.get === 'function'
    ? deltas.get(systemId)
    : null;

  return nativeDelta == null
    ? BigNumber(fallbackFeeSats)
    : BigNumber(nativeDelta).absoluteValue();
};

const getIdentityUtxosUsed = (identity, usedUtxos) => {
  const identityUtxoKeys = new Set((identity.utxos || []).map(utxoKey));

  return (usedUtxos || []).filter(utxo => identityUtxoKeys.has(utxoKey(utxo)));
};

const buildSweepTransaction = async ({
  system,
  destinationAddress,
  availableUtxos,
}) => {
  const {feeCoins, feeSats, outputs} = getSweepOutputPlan({
    system,
    destinationAddress,
    availableUtxos,
  });

  if (outputs.length === 0) return null;

  const infoRes = await getInfo(system.systemId);
  if (infoRes.error) throw new Error(infoRes.error.message);

  const unfundedTxHex = VerusIdInterface.createUnfundedCurrencyTransferTransaction(
    system.systemId,
    toCurrencyTransferOutputs(outputs),
    Number(BigNumber(infoRes.result.longestchain).plus(100).toString()),
  );

  const fundRes = await VrpcProvider.getEndpoint(system.systemId).fundRawTransaction(
    unfundedTxHex,
    availableUtxos.map(utxo => ({
      voutnum: utxo.outputIndex,
      txid: utxo.txid,
    })),
    destinationAddress,
    feeCoins,
  );

  if (fundRes.error) throw new Error(fundRes.error.message);

  const validation = validateFundedCurrencyTransfer(
    system.systemId,
    fundRes.result.hex,
    unfundedTxHex,
    destinationAddress,
    networks.verus,
    availableUtxos,
  );

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const actualNativeFee = BigNumber(
    validation.fees && validation.fees[system.systemId] != null
      ? validation.fees[system.systemId]
      : 0,
  );

  if (actualNativeFee.isGreaterThan(feeSats)) {
    throw new Error('Fee exceeds maximum spendable key claim fee.');
  }

  const inputs = getUsedUtxos(fundRes.result.hex, availableUtxos);

  return {
    type: 'sweep',
    systemId: system.systemId,
    coinObj: system.coinObj,
    txHex: fundRes.result.hex,
    inputs,
    claimWif: system.claimWif,
    outputs: outputs.map(output => ({
      currencyId: output.currency,
      satoshis: output.satoshis,
      amount: satsToCoins(BigNumber(output.satoshis)).toString(),
    })),
    validation,
  };
};

const applyClaimedIdentityAddresses = ({
  identity,
  destinationAddress,
  privateAddress,
  removePrivateAddress,
}) => {
  identity.setPrimaryAddresses([destinationAddress]);

  if (privateAddress) {
    identity.setPrivateAddress(privateAddress);
  } else if (removePrivateAddress) {
    identity.privateAddresses = [];
  }
};

const buildCombinedIdentityAndSweepTransaction = async ({
  claimPlan,
  system,
  identity,
  destinationAddress,
  privateAddress,
  removePrivateAddress,
  availableUtxos,
}) => {
  const fundingUtxos = uniqueUtxos(availableUtxos);
  const {feeCoins, outputs} = getSweepOutputPlan({
    system,
    destinationAddress: identity.identityAddress,
    availableUtxos: fundingUtxos,
    includesIdentityUpdate: true,
  });

  const updatableIdentity = await getUpdatableIdentity(
    system.systemId,
    identity.result,
  );

  applyClaimedIdentityAddresses({
    identity: updatableIdentity.identity,
    destinationAddress,
    privateAddress,
    removePrivateAddress,
  });
  const spentIdentityUtxos = getIdentityUtxosUsed(identity, fundingUtxos);
  const changeAddress =
    spentIdentityUtxos.length > 0
      ? identity.identityAddress
      : destinationAddress;
  const updateTx = await createUpdateIdentityWithCurrencyTransferTx({
    systemId: system.systemId,
    identity: updatableIdentity.identity,
    changeAaddr: changeAddress,
    rawIdTx: updatableIdentity.tx,
    idHeight: identity.result.blockheight,
    currencyTransferOutputs: toCurrencyTransferOutputs(outputs),
    utxos: fundingUtxos,
    maxFee: feeCoins,
    expectedIdentityPrimaryAddress: destinationAddress,
    isTestnet: claimPlan.requestIsTestnet,
  });

  return {
    type: 'identity',
    systemId: system.systemId,
    coinObj: system.coinObj,
    txHex: updateTx.hex,
    inputs: updateTx.utxos,
    keys: updateTx.utxos.map(() => [system.claimWif]),
    identity: {
      identityAddress: identity.identityAddress,
      fullyQualifiedName: identity.fullyQualifiedName,
    },
    outputs: [
      ...toOutputSummaries(outputs),
      ...getIdentityBalanceOutputSummaries(
        system,
        identity,
        spentIdentityUtxos,
      ),
    ],
    deltas: updateTx.deltas,
    includesSweep: true,
    requestIsTestnet: claimPlan.requestIsTestnet,
  };
};

const buildIdentityTransactionWithIdentityFee = async ({
  claimPlan,
  system,
  identity,
  destinationAddress,
  privateAddress,
  removePrivateAddress,
  feeUtxos,
}) => {
  const updatableIdentity = await getUpdatableIdentity(
    system.systemId,
    identity.result,
  );

  applyClaimedIdentityAddresses({
    identity: updatableIdentity.identity,
    destinationAddress,
    privateAddress,
    removePrivateAddress,
  });

  const updateTx = await createUpdateIdentityTxWithUtxos({
    systemId: system.systemId,
    identity: updatableIdentity.identity,
    changeAaddr: identity.identityAddress,
    rawIdTx: updatableIdentity.tx,
    idHeight: identity.result.blockheight,
    utxos: feeUtxos,
    maxFee: SPENDABLE_KEY_CLAIM_FEE_COINS,
    isTestnet: claimPlan.requestIsTestnet,
  });
  const actualFeeSats = getNativeFeeSatsFromDeltas(
    updateTx.deltas,
    system.systemId,
    SPENDABLE_KEY_CLAIM_FEE_SATS,
  );
  const changeBalances = sumUtxoBalances(system.systemId, feeUtxos);

  subtractBalanceMap(changeBalances, system.systemId, actualFeeSats);

  const changeOutputs = Array.from(changeBalances.entries())
    .filter(([, sats]) => sats.isGreaterThan(0))
    .map(([currencyId, sats]) => ({
      currencyId,
      satoshis: sats.toString(),
      amount: satsToCoins(sats).toString(),
    }));

  return {
    type: 'identity',
    systemId: system.systemId,
    coinObj: system.coinObj,
    txHex: updateTx.hex,
    inputs: updateTx.utxos,
    keys: updateTx.utxos.map(() => [system.claimWif]),
    identity: {
      identityAddress: identity.identityAddress,
      fullyQualifiedName: identity.fullyQualifiedName,
    },
    outputs: [
      ...changeOutputs,
      ...getIdentityBalanceOutputSummaries(system, identity, feeUtxos),
    ],
    deltas: updateTx.deltas,
    requestIsTestnet: claimPlan.requestIsTestnet,
  };
};

export const preflightSpendableKeyClaim = async ({
  claimPlan,
  destinationBySystem,
  privateAddressBySystem = {},
}) => {
  const transactions = [];
  const unsupportedIdentities = [];

  for (const system of claimPlan.systems) {
    unsupportedIdentities.push(
      ...system.identities.filter(identity => identity.unsupportedReason),
    );
  }

  if (unsupportedIdentities.length > 0) {
    throw new Error(unsupportedIdentities[0].unsupportedReason);
  }

  for (const system of claimPlan.systems) {
    const destinationAddress = destinationBySystem[system.systemId];
    const privateAddress = privateAddressBySystem[system.systemId];
    // Missing means the user opted out; explicit null means the wallet has no
    // z-address for this system and the claimed identity must not retain one.
    const removePrivateAddress =
      Object.prototype.hasOwnProperty.call(
        privateAddressBySystem,
        system.systemId,
      ) && privateAddress == null;

    if (!destinationAddress) {
      throw new Error(`No destination address found for ${system.coinObj.display_ticker || system.coinObj.id}.`);
    }

    let availableUtxos = [...system.utxos];

    for (let i = 0; i < system.identities.length; i++) {
      const identity = system.identities[i];
      const feeCandidates = availableUtxos.filter(isPureNativeUtxo(system.systemId));
      const feeUtxos = selectUtxosForAmount(
        feeCandidates,
        SPENDABLE_KEY_CLAIM_FEE_SATS,
        utxo => getUtxoNativeSatoshis(system.systemId, utxo),
      );
      const combineIdentityWithSweep = shouldCombineIdentityWithSweep({
        systemId: system.systemId,
        availableUtxos,
        identity,
        isLastIdentity: i === system.identities.length - 1,
      });

      if (combineIdentityWithSweep) {
        const hasNonNative = hasNonNativeBalance(
          system.systemId,
          availableUtxos,
        );
        const {feeSats} = getSweepClaimFee(hasNonNative, true);
        const nativeBalance = getNativeBalance(system.systemId, availableUtxos);
        let combinedUtxos = availableUtxos;

        if (
          nativeBalance.isLessThan(feeSats) ||
          (!hasNonNative && nativeBalance.isLessThanOrEqualTo(feeSats))
        ) {
          const identityFeeUtxos = getIdentityFeeUtxos(
            system.systemId,
            identity,
            feeSats,
            nativeBalance,
          );

          if (identityFeeUtxos != null) {
            combinedUtxos = uniqueUtxos([
              ...availableUtxos,
              ...identityFeeUtxos,
            ]);
          }
        }

        transactions.push(
          await buildCombinedIdentityAndSweepTransaction({
            claimPlan,
            system,
            identity,
            destinationAddress,
            privateAddress,
            removePrivateAddress,
            availableUtxos: combinedUtxos,
          }),
        );
        availableUtxos = [];
        continue;
      }

      if (feeUtxos == null) {
        const identityFeeUtxos = getIdentityFeeUtxos(
          system.systemId,
          identity,
          SPENDABLE_KEY_CLAIM_FEE_SATS,
        );

        if (identityFeeUtxos == null) {
          throw new Error(`Spendable key on ${system.coinObj.display_ticker || system.coinObj.id} does not contain enough native fee UTXOs to update ${identity.fullyQualifiedName || identity.identityAddress}.`);
        }

        transactions.push(
          await buildIdentityTransactionWithIdentityFee({
            claimPlan,
            system,
            identity,
            destinationAddress,
            privateAddress,
            removePrivateAddress,
            feeUtxos: identityFeeUtxos,
          }),
        );

        if (!hasNonNativeBalance(system.systemId, availableUtxos)) {
          availableUtxos = [];
        }

        continue;
      }

      const updatableIdentity = await getUpdatableIdentity(
        system.systemId,
        identity.result,
      );

      applyClaimedIdentityAddresses({
        identity: updatableIdentity.identity,
        destinationAddress,
        privateAddress,
        removePrivateAddress,
      });

      const updateTx = await createUpdateIdentityTxWithUtxos({
        systemId: system.systemId,
        identity: updatableIdentity.identity,
        changeAaddr: destinationAddress,
        rawIdTx: updatableIdentity.tx,
        idHeight: identity.result.blockheight,
        utxos: feeUtxos,
        maxFee: SPENDABLE_KEY_CLAIM_FEE_COINS,
        isTestnet: claimPlan.requestIsTestnet,
      });

      const fundingInputs = updateTx.utxos.filter(utxo =>
        availableUtxos.some(candidate => utxoKey(candidate) === utxoKey(utxo)),
      );

      availableUtxos = removeUtxos(availableUtxos, fundingInputs);

      transactions.push({
        type: 'identity',
        systemId: system.systemId,
        coinObj: system.coinObj,
        txHex: updateTx.hex,
        inputs: updateTx.utxos,
        keys: updateTx.utxos.map(() => [system.claimWif]),
        identity: {
          identityAddress: identity.identityAddress,
          fullyQualifiedName: identity.fullyQualifiedName,
        },
        outputs: getIdentityBalanceOutputSummaries(system, identity),
      });
    }

    const sweepTransaction = await buildSweepTransaction({
      system,
      destinationAddress,
      availableUtxos,
    });

    if (sweepTransaction != null) {
      transactions.push(sweepTransaction);
    }
  }

  if (transactions.length === 0) {
    throw new Error('No claimable transparent funds or VerusIDs were found on this spendable key.');
  }

  return {
    claimPlan,
    destinationBySystem,
    privateAddressBySystem,
    transactions,
  };
};

const signSweepTransaction = transaction => {
  const txb = getFundedTxBuilder(
    transaction.txHex,
    networks.verus,
    transaction.inputs.map(input => Buffer.from(input.script, 'hex')),
  );

  for (let i = 0; i < transaction.inputs.length; i++) {
    const keyPair = ECPair.fromWIF(transaction.claimWif, networks.verus);

    txb.sign(
      i,
      keyPair,
      null,
      Transaction.SIGHASH_ALL,
      transaction.inputs[i].satoshis,
    );
  }

  return txb.build().toHex();
};

const prepareSpendableKeyClaimBroadcast = (
  preflightPlan,
  ownerAccountHash,
) => {
  const ownerWalletBinding = (preflightPlan?.claimPlan?.systems || []).reduce(
    (binding, system) => {
      const systemId = system?.systemId;
      const coinId = system?.coinObj?.id;
      const destinationAddress = preflightPlan?.destinationBySystem?.[systemId];

      if (
        typeof systemId !== 'string' ||
        typeof coinId !== 'string' ||
        typeof destinationAddress !== 'string' ||
        destinationAddress.length === 0
      ) {
        throw new Error(
          'Unable to bind this claim to the originating wallet destination.',
        );
      }

      binding[systemId] = {
        coinId,
        destinationAddress,
      };

      const privateAddress = preflightPlan?.privateAddressBySystem?.[systemId];
      if (typeof privateAddress === 'string' && privateAddress.length > 0) {
        binding[systemId].privateAddress = privateAddress;
      }

      return binding;
    },
    {},
  );

  if (Object.keys(ownerWalletBinding).length === 0) {
    throw new Error(
      'Unable to bind this claim to the originating wallet destination.',
    );
  }

  const transactions = preflightPlan.transactions.map(transaction => {
    let rawTx;

    if (transaction.type === 'identity') {
      rawTx = signUpdateIdentityTx(
        transaction.systemId,
        transaction.txHex,
        transaction.inputs,
        transaction.keys,
      );
    } else if (transaction.type === 'sweep') {
      rawTx = signSweepTransaction(transaction);
    } else {
      throw new Error(`Unsupported spendable-key transaction type: ${transaction.type}`);
    }

    return createPendingBroadcastTransaction({transaction, rawTx});
  });

  return createPendingBroadcast({
    kind: 'spendable-key-claim',
    transactions,
    ownerAccountHash,
    ownerWalletBinding,
  });
};

export const assertSpendableKeyBroadcastOwner = (
  pendingBroadcast,
  ownerAccountHash,
  currentOwnerWalletBinding,
) => {
  if (
    typeof ownerAccountHash !== 'string' ||
    ownerAccountHash.length === 0
  ) {
    throw new Error(
      'An active profile is required to submit a spendable-key claim.',
    );
  }

  if (
    typeof pendingBroadcast?.ownerAccountHash !== 'string' ||
    pendingBroadcast.ownerAccountHash.length === 0
  ) {
    const error = new Error(
      'The saved spendable-key claim is missing its originating profile and cannot be retried safely.',
    );

    error.code = 'PENDING_BROADCAST_OWNER_MISSING';
    throw error;
  }

  if (pendingBroadcast.ownerAccountHash !== ownerAccountHash) {
    const error = new Error(
      'This saved spendable-key claim belongs to a different profile. Switch to the originating profile to retry it.',
    );

    error.code = 'PENDING_BROADCAST_ACCOUNT_MISMATCH';
    throw error;
  }

  const expectedWalletBinding = pendingBroadcast?.ownerWalletBinding;
  if (
    expectedWalletBinding == null ||
    typeof expectedWalletBinding !== 'object' ||
    Array.isArray(expectedWalletBinding) ||
    Object.keys(expectedWalletBinding).length === 0
  ) {
    const error = new Error(
      'The saved spendable-key claim is missing its originating wallet destination and cannot be retried safely.',
    );

    error.code = 'PENDING_BROADCAST_WALLET_BINDING_MISSING';
    throw error;
  }

  const walletMatches = Object.entries(expectedWalletBinding).every(
    ([systemId, expected]) => {
      const current = currentOwnerWalletBinding?.[systemId];
      if (
        typeof expected?.coinId !== 'string' ||
        typeof expected?.destinationAddress !== 'string' ||
        current?.coinId !== expected.coinId ||
        current?.destinationAddress !== expected.destinationAddress
      ) {
        return false;
      }

      return (
        typeof expected.privateAddress !== 'string' ||
        current?.privateAddress === expected.privateAddress
      );
    },
  );

  if (!walletMatches) {
    const error = new Error(
      'This saved spendable-key claim belongs to a different wallet. Sign in to the wallet that created it to retry it.',
    );

    error.code = 'PENDING_BROADCAST_WALLET_MISMATCH';
    throw error;
  }

  return pendingBroadcast;
};

export const broadcastSpendableKeyClaim = async ({
  preflightPlan,
  pendingBroadcast = null,
  ownerAccountHash,
  currentOwnerWalletBinding = null,
  persistPendingBroadcast,
  requestTimeoutMs,
}) => {
  if (
    typeof ownerAccountHash !== 'string' ||
    ownerAccountHash.length === 0
  ) {
    throw new Error(
      'An active profile is required to submit a spendable-key claim.',
    );
  }

  const durableBroadcast = pendingBroadcast ||
    prepareSpendableKeyClaimBroadcast(preflightPlan, ownerAccountHash);

  assertSpendableKeyBroadcastOwner(
    durableBroadcast,
    ownerAccountHash,
    pendingBroadcast == null
      ? durableBroadcast.ownerWalletBinding
      : currentOwnerWalletBinding,
  );

  try {
    const result = await broadcastPendingTransactions({
      pendingBroadcast: durableBroadcast,
      persistPendingBroadcast,
      requestTimeoutMs,
    });

    return {
      preflightPlan,
      ...result,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));

    error.preflightPlan = preflightPlan;
    throw error;
  }
};
