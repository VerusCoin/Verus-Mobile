import {
  addCoin,
  addKeypairs,
  setUserCoins,
} from '../../actions/actionCreators';
import {refreshLifecyclesAfterAssetChange} from '../../actions/actions/intervals/dispatchers/lifecycleManager';
import {scopeSessionAction, sessionScopeIsCurrent} from '../../actions/actions/updates/sessionRequests';
import store from '../../store';
import {sameAsset, ethereumNetwork} from '../assets/assetIdentity';
import {
  getCurrency,
  getCurrencyNameMap,
} from '../api/channels/verusid/callCreators';
import {ERC20} from '../constants/intervalConstants';
import {getWeb3ProviderForNetwork} from '../web3/provider';
import {CoinDirectory} from './CoinDirectory';
import {coinsList} from './CoinsList';

export const ETHEREUM_CONTRACT_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export const ASSET_IDENTIFIER_ERROR = {
  DUPLICATE: 'duplicate',
  ETHEREUM_FORMAT: 'ethereum_format',
  METADATA: 'metadata',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  UNKNOWN_VERUS: 'unknown_verus',
  TYPE: 'asset_type',
};

export class AssetIdentifierError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'AssetIdentifierError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * @typedef {Object} PbaasIdentifierResult
 * @property {'pbaas'} kind
 * @property {string} identifier
 * @property {Object} currencyDefinition
 * @property {Object} launchSystem
 * @property {Object<string, string>} friendlyNames
 * @property {Object|null} catalogueMatch
 * @property {Object|null} coinData
 *
 * @typedef {Object} Erc20IdentifierResult
 * @property {'erc20'} kind
 * @property {string} identifier
 * @property {string} canonicalAddress
 * @property {string} name
 * @property {string} symbol
 * @property {number} decimals
 * @property {string} network
 * @property {Object|null} catalogueMatch
 * @property {Object|null} coinData
 *
 * @typedef {PbaasIdentifierResult|Erc20IdentifierResult} AssetIdentifierResult
 */

const isTestnetNetwork = network => network !== 'homestead';

const findBuiltInPbaasCoin = (currencyId, isTestnet) => {
  const entry = Object.values(coinsList).find(
    coinObj =>
      coinObj.currency_id === currencyId &&
      coinObj.proto === 'vrsc' &&
      Boolean(coinObj.testnet) === isTestnet,
  );

  return entry ? CoinDirectory.findCoinObj(entry.id) : null;
};

const findBuiltInErc20Coin = (address, network) => {
  const normalizedAddress = address.toLowerCase();
  const entry = Object.values(coinsList).find(
    coinObj =>
      coinObj.proto === ERC20 &&
      ethereumNetwork(coinObj) === network &&
      coinObj.currency_id?.toLowerCase() === normalizedAddress,
  );

  return entry ? CoinDirectory.findCoinObj(entry.id) : null;
};

const findRegisteredCoin = predicate => {
  for (const coinId of CoinDirectory.fullCoinList) {
    const coinObj = CoinDirectory.findCoinObj(coinId);
    if (predicate(coinObj)) return coinObj;
  }

  return null;
};

const findRegisteredPbaasCoin = (currencyId, isTestnet) =>
  findRegisteredCoin(
    coinObj =>
      coinObj.proto === 'vrsc' && coinObj.currency_id === currencyId &&
      Boolean(coinObj.testnet) === isTestnet,
  );

const findRegisteredErc20Coin = (address, network) => {
  const normalizedAddress = address.toLowerCase();

  return findRegisteredCoin(
    coinObj =>
      coinObj.proto === ERC20 &&
      ethereumNetwork(coinObj) === network &&
      coinObj.currency_id?.toLowerCase() === normalizedAddress,
  );
};

const assetIsActive = (result, activeCoins) =>
  activeCoins.some(coinObj => {
    if (result.kind === 'catalogue') return sameAsset(coinObj, result.coinData);
    if (result.kind === 'pbaas') {
      return (
        coinObj.proto === 'vrsc' && Boolean(coinObj.testnet) === result.testnet &&
        coinObj.currency_id === result.currencyDefinition.currencyid
      );
    }

    const normalizedAddress = result.canonicalAddress.toLowerCase();

    return (
      coinObj.proto === ERC20 && ethereumNetwork(coinObj) === result.network &&
      coinObj.currency_id?.toLowerCase() === normalizedAddress
    );
  });

const duplicateError = result =>
  new AssetIdentifierError(
    ASSET_IDENTIFIER_ERROR.DUPLICATE,
    `${
      result.kind === 'pbaas'
        ? result.currencyDefinition.fullyqualifiedname
        : result.symbol || result.coinData?.display_name
    } is already in your wallet.`,
  );

export const classifyAssetIdentifier = value => {
  const identifier = value.trim();

  if (!identifier) return {kind: null, identifier};

  if (ETHEREUM_CONTRACT_PATTERN.test(identifier)) {
    return {kind: 'erc20', identifier};
  }

  if (identifier.startsWith('0x')) {
    return {
      kind: null,
      identifier,
      error: new AssetIdentifierError(
        ASSET_IDENTIFIER_ERROR.ETHEREUM_FORMAT,
        'Enter a 0x-prefixed Ethereum contract with exactly 40 hexadecimal characters.',
      ),
    };
  }

  return {kind: 'pbaas', identifier};
};

const resolvePbaasIdentifier = async ({
  activeCoins,
  identifier,
  pbaasCoin,
}) => {
  if (!pbaasCoin?.system_id) {
    throw new AssetIdentifierError(
      ASSET_IDENTIFIER_ERROR.PROVIDER_UNAVAILABLE,
      'The Verus lookup provider is unavailable.',
    );
  }

  let currencyResponse;

  try {
    currencyResponse = await getCurrency(pbaasCoin.system_id, identifier);
  } catch (error) {
    const providerUnavailable =
      /endpoint|provider|connect/i.test(error?.message || '');

    throw new AssetIdentifierError(
      providerUnavailable
        ? ASSET_IDENTIFIER_ERROR.PROVIDER_UNAVAILABLE
        : ASSET_IDENTIFIER_ERROR.UNKNOWN_VERUS,
      providerUnavailable
        ? 'The Verus lookup provider is unavailable.'
        : 'No Verus currency was found for that name or i-address.',
      error,
    );
  }

  if (currencyResponse?.error || !currencyResponse?.result?.currencyid) {
    const invalidMetadata = currencyResponse?.error?.code === -1;

    throw new AssetIdentifierError(
      invalidMetadata
        ? ASSET_IDENTIFIER_ERROR.METADATA
        : ASSET_IDENTIFIER_ERROR.UNKNOWN_VERUS,
      invalidMetadata
        ? 'The Verus provider returned invalid currency metadata.'
        : 'No Verus currency was found for that name or i-address.',
      currencyResponse?.error,
    );
  }

  const currencyDefinition = currencyResponse.result;
  if (typeof currencyDefinition.currencyid !== 'string' ||
      typeof currencyDefinition.systemid !== 'string' || !currencyDefinition.systemid.trim() ||
      typeof currencyDefinition.fullyqualifiedname !== 'string' ||
      !currencyDefinition.fullyqualifiedname.trim() || currencyDefinition.fullyqualifiedname.length > 256) {
    throw new AssetIdentifierError(ASSET_IDENTIFIER_ERROR.METADATA,
      'The network returned incomplete currency details. Try again.');
  }
  const isTestnet = Boolean(pbaasCoin.testnet);
  const catalogueMatch = findBuiltInPbaasCoin(
    currencyDefinition.currencyid,
    isTestnet,
  );
  const coinData =
    catalogueMatch ||
    findRegisteredPbaasCoin(currencyDefinition.currencyid, isTestnet);
  const partialResult = {
    kind: 'pbaas',
    identifier,
    currencyDefinition,
    catalogueMatch,
    coinData,
    testnet: isTestnet,
    lookupSystemId: pbaasCoin.system_id,
  };

  if (assetIsActive(partialResult, activeCoins)) {
    throw duplicateError(partialResult);
  }

  try {
    const launchResponse = await getCurrency(
      pbaasCoin.system_id,
      currencyDefinition.launchsystemid || currencyDefinition.systemid,
    );

    if (launchResponse?.error || !launchResponse?.result) {
      throw launchResponse?.error || new Error('Launch system unavailable');
    }

    const friendlyNames = await getCurrencyNameMap(
      pbaasCoin,
      currencyDefinition,
    );

    return {
      ...partialResult,
      launchSystem: launchResponse.result,
      friendlyNames,
    };
  } catch (error) {
    throw new AssetIdentifierError(
      ASSET_IDENTIFIER_ERROR.METADATA,
      'The currency was found, but its launch-system metadata could not be retrieved.',
      error,
    );
  }
};

const resolveErc20Identifier = async ({
  activeCoins,
  ethereumCoin,
  identifier,
}) => {
  const canonicalAddress = identifier.toLowerCase();
  const network = ethereumCoin?.network;

  if (!network) {
    throw new AssetIdentifierError(
      ASSET_IDENTIFIER_ERROR.PROVIDER_UNAVAILABLE,
      'The Ethereum network for this wallet is unavailable.',
    );
  }

  let provider;

  try {
    provider = getWeb3ProviderForNetwork(network);
  } catch (error) {
    throw new AssetIdentifierError(
      ASSET_IDENTIFIER_ERROR.PROVIDER_UNAVAILABLE,
      `No Ethereum provider is available for ${network}.`,
      error,
    );
  }

  try {
    const {name, symbol, decimals} = await provider.getContractInfo(
      canonicalAddress,
    );
    if (typeof name !== 'string' || !name.trim() || name.length > 256 ||
        typeof symbol !== 'string' || !symbol.trim() || symbol.length > 128 ||
        (typeof decimals !== 'number' && typeof decimals !== 'string') || String(decimals).trim() === '' ||
        !Number.isInteger(Number(decimals)) || Number(decimals) < 0 || Number(decimals) > 255) {
      throw new AssetIdentifierError(ASSET_IDENTIFIER_ERROR.METADATA,
        'The contract returned incomplete token details. Check the address and try again.');
    }
    const fallbackMetadata =
      name?.toLowerCase() === canonicalAddress &&
      symbol?.toLowerCase() === canonicalAddress.substring(0, 6);

    if (fallbackMetadata) {
      throw new AssetIdentifierError(
        ASSET_IDENTIFIER_ERROR.METADATA,
        'Token metadata could not be retrieved. Check the contract and Ethereum provider connection.',
      );
    }

    const catalogueMatch = findBuiltInErc20Coin(canonicalAddress, network);
    const coinData =
      catalogueMatch ||
      findRegisteredErc20Coin(canonicalAddress, network);
    const result = {
      kind: 'erc20',
      identifier,
      canonicalAddress,
      name,
      symbol,
      decimals: Number(decimals),
      network,
      catalogueMatch,
      coinData,
      testnet: isTestnetNetwork(network),
    };

    if (assetIsActive(result, activeCoins)) throw duplicateError(result);

    return result;
  } catch (error) {
    if (error instanceof AssetIdentifierError) throw error;

    throw new AssetIdentifierError(
      ASSET_IDENTIFIER_ERROR.METADATA,
      'Token metadata could not be retrieved. Check the contract and Ethereum provider connection.',
      error,
    );
  }
};

export const resolveAssetIdentifier = async ({
  activeCoins,
  ethereumCoin,
  identifier,
  pbaasCoin,
  kind,
}) => {
  const classification = classifyAssetIdentifier(identifier);

  if (classification.error) throw classification.error;
  if (kind && classification.kind !== kind) {
    throw new AssetIdentifierError(ASSET_IDENTIFIER_ERROR.TYPE,
      kind === 'erc20'
        ? 'Enter a 0x-prefixed contract address with 40 hexadecimal characters.'
        : 'Enter a Verus currency name or i-address.');
  }

  if (classification.kind === 'erc20') {
    return resolveErc20Identifier({
      activeCoins,
      ethereumCoin,
      identifier: classification.identifier,
    });
  }

  if (classification.kind === 'pbaas') {
    return resolvePbaasIdentifier({
      activeCoins,
      identifier: classification.identifier,
      pbaasCoin,
    });
  }

  throw new AssetIdentifierError(
    ASSET_IDENTIFIER_ERROR.METADATA,
    'Enter an asset identifier.',
  );
};

export const addResolvedAsset = async ({
  activeAccount,
  activeCoinList,
  activeCoins,
  dispatch,
  requestContext,
  result,
}) => {
  const sessionScope = requestContext?.sessionScope || requestContext;
  const assertCurrent = () => {
    requestContext?.assertCurrent?.();
    if (!sessionScopeIsCurrent(store.getState(), sessionScope)) {
      const error = new Error('The active wallet changed.');
      error.code = 'SESSION_CHANGED';
      throw error;
    }
  };
  assertCurrent();
  const testnet = Object.keys(activeAccount.testnetOverrides || {}).length > 0;
  if (result.testnet != null && Boolean(result.testnet) !== testnet) {
    throw new Error('The asset does not belong to this wallet network.');
  }
  let fullCoinData = result.coinData;

  if (result.kind === 'pbaas') {
    if (!fullCoinData) {
      await CoinDirectory.addPbaasCurrency(
        result.currencyDefinition,
        testnet,
        true,
      );
      assertCurrent();
      fullCoinData = CoinDirectory.findCoinObj(
        result.currencyDefinition.currencyid,
      );
    }
  } else if (!fullCoinData) {
    await CoinDirectory.addErc20Token(
      {
        address: result.canonicalAddress,
        symbol: result.symbol,
        decimals: result.decimals,
        name: result.name,
      },
      result.network,
    );
    assertCurrent();
    fullCoinData = CoinDirectory.findCoinObj(result.canonicalAddress);
  }

  const resultWithCoinData = {...result, coinData: fullCoinData};
  if (Boolean(fullCoinData.testnet) !== testnet) {
    throw new Error('The asset does not belong to this wallet network.');
  }

  if (assetIsActive(resultWithCoinData, activeCoins)) {
    throw duplicateError(resultWithCoinData);
  }

  const keyAction = await addKeypairs(
      fullCoinData,
      activeAccount.keys,
      activeAccount.keyDerivationVersion == null
        ? 0
        : activeAccount.keyDerivationVersion,
      requestContext,
    );
  assertCurrent();
  // Preserve keys added by another current-session flow while derivation ran.
  dispatch({...keyAction, keys: {
    ...store.getState().authentication.activeAccount.keys,
    [fullCoinData.id]: keyAction.keys[fullCoinData.id],
  }});

  const addCoinAction = await addCoin(
    fullCoinData,
    activeCoinList,
    activeAccount.id,
    fullCoinData.compatible_channels || [],
    requestContext,
  );

  if (!addCoinAction) throw new Error('Asset could not be added.');
  assertCurrent();

  dispatch(addCoinAction);

  const setUserCoinsAction = setUserCoins(
    addCoinAction.activeCoinList,
    activeAccount.id,
  );
  dispatch(scopeSessionAction(setUserCoinsAction, sessionScope));
  refreshLifecyclesAfterAssetChange(
    fullCoinData,
    setUserCoinsAction.payload.activeCoinsForUser,
  );

  return fullCoinData;
};
