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
  getBlock,
  getBlockHash,
  getAddressUtxos,
  getInfo,
  getSpendableUtxos,
  getTransaction,
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

const getUtxoKey = utxo => `${utxo.txid}:${utxo.outputIndex}`;

const getTopLevelIdentityFields = result => {
  return IDENTITY_DEFINITION_FIELDS.reduce((fields, field) => {
    if (result?.[field] !== undefined) fields[field] = result[field];
    return fields;
  }, {});
};

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

const isSpendableUtxo = utxo => {
  return utxo?.isspendable === true || utxo?.isspendable === 1;
};

const isNativeFeeUtxo = systemId => utxo => {
  return (
    isSpendableUtxo(utxo) &&
    getUtxoNativeSatoshis(systemId, utxo).isGreaterThan(0)
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
    isNativeFeeUtxo(systemId),
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

const hasNegativeCurrencyValue = currencyValues => {
  return Object.values(currencyValues || {}).some(value =>
    BigNumber(value || 0).isLessThan(0),
  );
};

const isClaimDelta = delta => {
  if (!delta) return false;

  if (delta.satoshis != null || delta.currencyvalues != null) {
    return (
      BigNumber(delta.satoshis || 0).isLessThan(0) ||
      hasNegativeCurrencyValue(delta.currencyvalues)
    );
  }

  return delta.sent?.outputs != null;
};

const getDeltaTime = delta => {
  const blocktime = Number(delta?.blocktime);

  if (!Number.isFinite(blocktime) || blocktime <= 0) return null;

  return blocktime < 10000000000 ? blocktime * 1000 : blocktime;
};

const compareClaimDeltas = (a, b) => {
  const aTime = getDeltaTime(a) || 0;
  const bTime = getDeltaTime(b) || 0;

  if (aTime !== bTime) return aTime - bTime;

  const aHeight = Number(a?.height || 0);
  const bHeight = Number(b?.height || 0);

  if (aHeight !== bHeight) return aHeight - bHeight;

  const aBlockIndex = Number(a?.blockindex || 0);
  const bBlockIndex = Number(b?.blockindex || 0);

  if (aBlockIndex !== bBlockIndex) return aBlockIndex - bBlockIndex;

  return Number(a?.index || 0) - Number(b?.index || 0);
};

const normalizeOutputAddresses = addresses => {
  if (Array.isArray(addresses)) return addresses;
  if (addresses == null) return [];

  return [addresses];
};

const getClaimedByAddresses = (delta, claimAddress) => {
  const seen = new Set();
  const claimedByAddresses = [];

  for (const output of delta?.sent?.outputs || []) {
    for (const address of normalizeOutputAddresses(output.addresses)) {
      if (!address || address === claimAddress || seen.has(address)) continue;

      seen.add(address);
      claimedByAddresses.push(address);
    }
  }

  return claimedByAddresses;
};

const getIdentityFromResult = result => {
  if (!result || !result.identity) return result;

  return {
    ...result.identity,
    ...getTopLevelIdentityFields(result),
  };
};

const getIdentityPrimaryAddresses = identity => {
  const primaryAddresses =
    identity?.primaryaddresses || identity?.primaryAddresses || [];

  return Array.isArray(primaryAddresses) ? primaryAddresses : [];
};

const normalizeChainTime = timestamp => {
  const normalized = Number(timestamp);

  if (!Number.isFinite(normalized) || normalized <= 0) return null;

  return normalized < 10000000000 ? normalized * 1000 : normalized;
};

const getIdentityResultHeight = identityResult => {
  return (
    identityResult?.blockheight ||
    identityResult?.height ||
    identityResult?.txout?.height ||
    null
  );
};

const getIdentityResultTxid = identityResult => {
  return identityResult?.txid || identityResult?.txout?.txid || null;
};

const getIdentityResultTime = identityResult => {
  return normalizeChainTime(
    identityResult?.blocktime ||
      identityResult?.time ||
      identityResult?.txout?.blocktime ||
      identityResult?.txout?.time,
  );
};

const getBlockClaimTime = async (systemId, height) => {
  if (!height) return null;

  try {
    const hashRes = await getBlockHash(systemId, Number(height));

    if (hashRes.error) throw new Error(hashRes.error.message);

    const blockRes = await getBlock(systemId, hashRes.result, true);

    if (blockRes.error) throw new Error(blockRes.error.message);

    return normalizeChainTime(
      blockRes.result?.time || blockRes.result?.blocktime,
    );
  } catch (e) {
    console.warn(e.message);
    return null;
  }
};

const getIdentityRedemptionClaimInfo = redemption => {
  return {
    systemId: redemption.systemId,
    coinObj: redemption.coinObj,
    claimAddress: redemption.claimAddress || null,
    txid: redemption.txid || null,
    height: redemption.height || null,
    claimedAt: redemption.claimedAt || null,
    claimedByAddresses: redemption.claimedByAddresses || [],
    identities: redemption.identities || [],
  };
};

const statusSystemBelongsToCard = (card, system) => {
  const expectedAddress = card?.addressesBySystem?.[system?.systemId];

  return (
    expectedAddress != null &&
    system?.claimAddress != null &&
    system.claimAddress === expectedAddress
  );
};

const identityRedemptionBelongsToCard = (card, redemption) => {
  const expectedAddress = card?.addressesBySystem?.[redemption?.systemId];

  if (!expectedAddress) return false;
  if (redemption?.claimAddress) return redemption.claimAddress === expectedAddress;

  return (card?.status?.systems || []).some(system =>
    statusSystemBelongsToCard(card, system) &&
    system.systemId === redemption.systemId,
  );
};

export const getGiftCardClaimInfo = card => {
  const isRedeemed =
    card?.status?.state === GIFT_CARD_STATUS_REDEEMED ||
    card?.status?.redeemed;

  if (!isRedeemed) {
    return null;
  }

  const deltaSystems = (card.status?.systems || [])
    .filter(system => statusSystemBelongsToCard(card, system))
    .map(system => {
      const deltas = (system.deltas || [])
        .filter(isClaimDelta)
        .sort(compareClaimDeltas);
      const claimDelta = deltas[deltas.length - 1];

      if (!claimDelta) return null;

      const claimedAt = getDeltaTime(claimDelta);

      return {
        systemId: system.systemId,
        coinObj: system.coinObj,
        txid: claimDelta.txid || null,
        height: claimDelta.height || null,
        claimedAt,
        claimedByAddresses: getClaimedByAddresses(
          claimDelta,
          system.claimAddress,
        ),
      };
    })
    .filter(system => system != null);
  const identityRedemptionSystems = (card.status?.identityRedemptions || [])
    .filter(redemption => identityRedemptionBelongsToCard(card, redemption))
    .map(getIdentityRedemptionClaimInfo)
    .filter(system => system.claimedByAddresses.length > 0);
  const systems = [...deltaSystems, ...identityRedemptionSystems];

  if (systems.length === 0) return null;

  const claimedByAddresses = [];
  const seenAddresses = new Set();

  for (const system of systems) {
    for (const address of system.claimedByAddresses) {
      if (seenAddresses.has(address)) continue;

      seenAddresses.add(address);
      claimedByAddresses.push(address);
    }
  }

  const latestSystem = systems.reduce((latest, system) => {
    if (latest == null) return system;

    const systemSort = [
      Number(system.claimedAt || 0),
      Number(system.height || 0),
    ];
    const latestSort = [
      Number(latest.claimedAt || 0),
      Number(latest.height || 0),
    ];

    return systemSort[0] > latestSort[0] ||
      (systemSort[0] === latestSort[0] && systemSort[1] > latestSort[1])
      ? system
      : latest;
  }, null);

  return {
    systems,
    claimedByAddresses,
    claimedAt: latestSystem?.claimedAt || null,
    height: latestSystem?.height || null,
    txid: latestSystem?.txid || null,
  };
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
    sharedAt: null,
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
  if (
    claims.redeemed ||
    ((claims.identityRedemptions || []).length > 0 && !claims.hasClaims)
  ) {
    return GIFT_CARD_STATUS_REDEEMED;
  }

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

export const hasGiftCardBeenShared = card => {
  const sharedAt = Number(card?.sharedAt);

  return Number.isFinite(sharedAt) && sharedAt > 0;
};

export const markGiftCardShared = (card, sharedAt = Date.now()) => {
  if (hasGiftCardBeenShared(card)) return card;

  const normalizedSharedAt = Number(sharedAt);

  if (!Number.isFinite(normalizedSharedAt) || normalizedSharedAt <= 0) {
    throw new Error('Gift card share time must be a positive timestamp.');
  }

  return {
    ...card,
    sharedAt: normalizedSharedAt,
    updatedAt: Date.now(),
  };
};

export const getGiftCardIdentityLookupErrors = card => {
  return (card?.status?.systems || []).filter(system => {
    return (
      statusSystemBelongsToCard(card, system) &&
      typeof system.identityLookupError === 'string' &&
      system.identityLookupError.length > 0
    );
  });
};

const getFundingIdentityAddress = identity => {
  return identity?.identityAddress || identity?.identityaddress;
};

const getFundingIdentitySystemId = identity => {
  return identity?.systemId || identity?.systemid;
};

const normalizeFundingIdentity = identity => {
  const identityAddress = getFundingIdentityAddress(identity);
  const systemId = getFundingIdentitySystemId(identity);

  if (!identityAddress || !systemId) return null;

  return {
    chain: identity.chain,
    systemId,
    identityAddress,
    fullyQualifiedName:
      identity.fullyQualifiedName ||
      identity.fullyqualifiedname ||
      identity.friendlyname ||
      identity.name,
  };
};

const addExpectedFundingIdentity = (identities, seen, identity) => {
  const normalized = normalizeFundingIdentity(identity);

  if (!normalized) return;

  const key = `${normalized.systemId}:${normalized.identityAddress}`;

  if (seen.has(key)) return;

  seen.add(key);
  identities.push(normalized);
};

const getExpectedFundingIdentities = card => {
  const identities = [];
  const seen = new Set();

  for (const entry of card?.fundingHistory || []) {
    for (const identity of entry.identities || []) {
      addExpectedFundingIdentity(identities, seen, identity);
    }
  }

  for (const system of card?.status?.systems || []) {
    if (!statusSystemBelongsToCard(card, system)) continue;

    for (const identity of system.identities || []) {
      addExpectedFundingIdentity(identities, seen, {
        ...identity,
        systemId: system.systemId,
      });
    }
  }

  for (const redemption of card?.status?.identityRedemptions || []) {
    if (!identityRedemptionBelongsToCard(card, redemption)) continue;

    for (const identity of redemption.identities || []) {
      addExpectedFundingIdentity(identities, seen, {
        ...identity,
        systemId: redemption.systemId,
      });
    }
  }

  return identities;
};

const getStatusExpectedIdentity = (status, expectedIdentity, card) => {
  for (const system of status?.systems || []) {
    if (system.systemId !== expectedIdentity.systemId) continue;
    if (card != null && !statusSystemBelongsToCard(card, system)) continue;

    const identity = (system.identities || []).find(
      candidate =>
        getFundingIdentityAddress(candidate) === expectedIdentity.identityAddress,
    );

    if (identity != null) return identity;
  }

  return null;
};

const statusHasExpectedIdentity = (status, expectedIdentity, card) => {
  return getStatusExpectedIdentity(status, expectedIdentity, card) != null;
};

const statusSystemHasClaims = system => {
  return (
    (system.currencies || []).length > 0 ||
    (system.identities || []).length > 0
  );
};

const statusSystemsHaveClaims = systems => {
  return (systems || []).some(statusSystemHasClaims);
};

const identityRedemptionsHaveExpectedIdentity = (
  identityRedemptions,
  expectedIdentity,
) => {
  return (identityRedemptions || []).some(redemption => {
    return (
      redemption.systemId === expectedIdentity.systemId &&
      (redemption.identities || []).some(
        identity =>
          getFundingIdentityAddress(identity) ===
          expectedIdentity.identityAddress,
      )
    );
  });
};

const identityStateIsNewerThanObservation = (identityResult, observation) => {
  const observedResult = observation?.result || observation;
  const identityHeight = Number(getIdentityResultHeight(identityResult));
  const observedHeight = Number(getIdentityResultHeight(observedResult));

  if (
    Number.isFinite(identityHeight) &&
    identityHeight > 0 &&
    Number.isFinite(observedHeight) &&
    observedHeight > 0
  ) {
    return identityHeight >= observedHeight;
  }

  return false;
};

const preserveObservedIdentityClaims = ({
  card,
  claims,
  expectedIdentities,
  identityRedemptions,
}) => {
  let systems = claims.systems || [];
  let changed = false;

  for (const expectedIdentity of expectedIdentities || []) {
    if (statusHasExpectedIdentity({systems}, expectedIdentity)) continue;
    if (
      identityRedemptionsHaveExpectedIdentity(
        identityRedemptions,
        expectedIdentity,
      )
    ) {
      continue;
    }

    const observedIdentity = getStatusExpectedIdentity(
      card?.status,
      expectedIdentity,
      card,
    );

    if (observedIdentity == null) continue;

    const previousSystem = (card?.status?.systems || []).find(system => {
      return (
        system.systemId === expectedIdentity.systemId &&
        statusSystemBelongsToCard(card, system)
      );
    });
    const systemIndex = systems.findIndex(
      system => system.systemId === expectedIdentity.systemId,
    );

    if (systemIndex >= 0) {
      systems = systems.map((system, index) => {
        if (index !== systemIndex) return system;

        return {
          ...system,
          identities: [...(system.identities || []), observedIdentity],
          redeemed: false,
        };
      });
    } else if (previousSystem != null) {
      systems = [
        ...systems,
        {
          ...previousSystem,
          currencies: previousSystem.currencies || [],
          identities: [observedIdentity],
          deltas: [],
          deltaCount: 0,
          redeemed: false,
        },
      ];
    }

    changed = true;
  }

  if (!changed) return claims;

  return {
    ...claims,
    systems,
    hasClaims: statusSystemsHaveClaims(systems),
    redeemed: systems.length > 0 && systems.every(system => system.redeemed),
  };
};

const discoverGiftCardIdentityRedemptions = async ({
  card,
  claims,
  expectedIdentities,
}) => {
  const redemptions = [];

  for (const expectedIdentity of expectedIdentities || []) {
    if (statusHasExpectedIdentity(claims, expectedIdentity)) continue;

    const observedOnCard = getStatusExpectedIdentity(
      card?.status,
      expectedIdentity,
      card,
    );

    if (observedOnCard == null) continue;

    try {
      const identityRes = await getIdentity(
        expectedIdentity.systemId,
        expectedIdentity.identityAddress,
      );

      if (identityRes.error) throw new Error(identityRes.error.message);

      const identityResult = identityRes.result;
      const identity = getIdentityFromResult(identityResult);
      const claimAddress = card.addressesBySystem?.[expectedIdentity.systemId];
      const primaryAddresses = getIdentityPrimaryAddresses(identity);
      const claimedByAddresses = primaryAddresses.filter(
        address => address && address !== claimAddress,
      );

      if (claimedByAddresses.length === 0) continue;
      if (!identityStateIsNewerThanObservation(identityResult, observedOnCard)) {
        continue;
      }

      const height = getIdentityResultHeight(identityResult);

      redemptions.push({
        systemId: expectedIdentity.systemId,
        coinObj: (claims.systems || []).find(
          system => system.systemId === expectedIdentity.systemId,
        )?.coinObj,
        claimAddress,
        txid: getIdentityResultTxid(identityResult),
        height,
        claimedAt:
          getIdentityResultTime(identityResult) ||
          (await getBlockClaimTime(expectedIdentity.systemId, height)),
        claimedByAddresses,
        identities: [
          {
            identityAddress: expectedIdentity.identityAddress,
            fullyQualifiedName: expectedIdentity.fullyQualifiedName,
          },
        ],
      });
    } catch (e) {
      console.warn(e.message);
    }
  }

  return redemptions;
};

const getPendingFundingTransactions = entry => {
  if (Array.isArray(entry?.transactions)) {
    return entry.transactions.filter(
      transaction =>
        typeof transaction?.txid === 'string' &&
        transaction.txid.length > 0 &&
        typeof transaction?.systemId === 'string' &&
        transaction.systemId.length > 0,
    );
  }

  return (entry?.txids || [])
    .map((txid, index) => ({
      txid,
      systemId: entry?.systems?.[index],
    }))
    .filter(
      transaction =>
        typeof transaction.txid === 'string' &&
        transaction.txid.length > 0 &&
        typeof transaction.systemId === 'string' &&
        transaction.systemId.length > 0,
    );
};

const getStatusConfirmedTransactionIds = status => {
  const txids = new Set();
  const addTxid = txid => {
    if (typeof txid === 'string' && txid.length > 0) {
      txids.add(txid);
    }
  };

  for (const system of status?.systems || []) {
    for (const utxo of system.utxos || []) addTxid(utxo?.txid);
    for (const delta of system.deltas || []) addTxid(delta?.txid);

    for (const identity of system.identities || []) {
      addTxid(identity?.txid);
      addTxid(identity?.result?.txid);
      addTxid(identity?.result?.txout?.txid);
    }
  }

  for (const redemption of status?.identityRedemptions || []) {
    addTxid(redemption?.txid);

    for (const identity of redemption.identities || []) {
      addTxid(identity?.txid);
      addTxid(identity?.result?.txid);
      addTxid(identity?.result?.txout?.txid);
    }
  }

  return txids;
};

const fundingTransactionIsConfirmed = async (
  transaction,
  confirmedTransactionIds,
) => {
  if (confirmedTransactionIds.has(transaction.txid)) return true;

  try {
    const result = await getTransaction(
      transaction.systemId,
      transaction.txid,
      1,
    );

    return (
      result?.error == null &&
      Number(result?.result?.confirmations || 0) > 0
    );
  } catch (_) {
    return false;
  }
};

const isPendingFundingResolved = async (entry, status) => {
  const expectedIdentities = (entry.identities || [])
    .map(normalizeFundingIdentity)
    .filter(identity => identity != null);
  const transactions = getPendingFundingTransactions(entry);
  const confirmedTransactionIds = getStatusConfirmedTransactionIds(status);
  const identitiesResolved =
    expectedIdentities.length === 0 ||
    expectedIdentities.every(
      identity =>
        statusHasExpectedIdentity(status, identity) ||
        identityRedemptionsHaveExpectedIdentity(
          status?.identityRedemptions,
          identity,
        ),
    );

  if (!identitiesResolved) return false;

  if (transactions.length === 0) {
    return expectedIdentities.length > 0;
  }

  const confirmations = await Promise.all(
    transactions.map(transaction =>
      fundingTransactionIsConfirmed(
        transaction,
        confirmedTransactionIds,
      ),
    ),
  );

  return confirmations.every(Boolean);
};

const resolveFundingHistory = async (fundingHistory, status) => {
  return Promise.all((fundingHistory || []).map(async entry => {
    const normalizedStatus =
      entry.status || (entry.pending ? GIFT_CARD_FUNDING_STATUS_PENDING : null);

    if (
      normalizedStatus === GIFT_CARD_FUNDING_STATUS_PENDING &&
      await isPendingFundingResolved(entry, status)
    ) {
      return {
        ...entry,
        status: GIFT_CARD_FUNDING_STATUS_CONFIRMED,
        pending: false,
        confirmedAt: Date.now(),
      };
    }

    return entry;
  }));
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
  const transactions = (fundingResult?.results || [])
    .filter(
      result =>
        typeof result?.txid === 'string' &&
        result.txid.length > 0 &&
        typeof result?.systemId === 'string' &&
        result.systemId.length > 0,
    )
    .map(result => ({
      txid: result.txid,
      systemId: result.systemId,
      type: result.type || null,
    }));
  const txids = transactions
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
        transactions,
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
  const expectedIdentities = getExpectedFundingIdentities(card);
  const claims = await discoverSpendableKeyAddressClaims({
    addressesBySystem: card.addressesBySystem,
    requestIsTestnet: card.requestIsTestnet,
    activeCoinsForUser,
    expectedIdentities,
  });
  const identityRedemptions = await discoverGiftCardIdentityRedemptions({
    card,
    claims,
    expectedIdentities,
  });
  const claimsWithPreservedIdentities = preserveObservedIdentityClaims({
    card,
    claims,
    expectedIdentities,
    identityRedemptions,
  });
  const claimsWithRedemptions = {
    ...claimsWithPreservedIdentities,
    identityRedemptions,
  };
  const state = getCardStateFromClaims(claimsWithRedemptions);
  const status = {
    ...claimsWithRedemptions,
    redeemed: state === GIFT_CARD_STATUS_REDEEMED,
    state,
    lastCheckedAt: Date.now(),
  };

  return {
    ...card,
    status,
    fundingHistory: await resolveFundingHistory(card.fundingHistory, status),
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
      fundedIdentity.utxos.filter(isNativeFeeUtxo(identity.systemId)),
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
  if (hasGiftCardBeenShared(card)) {
    throw new Error(
      'Shared gift cards cannot be funded. Create a new gift card instead.',
    );
  }

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

const normalizeGiftCardCards = cards => {
  if (cards == null || typeof cards !== 'object') return {};

  return Object.keys(cards).reduce((normalizedCards, key) => {
    const card = cards[key];

    if (card == null || typeof card !== 'object') return normalizedCards;

    const cardId =
      typeof card.id === 'string' && card.id.length > 0 ? card.id : key;

    normalizedCards[cardId] = {
      ...card,
      id: cardId,
      sharedAt: hasGiftCardBeenShared(card) ? Number(card.sharedAt) : null,
    };

    return normalizedCards;
  }, {});
};

export const normalizeGiftCardServiceData = data => {
  const defaults = getGiftCardServiceDefaults();

  if (data == null || typeof data !== 'object') return defaults;

  return {
    ...defaults,
    ...data,
    cards: normalizeGiftCardCards(data.cards),
  };
};

export const upsertGiftCard = (serviceData, card) => {
  const normalized = normalizeGiftCardServiceData(serviceData);
  const cards = Object.keys(normalized.cards).reduce((nextCards, key) => {
    const existingCard = normalized.cards[key];

    if (key === card.id || existingCard?.id === card.id) return nextCards;

    nextCards[key] = existingCard;
    return nextCards;
  }, {});

  return {
    ...normalized,
    cards: {
      ...cards,
      [card.id]: card,
    },
  };
};

const getGiftCardPersistenceSnapshot = card => {
  if (card == null) return null;

  return {
    id: card.id,
    version: card.version,
    label: card.label,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    sharedAt: hasGiftCardBeenShared(card) ? Number(card.sharedAt) : null,
    requestIsTestnet: card.requestIsTestnet,
    encrypted: card.encrypted,
    kdfIters: card.kdfIters,
    requestUri: card.requestUri,
    requestBufferString: card.requestBufferString,
    addressesBySystem: card.addressesBySystem || {},
    status: card.status || null,
    fundingHistory: card.fundingHistory || [],
  };
};

export const upsertGiftCardIfUnchanged = (
  serviceData,
  expectedCard,
  nextCard,
) => {
  const normalized = normalizeGiftCardServiceData(serviceData);
  const currentCard = normalized.cards?.[expectedCard?.id];

  if (currentCard == null) return normalized;

  if (
    JSON.stringify(getGiftCardPersistenceSnapshot(currentCard)) !==
    JSON.stringify(getGiftCardPersistenceSnapshot(expectedCard))
  ) {
    return normalized;
  }

  return upsertGiftCard(normalized, nextCard);
};

export const removeGiftCard = (serviceData, cardId) => {
  const normalized = normalizeGiftCardServiceData(serviceData);
  const cards = Object.keys(normalized.cards).reduce((nextCards, key) => {
    const card = normalized.cards[key];

    if (key === cardId || card?.id === cardId) return nextCards;

    nextCards[key] = card;
    return nextCards;
  }, {});

  return {
    ...normalized,
    cards,
  };
};
