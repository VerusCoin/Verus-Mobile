// Home.render.js

import React from 'react';
import { View, RefreshControl } from 'react-native';
import { Provider, Portal, Banner } from 'react-native-paper';
import { truncateDecimal } from '../../utils/math';
import { HomeListItemThemeDark, HomeListItemThemeLight } from './Home.themes';
import HomeFAB from './HomeFAB/HomeFAB';
import CurrencyWidget from './HomeWidgets/CurrencyWidget';
import {
  SortableContainer,
  SortableGrid,
  SortableTile,
} from '../../components/DragSort';
import {
  CURRENCY_WIDGET_TYPE,
  TOTAL_UNI_BALANCE_WIDGET_TYPE,
  VERUSID_WIDGET_TYPE,
} from '../../utils/constants/widgets';
import { setAndSaveAccountWidgets } from '../../actions/actionCreators';
import TotalUniBalanceWidget from './HomeWidgets/TotalUniBalanceWidget';
import ListSelectionModal from '../../components/ListSelectionModal/ListSelectionModal';
import {
  CURRENCY_NAMES,
  SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES,
} from '../../utils/constants/currencies';
import VerusIdWidget from './HomeWidgets/VerusIdWidget';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import NotificationWidget from './HomeWidgets/NotificationWidget';

export const HomeRender = ({
  dragDetectionEnabled,
  displayCurrencyModalOpen,
  displayCurrency,
  setDisplayCurrency,
  setDisplayCurrencyModalOpen,
  editingCards,
  setEditingCards,
  _addCoin,
  _verusPay,
  _addPbaasCurrency,
  _addErc20Token,
  forceUpdate,
  loading,
  HomeRenderCoinsList,
}) => {
  const dragDetection = dragDetectionEnabled();

  return (
    <Portal.Host>
      <Portal>
        {displayCurrencyModalOpen && (
          <ListSelectionModal
            title="Currencies"
            selectedKey={displayCurrency}
            visible={displayCurrencyModalOpen}
            onSelect={(item) => setDisplayCurrency(item.key)}
            data={SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES.map((key) => {
              return {
                key,
                title: key,
                description: CURRENCY_NAMES[key],
              };
            })}
            cancel={() => setDisplayCurrencyModalOpen(false)}
          />
        )}
      </Portal>
      <HomeFAB
        handleAddCoin={_addCoin}
        handleVerusPay={_verusPay}
        handleEditCards={() => setEditingCards(!editingCards)}
        handleAddPbaasCurrency={_addPbaasCurrency}
        handleAddErc20Token={_addErc20Token}
        showConfigureHomeCards={!dragDetection}
      />
      <Banner
        visible={editingCards}
        elevation={5}
        actions={[
          {
            label: 'Done',
            onPress: () => setEditingCards(false),
          },
        ]}
      >
        {'Drag your cards into your desired configuration, then press done.'}
      </Banner>
      {HomeRenderCoinsList()}
    </Portal.Host>
  );
};

export const HomeRenderCoinsList = ({
  widgets,
  dragDetectionEnabled,
  editingCards,
  loading,
  forceUpdate,
  handleWidgetPress,
  dispatch,
  navigation,
  activeAccount,
  HomeRenderWidget,
}) => {
  const dragDetection = dragDetectionEnabled();

  return widgets.length == 0 ? (
    <View />
  ) : (
    <View
      style={{
        height: '100%',
        backgroundColor: 'white',
        width: '100%',
        overflow: 'visible',
      }}
    >
      <NotificationWidget 
        dispatch={dispatch}
        navigation={navigation}
      />
      <SortableContainer customconfig={{}}>
        <SortableGrid
          minDist={dragDetection ? 60 : 0}
          animate={dragDetection ? true : editingCards}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={forceUpdate} />
          }
          onPressDetected={!editingCards ? (id) => handleWidgetPress(id) : () => {}}
          editing={true}
          onDragEnd={(positions) =>
            dispatch(setAndSaveAccountWidgets(positions, activeAccount.accountHash))
          }
        >
          {widgets.map((widgetId, index) => (
            <SortableTile key={index} id={widgetId}>
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'visible',
                }}
              >
                {HomeRenderWidget(widgetId)}
              </View>
            </SortableTile>
          ))}
        </SortableGrid>
      </SortableContainer>
    </View>
  );
};

export const HomeRenderWidget = ({
  widgetId,
  totalCryptoBalances,
  totalFiatBalance,
}) => {
  const widgetSplit = widgetId.split(':');
  const widgetType = widgetSplit[0];

  const renderers = {
    [CURRENCY_WIDGET_TYPE]: () => {
      const coinId = widgetSplit[1];
      const coinObj = CoinDirectory.findCoinObj(coinId);

      const balance =
        totalCryptoBalances[coinObj.id] == null
          ? null
          : truncateDecimal(totalCryptoBalances[coinObj.id], 8);

      return (
        <Provider theme={HomeListItemThemeDark}>
          <CurrencyWidget currencyBalance={balance} coinObj={coinObj} />
        </Provider>
      );
    },
    [TOTAL_UNI_BALANCE_WIDGET_TYPE]: () => {
      return (
        <Provider theme={HomeListItemThemeLight}>
          <TotalUniBalanceWidget totalBalance={totalFiatBalance} />
        </Provider>
      );
    },
    [VERUSID_WIDGET_TYPE]: () => {
      return (
        <Provider theme={HomeListItemThemeLight}>
          <VerusIdWidget />
        </Provider>
      );
    },
  };

  return renderers[widgetType] ? renderers[widgetType]() : <View />;
};