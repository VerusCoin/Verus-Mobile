import React from "react";
import { CoinLogos, findCoinObj } from "../../utils/CoinData/CoinData";
import { 
  View, 
  FlatList,
  ScrollView,
  RefreshControl,
  Animated
} from "react-native";
import { List, Text, Card, IconButton, Provider, Portal, TouchableRipple } from 'react-native-paper';
import { truncateDecimal } from "../../utils/math";
import BigNumber from "bignumber.js";
import styles from "../../styles";
import { HomeListItemThemeDark, HomeListItemThemeLight } from "./Home.themes";
import Colors from "../../globals/colors";
import HomeFAB from "./HomeFAB/HomeFAB";
import { triggerLightHaptic } from "../../utils/haptics/haptics";
import TestDrag from "./test";
import CurrencyWidget from "./HomeWidgets/CurrencyWidget";
import { SortableContainer, SortableGrid, SortableTile } from "../../components/DragSort";
import { CURRENCY_WIDGET_TYPE } from "../../utils/constants/widgets";
import { setAndSaveAccountWidgets } from "../../actions/actionCreators";

export const HomeRender = function() {
  return (
    <Portal.Host>
        <HomeFAB 
          handleAddCoin={() => this._addCoin()}
          handleVerusPay={() => this._verusPay()}
        />
        {HomeRenderCoinsList.call(this)}
    </Portal.Host>
  );
};

export const HomeRenderWidget = function(widgetId) {
  const widgetSplit = widgetId.split(":")
  const widgetType = widgetSplit[0]

  const renderers = {
    [CURRENCY_WIDGET_TYPE]: () => {
      const coinId = widgetSplit[1]
      const coinObj = findCoinObj(coinId)

      const balance = this.state.totalCryptoBalances[coinObj.id] == null
          ? null
          : truncateDecimal(this.state.totalCryptoBalances[coinObj.id], 8)

      return (
        <Provider theme={HomeListItemThemeDark}>
          <CurrencyWidget currencyBalance={balance} coinObj={coinObj} />
        </Provider>
      );
    },
  };

  return renderers[widgetType] ? renderers[widgetType]() : <View />
}

export const HomeRenderCoinsList = function() {
  const { widgets } = this.state;

  return widgets.length == 0 ? (
    <View />
  ) : (
    <View
      style={{
        height: '100%',
        backgroundColor: 'white',
        width: '100%',
        overflow: 'visible',
      }}>
      <SortableContainer customconfig={{}}>
        <SortableGrid
          refreshControl={
            <RefreshControl
              refreshing={this.state.loading}
              onRefresh={this.forceUpdate}
            />
          }
          onPressDetected={(id) => this.handleWidgetPress(id)}
          editing={true}
          onDragEnd={positions =>
            this.props.dispatch(
              setAndSaveAccountWidgets(
                positions,
                this.props.activeAccount.accountHash,
              ),
            )
          }>
          {widgets
            .filter(x => x !== 'totalunibalance')
            .map((widgetId, index) => (
              <SortableTile key={index} id={widgetId}>
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'visible',
                    paddingTop: 12,
                  }}>
                  {HomeRenderWidget.call(this, widgetId)}
                </View>
              </SortableTile>
            ))}
        </SortableGrid>
      </SortableContainer>
    </View>
  );



  // return activeCoinsForUser.map((item, index) => {
  //   return HomeListItemRender.call(
  //     this,
  //     activeCoinsForUser[index],
  //     true,
  //     null,
  //     index,
  //     activeCoinsForUser.length
  //   );
  // })
}

export const renderFiatBalance = function (balance, ticker) {
  const { displayCurrency } = this.props;
  const rate = this.getRate(ticker, displayCurrency);

  return (
    <Text>
      {(balance == null || rate == null
        ? "-"
        : truncateDecimal(BigNumber(rate).multipliedBy(BigNumber(balance)), 2)) +
        " " +
        displayCurrency}
    </Text>
  );
};

/**
 * Render a list item for a cryptocurrency in your wallet
 * @param {Object} coinObj The coin object
 * @param {Boolean} isParent Whether or not the list item is a parent
 * @param {Object} subWallet The subwallet (child only)
 */
export const HomeListItemRender = function(coinObj, isParent, subWallet, index = 0, length) {
  const balance = isParent
    ? (this.state.totalCryptoBalances[coinObj.id] == null
      ? null
      : truncateDecimal(this.state.totalCryptoBalances[coinObj.id], 8))
    : this.props.balances[coinObj.id] &&
      this.props.balances[coinObj.id][subWallet.id] != null
    ? truncateDecimal(this.props.balances[coinObj.id][subWallet.id].total, 8)
    : null;

  return (
    <Provider key={index} theme={HomeListItemThemeDark}>
      <CurrencyWidget 
        currencyBalance={balance}
        coinObj={coinObj}
      />
    </Provider>
  );
}