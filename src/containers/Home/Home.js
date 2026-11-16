/*
  The purpose of this component is to be the first screen a user is
  met with after login. This screen should have all necessary or
  essential wallet components available at the press of one button.
  This includes VerusPay, adding coins, and coin menus. Keeping this
  screen clean is also essential, as users will spend a lot of time with
  it in their faces. It updates the balances and the rates upon loading
  if they are flagged to be updated in the redux store.
*/

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {AppState, InteractionManager} from 'react-native';
import {
  setActiveCoin,
  setActiveApp,
  setActiveSection,
  expireCoinData,
  setCoinSubWallet,
  expireServiceData,
  saveGeneralSettings,
} from '../../actions/actionCreators';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_INFO,
  GENERAL,
  WYRE_SERVICE,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_RATES,
  API_GET_SERVICE_NOTIFICATIONS,
  API_SEND,
  DLIGHT_PRIVATE,
} from '../../utils/constants/intervalConstants';
import { USD } from '../../utils/constants/currencies';
import {
  conditionallyUpdateService,
  conditionallyUpdateWallets,
  dispatchAddWidget,
} from '../../actions/actionDispatchers';
import BigNumber from 'bignumber.js';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import { runRefreshUpdates } from '../../utils/updates/runRefreshUpdates';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  HOME_NOTICE_EMPTY,
  HOME_NOTICE_FOUND,
  HOME_NOTICE_OFFLINE,
  HOME_NOTICE_SYNC,
  HOME_NOTICE_UNREACHABLE,
} from './HomeWidgets/HomeNotice';
import {
  getUnreviewedNewAssetHoldings,
  markFoundAssetsReviewed,
} from '../../utils/assets/assetManagementService';
import { extractDisplaySubWallets } from '../../utils/subwallet/extractSubWallets';
import {getOpeningSubWallet} from '../../utils/subwallet/getOpeningSubWallet';
import {
  getPrivateSyncPercent,
  isPrivateCard,
  selectPrivateWalletInfo,
} from '../../utils/subwallet/privateWallet';
import {
  CURRENCY_WIDGET_TYPE,
  TOTAL_UNI_BALANCE_WIDGET_TYPE,
  VERUSID_WIDGET_TYPE,
} from '../../utils/constants/widgets';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import { useSelector, useDispatch } from 'react-redux';
import store from '../../store';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import {refreshRegistrationJobs} from '../../actions/actions/services/dispatchers/verusid/registration';
import SignedInWalletHome from './SignedInWalletHome';
import usePortfolioHistory from '../../utils/portfolioHistory/usePortfolioHistory';
import {usePrelaunchAssets} from '../../utils/preconversion/usePrelaunch';
import {getCurrencyDisplay} from '../SendWizard/wizardUtils';
import {
  getManagedAssetBalance,
  isAssetShown,
  isTestnetAccount,
  uniqueAssets,
} from '../../utils/assets/assetIdentity';
import {getAssetPresentation} from '../../utils/assets/assetPresentation';
import {
  CONVERSION_DISABLED,
} from '../../../env/index';
import {
  WALLET_APP_RECEIVE,
  WALLET_APP_SEND,
} from '../../utils/constants/apps';
import {
  isConversionChannel,
  SEND_WIZARD_MODE,
} from '../SendWizard/wizardUtils';

const getAssetStatusDescription = coin => {
  if (coin.mapped_to) return `Mapped · ${coin.display_ticker}`;
  if (coin.testnet) return 'Testnet';
  return coin.display_ticker;
};

const Home = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const activeCoinsForUser = useObjectSelector((state) => state.coins.activeCoinsForUser);

  const activeAccount = useObjectSelector((state) => state.authentication.activeAccount);
  const assetManagement = useObjectSelector(state => state.assetManagement);
  const ledgerBalances = useObjectSelector(state => state.ledger.balances);
  const balances = useObjectSelector((state) =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const rates = useObjectSelector((state) => state.ledger.rates);
  const allSubWallets = useObjectSelector((state) => extractDisplaySubWallets(state));
  const privateWalletInfo = useObjectSelector(selectPrivateWalletInfo);
  const activeSubWallets = useObjectSelector((state) => state.coinMenus.activeSubWallets);
  const userSelectedSubWallets = useObjectSelector(state => state.coinMenus.userSelectedSubWallets || {});
  const cardStackPreferences = useObjectSelector(state =>
    state.settings.generalWalletSettings.cardStackPreferencesByAccount?.[activeAccount?.accountHash] || {},
  );
  const widgetOrder = useObjectSelector((state) => state.widgets.order);
  // A currency before its launch shows when it launches and what this wallet
  // pre-converted to it, instead of a price.
  const {assets: prelaunchAssets} = usePrelaunchAssets(activeCoinsForUser, allSubWallets);

  const homeCardDragDetection = useSelector(
    (state) => state.settings.generalWalletSettings.homeCardDragDetection,
  );
  const displayCurrency = useSelector(
    (state) => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const showBalance = useSelector(state => state.coins.showBalance);
  const testnetPrices = useSelector(state => state.settings.generalWalletSettings.testnetPrices === true);

  const [totalFiatBalance, setTotalFiatBalance] = useState(null);
  const [totalCryptoBalances, setTotalCryptoBalances] = useState({});
  const [balanceAccountHash, setBalanceAccountHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const refreshRun = useRef(0);
  const balanceErrors = useObjectSelector((state) =>
    extractErrorData(state, API_GET_BALANCES),
  );
  const {isConnected} = useNetInfo();
  // Verus currencies on the wallet's addresses that are not in the wallet yet
  // and that the user has not reviewed or dismissed on Home.
  const foundAssets = useObjectSelector(getUnreviewedNewAssetHoldings);
  const reviewFoundAssets = useCallback(() => {
    markFoundAssetsReviewed(foundAssets.map(holding => holding.currencyId))
      .catch(error => console.warn(error));
  }, [foundAssets]);
  const [listItemHeights, setListItemHeights] = useState({});
  const [widgets, setWidgets] = useState([]);
  const [expandedListItems, setExpandedListItems] = useState({});

  const LIST_ITEM_INITIAL_HEIGHT = 58;
  const LIST_ITEM_MARGIN = 8;
  const LIST_ITEM_ANIMATION_DURATION = 250;

  const sortWidgets = useCallback(() => {
    setWidgets((prevWidgets) => {
      const sortedWidgets = [...prevWidgets].sort((a, b) => {
        return widgetOrder[a] <= widgetOrder[b] ? -1 : 1;
      });
      return sortedWidgets;
    });
  }, [widgetOrder]);

  // Locking the wallet clears the account while Home is still mounted.
  const accountHash = activeAccount?.accountHash ?? null;
  const [syncNoticeDismissed, setSyncNoticeDismissed] = useState(false);
  // This dismissal belongs to the open wallet, not its saved settings.
  useEffect(() => setSyncNoticeDismissed(false), [accountHash]);

  const getWidgets = useCallback(async () => {
    if (accountHash == null) return;
    setWidgets([]);
    let widgetsList = [...Object.keys(widgetOrder)].sort((a, b) => {
      return widgetOrder[a] <= widgetOrder[b] ? -1 : 1;
    });

    const widgetsToRemove = [];

    // Remove currency widgets for coins that aren't active
    for (let i = 0; i < widgetsList.length; i++) {
      const widgetId = widgetsList[i];
      const widgetSplit = widgetId.split(':');
      const widgetType = widgetSplit[0];

      if (
        widgetType === CURRENCY_WIDGET_TYPE &&
        !activeCoinsForUser.some((x) => x.id === widgetSplit[1])
      ) {
        widgetsToRemove.unshift(i);
      }
    }

    for (const widgetIndex of widgetsToRemove) {
      widgetsList.splice(widgetIndex, 1);
    }

    // Add the balance widget if not present
    if (!widgetsList.includes(TOTAL_UNI_BALANCE_WIDGET_TYPE)) {
      widgetsList.push(TOTAL_UNI_BALANCE_WIDGET_TYPE);
      dispatchAddWidget(TOTAL_UNI_BALANCE_WIDGET_TYPE, accountHash);
    }

    // Add currency widgets for active coins
    for (const coinObj of activeCoinsForUser) {
      const currencyWidgetId = `${CURRENCY_WIDGET_TYPE}:${coinObj.id}`;

      if (!widgetsList.includes(currencyWidgetId)) {
        widgetsList.push(currencyWidgetId);
        dispatchAddWidget(currencyWidgetId, accountHash);
      }
    }

    // Add the VerusID widget if not present
    if (!widgetsList.includes(VERUSID_WIDGET_TYPE)) {
      widgetsList.push(VERUSID_WIDGET_TYPE);
      dispatchAddWidget(VERUSID_WIDGET_TYPE, accountHash);
    }

    setWidgets(widgetsList);
  }, [accountHash, activeCoinsForUser, widgetOrder]);

  const setDisplayCurrencyFunc = async (currency) => {
    try {
      dispatch(await saveGeneralSettings({ displayCurrency: currency }));
    } catch (e) {
      console.warn(e);
      createAlert(
        'Display currency not changed',
        'The wallet could not save the new currency. Try again.',
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Start the data refresh after the Back animation ends, so Home shows
      // at once instead of after a long JS block.
      const refreshTask = InteractionManager.runAfterInteractions(() => {
        refresh(false);
      });
      const resumeRegistrations = () => {
        if (!store.getState().authentication.activeAccount) return;
        // A suspended app may miss polling intervals. Reconcile protected jobs
        // when Home is shown again; failed lookups retain their durable state.
        refreshRegistrationJobs().catch(() => {});
      };
      resumeRegistrations();
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') resumeRegistrations();
      });
      return () => {
        refreshTask.cancel();
        subscription.remove();
      };
    }, []),
  );

  useEffect(() => {
    getWidgets();
  }, [getWidgets]);

  useEffect(() => {
    const totalBalances = getTotalBalances();
    setTotalFiatBalance(totalBalances.fiat);
    setTotalCryptoBalances(totalBalances.crypto);
    setBalanceAccountHash(accountHash);
  }, [
    balances, ledgerBalances, assetManagement.snapshots, assetManagement.preferences,
    assetManagement.ready, displayCurrency, activeCoinsForUser, allSubWallets, rates, accountHash,
  ]);

  useEffect(() => {
    getWidgets();
  }, [activeCoinsForUser, getWidgets]);

  useEffect(() => {
    sortWidgets();
  }, [widgetOrder, sortWidgets]);

  const refresh = useCallback(
    async (showLoading = false) => {
      const run = showLoading ? ++refreshRun.current : null;
      if (showLoading) setLoading(true);

      const serviceUpdates = [
        API_GET_SERVICE_ACCOUNT,
        API_GET_SERVICE_PAYMENT_METHODS,
        API_GET_SERVICE_RATES,
        API_GET_SERVICE_NOTIFICATIONS,
      ];

      const coinUpdates = [API_GET_FIATPRICE, API_GET_BALANCES, API_GET_INFO];

      // Plan the whole wallet refresh together so address requests can share a
      // batch. Service work runs alongside it without delaying wallet requests.
      const walletRefresh = conditionallyUpdateWallets(
        store.getState(),
        dispatch,
        coinUpdates.flatMap(updateId =>
          activeCoinsForUser.map(coin => ({chainTicker: coin.id, updateId})),
        ),
      ).catch(e => {
        console.warn('Error forcing wallet updates');
        console.warn(e);
      });

      for (const updateId of serviceUpdates) {
        try {
          await conditionallyUpdateService(store.getState(), dispatch, updateId);
        } catch (e) {
          console.warn('Error forcing update to ' + updateId);
          console.warn(e);
        }
      }

      await walletRefresh;
      if (showLoading && run === refreshRun.current) setLoading(false);
    },
    [activeCoinsForUser, dispatch],
  );

  const resetToScreen = (route, title, data) => {
    if (route === 'CoinMenus') {
      navigation.navigate(route, {title, data});
      return;
    }

    const mainNavigation = navigation.getParent()?.getParent();
    (mainNavigation || navigation).navigate(route, {title, data});
  };

  const forceUpdate = () => {
    activeCoinsForUser.forEach((coinObj) => {
      dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
      dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));
      dispatch(expireCoinData(coinObj.id, API_GET_INFO));
    });

    dispatch(expireServiceData(API_GET_SERVICE_ACCOUNT));
    dispatch(expireServiceData(API_GET_SERVICE_PAYMENT_METHODS));
    dispatch(expireServiceData(API_GET_SERVICE_RATES));
    dispatch(expireServiceData(API_GET_SERVICE_NOTIFICATIONS));

    refresh(true);
  };

  const getTotalBalances = () => {
    let _totalFiatBalance = BigNumber(0);
    let fiatComplete = true;
    let coinBalances = {};

    uniqueAssets(activeCoinsForUser).filter(coin =>
      Boolean(coin.testnet) === isTestnetAccount(activeAccount)).forEach((coinObj) => {
      const key = coinObj.id;
      const balance = getManagedAssetBalance(coinObj, allSubWallets[key], ledgerBalances, assetManagement.snapshots);
      coinBalances[key] = balance.total;

      // The value record keeps the amount of a hidden asset. The total counts
      // only the assets on Home.
      if (!isAssetShown(coinObj, assetManagement.preferences)) return;

      const rate = getRate(key, displayCurrency);

      if (rate != null) {
        const price = BigNumber(rate);
        if (!balance.complete) fiatComplete = false;
        if (balance.total != null) _totalFiatBalance = _totalFiatBalance.plus(balance.total.multipliedBy(price));
      }
    });

    return {
      // The Show on Home choices are not known before the assets are ready.
      fiat: fiatComplete && assetManagement.ready ? _totalFiatBalance.toNumber() : null,
      crypto: coinBalances,
    };
  };

  const getRate = (coinId, currency) => {
    return rates[WYRE_SERVICE] &&
      rates[WYRE_SERVICE][coinId] &&
      rates[WYRE_SERVICE][coinId][currency]
      ? rates[WYRE_SERVICE][coinId][currency]
      : rates[GENERAL] &&
        rates[GENERAL][coinId] &&
        rates[GENERAL][coinId][currency]
      ? rates[GENERAL][coinId][currency]
      : null;
  };

  const openCoin = (coinObj, subWallet) => {
    const openingCard = subWallet || getOpeningSubWallet({
      cards: allSubWallets[coinObj.id],
      balances: balances[coinObj.id],
      activeSubWallet: activeSubWallets[coinObj.id],
      userSelectedSubWallet: userSelectedSubWallets[coinObj.id],
      savedSelectedId: cardStackPreferences[coinObj.id]?.selectedId,
    });
    if (openingCard != null) {
      dispatch(setCoinSubWallet(coinObj.id, openingCard));
    }
    dispatch(setActiveCoin(coinObj));
    dispatch(setActiveApp(coinObj.default_app));
    dispatch(setActiveSection(coinObj.apps[coinObj.default_app].data[0]));

    resetToScreen('CoinMenus', 'Overview');
  };

  const findSection = (coinObj, sectionKey) => {
    for (const [appKey, app] of Object.entries(coinObj.apps || {})) {
      const section = (app.data || []).find(item => item.key === sectionKey);

      if (section) return {appKey, section};
    }

    return null;
  };

  const actionSources = useCallback(
    action => {
      const sectionKey =
        action === 'wallet-receive' ? WALLET_APP_RECEIVE : WALLET_APP_SEND;

      return activeCoinsForUser.flatMap(coinObj => {
        return (allSubWallets[coinObj.id] || [])
          .map(card => {
            const channel = card.api_channels?.[API_SEND];
            const hasBalance = BigNumber(
              balances?.[coinObj.id]?.[card.id]?.total || 0,
            ).isGreaterThan(0);
            const compatible = card.compatible_apps.includes(sectionKey);
            const actionAvailable =
              action === 'wallet-receive'
                ? compatible
                : compatible &&
                  Boolean(channel) &&
                  hasBalance &&
                  (action !== 'wallet-convert' ||
                    (!CONVERSION_DISABLED && isConversionChannel(channel)));
            const section = actionAvailable
              ? findSection(coinObj, sectionKey)
              : null;

            if (!section) return null;

            return {
              key: `${coinObj.id}:${card.id}`,
              title: `${coinObj.display_name} · ${card.name}`,
              description: card.network
                ? `${coinObj.display_ticker} on ${card.network}`
                : coinObj.display_ticker,
              coinObj,
              card,
              ...section,
            };
          })
          .filter(Boolean);
      });
    },
    [activeCoinsForUser, allSubWallets, balances],
  );

  const openActionSource = (source) => {
    dispatch(setCoinSubWallet(source.coinObj.id, source.card, true));
    dispatch(setActiveCoin(source.coinObj));
    dispatch(setActiveApp(source.appKey));
    dispatch(setActiveSection(source.section));
    resetToScreen('CoinMenus', source.section.name);
  };

  const signedInAssets = useMemo(() => {
    if (!assetManagement.ready) return [];
    return uniqueAssets(activeCoinsForUser)
      .filter(coin => Boolean(coin.testnet) === isTestnetAccount(activeAccount) &&
        isAssetShown(coin, assetManagement.preferences))
      .map(coin => {
        const cards = allSubWallets[coin.id] || [];
        const presentation = getAssetPresentation(coin, {cards});
        const holding = getManagedAssetBalance(coin, cards, ledgerBalances, assetManagement.snapshots);
        const balance = holding.total;
        const rate = getRate(coin.id, displayCurrency);
        const fiatValue = rate == null || balance == null || !holding.complete ? null : balance.multipliedBy(rate).toNumber();
        const preferredCard = getOpeningSubWallet({
          cards,
          balances: balances[coin.id],
          activeSubWallet: activeSubWallets[coin.id],
          userSelectedSubWallet: userSelectedSubWallets[coin.id],
          savedSelectedId: cardStackPreferences[coin.id]?.selectedId,
        });
        const statusDescription = getAssetStatusDescription(coin);
        const prelaunchInfo = prelaunchAssets.get(coin.id);
        const prelaunch = prelaunchInfo
          ? {
              badge: prelaunchInfo.facts?.countdown
                ? `Launches ${prelaunchInfo.facts.countdown}`
                : 'Pre-launch',
              preconverted: prelaunchInfo.totals?.length
                ? prelaunchInfo.totals
                    .map(total => `${BigNumber(total.amount)
                      .decimalPlaces(4, BigNumber.ROUND_DOWN)
                      .toFormat()} ${getCurrencyDisplay(
                        total.currencyId,
                        prelaunchInfo.facts?.names?.[total.currencyId],
                      ).ticker}`)
                    .join(' + ')
                : null,
            }
          : null;

        return {
          coin,
          prelaunch,
          presentation,
          balance,
          balanceComplete: holding.complete,
          rate,
          fiatValue,
          cardCount: cards.length,
          preferredCard,
          statusDescription,
        };
      })
      .sort((a, b) => {
        const fundedOrder = Number(b.balance?.isGreaterThan(0) || false) - Number(a.balance?.isGreaterThan(0) || false);
        if (fundedOrder !== 0) return fundedOrder;
        if (a.fiatValue != null && b.fiatValue != null && a.fiatValue !== b.fiatValue) {
          return b.fiatValue - a.fiatValue;
        }
        if (a.fiatValue != null && b.fiatValue == null) return -1;
        if (a.fiatValue == null && b.fiatValue != null) return 1;
        return a.presentation.name.localeCompare(b.presentation.name);
      });
  }, [
    activeCoinsForUser,
    activeSubWallets,
    userSelectedSubWallets,
    cardStackPreferences,
    allSubWallets,
    balances,
    displayCurrency,
    rates,
    totalCryptoBalances,
    activeAccount,
    assetManagement,
    ledgerBalances,
    prelaunchAssets,
  ]);

  // One card under the balance: the connection first, because balances are
  // not known without it; then Verus currencies found on the wallet's
  // addresses (never added by themselves); then private sync and an empty wallet.
  // Private sync and Wyre service errors do not count for the connection.
  const homeNotice = useMemo(() => {
    if (isConnected === false) return {kind: HOME_NOTICE_OFFLINE};

    const balanceFailed = signedInAssets.some(({coin}) =>
      (allSubWallets[coin.id] || []).some((card) => {
        const channel = card.api_channels?.[API_GET_BALANCES];
        const parentChannel = channel?.split('.')[0];

        return (
          channel != null &&
          parentChannel !== DLIGHT_PRIVATE &&
          parentChannel !== WYRE_SERVICE &&
          balanceErrors?.[coin.id]?.[card.id] != null
        );
      }),
    );
    if (balanceFailed) return {kind: HOME_NOTICE_UNREACHABLE};
    if (!assetManagement.ready) return null;

    // Found currencies wait for the user's review, also when Home has funds.
    if (foundAssets.length > 0) {
      return {kind: HOME_NOTICE_FOUND, count: foundAssets.length};
    }
    if (accountHash && !syncNoticeDismissed) {
      // SET_INFO stores the Dlight result at info[dlight_private][coin.id].
      // Include hidden active assets, but only this account's network and cards.
      const syncing = activeCoinsForUser
        .filter(coin => Boolean(coin.testnet) === isTestnetAccount(activeAccount) &&
          (allSubWallets[coin.id] || []).some(isPrivateCard))
        .map(coin => getPrivateSyncPercent(privateWalletInfo[coin.id]))
        .filter(percent => percent != null && percent < 99);
      if (syncing.length > 0) {
        return {kind: HOME_NOTICE_SYNC, percent: Math.floor(Math.min(...syncing))};
      }
    }
    if (prelaunchAssets.size > 0) return null;

    // Empty only when every transparent and VerusID card is known to hold 0,
    // pending funds included, and hidden assets too. A private card that has
    // not synced yet does not block it.
    const walletEmpty = uniqueAssets(activeCoinsForUser)
      .filter(coin => Boolean(coin.testnet) === isTestnetAccount(activeAccount))
      .every(coin => {
        const cards = allSubWallets[coin.id] || [];
        const privateCards = cards.filter(card => card.id === 'PRIVATE_WALLET');
        const otherCards = cards.filter(card => card.id !== 'PRIVATE_WALLET');
        const others = getManagedAssetBalance(coin, otherCards, ledgerBalances, assetManagement.snapshots);
        const privateBalance = getManagedAssetBalance(coin, privateCards, ledgerBalances, assetManagement.snapshots);

        return (
          (otherCards.length === 0 || (others.complete && others.total.isZero())) &&
          (privateBalance.total == null || privateBalance.total.isZero())
        );
      });

    return walletEmpty ? {kind: HOME_NOTICE_EMPTY} : null;
  }, [
    activeAccount,
    accountHash,
    activeCoinsForUser,
    allSubWallets,
    assetManagement,
    balanceErrors,
    foundAssets,
    isConnected,
    ledgerBalances,
    prelaunchAssets,
    privateWalletInfo,
    signedInAssets,
    syncNoticeDismissed,
  ]);

  // Update as soon as the connection returns, without a pull.
  const wasOffline = useRef(false);
  useEffect(() => {
    if (isConnected === false) {
      wasOffline.current = true;
    } else if (isConnected === true && wasOffline.current) {
      wasOffline.current = false;
      forceUpdate();
    }
  }, [isConnected]);

  // The chart draws the Home total, so it uses the same assets.
  const shownCoins = useMemo(
    () => activeCoinsForUser.filter(coin => isAssetShown(coin, assetManagement.preferences)),
    [activeCoinsForUser, assetManagement.preferences],
  );
  const portfolioHistory = usePortfolioHistory({
    account: activeAccount,
    activeCoins: shownCoins,
    balances: totalCryptoBalances,
    total: balanceAccountHash === accountHash ? totalFiatBalance : null,
    rates,
    currency: displayCurrency,
    ready: assetManagement.ready && balanceAccountHash === accountHash,
    refreshing: loading,
    testnetPrices,
  });

  const mainNavigation = navigation.getParent()?.getParent();
  const receiveAvailable = actionSources('wallet-receive').length > 0;
  const sendAvailable = actionSources('wallet-send').length > 0;
  const convertAvailable = actionSources('wallet-convert').length > 0;

  return (
    <SignedInWalletHome
      assets={signedInAssets}
      hiddenAssetCount={uniqueAssets(activeCoinsForUser).filter(coin =>
        Boolean(coin.testnet) === isTestnetAccount(activeAccount) &&
        !isAssetShown(coin, assetManagement.preferences)).length}
      assetsReady={assetManagement.ready}
      assetsLoadError={assetManagement.loadError}
      homeNotice={homeNotice}
      displayCurrency={displayCurrency}
      loading={loading}
      showBalance={showBalance}
      totalFiatBalance={balanceAccountHash === accountHash ? totalFiatBalance : null}
      history={portfolioHistory}
      onToggleBalance={() => dispatch({type: 'SET_BALANCE_SHOW'})}
      onSelectDisplayCurrency={setDisplayCurrencyFunc}
      onRefresh={forceUpdate}
      onOpenAsset={openCoin}
      convertAvailable={convertAvailable}
      receiveAvailable={receiveAvailable}
      sendAvailable={sendAvailable}
      onReceive={() => (mainNavigation || navigation).navigate('ReceiveAssetsList')}
      onSend={() =>
        (mainNavigation || navigation).navigate('SendWizard', {
          mode: SEND_WIZARD_MODE.SEND,
        })
      }
      onConvert={() =>
        (mainNavigation || navigation).navigate('SendWizard', {
          mode: SEND_WIZARD_MODE.CONVERT,
        })
      }
      onManageAssets={() =>
        (mainNavigation || navigation).navigate('ManageAssets')
      }
      onReviewFoundAssets={() => {
        reviewFoundAssets();
        (mainNavigation || navigation).navigate('ManageAssets');
      }}
      onDismissFoundAssets={reviewFoundAssets}
      onDismissSyncNotice={() => setSyncNoticeDismissed(true)}
    />
  );
};

export default Home;
