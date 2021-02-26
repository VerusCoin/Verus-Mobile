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
import {  
  setActiveCoin, 
  setActiveApp,
  setActiveSection,
  setActiveSectionBuySellCrypto,
  expireData,
  setCoinSubWallet,
} from '../../actions/actionCreators';
import { connect } from 'react-redux';
import { Animated } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import Store from '../../store/index'
import {
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_INFO,
  GENERAL
} from "../../utils/constants/intervalConstants";
import { USD } from '../../utils/constants/currencies'
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";
import BigNumber from "bignumber.js";
import { extractLedgerData, extractErrorData } from "../../utils/ledger/extractLedgerData";
import { HomeRender } from "./Home.render";
import { extractDisplaySubWallets } from "../../utils/subwallet/extractSubWallets";

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      totalFiatBalance: "0.00",
      totalCryptoBalances: {},
      loading: false,
      listItemHeights: {},

      //TODO: MOVE TO REDUX
      expandedListItems: {},
    };
    
    this._unsubscribeFocus = null
    this.LIST_ITEM_INITIAL_HEIGHT = 58
    this.LIST_ITEM_MARGINS = 8
    this.LIST_ITEM_ANIMATION_DURATION = 250
  }

  componentDidMount() {
    this._unsubscribeFocus = this.props.navigation.addListener('focus', () => {
      this.refresh();
    });
  }

  animateHeightChange(anim, toValue, cb = () => {}) {    
    Animated.timing(anim, {
      toValue,
      duration: this.LIST_ITEM_ANIMATION_DURATION
    }).start(cb);
  }

  toggleListItem(id, numCards) {
    const _toggleListItem = () => {
      const newExpanded = !this.state.expandedListItems[id]
      const changeExpandState = (cb = () => {}) => {
        this.setState({
          expandedListItems: {
            ...this.state.expandedListItems,
            [id]: newExpanded,
          },
        }, cb);
      }

      if (newExpanded) {
        changeExpandState(
          this.animateHeightChange(
            this.state.listItemHeights[id],
            newExpanded
              ? ((this.LIST_ITEM_INITIAL_HEIGHT + (this.LIST_ITEM_MARGINS)) * (numCards + 1))
              : this.LIST_ITEM_INITIAL_HEIGHT
          )
        );
      } else {
        this.animateHeightChange(
          this.state.listItemHeights[id],
          newExpanded
            ? (this.LIST_ITEM_INITIAL_HEIGHT + this.LIST_ITEM_MARGINS) * (numCards + 1)
            : this.LIST_ITEM_INITIAL_HEIGHT,
          () => changeExpandState()
        );
      }
    }

    if (this.state.listItemHeights[id] == null) {
      this.setState({
        listItemHeights: {
          ...this.state.listItemHeights,
          [id]: new Animated.Value(this.LIST_ITEM_INITIAL_HEIGHT)
        }
      }, () => _toggleListItem())
    } else _toggleListItem()
  }

  componentWillUnmount() {
    this._unsubscribeFocus()
  }

  componentDidUpdate(lastProps) {
    if (this.props.balances !== lastProps.balances) {
      const totalBalances = this.getTotalBalances(this.props)

      this.setState({
        totalFiatBalance: totalBalances.fiat,
        totalCryptoBalances: totalBalances.crypto
      })
    }
  }

  refresh = () => {    
    this.setState({ loading: true }, () => {
      Promise.all(this.props.activeCoinsForUser.map(async (coinObj) => {
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_FIATPRICE)
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_BALANCES)
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, coinObj.id, API_GET_INFO)
      })).then(() => {
        const totalBalances = this.getTotalBalances(this.props)

        this.setState({
          loading: false,
          totalFiatBalance: totalBalances.fiat,
          totalCryptoBalances: totalBalances.crypto,
        });
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
            const totalBalances = this.getTotalBalances(this.props)

            this.setState({
              totalFiatBalance: totalBalances.fiat,
              totalCryptoBalances: totalBalances.crypto,
            });
            resolve(true)
          }
          else {
            resolve(false)
          }
        })
    }) 
  }

  getTotalBalances = (props) => {    
    let _totalFiatBalance = BigNumber(0)
    let coinBalances = {}
    const balances = props.balances
    const { rates, displayCurrency, activeCoinsForUser, allSubWallets } = props

    activeCoinsForUser.map(coinObj => {
      const key = coinObj.id
      coinBalances[coinObj.id] = BigNumber("0")

      allSubWallets[coinObj.id].map(wallet => {
        if (balances[coinObj.id] != null && balances[coinObj.id][wallet.id] != null) {
          coinBalances[coinObj.id] = coinBalances[coinObj.id].plus(
            balances[key] &&
              balances[key][wallet.id] &&
              balances[key][wallet.id].total != null
              ? BigNumber(balances[key][wallet.id].total)
              : BigNumber("0")
          );

          if (rates[key] && rates[key][displayCurrency]) {
            const price = BigNumber(rates[key][displayCurrency])
    
            _totalFiatBalance = _totalFiatBalance.plus(coinBalances[coinObj.id].multipliedBy(price))
          }
        }
      })
    })

    return {
      fiat: _totalFiatBalance.toFixed(2),
      crypto: coinBalances
    }
  }

  _verusPay = () => {
    let navigation = this.props.navigation  

    navigation.navigate("VerusPay", { refresh: this.refresh });
  }

  openCoin = (coinObj, subWallet) => {
    if (subWallet != null) this.props.dispatch(setCoinSubWallet(coinObj.id, subWallet))
    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(coinObj.defaultApp))
    this.props.dispatch(setActiveSection(coinObj.apps[coinObj.defaultApp].data[0]))

    this.resetToScreen('CoinMenus', 'Overview');
  }

  _handleIdentity = () => {
    let navigation = this.props.navigation ; 
    navigation.navigate("Identity", { selectedScreen: "Identity" } );
  }

  calculateSyncProgress = (coinObj, subWallet) => {
    const syncInfo = this.props.info 

    if (syncInfo[coinObj.id] == null || syncInfo[coinObj.id][subWallet.id] == null) return 100
    else return syncInfo[coinObj.id][subWallet.id].percent
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

  render() {
    return HomeRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    balances: extractLedgerData(state, 'balances', API_GET_BALANCES),
    balanceErrors: extractErrorData(state, API_GET_BALANCES),
    info: extractLedgerData(state, 'info', API_GET_INFO),
    rates: state.ledger.rates[GENERAL],
    displayCurrency:
      state.settings.generalWalletSettings.displayCurrency || USD,
    allSubWallets: extractDisplaySubWallets(state)
  };
};

export default connect(mapStateToProps)(Home);