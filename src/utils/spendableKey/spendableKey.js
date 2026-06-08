import BigNumber from 'bignumber.js';
import {
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
import {coinsToSats, satsToCoins} from '../math';
import {
  getAddressUtxos,
  getInfo,
  sendRawTransaction,
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
  pushUpdateIdentityTx,
} from '../api/channels/verusid/requests/updateIdentity';
import {
  seedDetailsOrdinalToMnemonic,
  seedDetailsRequiresPassword,
} from '../seedDetails/seedDetails';
import {VerusIdInterface} from 'verusid-ts-client';

const {
  getFundedTxBuilder,
  validateFundedCurrencyTransfer,
} = smarttxs;

export const SPENDABLE_KEY_CLAIM_FEE_SATS = BigNumber(10000);
export const SPENDABLE_KEY_CLAIM_FEE_COINS = 0.0001;
export const SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_SATS = BigNumber(20000);
export const SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS = 0.0002;
const VETH_SYSTEM_ID = 'i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X';

const utxoKey = utxo => `${utxo.txid}:${utxo.outputIndex}`;

const toAddressDestination = address => {
  const {hash, version} = fromBase58Check(address);

  return new TransferDestination({
    destinationBytes: hash,
    type: DEST_PKH,
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
        txid: identityResult.txout?.txid,
        vout: identityResult.txout?.voutnum
      };
    })
    .filter(identityResult => identityResult != null);
};

const getIdentityFromResult = result => {
  return result.identity || result;
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
  const identityAddress = identity.identityaddress;
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

  if (!identity || !identity.identityaddress) return identityResult;

  try {
    const identityRes = await getIdentity(systemId, identity.identityaddress);

    if (identityRes.error) throw new Error(identityRes.error.message);

    const enrichedIdentityResult = {
      ...identityResult,
      ...identityRes.result,
      identity: {
        ...identity,
        ...(identityRes.result.identity || {}),
      },
      txid: identityResult.txid || identityRes.result.txid,
      vout:
        identityResult.vout == null
          ? identityRes.result.vout
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

const isSpendableUtxo = (systemId, utxo) => {
  if (!utxo || !(utxo.isspendable === true || utxo.isspendable === 1)) {
    return false;
  }

  try {
    unpackUtxoOutput(systemId, utxo);
    return true;
  } catch (e) {
    console.warn(e.message);
    return false;
  }
};

const isPureNativeUtxo = systemId => utxo => {
  return (
    isSpendableUtxo(systemId, utxo) &&
    BigNumber(utxo.satoshis || 0).isGreaterThan(0) &&
    (
      utxo.currencyvalues == null ||
      Object.keys(utxo.currencyvalues).length === 0
    )
  );
};

const sumUtxoBalances = (systemId, utxos) => {
  const balances = new Map();

  for (const utxo of utxos) {
    if (!isSpendableUtxo(systemId, utxo)) continue;

    const nativeSats = BigNumber(utxo.satoshis || 0);
    if (nativeSats.isGreaterThan(0)) {
      balances.set(
        systemId,
        (balances.get(systemId) || BigNumber(0)).plus(nativeSats),
      );
    }

    const currencyValues = utxo.currencyvalues || {};
    for (const currencyId of Object.keys(currencyValues)) {
      const sats = coinsToSats(BigNumber(currencyValues[currencyId]));
      balances.set(
        currencyId,
        (balances.get(currencyId) || BigNumber(0)).plus(sats),
      );
    }
  }

  return balances;
};

const selectUtxosForAmount = (utxos, amountSats) => {
  const selected = [];
  let total = BigNumber(0);

  for (const utxo of utxos) {
    selected.push(utxo);
    total = total.plus(BigNumber(utxo.satoshis || 0));

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

const hasNonNativeBalance = (systemId, utxos) => {
  const balanceMap = sumUtxoBalances(systemId, utxos);

  return Array.from(balanceMap.entries()).some(
    ([currencyId, sats]) => currencyId !== systemId && sats.isGreaterThan(0),
  );
};

const getSweepClaimFee = hasNonNative => {
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
  feeUtxos,
  isLastIdentity,
}) => {
  if (!isLastIdentity || !hasNonNativeBalance(systemId, availableUtxos)) {
    return false;
  }

  if (feeUtxos == null) return true;

  const remainingUtxos = removeUtxos(availableUtxos, feeUtxos);
  const remainingBalanceMap = sumUtxoBalances(systemId, remainingUtxos);
  const remainingNative =
    remainingBalanceMap.get(systemId) || BigNumber(0);

  return remainingNative.isLessThan(SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_SATS);
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

const getActiveScanSystems = (requestIsTestnet, activeCoinsForUser) => {
  const rootCoin = requestIsTestnet ? coinsList.VRSCTEST : coinsList.VRSC;
  const systems = new Map([[rootCoin.system_id, rootCoin]]);

  for (const coinObj of activeCoinsForUser || []) {
    if (!!coinObj.testnet !== !!requestIsTestnet) continue;
    if (!isVrpcScanCandidate(coinObj)) continue;

    try {
      const systemCoin = CoinDirectory.findCoinObj(
        coinObj.system_id,
        null,
        true,
      );

      if (
        systemCoin &&
        systemCoin.vrpc_endpoints &&
        systemCoin.vrpc_endpoints.length > 0
      ) {
        systems.set(systemCoin.system_id, systemCoin);
      }
    } catch (e) {
      console.warn(e.message);
    }
  }

  return Array.from(systems.values());
};

const getClaimableIdentities = (identityResults, claimAddress, systemId) => {
  return identityResults
    .filter(result => {
      const identity = getIdentityFromResult(result);
      const primaryAddresses = identity.primaryaddresses || [];

      return primaryAddresses.includes(claimAddress);
    })
    .map(result => {
      const identity = getIdentityFromResult(result);
      const primaryAddresses = identity.primaryaddresses || [];
      const minimumSignatures = Number(identity.minimumsignatures || 0);
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
        identityAddress: identity.identityaddress,
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
}) => {
  const systems = [];
  const scanSystems = getActiveScanSystems(requestIsTestnet, activeCoinsForUser);

  for (const coinObj of scanSystems) {
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
    const balanceMap = sumUtxoBalances(coinObj.system_id, spendableUtxos);
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

    const identitiesFromUtxos = await getClaimableIdentitiesFromUtxos(
      coinObj.system_id,
      utxosRes.result || [],
      claimAddress,
    );
    let identitiesFromRpc = [];

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
      console.warn(e.message);
    }
    const identities = mergeIdentityClaims(identitiesFromUtxos, identitiesFromRpc);

    systems.push({
      systemId: coinObj.system_id,
      coinObj,
      claimAddress,
      claimWif: keyPair.privKey,
      utxos: spendableUtxos,
      currencies,
      identities,
    });
  }

  return {
    requestIsTestnet,
    systems,
    hasClaims: systems.some(
      system => system.currencies.length > 0 || system.identities.length > 0,
    ),
  };
};

const getSweepOutputPlan = ({
  system,
  destinationAddress,
  availableUtxos,
}) => {
  const balanceMap = sumUtxoBalances(system.systemId, availableUtxos);
  const nativeBalance = balanceMap.get(system.systemId) || BigNumber(0);
  const hasNonNative = Array.from(balanceMap.entries()).some(
    ([currencyId, sats]) => currencyId !== system.systemId && sats.isGreaterThan(0),
  );
  const {feeSats, feeCoins} = getSweepClaimFee(hasNonNative);

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

  const destination = toAddressDestination(destinationAddress);
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

const buildSweepTransaction = async ({
  system,
  destinationAddress,
  availableUtxos,
}) => {
  const {feeCoins, outputs} = getSweepOutputPlan({
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

const buildCombinedIdentityAndSweepTransaction = async ({
  claimPlan,
  system,
  identity,
  destinationAddress,
  availableUtxos,
}) => {
  const {feeCoins, outputs} = getSweepOutputPlan({
    system,
    destinationAddress,
    availableUtxos,
  });

  const updatableIdentity = await getUpdatableIdentity(
    system.systemId,
    identity.result,
  );

  updatableIdentity.identity.setPrimaryAddresses([destinationAddress]);
  const updateTx = await createUpdateIdentityWithCurrencyTransferTx({
    systemId: system.systemId,
    identity: updatableIdentity.identity,
    changeAaddr: destinationAddress,
    rawIdTx: updatableIdentity.tx,
    idHeight: identity.result.blockheight,
    currencyTransferOutputs: toCurrencyTransferOutputs(outputs),
    utxos: availableUtxos,
    maxFee: feeCoins,
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
    outputs: outputs.map(output => ({
      currencyId: output.currency,
      satoshis: output.satoshis,
      amount: satsToCoins(BigNumber(output.satoshis)).toString(),
    })),
    deltas: updateTx.deltas,
    includesSweep: true,
    requestIsTestnet: claimPlan.requestIsTestnet,
  };
};

export const preflightSpendableKeyClaim = async ({
  claimPlan,
  destinationBySystem,
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
      );
      const combineIdentityWithSweep = shouldCombineIdentityWithSweep({
        systemId: system.systemId,
        availableUtxos,
        feeUtxos,
        isLastIdentity: i === system.identities.length - 1,
      });

      if (combineIdentityWithSweep) {
        transactions.push(
          await buildCombinedIdentityAndSweepTransaction({
            claimPlan,
            system,
            identity,
            destinationAddress,
            availableUtxos,
          }),
        );
        availableUtxos = [];
        continue;
      }

      if (feeUtxos == null) {
        throw new Error(`Spendable key on ${system.coinObj.display_ticker || system.coinObj.id} does not contain enough native fee UTXOs to update ${identity.fullyQualifiedName || identity.identityAddress}.`);
      }

      const updatableIdentity = await getUpdatableIdentity(
        system.systemId,
        identity.result,
      );

      updatableIdentity.identity.setPrimaryAddresses([destinationAddress]);

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

export const broadcastSpendableKeyClaim = async ({preflightPlan}) => {
  const results = [];

  for (const transaction of preflightPlan.transactions) {
    try {
      if (transaction.type === 'identity') {
        const result = await pushUpdateIdentityTx(
          transaction.systemId,
          transaction.txHex,
          transaction.inputs,
          transaction.keys,
        );

        if (result.error) throw new Error(result.error.message);

        results.push({
          ...transaction,
          txid: result.result,
        });
      } else if (transaction.type === 'sweep') {
        const signedTx = signSweepTransaction(transaction);
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
