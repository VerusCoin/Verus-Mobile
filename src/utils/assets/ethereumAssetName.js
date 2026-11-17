import {DEST_ETH, FLAG_MASK} from 'verus-typescript-primitives';

// A failed contract lookup reports the address (or its first bytes) as the
// name and symbol. A raw address is never an asset name.
const cleanTicker = value => {
  if (typeof value !== 'string') return null;
  const ticker = value.replace(/\s*\[ERC20\]\s*$/i, '').trim();
  return ticker && !/^0x[0-9a-f]*$/i.test(ticker) ? ticker : null;
};
const sameAddress = (left, right) =>
  Boolean(left && right) && left.toLowerCase() === right.toLowerCase();

// Display identity only. Currency IDs still own routing, logos and prices.
// lookupCoin accepts a coin ID or contract address, ignoring contract case.
export const getEthereumAssetName = (
  destination,
  route,
  {lookupCoin, bridgeDelegator = null},
) => {
  if (route?.mapTo) return cleanTicker(route.mapTo);
  const native = destination?.nativecurrencyid;
  const ethereumNative = native &&
    (Number(native.type) & ~FLAG_MASK.toNumber()) === DEST_ETH.toNumber();
  if (
    (destination?.currencyid && destination.currencyid === route?.exportTo) ||
    (ethereumNative && sameAddress(native.address, bridgeDelegator)) ||
    destination?.proto === 'eth' ||
    sameAddress(destination?.address, '0x0000000000000000000000000000000000000000')
  ) return 'ETH';

  if (ethereumNative) {
    return cleanTicker(lookupCoin(native.address)?.display_ticker) ||
      cleanTicker(destination.name);
  }
  // Ethereum-source bouncebacks carry the contract's symbol and name.
  if (destination?.address) {
    return cleanTicker(destination.symbol) ||
      cleanTicker(lookupCoin(destination.address)?.display_ticker) ||
      cleanTicker(destination.name);
  }
  const coin = lookupCoin(destination?.currencyid || destination?.id) || destination;
  const mapped = coin?.mapped_to;
  if (!mapped) return null;
  const original = lookupCoin(mapped);
  if (original?.proto === 'eth') return 'ETH';
  return cleanTicker(original?.display_ticker) ||
    (/^0x/i.test(mapped) ? null : cleanTicker(mapped));
};
