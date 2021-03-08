/*
  This component represents the drawer menu that pulls out from the
  side of the screen to display components.
*/

import { Component } from "react";
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { 
  setActiveCoin, 
  setActiveApp, 
  setActiveSection, 
  signOut,
  setConfigSection,
  removeExistingCoin,
  setUserCoins,
  setActiveSectionCustomCoins
 } from '../../actions/actionCreators'
import { getKeyByValue } from '../../utils/objectManip'
import { CommonActions } from '@react-navigation/native';
import AlertAsync from "react-native-alert-async";
import { clearAllCoinIntervals } from "../../actions/actionDispatchers";
import { renderSideMenu } from "./SideMenu.render";

class SideMenu extends Component {
  constructor(props) {
    super(props)
    this.state = {          
      error: null,   
      mainDrawer: true, 
      currentCoinIndex: null,
    };

    this.APP_INFO = 'App Info'
    this.PROFILE = 'Profile'
    this.WALLET = 'Wallet'

    this.CANCEL = 0
    this.REMOVE = 1
    this.REMOVE_DELETE = 2
  }

  navigateToScreen = (route) => {
    let navigation = this.props.navigation

    navigation.navigate(route);
  }

  _openWallet = (coinID) => {  
    let navigation = this.props.navigation  
    navigation.navigate("Wallet", { 
      coin: coinID
    });
  };

  _openApp = (coinObj, screen, section) => {
    if (section.title === "Identity App") {
      let navigation = this.props.navigation;
      navigation.navigate("Identity", { selectedScreen: screen } );
    } else {
      this._openCoin(coinObj, screen, section)
    }
  }

  _openCoin = (coinObj, screen, section) => {
    let sectionName = getKeyByValue(section, coinObj.apps)
    let index = 0;
    
    while (
      index < coinObj.apps[sectionName].data.length && 
      coinObj.apps[sectionName].data[index].name !== screen) {
       index++;     
    }

    if (index >= coinObj.apps[sectionName].data.length) {
      throw new Error("Array out of bounds error at _openCoin in SideMenu.js")
    }

    this.props.navigation.closeDrawer();
    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(sectionName))
    this.props.dispatch(setActiveSection(coinObj.apps[sectionName].data[index]))
    this.resetToScreen("CoinMenus", screen)
  }

  _removeCoin = (coinID) => {
    this.canRemoveCoin(coinID)
    .then(answer => {
      let data = {
        task: this._removeUserFromCoin,
        message: "Removing " + coinID + " from user " + this.props.activeAccount.id + ", please do not close Verus Mobile.",
        input: [coinID, answer === this.REMOVE_DELETE],
        route: "Home",
        dispatchResult: true
      }

      if (answer === this.REMOVE_DELETE || answer === this.REMOVE) {
        this.setState({ mainDrawer: true }, () => {
          this.resetToScreen("SecureLoading", null, data, true)
        })
      }
    })
  }

  _removeUserFromCoin = (coinID, deleteWallet) => {
    return new Promise((resolve, reject) => {
      removeExistingCoin(
        coinID,
        this.props.activeAccount.id,
        this.props.dispatch,
        deleteWallet
      )
        .then((res) => {
          clearAllCoinIntervals(coinID);
          resolve(
            setUserCoins(
              this.props.activeCoinList,
              this.props.activeAccount.id
            )
          );
        })
        .catch((err) => {
          console.warn(err);
          reject(err);
        });
    })
  }

  resetToScreen = (route, title, data, fullReset) => {
    let resetAction

    if (fullReset) {
      resetAction = CommonActions.reset({
        index: 0, // <-- currect active route from actions array
        routes: [
          { name: route, params: { data: data } },
        ],
      })
    } else {
      resetAction = CommonActions.reset({
        index: 1, // <-- currect active route from actions array
        routes: [
          { name: "Home" },
          { name: route, params: { title: title, data: data } },
        ],
      })
    }

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  sectionExtractor = (currentCoinIndex) => {
    let sections = []
    let coinApps = this.props.activeCoinsForUser[currentCoinIndex].apps
    for (let key in coinApps) {
      sections.push(coinApps[key])
    }

    return sections
  }

  canRemoveCoin = (coinID) => {
    if (this.props.dlightSockets[coinID]) {
      return AlertAsync(
        'Confirm',
        "Would you like to remove " + coinID + " and delete all its blockchain data?",
        [
          {
            text: 'Cancel',
            onPress: () => Promise.resolve(this.CANCEL),
            style: 'cancel',
          },
          {text: 'Remove', onPress: () => Promise.resolve(this.REMOVE)},
          {text: 'Remove & Delete', onPress: () => Promise.resolve(this.REMOVE_DELETE)},
        ],
        {
          cancelable: false,
        },
      )
    } else {
      return AlertAsync(
        'Confirm',
        "Are you sure you would like to remove " + coinID + "?",
        [
          {
            text: 'No',
            onPress: () => Promise.resolve(this.CANCEL),
            style: 'cancel',
          },
          {text: 'Yes', onPress: () => Promise.resolve(this.REMOVE)},
        ],
        {
          cancelable: false,
        },
      )
    }
    
  }

  handleLogout = () => {
    this.props.dispatch(signOut())
  }

  _openSettings = (drawerItem) => {
    let navigation = this.props.navigation
    if (drawerItem.title === this.APP_INFO) {
      this.props.dispatch(setConfigSection('settings-info'))
    } else if (drawerItem.title === this.PROFILE){
      this.props.dispatch(setConfigSection('settings-profile'))
    } else if (drawerItem.title === this.WALLET){
      this.props.dispatch(setConfigSection('settings-wallet'))
    } else {
      throw new Error("Option " + drawerItem.title + " not found in possible settings values")
    }

    navigation.navigate("SettingsMenus", { title: drawerItem.title })
  }

  _openCustomCoinMenus = () => {
    let navigation = this.props.navigation
    this.props.dispatch(setActiveSectionCustomCoins('custom-coin-qr'))

    //TODO: Change this when coin adding is refactored
    navigation.navigate("CustomChainMenus", { title: "Scan QR" })
  }

  toggleMainDrawer = () =>
		this.setState(prevState => ({ mainDrawer: !prevState.mainDrawer }));

  render() {
    return renderSideMenu.call(this)
  }
}

SideMenu.propTypes = {
  navigation: PropTypes.object
};

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    dlightSockets: state.channelStore_dlight_private.dlightSockets
  }
};

export default connect(mapStateToProps)(SideMenu);
