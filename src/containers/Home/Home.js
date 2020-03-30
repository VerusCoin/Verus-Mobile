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
import { ListItem } from "react-native-elements";
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
  //everythingNeedsUpdate,
  setActiveSectionBuySellCrypto,
  expireData,
  //updateOneBalance
} from '../../actions/actionCreators';
import { connect } from 'react-redux';
import { satsToCoins, truncateDecimal } from '../../utils/math';
import { NavigationActions } from 'react-navigation';
import styles from './Home.styles'
import Colors from "../../globals/colors";
import Store from '../../store/index'
import { ENABLE_WYRE } from "../../utils/constants/constants";
import { withNavigationFocus } from 'react-navigation';
import { API_GET_FIATPRICE, API_GET_ADDRESSES, API_GET_BALANCES, API_GET_INFO, ELECTRUM, DLIGHT, GENERAL } from "../../utils/constants/intervalConstants";
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";

const CONNECTION_ERROR = "Connection Error"

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      totalFiatBalance: this.getTotalFiatBalance(props),
      loading: false
    };
    
    this.updateProps = this.updateProps.bind(this);
  }

  componentDidUpdate(lastProps) {    
    if (lastProps.isFocused !== this.props.isFocused && this.props.isFocused) {
      this.refresh();
    }
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
        console.error(error)
      })
    })
    
  }

  resetToScreen = (route, title, data) => {
    const resetAction = NavigationActions.reset({
      index: 1, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: "Home" }),
        NavigationActions.navigate({ routeName: route, params: {title: title, data: data} }),
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
    const balanceErrors = props.balances.errors.public
    
    for (let key in props.rates) {
      if (typeof props.rates[key] === "number") {
        coinBalance = balances.hasOwnProperty(key) && !balanceErrors[key] && !isNaN(balances[key].confirmed) ? 
        truncateDecimal(satsToCoins(balances[key].confirmed), 4) : 0

        _totalFiatBalance += coinBalance*props.rates[key]
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

  _addCoin = () => {
    let navigation = this.props.navigation  

    navigation.navigate("AddCoin", { refresh: this.refresh });
  }

  _buySellCrypto = () => {
    let navigation = this.props.navigation  
    this.props.dispatch(setActiveSectionBuySellCrypto('buy-crypto'))

    navigation.navigate("BuySellCryptoMenus", {title: "Buy"});
  }

  renderCoinList = () => {
    const { rates, balances, activeCoinsForUser } = this.props
    
    return (
      <ScrollView
        style={styles.coinList}
        refreshControl={
          <RefreshControl
            refreshing={this.state.loading}
            onRefresh={this.forceUpdate}
          />
        }
      >
        <TouchableOpacity onPress={this._verusPay}>
          <ListItem
            roundAvatar
            title={<Text style={styles.coinItemLabel}>VerusPay</Text>}
            hideChevron
            avatar={require("../../images/customIcons/verusPay.png")}
            containerStyle={{ borderBottomWidth: 0 }}
          />
        </TouchableOpacity>
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
                title={<Text style={styles.coinItemLabel}>{item.name}</Text>}
                subtitle={
                  balances.public.hasOwnProperty(item.id) ||
                  balances.errors.public[item.id]
                    ? balances.errors.public[item.id] ||
                      isNaN(balances.public[item.id].confirmed)
                      ? CONNECTION_ERROR
                      : truncateDecimal(
                          satsToCoins(balances.public[item.id].confirmed),
                          4
                        ) +
                        " " +
                        item.id
                    : null
                }
                avatar={item.logo}
                subtitleStyle={
                  (balances.public.hasOwnProperty(item.id) ||
                    balances.errors.public[item.id]) &&
                  (balances.errors.public[item.id] ||
                    isNaN(balances.public[item.id].confirmed))
                    ? { color: "rgba(206,68,70,1)" }
                    : null
                }
                containerStyle={{ borderBottomWidth: 0 }}
                rightTitleStyle={{ color: "black" }}
                rightTitle={
                  "$" +
                  (!balances.public.hasOwnProperty(item.id) ||
                  balances.errors.public[item.id] ||
                  isNaN(balances.public[item.id].confirmed)
                    ? "0.00"
                    : truncateDecimal(
                        (typeof rates[item.id] === "number"
                          ? rates[item.id]
                          : 0) *
                          (balances.hasOwnProperty(item.id)
                            ? satsToCoins(balances.public[item.id].confirmed)
                            : 0),
                        2
                      ))
                }
              />
            </TouchableOpacity>
          )}
          extraData={balances.public}
          keyExtractor={item => item.id}
        />
        <View
          style={{
            borderBottomColor: Colors.tertiaryColor,
            borderBottomWidth: 1,
            width: "100%",
            alignSelf: "center",
            width: "90%",
            marginVertical: "3%"
          }}
        ></View>
        {ENABLE_WYRE && (
          <TouchableOpacity onPress={this._buySellCrypto}>
            <ListItem
              roundAvatar
              title={<Text style={styles.coinItemLabel}>Buy/Sell Crypto</Text>}
              avatar={require("../../images/customIcons/buySell.png")}
              containerStyle={{ borderBottomWidth: 0 }}
              hideChevron
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={this._addCoin}>
          <ListItem
            roundAvatar
            title={<Text style={styles.coinItemLabel}>Add Coin</Text>}
            avatar={require("../../images/customIcons/coinAdd.png")}
            containerStyle={{ borderBottomWidth: 0 }}
            hideChevron
          />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  render() {
    //console.log("FOCUSED?:")
    //console.log(isFocused)

    return (
      <View style={styles.root}>
        <Text style={styles.fiatBalanceLabel} >
        {'$' + truncateDecimal(this.state.totalFiatBalance, 2)}
        </Text>
        <Text style={styles.balanceSheetLabel}>Portfolio</Text>
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
      public: state.ledger.balances[ELECTRUM],
      private: state.ledger.balances[DLIGHT],
      errors: {
        public: state.errors[API_GET_BALANCES][ELECTRUM],
        private: state.errors[API_GET_BALANCES][DLIGHT],
      }
    },
    //needsUpdate: state.ledger.needsUpdate,
    rates: state.ledger.rates[GENERAL],
  }
};

export default connect(mapStateToProps)(withNavigationFocus(Home));