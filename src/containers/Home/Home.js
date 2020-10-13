/*
  The purpose of this component is to be the first screen a user is
  met with after login. This screen should have all necesarry or
  essential wallet components available at the press of one button.
  This includes VerusPay, adding coins, and coin menus. Keeping this
  screen clean is also essential, as users will spend alot of time with
  it in their faces. It updates the balances and the rates upon loading
  if they are flagged to be updated in the redux store.
*/

import React, { Component } from "react";
import { ListItem, Divider, Button } from "react-native-elements";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from "react-native";
import {
  setActiveCoin,
  setActiveApp,
  setActiveSection,
  setActiveSectionBuySellCrypto,
  expireData,
} from '../../actions/actionCreators';
import { connect } from 'react-redux';
import { truncateDecimal } from '../../utils/math';
import { CommonActions } from '@react-navigation/native';
import Styles from '../../styles/index'
import Colors from "../../globals/colors";
import Store from '../../store/index'
import { API_GET_FIATPRICE, API_GET_ADDRESSES, API_GET_BALANCES, API_GET_INFO, ELECTRUM, DLIGHT, GENERAL, USD } from "../../utils/constants/intervalConstants";
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";
import VerusLightClient from 'react-native-verus-light-client';

const CONNECTION_ERROR = "Connection Error"

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      totalFiatBalance: this.getTotalFiatBalance(props),
      loading: false
    };

    this.updateProps = this.updateProps.bind(this);
    this._unsubscribeFocus = null
  }

  componentDidMount() {
    this._unsubscribeFocus = this.props.navigation.addListener('focus', () => {
      this.refresh();
    });
  }

  componentWillUnmount() {
    this._unsubscribeFocus()
  }

  refresh = () => {
    this.setState({ loading: true }, () => {
      Promise.all(this.props.activeCoinsForUser.map(async (coinObj) => {
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_FIATPRICE)
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_BALANCES)
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_INFO)
      })).then(res => {
        this.setState({ loading: false })
      })
      .catch(error => {
        this.setState({ loading: false })
        console.warn(error)
      })
    })

  }

  resetToScreen = (route, title, data) => {
    const resetAction = CommonActions.reset({
      index: 1, // <-- currect active route from actions array
      routes: [
        { name: "Home" },
        { name: route, params: { title: title, data: data } },
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  forceUpdate = () => {
    this.props.activeCoinsForUser.map(coinObj => {
      this.props.dispatch(expireData(coinObj.id, API_GET_FIATPRICE))
      this.props.dispatch(expireData(coinObj.id, API_GET_BALANCES))
      this.props.dispatch(expireData(coinObj.id, API_GET_INFO))
    })

    this.refresh();
  }




  updateProps = (promiseArray) => {
    return new Promise((resolve, reject) => {
      Promise.all(promiseArray)
        .then((updatesArray) => {
          if (updatesArray.length > 0) {
            for (let i = 0; i < updatesArray.length; i++) {
              if(updatesArray[i]) {
                this.props.dispatch(updatesArray[i])
              }
            }
            if (this.state.loading) {
              this.setState({ loading: false });
            }
            return true
          }
          else {
            return false
          }
        })
        .then((res) => {
          if (res) {
            this.setState({ totalFiatBalance: this.getTotalFiatBalance(this.props) })
            resolve(true)
          }
          else {
            resolve(false)
          }
        })
    })
  }

  getTotalFiatBalance = (props) => {
    let _totalFiatBalance = 0
    let coinBalance = 0
    const balances = props.balances.public
    const { rates, displayCurrency } = props
    const balanceErrors = props.balances.errors.public

    for (let key in rates) {
      if (rates[key][displayCurrency]) {
        const price = rates[key][displayCurrency]

        coinBalance = balances.hasOwnProperty(key) && !balanceErrors[key] && !isNaN(balances[key].confirmed) ?
        truncateDecimal(balances[key].confirmed, 4) : 0

        _totalFiatBalance += coinBalance*price
      }
    }

    return _totalFiatBalance.toFixed(2)
  }

  _verusPay = () => {
    let navigation = this.props.navigation

    navigation.navigate("VerusPay", { refresh: this.refresh });
  }

  _openCoin = (coinObj) => {
    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(coinObj.defaultApp))
    this.props.dispatch(setActiveSection(coinObj.apps[coinObj.defaultApp].data[0]))

    this.resetToScreen('CoinMenus', 'Overview');
  }

  _handleIdentity = () => {
    let navigation = this.props.navigation ;
    navigation.navigate("Identity", { selectedScreen: "Identity" } );
  }

  _addCoin = () => {
    let navigation = this.props.navigation
    navigation.navigate("AddCoin", { refresh: this.refresh });
  }

  _buySellCrypto = () => {
    let navigation = this.props.navigation
    this.props.dispatch(setActiveSectionBuySellCrypto('buy-crypto'))

    navigation.navigate("BuySellCryptoMenus", {title: "Buy"});
  }

  handleScanToVerify = () => {
    this.props.navigation.navigate('ScanBadge');
  }

  onKYCScreen = () => {
    this.props.navigation.navigate("KYCLogin");
  }

  renderCoinList = () => {
    const { rates, balances, activeCoinsForUser, displayCurrency } = this.props;

    return (
      <ScrollView
        style={Styles.wide}
        refreshControl={
          <RefreshControl
            refreshing={this.state.loading}
            onRefresh={this.forceUpdate}
          />
        }
      >
        <TouchableOpacity onPress={this._verusPay}>
          <ListItem
            title={
              <Text style={Styles.listItemLeftTitleDefault}>VerusPay</Text>
            }
            hideChevron
            leftAvatar={{
              source: require("../../images/customIcons/verusPay.png"),
            }}
            containerStyle={Styles.bottomlessListItemContainer}
          />
        </TouchableOpacity>
        {global.ENABLE_VERUS_IDENTITIES &&
          activeCoinsForUser.some(
            (coin) => coin.id === "VRSC" || coin.id === "ZECTEST"
          ) && (
            <View>
              <TouchableOpacity onPress={this._handleIdentity}>
                <ListItem
                  title={
                    <Text style={Styles.listItemLeftTitleDefault}>
                      Identity
                    </Text>
                  }
                  hideChevron
                  leftAvatar={{
                    source: require("../../images/customIcons/id-card.png"),
                  }}
                  containerStyle={Styles.bottomlessListItemContainer}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={this.handleScanToVerify}>
                <ListItem
                  title={
                    <Text style={Styles.listItemLeftTitleDefault}>
                      Scan to verify
                    </Text>
                  }
                  hideChevron
                  leftAvatar={{
                    source: require("../../images/customIcons/verusPay.png"),
                  }}
                  containerStyle={Styles.bottomlessListItemContainer}
                />
              </TouchableOpacity>
            </View>
          )}
        <FlatList
          data={activeCoinsForUser}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => {
                this._openCoin(activeCoinsForUser[index], item);
              }}
            >
              <ListItem
                roundAvatar
                title={
                  <Text style={Styles.listItemLeftTitleDefault}>
                    {item.name}
                  </Text>
                }
                subtitle={
                  balances.public.hasOwnProperty(item.id) ||
                  balances.errors.public[item.id]
                    ? balances.errors.public[item.id] ||
                      isNaN(balances.public[item.id].confirmed)
                      ? CONNECTION_ERROR
                      : truncateDecimal(
                          balances.public[item.id].confirmed,
                          4
                        ) +
                        " " +
                        item.id
                    : null
                }
                leftAvatar={{
                  source: item.logo,
                }}
                subtitleStyle={
                  (balances.public.hasOwnProperty(item.id) ||
                    balances.errors.public[item.id]) &&
                  (balances.errors.public[item.id] ||
                    isNaN(balances.public[item.id].confirmed))
                    ? Styles.listItemSubtitleDefault
                    : null
                }
                containerStyle={Styles.bottomlessListItemContainer}
                rightTitleStyle={Styles.listItemRightTitleDefault}
                rightTitle={
                  (!balances.public.hasOwnProperty(item.id) ||
                  balances.errors.public[item.id] ||
                  isNaN(balances.public[item.id].confirmed)
                    ? "-"
                    : truncateDecimal(
                        (rates[item.id] &&
                        rates[item.id][displayCurrency] != null
                          ? rates[item.id][displayCurrency]
                          : 0) * balances.public[item.id].confirmed,
                        2
                      )) +
                  " " +
                  displayCurrency
                }
              />
            </TouchableOpacity>
          )}
          extraData={balances.public}
          keyExtractor={(item) => item.id}
        />
        <Divider style={Styles.defaultDivider} />
        {global.ENABLE_FIAT_GATEWAY && (
          <TouchableOpacity onPress={this._buySellCrypto}>
            <ListItem
              title={
                <Text style={Styles.listItemLeftTitleDefault}>
                  Buy/Sell Crypto
                </Text>
              }
              leftAvatar={{
                source: require("../../images/customIcons/buySell.png"),
              }}
              containerStyle={Styles.bottomlessListItemContainer}
              hideChevron
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={this._addCoin}>
          <ListItem
            title={
              <Text style={Styles.listItemLeftTitleDefault}>Add Coin</Text>
            }
            leftAvatar={{
              source: require("../../images/customIcons/coinAdd.png"),
            }}
            containerStyle={{ borderBottomWidth: 0 }}
            hideChevron
          />
        </TouchableOpacity>
      </ScrollView>
    );
}

render() {
    return (
      <View style={Styles.defaultRoot}>
        <Text style={Styles.fiatLabel}>
          {truncateDecimal(this.state.totalFiatBalance, 2) +
            " " +
            this.props.displayCurrency}
        </Text>
        <Text style={Styles.boldListHeader}>{"Portfolio"}</Text>
        {this.renderCoinList()}
        <Button
          title="go to kyc screen"
          onPress={this.onKYCScreen}
          />
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    info: {
      public: state.ledger.info[ELECTRUM],
      private: state.ledger.info[DLIGHT],
    },
    balances: {
      public: state.ledger.balances[ELECTRUM],
      private: state.ledger.balances[DLIGHT],
      errors: {
        public: state.errors[API_GET_BALANCES][ELECTRUM],
        private: state.errors[API_GET_BALANCES][DLIGHT],
      }
    },
    //needsUpdate: state.ledger.needsUpdate,
    rates: state.ledger.rates[GENERAL],
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD
  }
};


export default connect(mapStateToProps)(Home);
