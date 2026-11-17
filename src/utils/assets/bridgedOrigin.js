import {ethereumNetwork} from './assetIdentity';

const NETWORK_LABELS = {homestead: 'Ethereum', sepolia: 'Sepolia'};
const EXPLORER_IDS = {homestead: 'ETH', sepolia: 'GETH'};
const ETHEREUM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// Where a Verus currency comes from, when its original lives on Ethereum.
//
// The rule: the currency is the Ethereum gateway (vETH, whose `mapped_to` is
// native ETH), or its system is that gateway (an ERC-20 token brought in
// through the bridge, such as DAI.vETH or vUSDC.vETH). The daemon defines both
// with proof protocol 3 and a DEST_ETH native currency ID, which CoinDirectory
// turns into `mapped_to`. VRSC and Bridge.vETH also carry `mapped_to`, but it
// points the other way, to their ERC-20 copy on Ethereum, and their system is
// VRSC, so they do not match. The gateway's ETH gives the network. The mapped
// token gives the name when the wallet knows it, and the contract address.
//
// `lookupCoin(id)` returns a coin definition or null. `explorers` maps a coin ID
// to its explorer base URL. Returns null when the rule does not match or the
// mapping is not resolved yet.
export const getBridgedOrigin = (coin, {lookupCoin, explorers = {}}) => {
  if (coin?.proto !== 'vrsc' || coin.mapped_to == null) return null;

  const mapped = lookupCoin(coin.mapped_to);
  const isGateway = mapped?.proto === 'eth';
  let ether = mapped;

  if (!isGateway) {
    const system = coin.system_id ? lookupCoin(coin.system_id) : null;
    ether = system?.proto === 'vrsc' && system.mapped_to != null
      ? lookupCoin(system.mapped_to)
      : null;
    if (ether?.proto !== 'eth') return null;
    if (mapped ? mapped.proto !== 'erc20' : !ETHEREUM_ADDRESS.test(coin.mapped_to)) {
      return null;
    }
  }

  const network = ethereumNetwork(ether);
  const networkLabel = NETWORK_LABELS[network];
  if (!networkLabel) return null;

  const contractAddress = isGateway
    ? null
    : mapped?.currency_id || mapped?.id || coin.mapped_to;
  const explorer = explorers[EXPLORER_IDS[network]];

  return {
    title: `Bridged from ${networkLabel}`,
    original: mapped?.display_ticker || mapped?.display_name || null,
    contractAddress,
    explorerUrl: contractAddress && explorer
      ? `${explorer}/token/${contractAddress}`
      : null,
  };
};
