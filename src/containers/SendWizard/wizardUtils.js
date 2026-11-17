import {Buffer} from 'buffer';
import {ethers} from 'ethers';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {
  I_ADDRESS_VERSION,
  R_ADDRESS_VERSION,
} from '../../utils/constants/constants';
import {DEST_ETH, fromBase58Check} from 'verus-typescript-primitives';
import {getEthereumAssetName} from '../../utils/assets/ethereumAssetName';
import {VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT} from '../../utils/constants/web3Constants';
import {getTestnetBridgeDelegator} from '../../utils/testnetEnvironment';

const lookupCoin = id => {
  if (!id) return null;
  try {
    return CoinDirectory.findCoinObj(id);
  } catch (error) {
    return /^0x/i.test(id)
      ? Object.values(CoinDirectory.coins || {}).find(coin =>
          coin.currency_id?.toLowerCase() === id.toLowerCase()) || null
      : null;
  }
};
const ethereumAssetName = (destination, route, sourceCoin) =>
  getEthereumAssetName(destination, route, {
    lookupCoin,
    bridgeDelegator: sourceCoin?.testnet
      ? getTestnetBridgeDelegator()
      : VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT,
  });

export const SEND_WIZARD_MODE = {
  CONVERT: 'convert',
  SEND: 'send',
};

const CONVERSION_CHANNEL_TYPES = new Set([
  'erc20',
  'eth',
  'vrpc',
  'wyre_service',
]);

export const isConversionChannel = channel =>
  CONVERSION_CHANNEL_TYPES.has(channel?.split('.')[0]);

// An Amount quote belongs to its original input. After a fee reduction, only
// a fresh preflight estimate can describe what this transaction may receive.
export const getPreparedConversionEstimate = (preflight, estimate) => {
  if (preflight?.estimate) return preflight.estimate;
  if (
    preflight?.submittedsats != null && preflight?.output?.satoshis != null &&
    String(preflight.submittedsats) !== String(preflight.output.satoshis)
  ) return null;
  return estimate;
};

export const WIZARD_CONTEXT_STEP = {
  AMOUNT: 'amount',
  RECIPIENT: 'recipient',
  SOURCE: 'source',
};

// A scanned address in the band: the start and the end, as on a history row.
export const shortAddress = (address, keep = 6) => {
  const value = String(address || '');
  return value.endsWith('@') || value.length <= keep * 2 + 3
    ? value
    : `${value.slice(0, keep)}…${value.slice(-keep)}`;
};

// "VRSC [ERC20]" is the Ethereum token. Its logo badge already says so, and
// the context band has little room.
const getShortTicker = ticker =>
  String(ticker || '').replace(/\s*\[ERC20\]\s*$/i, '').trim();

// What the context band under the wizard header shows: the asset that moves,
// where it goes, and the chain only when it is not the asset's own chain.
// Amount already has a Network row for Send from a conversion channel, so
// the band does not repeat the chain there.
// A scanned recipient shows as "to <address>" on Amount and as "To <address>"
// on Select asset, because the Recipient step is skipped.
// A Send or Convert from the VerusID page shows "From <name>" on Select asset.
// A scanned recipient wins.
export const getWizardContextSummary = ({
  mode,
  step,
  sourceCoin,
  target,
  route,
  channel,
  recipient,
  sourceIdentityName,
}) => {
  const recipientLabel = recipient ? shortAddress(recipient) : null;
  if (step === WIZARD_CONTEXT_STEP.SOURCE) {
    if (recipientLabel) {
      return {recipient: recipientLabel, recipientOnly: true, description: `Send to ${recipient}`};
    }
    return sourceIdentityName
      ? {
          recipient: sourceIdentityName,
          recipientOnly: true,
          recipientPrefix: 'From',
          recipientIsName: true,
          description: `${
            mode === SEND_WIZARD_MODE.CONVERT ? 'Convert' : 'Send'
          } from ${sourceIdentityName}`,
        }
      : null;
  }
  if (!sourceCoin || !target || !route) return null;

  const sourceLabel = getShortTicker(sourceCoin.display_ticker);
  const source = {coinId: sourceCoin.id, label: sourceLabel};
  const chain =
    route.isCrossChain && route.networkName
      ? {iconId: route.networkIcon, label: route.networkName}
      : null;

  if (target.isConversion) {
    const targetLabel = getShortTicker(target.ticker);

    return {
      source,
      destination: {
        kind: 'coin',
        coinId: target.coinId || target.id,
        label: targetLabel,
        // The tail names the chain, so the logo badge would say it twice.
        showBadge: !chain,
      },
      chain,
      description: `Convert ${sourceLabel} to ${targetLabel}${
        chain ? ` on ${chain.label}` : ''
      }`,
    };
  }

  const networkRowShown =
    mode === SEND_WIZARD_MODE.SEND && isConversionChannel(channel);
  const showChain =
    chain && !(step === WIZARD_CONTEXT_STEP.AMOUNT && networkRowShown);

  return {
    source,
    destination: showChain ? {kind: 'chain', ...chain} : null,
    chain: null,
    recipient: step === WIZARD_CONTEXT_STEP.AMOUNT ? recipientLabel : null,
    description: showChain
      ? `Send ${sourceLabel} to ${chain.label}`
      : recipientLabel && step === WIZARD_CONTEXT_STEP.AMOUNT
      ? `Send ${sourceLabel} to ${recipient}`
      : `Send ${sourceLabel}`,
  };
};

// Use the selected Card's address, which can differ from another Card's keys.
export const isOwnChannelAddress = ({
  activeAccount,
  channel,
  recipientAddress,
  sourceCoin,
}) => {
  const [channelType, channelAddress] = String(channel || '').split('.');
  const sourceAddress = channelType === 'vrpc'
    ? channelAddress
    : activeAccount?.keys?.[sourceCoin?.id]?.[channelType]?.addresses?.[0];

  return Boolean(sourceAddress) && typeof recipientAddress === 'string' &&
    (['eth', 'erc20'].includes(channelType)
      ? recipientAddress.toLowerCase() === sourceAddress.toLowerCase()
      : recipientAddress === sourceAddress);
};

export const ADDRESS_TYPE = {
  ETHEREUM: 'ethereum',
  GENERIC: 'generic',
  // A private (Sapling) address. Only a private card can send to it.
  PRIVATE: 'private',
  VERUS: 'verus',
};

// The same rule as the light wallet preflight, so both accept one set.
export const isPrivateAddress = address =>
  /^zs[a-zA-Z0-9]{65,85}$/.test(String(address || '').trim());

// "alice@:private" sends to the private address of the VerusID alice@.
export const PRIVATE_IDENTITY_SUFFIX = ':private';
export const isPrivateIdentity = address =>
  /^[^@\s]+@:private$/.test(String(address || '').trim());

export const isPrivateRecipient = address =>
  isPrivateAddress(address) || isPrivateIdentity(address);

// A memo travels only inside a private output: a private card that sends to a
// private address. The light wallet takes up to 512 bytes.
export const MEMO_MAX_BYTES = 512;
export const getMemoBytes = memo => Buffer.byteLength(String(memo || ''), 'utf8');

// The kind of address an asset sends to on its own network.
export const getSourceAddressType = coin =>
  ['eth', 'erc20'].includes(coin?.proto)
    ? ADDRESS_TYPE.ETHEREUM
    : coin?.proto === 'vrsc'
    ? ADDRESS_TYPE.VERUS
    : ADDRESS_TYPE.GENERIC;

// The kind of a scanned address. An R-address or i-address goes to Verus
// assets only, although some other chains share the R prefix.
export const getRecipientAddressType = address => {
  const value = String(address || '').trim();
  if (!value) return null;
  if (ethers.isAddress(value)) return ADDRESS_TYPE.ETHEREUM;
  if (isPrivateRecipient(value)) return ADDRESS_TYPE.PRIVATE;
  if (value.endsWith('@')) return ADDRESS_TYPE.VERUS;
  try {
    const {version} = fromBase58Check(value);
    if (version === R_ADDRESS_VERSION || version === I_ADDRESS_VERSION) {
      return ADDRESS_TYPE.VERUS;
    }
  } catch (error) {}
  return value.length >= 20 && value.length <= 256 && !/\s/.test(value)
    ? ADDRESS_TYPE.GENERIC
    : null;
};

const getDefinitionId = definition => {
  if (definition == null) return null;
  if (typeof definition === 'string') return definition;
  return definition.currencyid || definition.currency_id || definition.address || null;
};

const getDefinitionName = definition => {
  if (definition == null) return null;
  if (typeof definition === 'string') return definition;
  return (
    definition.fullyqualifiedname ||
    definition.name ||
    definition.symbol ||
    getDefinitionId(definition)
  );
};

const getMappingTarget = (sourceCoin, definition) => {
  if (definition == null) return null;
  if (typeof definition === 'string') return definition;
  if (sourceCoin?.proto === 'vrsc') {
    return definition.symbol || getDefinitionName(definition);
  }
  if (sourceCoin?.proto === 'eth' || sourceCoin?.proto === 'erc20') {
    return (
      definition.fullyqualifiedname ||
      definition.name ||
      getDefinitionId(definition)
    );
  }
  return getDefinitionName(definition);
};

export const getCurrencyDisplay = (currencyId, fallback) => {
  try {
    const coin = CoinDirectory.findCoinObj(currencyId);
    return {
      coinId: coin.id,
      name: coin.display_name,
      ticker: coin.display_ticker,
    };
  } catch (error) {
    const name = fallback || currencyId || 'Unknown asset';
    const pieces = String(name).split('.');
    // A Verus name is `currency.parent`; the first part is the currency's own
    // name. A Bridge is the exception: "Bridge" alone names no currency, so it
    // keeps its full name (Bridge.vETH).
    const ticker = /^bridge$/i.test(pieces[0]) ? name : pieces[0] || name;
    return {coinId: currencyId, name, ticker};
  }
};

const getAddressType = (sourceCoin, path) => {
  if (
    path?.ethdest === true ||
    path?.exportto?.nativecurrencyid?.type === DEST_ETH.toNumber()
  ) {
    return ADDRESS_TYPE.ETHEREUM;
  }

  // Any other export goes to a Verus system, so it takes a Verus address or
  // VerusID, also when the funds start on Ethereum.
  if (path?.exportto) return ADDRESS_TYPE.VERUS;

  if (['eth', 'erc20'].includes(sourceCoin?.proto)) {
    return ADDRESS_TYPE.ETHEREUM;
  }

  return sourceCoin?.proto === 'vrsc'
    ? ADDRESS_TYPE.VERUS
    : ADDRESS_TYPE.GENERIC;
};

const getSourceNetworkId = (sourceCoin, sourceNetworkId) =>
  sourceNetworkId || sourceCoin?.system_id || sourceCoin?.id || null;

const getRouteNetwork = (sourceCoin, sourceNetworkId, route) => {
  const sourceNetwork = getSourceNetworkId(sourceCoin, sourceNetworkId);
  const networkKey =
    route.addressType === ADDRESS_TYPE.ETHEREUM
      ? '.eth'
      : route.exportTo || sourceNetwork;
  const networkDisplay = getCurrencyDisplay(
    networkKey,
    route.exportToFqn || sourceCoin?.display_name || networkKey,
  );

  return {
    networkKey,
    // The wallet's name for a known chain ("Verus Testnet"), as on Home.
    networkName: networkKey === '.eth' ? 'Ethereum' : networkDisplay.name,
    networkIcon: networkKey === '.eth' ? 'ETH' : networkDisplay.coinId,
    isSameNetwork: networkKey === sourceNetwork,
  };
};

// The parts of a pre-launch currency's definition that its launch facts need.
const LAUNCH_DEFINITION_KEYS = [
  'currencyid',
  'fullyqualifiedname',
  'name',
  'startblock',
  'currencies',
  'currencynames',
  'weights',
  'minpreconversion',
  'maxpreconversion',
  'initialsupply',
  'systemid',
  'launchsystemid',
];
const getLaunchDefinition = definition =>
  definition && typeof definition === 'object'
    ? Object.fromEntries(
        LAUNCH_DEFINITION_KEYS.filter(key => definition[key] != null).map(key => [
          key,
          definition[key],
        ]),
      )
    : null;

const buildRoute = (sourceCoin, sourceNetworkId, path) => {
  const exportTo = getDefinitionId(path?.exportto);
  const exportToFqn = getDefinitionName(path?.exportto);
  const via = getDefinitionId(path?.via);
  const viaFqn = getDefinitionName(path?.via);
  const mapDefinition = path?.mappingdestination || path?.destination?.mapto;
  const mapTo = path?.mapping
    ? getMappingTarget(sourceCoin, mapDefinition || path.destination)
    : null;
  const preconvert = Boolean(path?.prelaunch);
  const parts = [];

  if (preconvert) parts.push('Preconvert');
  if (via) parts.push(`via ${viaFqn || via}`);
  if (exportTo) parts.push(`to ${exportToFqn || exportTo}`);
  if (parts.length === 0) parts.push('Same network');

  const route = {
    key: `${
      getDefinitionId(path?.destination) ||
      getDefinitionName(path?.destination) ||
      'same'
    }:${exportTo || 'local'}:${via || 'direct'}:${mapTo || 'native'}:${
      preconvert ? 'pre' : 'live'
    }`,
    label: parts.join(' · '),
    exportTo,
    exportToFqn,
    via,
    viaFqn,
    mapTo,
    price: path?.price == null ? null : path.price,
    preconvert,
    // A pre-conversion has no price yet. Its facts come from the definition.
    launchDefinition: preconvert ? getLaunchDefinition(path.destination) : null,
    bridgePrelaunch: Boolean(path?.bridgeprelaunch),
    isCrossChain: Boolean(exportTo),
    addressType: getAddressType(sourceCoin, path),
  };

  return {
    ...route,
    ...getRouteNetwork(sourceCoin, sourceNetworkId, route),
    receiveTicker: route.addressType === ADDRESS_TYPE.ETHEREUM
      ? ethereumAssetName(path.destination, route, sourceCoin)
      : verusMappedAssetName(sourceCoin, path, route),
  };
};

// An Ethereum asset that crosses to Verus arrives as the Verus currency it is
// mapped to: ETH as vETH, DAI as DAI.vETH.
const verusMappedAssetName = (sourceCoin, path, route) => {
  if (!route.mapTo || !['eth', 'erc20'].includes(sourceCoin?.proto)) return null;
  return lookupCoin(getDefinitionId(path?.destination))?.display_ticker || route.mapTo;
};

const getCanonicalAssetKey = option => {
  const fullyqualifiedname = String(option?.fullyqualifiedname || '');
  let ticker = String(option?.ticker || option?.name || option?.id || '')
    .trim()
    .toUpperCase()
    .replace(/\s*\[ERC20\]\s*/g, '');
  const fqnParts = fullyqualifiedname.toUpperCase().split('.');

  if (
    fqnParts.length > 1 &&
    ticker === fqnParts[fqnParts.length - 1]
  ) {
    ticker = fqnParts.slice(0, -1).join('.');
  }

  if (ticker.endsWith('.VETH')) {
    ticker = ticker.slice(0, -5);
    if (ticker.startsWith('V') && ticker.length > 1) ticker = ticker.slice(1);
  }
  if (ticker === 'VETH') ticker = 'ETH';

  return ticker || option.id;
};

const getCanonicalAssetDisplay = canonicalKey => {
  const display = {
    BRIDGE: {name: 'Bridge.vETH', ticker: 'Bridge.vETH'},
    ETH: {name: 'Ethereum', ticker: 'ETH'},
    MKR: {name: 'Maker', ticker: 'MKR'},
    TBTC: {name: 'tBTC', ticker: 'tBTC'},
  }[canonicalKey];

  return display || {name: canonicalKey, ticker: canonicalKey};
};

export const buildNetworkOptions = (option, sourceCoin, sourceNetworkId) => {
  const networks = new Map();

  option.routes.forEach(route => {
    const verusTicker = lookupCoin(option.coinId)?.display_ticker || option.name;
    // The asset's name on that network (owner, 2026-11-03).
    const ticker = route.receiveTicker || verusTicker;
    const network = networks.get(route.networkKey) || {
      ...option,
      ticker,
      name: route.networkKey === '.eth' || route.receiveTicker ? ticker : option.name,
      networkKey: route.networkKey,
      networkName: route.networkName,
      networkIcon: route.networkIcon,
      isSameNetwork: route.isSameNetwork,
      routes: [],
    };

    if (!network.routes.some(existing => existing.key === route.key)) {
      network.routes.push(route);
    }
    networks.set(route.networkKey, network);
  });

  if (networks.size === 0) {
    const sourceNetwork = getSourceNetworkId(sourceCoin, sourceNetworkId);
    const display = getCurrencyDisplay(sourceNetwork, sourceCoin?.display_name);
    networks.set(sourceNetwork, {
      ...option,
      networkKey: sourceNetwork,
      networkName: display.name,
      networkIcon: display.coinId,
      isSameNetwork: true,
      routes: [],
    });
  }

  return [...networks.values()].map(network => ({
    ...network,
    selectionTitle:
      network.isConversion && network.routes.length > 1
        ? 'Select conversion route'
        : null,
  }));
};

const groupConversionOptions = (options, sourceCoin, sourceNetworkId) => {
  const groups = new Map();

  options.forEach(option => {
    const canonicalKey = getCanonicalAssetKey(option);
    const networkOptions = buildNetworkOptions(
      option,
      sourceCoin,
      sourceNetworkId,
    );
    const group = groups.get(canonicalKey) || [];
    group.push(...networkOptions);
    groups.set(canonicalKey, group);
  });

  return [...groups.entries()].map(([canonicalKey, networkOptions]) => {
    const deduplicatedNetworks = [];
    networkOptions.forEach(network => {
      const existing = deduplicatedNetworks.find(
        option =>
          option.networkKey === network.networkKey &&
          option.transactionCurrency === network.transactionCurrency,
      );
      if (existing) {
        network.routes.forEach(route => {
          if (!existing.routes.some(candidate => candidate.key === route.key)) {
            existing.routes.push(route);
          }
        });
      } else {
        deduplicatedNetworks.push({...network, routes: [...network.routes]});
      }
    });

    if (deduplicatedNetworks.length === 1) {
      const [onlyNetwork] = deduplicatedNetworks;
      return {...onlyNetwork, networkOptions: [onlyNetwork]};
    }

    const preferredDisplay =
      deduplicatedNetworks.find(option => option.networkKey === '.eth') ||
      deduplicatedNetworks[0];
    const canonicalDisplay = getCanonicalAssetDisplay(canonicalKey);

    const verusNetwork = deduplicatedNetworks.find(
      option => !String(option.coinId || '').startsWith('0x'),
    );
    // The system of the option whose coin id the group uses. A price lookup
    // needs both.
    const priceNetwork = verusNetwork?.coinId ? verusNetwork : preferredDisplay;

    return {
      id: canonicalKey,
      name: canonicalDisplay.name,
      ticker: canonicalDisplay.ticker,
      coinId: priceNetwork.coinId,
      systemId: priceNetwork.systemId || null,
      isConversion: true,
      isGrouped: true,
      networkOptions: deduplicatedNetworks,
      routes: [],
    };
  });
};

export const buildTargetOptions = (
  conversionPaths,
  sourceCoin,
  conversionDisabled,
  sourceNetworkId,
) => {
  if (!sourceCoin) return [];

  const sourceOption = buildSendTarget(
    conversionPaths,
    sourceCoin,
    sourceNetworkId,
  );
  const sourceCurrencyId = sourceCoin.currency_id || sourceCoin.id;
  const optionMap = new Map();

  for (const [destinationKey, paths] of Object.entries(conversionPaths || {})) {
    if (!Array.isArray(paths)) continue;

    paths.forEach(path => {
      const destination = path?.destination;
      if (!destination) return;

      const displayCurrencyId = getDefinitionId(destination) || destinationKey;
      const sameCurrency = displayCurrencyId === sourceCurrencyId;
      const mappingSend = Boolean(path.mapping && path.exportto);
      if (sameCurrency || mappingSend || conversionDisabled) return;

      const route = buildRoute(sourceCoin, sourceNetworkId, path);
      const bouncebackCurrency =
        path.ethdest && destination.mapto
          ? getDefinitionId(destination.mapto) || getDefinitionName(destination.mapto)
          : displayCurrencyId;
      const fallbackName = getDefinitionName(destination) || displayCurrencyId;
      const display = getCurrencyDisplay(displayCurrencyId, fallbackName);
      const option = optionMap.get(displayCurrencyId) || {
        id: displayCurrencyId,
        transactionCurrency: bouncebackCurrency,
        fullyqualifiedname: getDefinitionName(destination) || bouncebackCurrency,
        convertToFqn: path.ethdest
          ? null
          : getDefinitionName(destination) || bouncebackCurrency,
        coinId: display.coinId,
        // The destination's own system: the on-chain price of a currency that
        // is not in the coin directory is read there.
        systemId: destination.systemid || null,
        name: display.name,
        ticker: display.ticker,
        isConversion: true,
        routes: [],
      };

      if (!option.routes.some(existing => existing.key === route.key)) {
        option.routes.push(route);
      }
      optionMap.set(displayCurrencyId, option);
    });
  }

  const conversions = groupConversionOptions(
    [...optionMap.values()],
    sourceCoin,
    sourceNetworkId,
  )
    .map(option => ({...option, isPrelaunch: isPrelaunchTarget(option)}))
    .sort((first, second) => first.name.localeCompare(second.name));
  return [sourceOption, ...conversions];
};

const targetRoutes = target => [
  ...(target?.routes || []),
  ...(target?.networkOptions || []).flatMap(option => option.routes || []),
];

// A currency before its launch: every way to reach it is a pre-conversion.
export const isPrelaunchTarget = target => {
  const routes = targetRoutes(target);
  return routes.length > 0 && routes.every(route => route.preconvert);
};

// The launch definition carried by a pre-launch target's routes.
export const getTargetLaunchDefinition = target =>
  targetRoutes(target).find(route => route.launchDefinition)?.launchDefinition || null;

export const buildSendTarget = (
  conversionPaths,
  sourceCoin,
  sourceNetworkId,
) => {
  if (!sourceCoin) return null;

  const sourceCurrencyId = sourceCoin.currency_id || sourceCoin.id;
  const sourceDisplay = getCurrencyDisplay(sourceCoin.id, sourceCoin.display_name);
  const directRoute = {
    key: 'local:direct:live:send',
    label: 'Same network',
    exportTo: null,
    exportToFqn: null,
    via: null,
    viaFqn: null,
    mapTo: null,
    price: null,
    preconvert: false,
    bridgePrelaunch: false,
    isCrossChain: false,
    addressType: getSourceAddressType(sourceCoin),
    receiveTicker: ethereumAssetName(sourceCoin, null, sourceCoin),
  };
  const sourceOption = {
    id: sourceCurrencyId,
    transactionCurrency: sourceCurrencyId,
    fullyqualifiedname: sourceCurrencyId,
    convertToFqn: null,
    coinId: sourceCoin.id,
    name: sourceCoin.display_name,
    ticker: sourceCoin.display_ticker,
    isConversion: false,
    routes: [
      {
        ...directRoute,
        ...getRouteNetwork(sourceCoin, sourceNetworkId, directRoute),
      },
    ],
    ...sourceDisplay,
    coinId: sourceCoin.id,
    name: sourceCoin.display_name,
    ticker: sourceCoin.display_ticker,
  };

  for (const [destinationKey, paths] of Object.entries(conversionPaths || {})) {
    if (!Array.isArray(paths)) continue;

    paths.forEach(path => {
      const destination = path?.destination;
      if (!destination) return;

      const displayCurrencyId = getDefinitionId(destination) || destinationKey;
      const sameCurrency = displayCurrencyId === sourceCurrencyId;
      const mappingSend = Boolean(path.mapping && path.exportto);

      if (sameCurrency || mappingSend) {
        const route = buildRoute(sourceCoin, sourceNetworkId, path);
        const routeWithMapping = mappingSend
          ? {
              ...route,
              mapTo:
                route.mapTo || getMappingTarget(sourceCoin, destination),
            }
          : route;
        if (
          routeWithMapping.isCrossChain &&
          !sourceOption.routes.some(existing => existing.key === routeWithMapping.key)
        ) {
          sourceOption.routes.push(routeWithMapping);
        }
        return;
      }
    });
  }

  sourceOption.networkOptions = buildNetworkOptions(
    sourceOption,
    sourceCoin,
    sourceNetworkId,
  );
  return sourceOption;
};

export const POPULAR_TARGETS = ['VRSC', 'USDC', 'ETH', 'TBTC', 'DAI'];

export const isPopularTarget = target => {
  const values = [target?.ticker, target?.name, target?.id]
    .filter(Boolean)
    .map(value => String(value).toUpperCase());
  return POPULAR_TARGETS.some(popular =>
    values.some(value => value === popular || value.includes(`.${popular}`)),
  );
};

export const getTransactionId = result => {
  if (typeof result === 'string') return result;
  return (
    result?.txid ||
    result?.hash ||
    result?.transactionid ||
    result?.transactionHash ||
    null
  );
};

// The network a cross-chain transfer arrives on, named as the Network sheet
// names it ("Ethereum", not "vETH").
export const getDestinationNetwork = (route, fallback = '') =>
  route?.networkName || route?.exportToFqn || route?.exportTo || fallback;

// How a route reads where the user can choose between routes: the basket it
// goes through. A route with no basket is "Direct".
export const getRouteName = route =>
  route?.viaFqn || route?.via || 'Direct';
