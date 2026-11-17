import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {uniqueAssets} from '../../utils/assets/assetIdentity';
import {getAssetPresentation} from '../../utils/assets/assetPresentation';
import {START_COINS} from '../../utils/constants/constants';

const sortCoins = (coins, priorityIds = []) => {
  const priority = new Map(priorityIds.map((id, index) => [id, index]));
  const names = new Map(coins.map(coin => [coin, getAssetPresentation(coin).name]));

  return [...coins].sort((left, right) => {
    const leftRank = priority.has(left.id)
      ? priority.get(left.id)
      : Number.MAX_SAFE_INTEGER;
    const rightRank = priority.has(right.id)
      ? priority.get(right.id)
      : Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) return leftRank - rightRank;

    return names.get(left).localeCompare(names.get(right));
  });
};

const getStarterIds = (testAccount, testnetOverrides) =>
  START_COINS.map(coinId =>
    testAccount ? testnetOverrides?.[coinId] : coinId,
  ).filter(Boolean);

// Wyre stopped operating, so its fiat and stablecoin assets are never offered.
const getCatalogueIds = ({testAccount}) =>
  testAccount ? CoinDirectory.testCoinList : CoinDirectory.enabledNameList;

const getCatalogueCoin = coinId => {
  try {
    return CoinDirectory.getBasicCoinObj(coinId);
  } catch (error) {
    console.warn(`Unable to load asset catalogue entry ${coinId}`, error);
    return null;
  }
};

export const buildAssetManagerData = ({
  activeAccount,
  activeCoins,
  testAccount,
}) => {
  const starterIds = getStarterIds(
    testAccount,
    activeAccount?.testnetOverrides,
  );
  const catalogue = sortCoins(
    uniqueAssets(
      getCatalogueIds({activeAccount, testAccount})
        .filter(id => Object.prototype.hasOwnProperty.call(coinsList, id))
        .map(getCatalogueCoin)
        .filter(coin => coin && coin.proto !== 'fiat'),
    ),
    starterIds,
  );
  const activeAssets = sortCoins(uniqueAssets((activeCoins || [])
    .filter(coin => Boolean(coin.testnet) === testAccount)), starterIds);
  return {activeAssets, catalogue};
};
