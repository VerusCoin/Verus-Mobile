/*
  The purpose of this component is to be the first screen a user is
  met with after login. This screen should have all necessary or
  essential wallet components available at the press of one button.
  This includes VerusPay, adding coins, and coin menus. Keeping this
  screen clean is also essential, as users will spend a lot of time with
  it in their faces. It updates the balances and the rates upon loading
  if they are flagged to be updated in the redux store.
*/

import React, { useState, useEffect, useCallback } from 'react';
import {
  setActiveCoin,
  setActiveApp,
  setActiveSection,
  expireCoinData,
  setCoinSubWallet,
  expireServiceData,
  saveGeneralSettings,
} from '../../actions/actionCreators';
import { CommonActions, useNavigation, useFocusEffect } from '@react-navigation/native';
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
} from '../../utils/constants/intervalConstants';
import { USD } from '../../utils/constants/currencies';
import {
  conditionallyUpdateService,
  conditionallyUpdateWallet,
  dispatchAddWidget,
} from '../../actions/actionDispatchers';
import BigNumber from 'bignumber.js';
import {
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import { HomeRender, HomeRenderCoinsList, HomeRenderWidget } from './Home.render';
import { extractDisplaySubWallets } from '../../utils/subwallet/extractSubWallets';
import {
  CURRENCY_WIDGET_TYPE,
  TOTAL_UNI_BALANCE_WIDGET_TYPE,
  VERUSID_WIDGET_TYPE,
} from '../../utils/constants/widgets';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import { VERUSID_SERVICE_ID } from '../../utils/constants/services';
import { dragDetectionEnabled } from '../../utils/dragDetection';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import {
  openAddErc20TokenModal,
  openAddPbaasCurrencyModal,
} from '../../actions/actions/sendModal/dispatchers/sendModal';
import { useSelector, useDispatch } from 'react-redux';
import store from '../../store';
import { useObjectSelector } from '../../hooks/useObjectSelector';

const Home = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const activeCoinsForUser = useObjectSelector((state) => state.coins.activeCoinsForUser);

  const activeAccount = useObjectSelector((state) => state.authentication.activeAccount);
  const testnetOverrides = useObjectSelector(
    (state) => state.authentication.activeAccount.testnetOverrides,
  );
  const balances = useObjectSelector((state) =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const rates = useObjectSelector((state) => state.ledger.rates);
  const allSubWallets = useObjectSelector((state) => extractDisplaySubWallets(state));
  const activeSubWallets = useObjectSelector((state) => state.coinMenus.activeSubWallets);
  const widgetOrder = useObjectSelector((state) => state.widgets.order);

  const homeCardDragDetection = useSelector(
    (state) => state.settings.generalWalletSettings.homeCardDragDetection,
  );
  const displayCurrency = useSelector(
    (state) => state.settings.generalWalletSettings.displayCurrency || USD,
  );

  const [totalFiatBalance, setTotalFiatBalance] = useState(0);
  const [totalCryptoBalances, setTotalCryptoBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [listItemHeights, setListItemHeights] = useState({});
  const [widgets, setWidgets] = useState([]);
  const [displayCurrencyModalOpen, setDisplayCurrencyModalOpen] = useState(false);
  const [editingCards, setEditingCards] = useState(false);
  const [expandedListItems, setExpandedListItems] = useState({});

  const LIST_ITEM_INITIAL_HEIGHT = 58;
  const LIST_ITEM_MARGIN = 8;
  const LIST_ITEM_ANIMATION_DURATION = 250;

  const isDragDetectionEnabled = () => {
    return dragDetectionEnabled(homeCardDragDetection);
  };

  const handleSetEditingCards = (editing) => {
    setEditingCards(editing);
  };

  const sortWidgets = useCallback(() => {
    setWidgets((prevWidgets) => {
      const sortedWidgets = [...prevWidgets].sort((a, b) => {
        return widgetOrder[a] <= widgetOrder[b] ? -1 : 1;
      });
      return sortedWidgets;
    });
  }, [widgetOrder]);

  const getWidgets = useCallback(async () => {
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
      dispatchAddWidget(TOTAL_UNI_BALANCE_WIDGET_TYPE, activeAccount.accountHash);
    }

    // Add currency widgets for active coins
    for (const coinObj of activeCoinsForUser) {
      const currencyWidgetId = `${CURRENCY_WIDGET_TYPE}:${coinObj.id}`;

      if (!widgetsList.includes(currencyWidgetId)) {
        widgetsList.push(currencyWidgetId);
        dispatchAddWidget(currencyWidgetId, activeAccount.accountHash);
      }
    }

    // Add the VerusID widget if not present
    if (!widgetsList.includes(VERUSID_WIDGET_TYPE)) {
      widgetsList.push(VERUSID_WIDGET_TYPE);
      dispatchAddWidget(VERUSID_WIDGET_TYPE, activeAccount.accountHash);
    }

    setWidgets(widgetsList);
  }, [activeAccount.accountHash, activeCoinsForUser, widgetOrder]);

  const handleWidgetPress = (widgetId) => {
    const widgetSplit = widgetId.split(':');
    const widgetType = widgetSplit[0];

    const widgetOnPress = {
      [CURRENCY_WIDGET_TYPE]: () => {
        const coinId = widgetSplit[1];
        const coinObj = activeCoinsForUser.find((x) => x.id === coinId);

        if (coinObj) {
          const subWallets = allSubWallets[coinId];

          openCoin(
            coinObj,
            activeSubWallets[coinId] ? activeSubWallets[coinId] : subWallets[0],
          );
        }
      },
      [TOTAL_UNI_BALANCE_WIDGET_TYPE]: () => {
        setDisplayCurrencyModalOpen(true);
      },
      [VERUSID_WIDGET_TYPE]: () => {
        navigation.navigate('Service', {
          service: VERUSID_SERVICE_ID,
        });
      },
    };

    if (widgetOnPress[widgetType]) {
      widgetOnPress[widgetType]();
    }
  };

  const setDisplayCurrencyFunc = async (currency) => {
    try {
      dispatch(await saveGeneralSettings({ displayCurrency: currency }));
    } catch (e) {
      createAlert('Error setting display currency', e.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refresh(false);
      return () => {};
    }, []),
  );

  useEffect(() => {
    getWidgets();
  }, [getWidgets]);

  useEffect(() => {
    const totalBalances = getTotalBalances();
    setTotalFiatBalance(totalBalances.fiat);
    setTotalCryptoBalances(totalBalances.crypto);
  }, [balances, displayCurrency, activeCoinsForUser, allSubWallets]);

  useEffect(() => {
    getWidgets();
  }, [activeCoinsForUser, getWidgets]);

  useEffect(() => {
    sortWidgets();
  }, [widgetOrder, sortWidgets]);

  const refresh = useCallback(
    async (showLoading = true) => {
      setLoading(showLoading);

      const serviceUpdates = [
        API_GET_SERVICE_ACCOUNT,
        API_GET_SERVICE_PAYMENT_METHODS,
        API_GET_SERVICE_RATES,
        API_GET_SERVICE_NOTIFICATIONS,
      ];

      const coinUpdates = [API_GET_FIATPRICE, API_GET_BALANCES, API_GET_INFO];

      const updates = [
        {
          keys: serviceUpdates,
          update: conditionallyUpdateService,
          params: [[dispatch]],
        },
        {
          keys: coinUpdates,
          update: conditionallyUpdateWallet,
          params: activeCoinsForUser.map((coinObj) => {
            return [dispatch, coinObj.id];
          }),
        },
      ];

      for (const update of updates) {
        for (const key of update.keys) {
          try {
            for (const paramList of update.params) {
              await update.update(store.getState(), ...paramList, key);
            }
          } catch (e) {
            console.warn('Error forcing update to ' + key);
            console.warn(e);
          }
        }
      }

      setLoading(false);
    },
    [activeCoinsForUser, dispatch],
  );

  const resetToScreen = (route, title, data) => {
    const resetAction = CommonActions.reset({
      index: 1,
      routes: [
        { name: 'Home' },
        { name: route, params: { title: title, data: data } },
      ],
    });

    navigation.closeDrawer();
    navigation.dispatch(resetAction);
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

    refresh();
  };

  const getTotalBalances = () => {
    let _totalFiatBalance = BigNumber(0);
    let coinBalances = {};

    activeCoinsForUser.forEach((coinObj) => {
      const key = coinObj.id;
      coinBalances[coinObj.id] = BigNumber(0);

      allSubWallets[coinObj.id].forEach((wallet) => {
        if (balances[coinObj.id] != null && balances[coinObj.id][wallet.id] != null) {
          coinBalances[coinObj.id] = coinBalances[coinObj.id].plus(
            balances[key] &&
              balances[key][wallet.id] &&
              balances[key][wallet.id].total != null
              ? BigNumber(balances[key][wallet.id].total)
              : BigNumber(0),
          );
        }
      });

      const rate = getRate(key, displayCurrency);

      if (rate != null) {
        const price = BigNumber(rate);

        _totalFiatBalance = _totalFiatBalance.plus(
          coinBalances[coinObj.id].multipliedBy(price),
        );
      }
    });

    return {
      fiat: _totalFiatBalance.toNumber(),
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

  const _verusPay = () => {
    navigation.navigate('VerusPay');
  };

  const openCoin = (coinObj, subWallet) => {
    if (subWallet != null) {
      dispatch(setCoinSubWallet(coinObj.id, subWallet));
    }
    dispatch(setActiveCoin(coinObj));
    dispatch(setActiveApp(coinObj.default_app));
    dispatch(setActiveSection(coinObj.apps[coinObj.default_app].data[0]));

    resetToScreen('CoinMenus', 'Overview');
  };

  const _addCoin = () => {
    navigation.navigate('AddCoin', { refresh: refresh });
  };

  const _addPbaasCurrency = async () => {
    openAddPbaasCurrencyModal(
      CoinDirectory.findCoinObj(testnetOverrides.VRSC ? testnetOverrides.VRSC : 'VRSC'),
    );
  };

  const _addErc20Token = () => {
    openAddErc20TokenModal(
      CoinDirectory.findCoinObj(testnetOverrides.ETH ? testnetOverrides.ETH : 'ETH'),
    );
  };

  return (
    <HomeRender
      dragDetectionEnabled={isDragDetectionEnabled}
      displayCurrencyModalOpen={displayCurrencyModalOpen}
      displayCurrency={displayCurrency}
      setDisplayCurrency={setDisplayCurrencyFunc}
      setDisplayCurrencyModalOpen={setDisplayCurrencyModalOpen}
      editingCards={editingCards}
      setEditingCards={handleSetEditingCards}
      _addCoin={_addCoin}
      _verusPay={_verusPay}
      _addPbaasCurrency={_addPbaasCurrency}
      _addErc20Token={_addErc20Token}
      forceUpdate={forceUpdate}
      loading={loading}
      HomeRenderCoinsList={() =>
        HomeRenderCoinsList({
          widgets,
          dragDetectionEnabled: isDragDetectionEnabled,
          editingCards,
          loading,
          forceUpdate,
          handleWidgetPress,
          dispatch,
          navigation,
          activeAccount,
          totalCryptoBalances,
          totalFiatBalance,
          HomeRenderWidget: (widgetId) =>
            HomeRenderWidget({
              widgetId,
              totalCryptoBalances,
              totalFiatBalance,
            }),
        })
      }
    />
  );
};

export default Home;