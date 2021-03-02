import React from "react";
import { CoinLogos } from "../../utils/CoinData/CoinData";
import { 
  View, 
  FlatList,
  ScrollView,
  RefreshControl,
  Animated
} from "react-native";
import { List, Text, Card, IconButton, Provider, Portal, TouchableRipple } from 'react-native-paper';
import { SUBWALLET_NAMES } from "../../utils/constants/constants";
import { truncateDecimal } from "../../utils/math";
import BigNumber from "bignumber.js";
import styles from "../../styles";
import { HomeListItemThemeDark, HomeListItemThemeLight } from "./Home.themes";
import Colors from "../../globals/colors";
import HomeFAB from "./HomeFAB/HomeFAB";
import { triggerLightHaptic } from "../../utils/haptics/haptics";

export const HomeRender = function() {
  return (
    <Portal.Host>
      <ScrollView
        style={{...styles.fullWidth, ...styles.backgroundColorWhite}}
        refreshControl={
          <RefreshControl
            refreshing={this.state.loading}
            onRefresh={this.forceUpdate}
          />
        }
      >
        <HomeFAB 
          handleAddCoin={() => this._addCoin()}
          handleVerusPay={() => this._verusPay()}
        />
        <List.Section>
          <View
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexDirection: "row",
              padding: 8
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{"Wallets"}</Text>
            <View style={{ display: "flex", flexDirection: "column" }}>
              <Text style={{ fontSize: 10 }}>{"Total Value"}</Text>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>{`${
                this.state.totalFiatBalance
              } ${this.props.displayCurrency}`}</Text>
            </View>
          </View>
          {HomeRenderCoinsList.call(this)}
        </List.Section>
      </ScrollView>
    </Portal.Host>
  );
};

export const HomeRenderCoinsList = function() {
  const { activeCoinsForUser } = this.props;
  
  return (
    <FlatList
      data={activeCoinsForUser}
      scrollEnabled={false}
      renderItem={({ item, index }) => {
        const coinObj = activeCoinsForUser[index]

        return HomeListItemRender.call(this, coinObj, true, null)
      }}
      keyExtractor={(item) => item.id}
    />
  )
}

export const renderFiatBalance = function(balance, ticker) {
  const { rates, displayCurrency } = this.props

  return (
    <Text>
      {(balance == null ||
      rates[ticker] == null ||
      rates[ticker][displayCurrency] == null
        ? "-"
        : truncateDecimal(
            BigNumber(rates[ticker][displayCurrency]).multipliedBy(
              BigNumber(balance)
            ),
            2
          )) +
        " " +
        displayCurrency}
    </Text>
  );
}

/**
 * Render a list item for a cryptocurrency in your wallet
 * @param {Object} coinObj The coin object
 * @param {Boolean} isParent Whether or not the list item is a parent
 * @param {Object} subWallet The subwallet (child only)
 */
export const HomeListItemRender = function(coinObj, isParent, subWallet, index = 0) {
  const ticker = coinObj.id
  const expanded = this.state.expandedListItems[coinObj.id]
  const subWallets = this.props.allSubWallets[coinObj.id]
  const balance = isParent
    ? (this.state.totalCryptoBalances[coinObj.id] == null
      ? null
      : this.state.totalCryptoBalances[coinObj.id].toString())
    : this.props.balances[coinObj.id] &&
      this.props.balances[coinObj.id][subWallet.id] != null
    ? this.props.balances[coinObj.id][subWallet.id].total.toString()
    : null;
  const syncProgress = isParent ? null : this.calculateSyncProgress(coinObj, subWallet)
  const Logo = CoinLogos[ticker.toLowerCase()] ? CoinLogos[ticker.toLowerCase()].light : null
  const balanceErrors = this.props.balanceErrors[coinObj.id]
  const subWalletError = isParent || balanceErrors == null ? null : balanceErrors[subWallet.id]

  return (
    <Provider
      theme={isParent ? HomeListItemThemeDark : HomeListItemThemeLight}
      key={index}
    >
      <Animated.View
        style={{
          height: isParent
            ? this.state.listItemHeights[coinObj.id]
            : this.LIST_ITEM_INITIAL_HEIGHT,
          margin: 8,
          marginTop: index > 0 ? 4 : 8,
        }}
      >
        <TouchableRipple
          onPress={() =>
            this.openCoin(
              coinObj,
              isParent
                ? this.props.activeSubWallets[ticker]
                  ? this.props.activeSubWallets[ticker]
                  : subWallets[0]
                : subWallet
            )
          }
          onLongPress={() => {
            if (isParent) {
              triggerLightHaptic();
              this.toggleListItem(coinObj.id, subWallets.length);
            }
          }}
          rippleColor="rgba(0, 0, 0, .32)"
        >
          <Card
            elevation={isParent ? 2 : 0}
            style={{
              height: "100%",
              backgroundColor: isParent
                ? coinObj.theme_color
                  ? coinObj.theme_color
                  : "#1C1C1C"
                : "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <List.Item
              expanded={expanded}
              left={(props) => (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {isParent ? (
                    <Logo
                      style={{
                        alignSelf: "center",
                        marginLeft: 8,
                        marginRight: 8,
                      }}
                      width={25}
                      height={25}
                    />
                  ) : (
                    <List.Icon
                      icon="wallet"
                      color={subWallet.color}
                      style={{
                        alignSelf: "center",
                        margin: 0,
                        padding: 0,
                      }}
                      size={30}
                    />
                  )}
                  <View
                    {...props}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        textAlign: "left",
                        fontWeight: "500",
                      }}
                    >
                      {isParent
                        ? coinObj.display_name
                        : SUBWALLET_NAMES[subWallet.id]}
                    </Text>
                    <View
                      style={{
                        fontSize: 14,
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "row",
                      }}
                    >
                      <Text style={{ fontWeight: "500" }}>
                        {balance || "-"}
                      </Text>
                      <Text
                        style={{ fontWeight: "300" }}
                      >{` ${ticker}`}</Text>
                    </View>
                  </View>
                </View>
              )}
              right={(props) => {
                return (
                  <View
                    {...props}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "space-between",
                      }}
                    >
                      <View
                        style={{
                          fontSize: 14,
                          textAlign: "right",
                          display: "flex",
                          flexDirection: "row",
                        }}
                      >
                        <Text style={{ fontWeight: "300" }}>
                          {isParent || syncProgress == 100
                            ? renderFiatBalance.call(
                                this,
                                balance,
                                coinObj.id
                              )
                            : syncProgress == -1
                            ? "Error"
                            : "Syncing "}
                        </Text>
                        {syncProgress != 100 &&
                          syncProgress != -1 &&
                          !isParent && (
                            <Text style={{ fontWeight: "500" }}>
                              {`${syncProgress.toFixed(2)}%`}
                            </Text>
                          )}
                      </View>
                      {(isParent || subWalletError != null) && (
                        <View
                          style={{
                            fontSize: 14,
                            textAlign: "right",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          {isParent && (
                            <Text style={{ fontWeight: "500" }}>
                              {subWallets.length}
                            </Text>
                          )}
                          {(isParent || subWalletError != null) && (
                            <Text
                              style={{
                                fontWeight: "300",
                                color:
                                  subWalletError != null
                                    ? Colors.warningButtonColor
                                    : Colors.secondaryColor,
                              }}
                            >
                              {subWalletError != null
                                ? "Connection Error"
                                : ` Card${subWallets.length == 1 ? "" : "s"}`}
                            </Text>
                          )}
                          {isParent &&
                            balanceErrors != null &&
                            (Object.values(balanceErrors).some(
                              (value) => value != null
                            ) && (
                              <IconButton
                                icon="alert"
                                color={"white"}
                                style={{
                                  margin: 0,
                                  padding: 0,
                                }}
                                size={15}
                              />
                            ))}
                        </View>
                      )}
                    </View>
                    <IconButton
                      {...props}
                      style={{ alignSelf: "center" }}
                      onPress={
                        isParent
                          ? () =>
                              this.toggleListItem(
                                coinObj.id,
                                subWallets.length
                              )
                          : null
                      }
                      icon={
                        !isParent
                          ? "chevron-right"
                          : expanded
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                    />
                  </View>
                );
              }}
              style={{ padding: 8, paddingRight: 0 }}
            />
            {expanded &&
              isParent &&
              subWallets.map((wallet, index) =>
                HomeListItemRender.call(this, coinObj, false, wallet, index)
              )}
          </Card>
        </TouchableRipple>
      </Animated.View>
    </Provider>
  );
}