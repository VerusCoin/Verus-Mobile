import BigNumber from 'bignumber.js';
import {Buffer} from 'buffer';
import {entropyToMnemonic} from 'bip39';
import {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
  DEST_ID,
  DEST_PKH,
  GenericRequest,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
  TransferDestination,
  fromBase58Check,
} from 'verus-typescript-primitives';
import {ECPair, Transaction, networks, smarttxs} from '@bitgo/utxo-lib';
import {VerusIdInterface} from 'verusid-ts-client';
import {randomBytes} from '../crypto/randomBytes';
import {
  SEED_DETAILS_ENCRYPTION_ITERS_LOW,
  buildSeedDetails,
} from '../seedDetails/seedDetails';
import {
  SPENDABLE_KEY_CLAIM_FEE_COINS,
  SPENDABLE_KEY_CLAIM_FEE_SATS,
  SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_COINS,
  SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_SATS,
  SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS,
  SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_SATS,
  deriveSpendableKeyAddresses,
  discoverSpendableKeyAddressClaims,
  spendableKeyDetailsOrdinalToMnemonic,
  spendableKeyDetailsRequiresPassword,
} from '../spendableKey/spendableKey';
import {coinsToSats, satsToCoins} from '../math';
import {VRPC} from '../constants/intervalConstants';
import {I_ADDRESS_VERSION, R_ADDRESS_VERSION} from '../constants/constants';
import {
  fundRawTransaction,
  getAddressUtxos,
  getInfo,
  getSpendableUtxos,
  sendRawTransaction,
} from '../api/channels/vrpc/callCreators';
import {getCurrency, getIdentity} from '../api/channels/verusid/callCreators';
import {
  createUpdateIdentityTxWithUtxos,
  createUpdateIdentityWithCurrencyTransferTx,
  getUpdatableIdentity,
  pushUpdateIdentityTx,
} from '../api/channels/verusid/requests/updateIdentity';
import {requestPrivKey} from '../auth/authBox';

const {getFundedTxBuilder, validateFundedCurrencyTransfer} = smarttxs;

export const GIFT_CARD_STORAGE_VERSION = 1;
export const GIFT_CARD_STATUS_NEW = 'new';
export const GIFT_CARD_STATUS_FUNDED = 'funded';
export const GIFT_CARD_STATUS_REDEEMED = 'redeemed';
export const GIFT_CARD_FUNDING_FUNDS = 'funds';
export const GIFT_CARD_FUNDING_IDENTITY = 'identity';
export const GIFT_CARD_FUNDING_BOTH = 'both';
export const GIFT_CARD_FUNDING_STATUS_PENDING = 'pending';
export const GIFT_CARD_FUNDING_STATUS_CONFIRMED = 'confirmed';

const DEFAULT_LABEL = 'Gift Card';

const getUtxoKey = utxo => `${utxo.txid}:${utxo.outputIndex}`;

const uniqueUtxos = utxos => {
  const seen = new Set();
  const unique = [];

  for (const utxo of utxos || []) {
    const key = getUtxoKey(utxo);

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(utxo);
    }
  }

  return unique;
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

  for (const utxo of utxos || []) {
    selected.push(utxo);
    total = total.plus(getUtxoSats(utxo));

    if (total.isGreaterThanOrEqualTo(amountSats)) {
      return selected;
    }
  }

  return null;
};

const getUtxoNativeSatoshis = (systemId, utxo) => {
  const nativeSats = BigNumber(utxo?.satoshis || 0);

  if (nativeSats.isGreaterThan(0)) return nativeSats;

  const nativeCurrencyValue = (utxo?.currencyvalues || {})[systemId];

  return nativeCurrencyValue == null
    ? BigNumber(0)
    : coinsToSats(BigNumber(nativeCurrencyValue));
};

const hasPositiveNonNativeCurrencyValue = (systemId, currencyValues = {}) => {
  return Object.keys(currencyValues).some(currencyId => {
    return (
      currencyId !== systemId &&
      coinsToSats(BigNumber(currencyValues[currencyId])).isGreaterThan(0)
    );
  });
};

const isSpendableUtxo = utxo => {
  return utxo?.isspendable === true || utxo?.isspendable === 1;
};

const isPureNativeFeeUtxo = systemId => utxo => {
  return (
    isSpendableUtxo(utxo) &&
    getUtxoNativeSatoshis(systemId, utxo).isGreaterThan(0) &&
    !hasPositiveNonNativeCurrencyValue(systemId, utxo.currencyvalues)
  );
};

const getNativeBalance = (systemId, utxos = []) => {
  return (utxos || []).reduce((total, utxo) => {
    return total.plus(getUtxoNativeSatoshis(systemId, utxo));
  }, BigNumber(0));
};

const getIdentityFeeUtxos = (
  systemId,
  identity,
  feeSats,
  nativeSatsAvailable = BigNumber(0),
) => {
  const feeCandidates = (identity?.utxos || []).filter(
    isPureNativeFeeUtxo(systemId),
  );
  const requiredFeeSats = BigNumber(feeSats)
    .minus(nativeSatsAvailable)
    .integerValue(BigNumber.ROUND_CEIL);

  return selectUtxosForAmount(
    feeCandidates,
    requiredFeeSats,
    utxo => getUtxoNativeSatoshis(systemId, utxo),
  );
};

const getUsedUtxos = (txHex, candidates) => {
  const tx = Transaction.fromHex(txHex, networks.verus);

  return tx.ins.map(input => {
    const txid = Buffer.from(input.hash).reverse().toString('hex');
    const found = (candidates || []).find(
      utxo => utxo.txid === txid && utxo.outputIndex === input.index,
    );

    if (!found) {
      throw new Error(`Cannot find transaction input ${txid}:${input.index}`);
    }

    return found;
  });
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

const getTransferDestinationKey = address => {
  return address.getAddressString();
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

    currencyOutput.currencies[currency] =
      previousSatoshis == null
        ? satoshis
        : BigNumber(previousSatoshis).plus(satoshis).toString();
  }

  return currencyTransferOutputs;
};

const getGiftCardId = requestBufferString => {
  // Good enough for a local id; this is not used as a cryptographic commitment.
  return `${Date.now()}-${requestBufferString.slice(0, 16)}`;
};

const normalizeCardLabel = label => {
  const normalized = typeof label === 'string' ? label.trim() : '';

  return normalized.length > 0 ? normalized : DEFAULT_LABEL;
};

const buildSpendableKeyRequest = ({spendableKeyOrdinal, requestIsTestnet}) => {
  return new GenericRequest({
    details: [spendableKeyOrdinal],
    flags: requestIsTestnet
      ? GenericRequest.FLAG_IS_TESTNET
      : GenericRequest.BASE_FLAGS,
  });
};

export const parseGiftCardRequest = card => {
  const request = card.requestUri
    ? GenericRequest.fromWalletDeeplinkUri(card.requestUri)
    : (() => {
        const req = new GenericRequest();
        req.fromBuffer(Buffer.from(card.requestBufferString, 'hex'), 0);
        return req;
      })();
  const spendableKeyOrdinal = request.details.find(
    detail => detail instanceof SpendableKeyDetailsOrdinalVDXFObject,
  );

  if (!spendableKeyOrdinal) {
    throw new Error('Gift card does not contain spendable key details.');
  }

  return {
    request,
    spendableKeyOrdinal,
  };
};

export const createGiftCard = async ({
  label,
  password,
  kdfIters = SEED_DETAILS_ENCRYPTION_ITERS_LOW,
  requestIsTestnet,
  activeCoinsForUser,
}) => {
  const entropy = Buffer.from(await randomBytes(32));
  const mnemonic = entropyToMnemonic(entropy.toString('hex'));
  const spendableKey = await buildSeedDetails({
    SeedDetailsClass: SpendableKeyDetails,
    mnemonic,
    password,
    kdfIters,
  });
  const spendableKeyOrdinal = new SpendableKeyDetailsOrdinalVDXFObject({
    data: spendableKey,
  });
  const request = buildSpendableKeyRequest({
    spendableKeyOrdinal,
    requestIsTestnet,
  });
  const requestBufferString = request.toBuffer().toString('hex');
  const requestUri = request.toWalletDeeplinkUri();
  const derived = await deriveSpendableKeyAddresses({
    mnemonic,
    requestIsTestnet,
    activeCoinsForUser,
  });
  const encrypted = spendableKeyDetailsRequiresPassword(spendableKeyOrdinal);
  const now = Date.now();

  return {
    id: getGiftCardId(requestBufferString),
    version: GIFT_CARD_STORAGE_VERSION,
    label: normalizeCardLabel(label),
    createdAt: now,
    updatedAt: now,
    requestIsTestnet,
    encrypted,
    kdfIters: encrypted ? Number(kdfIters) : 0,
    requestUri,
    requestBufferString,
    addressesBySystem: derived.addressesBySystem,
    status: {
      state: GIFT_CARD_STATUS_NEW,
      systems: [],
      hasClaims: false,
      redeemed: false,
      lastCheckedAt: null,
    },
    fundingHistory: [],
  };
};

export const getGiftCardMnemonic = ({card, password}) => {
  const {spendableKeyOrdinal} = parseGiftCardRequest(card);

  return spendableKeyDetailsOrdinalToMnemonic({
    spendableKeyOrdinal,
    password,
  });
};

export const verifyGiftCardAddresses = async ({
  card,
  password,
  activeCoinsForUser,
  systems,
}) => {
  const mnemonic = getGiftCardMnemonic({card, password});
  const derived = await deriveSpendableKeyAddresses({
    mnemonic,
    requestIsTestnet: card.requestIsTestnet,
    activeCoinsForUser,
  });
  const requestedSystems = systems || Object.keys(card.addressesBySystem || {});

  for (const systemId of requestedSystems) {
    const savedAddress = card.addressesBySystem && card.addressesBySystem[systemId];
    const derivedAddress = derived.addressesBySystem[systemId];

    if (!savedAddress || !derivedAddress || savedAddress !== derivedAddress) {
      throw new Error(`Gift card address verification failed for ${systemId}.`);
    }
  }

  return derived;
};

export const buildGiftCardNfcDeeplinkUri = card => {
  const {spendableKeyOrdinal} = parseGiftCardRequest(card);
  const request = new GenericRequest({
    details: [
      new CreateWalletBackupDetailsOrdinalVDXFObject({
        data: new CreateWalletBackupDetails(),
      }),
      spendableKeyOrdinal,
    ],
    flags: card.requestIsTestnet
      ? GenericRequest.FLAG_IS_TESTNET
      : GenericRequest.BASE_FLAGS,
  });

  return request.toWalletDeeplinkUri();
};

const getCardStateFromClaims = claims => {
  if (claims.redeemed) return GIFT_CARD_STATUS_REDEEMED;
  if (claims.hasClaims) return GIFT_CARD_STATUS_FUNDED;
  return GIFT_CARD_STATUS_NEW;
};

export const hasGiftCardClaims = card => {
  const status = card && card.status;

  return (
    status?.hasClaims === true ||
    (status?.systems || []).some(
      system =>
        (system.currencies || []).length > 0 ||
        (system.identities || []).length > 0,
    )
  );
};

export const getGiftCardPendingFundings = card => {
  return (card?.fundingHistory || []).filter(entry => {
    return (
      entry?.status === GIFT_CARD_FUNDING_STATUS_PENDING ||
      entry?.pending === true
    );
  });
};

export const hasPendingGiftCardFunding = card => {
  return getGiftCardPendingFundings(card).length > 0;
};

const normalizeFundingIdentity = identity => {
  if (!identity?.identityAddress || !identity?.systemId) return null;

  return {
    chain: identity.chain,
    systemId: identity.systemId,
    identityAddress: identity.identityAddress,
    fullyQualifiedName: identity.fullyQualifiedName || identity.name,
  };
};

const getExpectedFundingIdentities = card => {
  const identities = [];
  const seen = new Set();

  for (const entry of card?.fundingHistory || []) {
    for (const identity of entry.identities || []) {
      const normalized = normalizeFundingIdentity(identity);

      if (!normalized) continue;

      const key = `${normalized.systemId}:${normalized.identityAddress}`;

      if (seen.has(key)) continue;

      seen.add(key);
      identities.push(normalized);
    }
  }

  return identities;
};

const statusHasExpectedIdentity = (status, expectedIdentity) => {
  return (status?.systems || []).some(system => {
    return (
      system.systemId === expectedIdentity.systemId &&
      (system.identities || []).some(
        identity => identity.identityAddress === expectedIdentity.identityAddress,
      )
    );
  });
};

const isPendingFundingResolved = (entry, status) => {
  if (status.redeemed === true) return true;

  const expectedIdentities = (entry.identities || [])
    .map(normalizeFundingIdentity)
    .filter(identity => identity != null);

  if (expectedIdentities.length > 0) {
    return expectedIdentities.every(identity =>
      statusHasExpectedIdentity(status, identity),
    );
  }

  return status.hasClaims === true;
};

const resolveFundingHistory = (fundingHistory, status) => {
  return (fundingHistory || []).map(entry => {
    const normalizedStatus =
      entry.status || (entry.pending ? GIFT_CARD_FUNDING_STATUS_PENDING : null);

    if (
      normalizedStatus === GIFT_CARD_FUNDING_STATUS_PENDING &&
      isPendingFundingResolved(entry, status)
    ) {
      return {
        ...entry,
        status: GIFT_CARD_FUNDING_STATUS_CONFIRMED,
        pending: false,
        confirmedAt: Date.now(),
      };
    }

    return entry;
  });
};

export const getSubmittedGiftCardFundingIdentities = fundingResult => {
  const results = fundingResult?.results || [];
  const selectedIdentities =
    fundingResult?.preflightPlan?.selections?.identities || [];
  const submittedIdentityResults = results.filter(result => {
    return (
      result?.type === 'identity' &&
      result?.systemId &&
      result?.identity?.identityAddress
    );
  });

  if (
    submittedIdentityResults.length === 0 &&
    results.every(result => result?.type == null)
  ) {
    return selectedIdentities
      .map(normalizeFundingIdentity)
      .filter(identity => identity != null);
  }

  const submittedKeys = new Set(
    submittedIdentityResults.map(
      result => `${result.systemId}:${result.identity.identityAddress}`,
    ),
  );
  const submittedByKey = submittedIdentityResults.reduce((mapped, result) => {
    const key = `${result.systemId}:${result.identity.identityAddress}`;
    const normalized = normalizeFundingIdentity({
      ...result.identity,
      systemId: result.systemId,
    });

    if (normalized != null) mapped.set(key, normalized);
    return mapped;
  }, new Map());
  const identities = [];
  const seen = new Set();

  for (const identity of selectedIdentities) {
    const normalized = normalizeFundingIdentity(identity);
    if (!normalized) continue;

    const key = `${normalized.systemId}:${normalized.identityAddress}`;
    if (!submittedKeys.has(key) || seen.has(key)) continue;

    seen.add(key);
    identities.push(normalized);
  }

  for (const [key, identity] of submittedByKey.entries()) {
    if (seen.has(key)) continue;

    seen.add(key);
    identities.push(identity);
  }

  return identities;
};

export const addGiftCardPendingFunding = (card, fundingResult) => {
  const now = Date.now();
  const txids = (fundingResult?.results || [])
    .map(result => result.txid)
    .filter(txid => typeof txid === 'string' && txid.length > 0);

  return {
    ...card,
    updatedAt: now,
    fundingHistory: [
      ...(card.fundingHistory || []),
      {
        createdAt: now,
        status: GIFT_CARD_FUNDING_STATUS_PENDING,
        pending: true,
        txids,
        systems: (fundingResult?.results || []).map(result => result.systemId),
        identities: getSubmittedGiftCardFundingIdentities(fundingResult),
      },
    ],
  };
};

export const unlinkGiftCardFundingIdentitiesFromVerusIdData = (
  verusIdData = {},
  identities = [],
) => {
  const currentLinkedIds = verusIdData.linked_ids || {};
  const nextLinkedIds = Object.keys(currentLinkedIds).reduce((linked, chain) => {
    linked[chain] = {...currentLinkedIds[chain]};
    return linked;
  }, {});
  let changed = false;

  for (const identity of identities || []) {
    const identityAddress = identity?.identityAddress;
    const chains = identity?.chain ? [identity.chain] : Object.keys(nextLinkedIds);

    if (!identityAddress) continue;

    for (const chain of chains) {
      if (nextLinkedIds[chain]?.[identityAddress] == null) continue;

      delete nextLinkedIds[chain][identityAddress];
      changed = true;

      if (Object.keys(nextLinkedIds[chain]).length === 0) {
        delete nextLinkedIds[chain];
      }
    }
  }

  if (!changed) return verusIdData;

  return {
    ...verusIdData,
    linked_ids: nextLinkedIds,
  };
};

export const refreshGiftCardStatus = async ({
  card,
  activeCoinsForUser,
}) => {
  const claims = await discoverSpendableKeyAddressClaims({
    addressesBySystem: card.addressesBySystem,
    requestIsTestnet: card.requestIsTestnet,
    activeCoinsForUser,
    expectedIdentities: getExpectedFundingIdentities(card),
  });
  const status = {
    ...claims,
    state: getCardStateFromClaims(claims),
    lastCheckedAt: Date.now(),
  };

  return {
    ...card,
    status,
    fundingHistory: resolveFundingHistory(card.fundingHistory, status),
    updatedAt: Date.now(),
  };
};

export const canDeleteGiftCard = card => {
  const status = card && card.status;

  return (
    status != null &&
    !hasPendingGiftCardFunding(card) &&
    !hasGiftCardClaims(card)
  );
};

const getActiveVrpcCoinForSystem = (systemId, activeCoinsForUser, activeAccount) => {
  const candidates = (activeCoinsForUser || []).filter(coinObj => {
    return (
      coinObj &&
      coinObj.system_id === systemId &&
      Array.isArray(coinObj.compatible_channels) &&
      coinObj.compatible_channels.includes(VRPC) &&
      activeAccount?.keys?.[coinObj.id]?.[VRPC]?.addresses?.length > 0
    );
  });

  return (
    candidates.find(coinObj => coinObj.currency_id === systemId) ||
    candidates[0] ||
    null
  );
};

const getSourceCoinForCurrency = (
  systemId,
  currencyId,
  activeCoinsForUser,
  activeAccount,
) => {
  const exactCoin = (activeCoinsForUser || []).find(coinObj => {
    return (
      coinObj &&
      coinObj.system_id === systemId &&
      coinObj.currency_id === currencyId &&
      activeAccount?.keys?.[coinObj.id]?.[VRPC]?.addresses?.length > 0
    );
  });

  return (
    exactCoin ||
    getActiveVrpcCoinForSystem(systemId, activeCoinsForUser, activeAccount)
  );
};

const getSourceAddress = (coinObj, activeAccount) => {
  const source = activeAccount?.keys?.[coinObj.id]?.[VRPC]?.addresses?.[0];

  if (!source) {
    throw new Error(`No VRPC source address found for ${coinObj.display_ticker || coinObj.id}.`);
  }

  return source;
};

const getFundingGroups = selections => {
  const groups = new Map();

  const getGroup = systemId => {
    if (!groups.has(systemId)) {
      groups.set(systemId, {
        systemId,
        funds: [],
        identities: [],
      });
    }

    return groups.get(systemId);
  };

  for (const fund of selections?.funds || []) {
    if (!fund || !fund.systemId || !fund.currencyId) continue;

    const sats = coinsToSats(BigNumber(fund.amount || 0))
      .integerValue(BigNumber.ROUND_FLOOR);

    if (sats.isLessThanOrEqualTo(0)) continue;

    getGroup(fund.systemId).funds.push({
      ...fund,
      satoshis: sats.toString(),
    });
  }

  for (const identity of selections?.identities || []) {
    if (!identity || !identity.systemId || !identity.identityAddress) continue;

    getGroup(identity.systemId).identities.push(identity);
  }

  return Array.from(groups.values());
};

const getIdentityFundingKey = identity => {
  return `${identity.systemId}:${identity.identityAddress}`;
};

const getIdentityFundingByKey = identityFunding => {
  return (identityFunding || []).reduce((mapped, identity) => {
    if (!identity?.systemId || !identity?.identityAddress) return mapped;

    mapped.set(getIdentityFundingKey(identity), identity);
    return mapped;
  }, new Map());
};

const getCurrencyFundingSats = currency => {
  if (currency?.satoshis != null) return BigNumber(currency.satoshis);
  if (currency?.amount != null) return coinsToSats(BigNumber(currency.amount));

  return BigNumber(0);
};

const getIdentityNativeFundingSats = (identity, identityFundingByKey) => {
  const fundedIdentity =
    identityFundingByKey.get(getIdentityFundingKey(identity)) || identity;

  if (Array.isArray(fundedIdentity?.utxos)) {
    return getNativeBalance(
      identity.systemId,
      fundedIdentity.utxos.filter(isPureNativeFeeUtxo(identity.systemId)),
    );
  }

  return (fundedIdentity?.currencies || []).reduce((total, currency) => {
    if (currency?.currencyId !== identity.systemId) return total;

    return total.plus(getCurrencyFundingSats(currency));
  }, BigNumber(0));
};

const identityHasNativeFeeFunds = (
  identity,
  identityFundingByKey,
  feeSats,
) => {
  return getIdentityNativeFundingSats(identity, identityFundingByKey)
    .isGreaterThanOrEqualTo(feeSats);
};

const getIdentityOnlyRequiredFeeSats = (identities, identityFundingByKey) => {
  return identities.reduce((total, identity) => {
    return identityHasNativeFeeFunds(
      identity,
      identityFundingByKey,
      SPENDABLE_KEY_CLAIM_FEE_SATS,
    )
      ? total
      : total.plus(SPENDABLE_KEY_CLAIM_FEE_SATS);
  }, BigNumber(0));
};

const getIdentityAndFundsRequiredFeeSats = (
  identities,
  identityFundingByKey,
) => {
  const remainingIdentities = [...identities];
  const combinedIdentity = remainingIdentities.pop();
  const standaloneFeeSats = getIdentityOnlyRequiredFeeSats(
    remainingIdentities,
    identityFundingByKey,
  );

  if (combinedIdentity == null) return standaloneFeeSats;

  const combinedIdentityNativeSats = getIdentityNativeFundingSats(
    combinedIdentity,
    identityFundingByKey,
  );
  const combinedFeeSats = SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_SATS.minus(
    combinedIdentityNativeSats,
  );

  return standaloneFeeSats.plus(
    combinedFeeSats.isGreaterThan(0) ? combinedFeeSats : BigNumber(0),
  );
};

export const getGiftCardFundingTopups = (
  selections,
  {identityFunding = selections?.identityFunding || []} = {},
) => {
  const identityFundingByKey = getIdentityFundingByKey(identityFunding);

  return getFundingGroups(selections).reduce((topups, group) => {
    const hasIdentity = group.identities.length > 0;
    const hasNonNative = group.funds.some(fund => fund.currencyId !== group.systemId);
    const nativeSelectedSats = group.funds.reduce((total, fund) => {
      return fund.currencyId === group.systemId
        ? total.plus(fund.satoshis)
        : total;
    }, BigNumber(0));
    let requiredFeeSats = BigNumber(0);

    if (hasIdentity && group.funds.length > 0) {
      requiredFeeSats = getIdentityAndFundsRequiredFeeSats(
        group.identities,
        identityFundingByKey,
      );
    } else if (hasIdentity) {
      requiredFeeSats = getIdentityOnlyRequiredFeeSats(
        group.identities,
        identityFundingByKey,
      );
    } else if (hasNonNative) {
      requiredFeeSats = SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_SATS;
    } else if (group.funds.length > 0) {
      requiredFeeSats = SPENDABLE_KEY_CLAIM_FEE_SATS;
    }

    const topupSats = requiredFeeSats.minus(nativeSelectedSats);

    if (topupSats.isGreaterThan(0)) {
      topups[group.systemId] = {
        systemId: group.systemId,
        satoshis: topupSats.toString(),
        amount: satsToCoins(topupSats).toString(),
        requiredFeeSats: requiredFeeSats.toString(),
      };
    }

    return topups;
  }, {});
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
  } catch (_) {
    return {
      currencyId,
      name: currencyId,
      definition: null,
    };
  }
};

const addUtxoBalance = (balances, currencyId, satoshis) => {
  const sats = BigNumber(satoshis || 0);

  if (sats.isLessThanOrEqualTo(0)) return;

  balances.set(currencyId, (balances.get(currencyId) || BigNumber(0)).plus(sats));
};

const sumAddressUtxoBalances = (systemId, utxos = []) => {
  const balances = new Map();

  for (const utxo of utxos) {
    const currencyValues = utxo.currencyvalues || {};
    const nativeSats = BigNumber(utxo.satoshis || 0);

    if (nativeSats.isGreaterThan(0)) {
      addUtxoBalance(balances, systemId, nativeSats);
    } else if (currencyValues[systemId] != null) {
      addUtxoBalance(
        balances,
        systemId,
        coinsToSats(BigNumber(currencyValues[systemId])),
      );
    }

    for (const currencyId of Object.keys(currencyValues)) {
      if (currencyId === systemId) continue;

      addUtxoBalance(
        balances,
        currencyId,
        coinsToSats(BigNumber(currencyValues[currencyId])),
      );
    }
  }

  return balances;
};

export const discoverGiftCardIdentityFunds = async ({identities}) => {
  const fundedIdentities = [];

  for (const identity of identities || []) {
    if (!identity?.systemId || !identity?.identityAddress) continue;

    const utxosRes = await getAddressUtxos(
      identity.systemId,
      [identity.identityAddress],
      true,
    );

    if (utxosRes.error) throw new Error(utxosRes.error.message);

    const balanceMap = sumAddressUtxoBalances(
      identity.systemId,
      utxosRes.result || [],
    );
    const currencies = [];

    for (const [currencyId, sats] of balanceMap.entries()) {
      if (sats.isLessThanOrEqualTo(0)) continue;

      currencies.push({
        currencyId,
        satoshis: sats.toString(),
        amount: satsToCoins(sats).toString(),
        display: await getCurrencyDisplay(identity.systemId, currencyId),
      });
    }

    if (currencies.length > 0) {
      fundedIdentities.push({
        ...identity,
        utxos: utxosRes.result || [],
        currencies,
      });
    }
  }

  return fundedIdentities;
};

const addTopupsToGroups = (groups, topups, activeCoinsForUser, activeAccount) => {
  return groups.map(group => {
    const topup = topups[group.systemId];

    if (!topup) return group;

    const sourceCoin = getSourceCoinForCurrency(
      group.systemId,
      group.systemId,
      activeCoinsForUser,
      activeAccount,
    );

    if (!sourceCoin) {
      throw new Error(`No native VRPC wallet found to add fee funds on ${group.systemId}.`);
    }

    return {
      ...group,
      funds: [
        ...group.funds,
        {
          systemId: group.systemId,
          currencyId: group.systemId,
          amount: topup.amount,
          satoshis: topup.satoshis,
          coinObj: sourceCoin,
          isFeeTopup: true,
        },
      ],
    };
  });
};

const getFundingUtxos = async (systemId, sourceAddress, outputs) => {
  const currencies = new Set([systemId]);

  for (const output of outputs || []) {
    currencies.add(output.currency);
  }

  const utxos = [];

  for (const currencyId of currencies) {
    utxos.push(
      ...(await getSpendableUtxos(systemId, currencyId, [sourceAddress])),
    );
  }

  return uniqueUtxos(utxos);
};

const getParentFeeCoins = outputs => {
  const hasNonNative = (outputs || []).some(output => output.currency !== output.systemId);

  return hasNonNative
    ? SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS
    : SPENDABLE_KEY_CLAIM_FEE_COINS;
};

const getParentFeeSats = outputs => {
  const hasNonNative = (outputs || []).some(output => output.currency !== output.systemId);

  return hasNonNative
    ? SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_SATS
    : SPENDABLE_KEY_CLAIM_FEE_SATS;
};

const makeOutputSummaries = outputs => {
  return outputs.map(output => ({
    currencyId: output.currency,
    satoshis: output.satoshis,
    amount: satsToCoins(BigNumber(output.satoshis)).toString(),
    isFeeTopup: output.isFeeTopup === true,
  }));
};

const buildCurrencyFundingTransaction = async ({
  group,
  sourceCoin,
  sourceAddress,
  cardAddress,
}) => {
  const infoRes = await getInfo(group.systemId);
  if (infoRes.error) throw new Error(infoRes.error.message);

  const destination = toTransferDestination(cardAddress);
  const outputs = group.funds.map(fund => ({
    systemId: group.systemId,
    currency: fund.currencyId,
    satoshis: fund.satoshis,
    address: destination,
    isFeeTopup: fund.isFeeTopup,
  }));
  const unfundedTxHex = VerusIdInterface.createUnfundedCurrencyTransferTransaction(
    group.systemId,
    toCurrencyTransferOutputs(outputs),
    Number(BigNumber(infoRes.result.longestchain).plus(100).toString()),
  );
  const fundingUtxos = await getFundingUtxos(
    group.systemId,
    sourceAddress,
    outputs,
  );
  const fundRes = await fundRawTransaction(
    group.systemId,
    unfundedTxHex,
    fundingUtxos.map(utxo => ({
      voutnum: utxo.outputIndex,
      txid: utxo.txid,
    })),
    sourceAddress,
    getParentFeeCoins(outputs),
  );

  if (fundRes.error) throw new Error(fundRes.error.message);

  const validation = validateFundedCurrencyTransfer(
    group.systemId,
    fundRes.result.hex,
    unfundedTxHex,
    sourceAddress,
    networks.verus,
    fundingUtxos,
  );

  if (!validation.valid) throw new Error(validation.message);

  const actualNativeFee = BigNumber(
    validation.fees && validation.fees[group.systemId] != null
      ? validation.fees[group.systemId]
      : 0,
  );

  if (actualNativeFee.isGreaterThan(getParentFeeSats(outputs))) {
    throw new Error('Fee exceeds maximum gift card funding fee.');
  }

  return {
    type: 'currency',
    systemId: group.systemId,
    txHex: fundRes.result.hex,
    inputs: getUsedUtxos(fundRes.result.hex, fundingUtxos),
    signingCoinId: sourceCoin.id,
    sourceAddress,
    outputs: makeOutputSummaries(outputs),
    validation,
  };
};

const getIdentityUpdate = async (systemId, identityAddress) => {
  const identityRes = await getIdentity(systemId, identityAddress);

  if (identityRes.error) throw new Error(identityRes.error.message);

  const updatableIdentity = await getUpdatableIdentity(
    systemId,
    identityRes.result,
  );

  return {
    identityResult: identityRes.result,
    updatableIdentity,
  };
};

const getNativeFeeSatsFromDeltas = (deltas, systemId, fallbackFeeSats) => {
  const nativeDelta = deltas && typeof deltas.get === 'function'
    ? deltas.get(systemId)
    : null;

  return nativeDelta == null
    ? BigNumber(fallbackFeeSats)
    : BigNumber(nativeDelta).absoluteValue();
};

const getIdentityFunding = (identity, identityFundingByKey) => {
  return identityFundingByKey?.get(getIdentityFundingKey(identity)) || identity;
};

const getIdentityFundingInputPlan = async ({
  group,
  identity,
  sourceAddress,
  outputs,
  identityFundingByKey,
}) => {
  const usesCurrencyTransfer = outputs.length > 0;
  const sourceUtxos = usesCurrencyTransfer
    ? await getFundingUtxos(group.systemId, sourceAddress, outputs)
    : await getSpendableUtxos(group.systemId, group.systemId, [sourceAddress]);
  const requiredFeeSats = usesCurrencyTransfer
    ? SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_SATS
    : SPENDABLE_KEY_CLAIM_FEE_SATS;

  if (
    usesCurrencyTransfer ||
    getNativeBalance(group.systemId, sourceUtxos)
      .isGreaterThanOrEqualTo(requiredFeeSats)
  ) {
    return {
      utxos: sourceUtxos,
      changeAddress: sourceAddress,
      usesIdentityFeeFunds: false,
      expectedFeeSats: requiredFeeSats,
    };
  }

  const identityFeeUtxos = getIdentityFeeUtxos(
    group.systemId,
    getIdentityFunding(identity, identityFundingByKey),
    requiredFeeSats,
  );

  if (identityFeeUtxos == null) {
    return {
      utxos: sourceUtxos,
      changeAddress: sourceAddress,
      usesIdentityFeeFunds: false,
      expectedFeeSats: requiredFeeSats,
    };
  }

  return {
    utxos: identityFeeUtxos,
    changeAddress: identity.identityAddress,
    usesIdentityFeeFunds: true,
    expectedFeeSats: requiredFeeSats,
  };
};

const buildIdentityFundingTransaction = async ({
  group,
  identity,
  sourceCoin,
  sourceAddress,
  cardAddress,
  outputs = [],
  identityFundingByKey,
  requestIsTestnet,
}) => {
  const {identityResult, updatableIdentity} = await getIdentityUpdate(
    group.systemId,
    identity.identityAddress,
  );

  updatableIdentity.identity.setPrimaryAddresses([cardAddress]);

  const inputPlan = await getIdentityFundingInputPlan({
    group,
    identity,
    sourceAddress,
    outputs,
    identityFundingByKey,
  });
  const updateTx = outputs.length > 0
    ? await createUpdateIdentityWithCurrencyTransferTx({
        systemId: group.systemId,
        identity: updatableIdentity.identity,
        changeAaddr: inputPlan.changeAddress,
        rawIdTx: updatableIdentity.tx,
        idHeight: identityResult.blockheight,
        currencyTransferOutputs: toCurrencyTransferOutputs(outputs),
        utxos: inputPlan.utxos,
        maxFee: SPENDABLE_KEY_CLAIM_IDENTITY_SWEEP_FEE_COINS,
        expectedIdentityPrimaryAddress: cardAddress,
        isTestnet: requestIsTestnet,
      })
    : await createUpdateIdentityTxWithUtxos({
        systemId: group.systemId,
        identity: updatableIdentity.identity,
        changeAaddr: inputPlan.changeAddress,
        rawIdTx: updatableIdentity.tx,
        idHeight: identityResult.blockheight,
        utxos: inputPlan.utxos,
        maxFee: SPENDABLE_KEY_CLAIM_FEE_COINS,
        expectedIdentityPrimaryAddress: cardAddress,
        isTestnet: requestIsTestnet,
      });
  const actualFeeSats = getNativeFeeSatsFromDeltas(
    updateTx.deltas,
    group.systemId,
    inputPlan.expectedFeeSats,
  );

  return {
    type: 'identity',
    systemId: group.systemId,
    txHex: updateTx.hex,
    inputs: updateTx.utxos,
    signingCoinId: sourceCoin.id,
    sourceAddress,
    identity: {
      identityAddress: identity.identityAddress,
      fullyQualifiedName: identity.fullyQualifiedName || identity.name,
    },
    outputs: makeOutputSummaries(outputs),
    includesFunds: outputs.length > 0,
    usesIdentityFeeFunds: inputPlan.usesIdentityFeeFunds,
    feeSource: inputPlan.usesIdentityFeeFunds ? 'identity' : 'wallet',
    feeSats: actualFeeSats.toString(),
    deltas: updateTx.deltas,
    requestIsTestnet,
  };
};

export const preflightGiftCardFunding = async ({
  card,
  password,
  selections,
  identityFunding,
  activeCoinsForUser,
  activeAccount,
}) => {
  if (card?.status?.state === GIFT_CARD_STATUS_REDEEMED || card?.status?.redeemed) {
    throw new Error('Redeemed gift cards cannot be funded.');
  }

  const baseGroups = getFundingGroups(selections);

  if (baseGroups.length === 0) {
    throw new Error('Select funds, a VerusID, or both before continuing.');
  }

  const topups = getGiftCardFundingTopups(selections, {identityFunding});
  const identityFundingByKey = getIdentityFundingByKey(identityFunding);
  const groups = addTopupsToGroups(
    baseGroups,
    topups,
    activeCoinsForUser,
    activeAccount,
  );
  const requestedSystems = groups.map(group => group.systemId);

  await verifyGiftCardAddresses({
    card,
    password,
    activeCoinsForUser,
    systems: requestedSystems,
  });

  const transactions = [];

  for (const group of groups) {
    const cardAddress = card.addressesBySystem[group.systemId];
    const sourceCoin =
      group.funds[0]?.coinObj ||
      getActiveVrpcCoinForSystem(group.systemId, activeCoinsForUser, activeAccount);

    if (!sourceCoin) {
      throw new Error(`No active VRPC wallet found for ${group.systemId}.`);
    }

    const sourceAddress = getSourceAddress(sourceCoin, activeAccount);
    const destination = toTransferDestination(cardAddress);
    const fundOutputs = group.funds.map(fund => ({
      systemId: group.systemId,
      currency: fund.currencyId,
      satoshis: fund.satoshis,
      address: destination,
      isFeeTopup: fund.isFeeTopup,
    }));

    if (group.identities.length > 0) {
      const [firstIdentity, ...remainingIdentities] = group.identities;

      transactions.push(
        await buildIdentityFundingTransaction({
          group,
          identity: firstIdentity,
          sourceCoin,
          sourceAddress,
          cardAddress,
          outputs: fundOutputs,
          identityFundingByKey,
          requestIsTestnet: card.requestIsTestnet,
        }),
      );

      for (const identity of remainingIdentities) {
        transactions.push(
          await buildIdentityFundingTransaction({
            group,
            identity,
            sourceCoin,
            sourceAddress,
            cardAddress,
            identityFundingByKey,
            requestIsTestnet: card.requestIsTestnet,
          }),
        );
      }
    } else if (fundOutputs.length > 0) {
      transactions.push(
        await buildCurrencyFundingTransaction({
          group,
          sourceCoin,
          sourceAddress,
          cardAddress,
        }),
      );
    }
  }

  return {
    cardId: card.id,
    selections,
    topups,
    transactions,
    createdAt: Date.now(),
  };
};

const signCurrencyFundingTransaction = async transaction => {
  const spendingKey = await requestPrivKey(transaction.signingCoinId, VRPC);
  const signer = ECPair.fromWIF(spendingKey, networks.verus);
  const txb = getFundedTxBuilder(
    transaction.txHex,
    networks.verus,
    transaction.inputs.map(input => Buffer.from(input.script, 'hex')),
  );

  for (let i = 0; i < transaction.inputs.length; i++) {
    txb.sign(
      i,
      signer,
      null,
      Transaction.SIGHASH_ALL,
      transaction.inputs[i].satoshis,
    );
  }

  return txb.build().toHex();
};

export const broadcastGiftCardFunding = async ({preflightPlan}) => {
  const results = [];

  for (const transaction of preflightPlan.transactions) {
    try {
      if (transaction.type === 'identity') {
        const spendingKey = await requestPrivKey(transaction.signingCoinId, VRPC);
        const keys = transaction.inputs.map(() => [spendingKey]);
        const result = await pushUpdateIdentityTx(
          transaction.systemId,
          transaction.txHex,
          transaction.inputs,
          keys,
        );

        if (result.error) throw new Error(result.error.message);

        results.push({
          ...transaction,
          txid: result.result,
        });
      } else if (transaction.type === 'currency') {
        const signedTx = await signCurrencyFundingTransaction(transaction);
        const result = await sendRawTransaction(transaction.systemId, signedTx);

        if (result.error) throw new Error(result.error.message);

        results.push({
          ...transaction,
          txid: result.result,
        });
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));

      error.results = results;
      error.preflightPlan = preflightPlan;
      throw error;
    }
  }

  return {
    preflightPlan,
    results,
  };
};

export const getGiftCardServiceDefaults = () => ({
  version: GIFT_CARD_STORAGE_VERSION,
  introSeen: false,
  cards: {},
});

export const normalizeGiftCardServiceData = data => {
  const defaults = getGiftCardServiceDefaults();

  if (data == null || typeof data !== 'object') return defaults;

  return {
    ...defaults,
    ...data,
    cards:
      data.cards != null && typeof data.cards === 'object'
        ? data.cards
        : {},
  };
};

export const upsertGiftCard = (serviceData, card) => {
  const normalized = normalizeGiftCardServiceData(serviceData);

  return {
    ...normalized,
    cards: {
      ...normalized.cards,
      [card.id]: card,
    },
  };
};

export const removeGiftCard = (serviceData, cardId) => {
  const normalized = normalizeGiftCardServiceData(serviceData);
  const cards = {...normalized.cards};

  delete cards[cardId];

  return {
    ...normalized,
    cards,
  };
};
