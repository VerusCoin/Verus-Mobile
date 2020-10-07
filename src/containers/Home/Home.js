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
import { ListItem, Divider } from "react-native-elements";
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
import { ENABLE_VERUS_IDENTITIES, ENABLE_FIAT_GATEWAY } from '../../../env/main.json'
import Store from '../../store/index'
import {
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_INFO,
  ELECTRUM,
  DLIGHT,
  GENERAL
} from "../../utils/constants/intervalConstants";
import { USD } from '../../utils/constants/currencies'
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";
import { arrayToObject } from "../../utils/objectManip";
import BigNumber from "bignumber.js";

const CONNECTION_ERROR = "Connection Error"

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      totalFiatBalance: "0.00",
      loading: false
    };
<<<<<<< HEAD

    this.updateProps = this.updateProps.bind(this);
=======

>>>>>>> 4301f29a779a8382caf9ee6842d9aafef83a096d
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

<<<<<<< HEAD
  refresh = () => {
=======
  componentDidUpdate(lastProps) {
    if (this.props.balances !== lastProps.balances) {
      this.setState({
        totalFiatBalance: this.getTotalFiatBalance(this.props)
      })
    }
  }

  refresh = () => {
>>>>>>> 4301f29a779a8382caf9ee6842d9aafef83a096d
    this.setState({ loading: true }, () => {
      Promise.all(this.props.activeCoinsForUser.map(async (coinObj) => {
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_FIATPRICE)
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_BALANCES)
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_INFO)
      })).then(res => {
        this.setState({ loading: false, totalFiatBalance: this.getTotalFiatBalance(this.props) })
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

    this.props.navigation.closeDrawer();
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
    let _totalFiatBalance = BigNumber(0)
    let coinBalance = BigNumber(0)
    const balances = props.balances.public
    const { rates, displayCurrency, activeCoinsForUser } = props
    const balanceErrors = props.balances.errors.public

    activeCoinsForUser.map(coinObj => {
      const key = coinObj.id
      const channel = coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM

      if (rates[key] && rates[key][displayCurrency]) {
        const price = BigNumber(rates[key][displayCurrency])

        coinBalance =
          balances[channel].hasOwnProperty(key) &&
          !balanceErrors[channel][key] &&
          balances[channel][key].confirmed != null
            ? BigNumber(balances[channel][key].confirmed)
            : BigNumber("0");

        _totalFiatBalance = _totalFiatBalance.plus(coinBalance.multipliedBy(price))
      }
    })

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

    navigation.navigate("KYCStartScreen");
  }

  handleScanToVerify = () => {
    this.props.navigation.navigate('ScanBadge');
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
        {ENABLE_VERUS_IDENTITIES &&
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
          renderItem={({ item, index }) => {
            const channel = item.dominant_channel ? item.dominant_channel : ELECTRUM
            const _balances = balances.public[channel]
            const balanceErrors = balances.errors.public[channel]

            return (
              <TouchableOpacity
                onPress={() => {
                  this._openCoin(activeCoinsForUser[index], item);
                }}
              >
                <ListItem
                  roundAvatar
                  title={
                    <Text style={Styles.listItemLeftTitleDefault}>
                      {item.display_name}
                    </Text>
                  }
                  subtitle={
                    _balances.hasOwnProperty(item.id) ||
                    balanceErrors[item.id]
                      ? balanceErrors[item.id] ||
                        _balances[item.id].confirmed == null
                        ? CONNECTION_ERROR
                        : truncateDecimal(
                            _balances[item.id].confirmed,
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
                    (_balances.hasOwnProperty(item.id) ||
                      balanceErrors[item.id]) &&
                    (balanceErrors[item.id] ||
                      _balances[item.id].confirmed) == null
                      ? Styles.listItemSubtitleError
                      : null
                  }
                  containerStyle={Styles.bottomlessListItemContainer}
                  rightTitleStyle={Styles.listItemRightTitleDefault}
                  rightTitle={
                    (!_balances.hasOwnProperty(item.id) ||
                    balanceErrors[item.id] ||
                    _balances[item.id].confirmed == null
                      ? "-"
                      : truncateDecimal(
                          (rates[item.id] &&
                          rates[item.id][displayCurrency] != null
                            ? BigNumber(rates[item.id][displayCurrency])
                            : BigNumber(0)).multipliedBy(BigNumber(_balances[item.id].confirmed)),
                          2
                        )) +
                    " " +
                    displayCurrency
                  }
                />
              </TouchableOpacity>
            );
          }}
          extraData={balances.public}
          keyExtractor={(item) => item.id}
        />
        <Divider style={Styles.defaultDivider} />
        {ENABLE_FIAT_GATEWAY && (
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
          {this.state.totalFiatBalance +
            " " +
            this.props.displayCurrency}
        </Text>
        <Text style={Styles.boldListHeader}>{"Portfolio"}</Text>
        {this.renderCoinList()}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    balances: {
      public: arrayToObject(
        Object.keys(state.ledger.balances),
        (curr, key) => state.ledger.balances[key],
        true
      ),
      private: state.ledger.balances[DLIGHT],
      errors: {
        public: arrayToObject(
          Object.keys(state.errors[API_GET_BALANCES]),
          (curr, key) => state.errors[API_GET_BALANCES][key],
          true
        ),
        private: state.errors[API_GET_BALANCES][DLIGHT],
      },
    },
    //needsUpdate: state.ledger.needsUpdate,
    rates: state.ledger.rates[GENERAL],
    displayCurrency:
      state.settings.generalWalletSettings.displayCurrency || USD,
  };
};

export default connect(mapStateToProps)(Home);
