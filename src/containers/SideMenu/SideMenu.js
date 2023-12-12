/*
  This component represents the drawer menu that pulls out from the
  side of the screen to display components.
*/

import {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
  setActiveCoin,
  setActiveApp,
  setActiveSection,
  signOut,
  setConfigSection,
  removeExistingCoin,
  setUserCoins,
  setActiveSectionCustomCoins,
  setDarkMode,
} from '../../actions/actionCreators';
import {getKeyByValue} from '../../utils/objectManip';
import {CommonActions} from '@react-navigation/native';
import {
  clearActiveAccountLifecycles,
  clearAllCoinIntervals,
} from '../../actions/actionDispatchers';
import {renderSideMenu} from './SideMenu.render';
import {
  createAlert,
  resolveAlert,
} from '../../actions/actions/alert/dispatchers/alert';
import {bindActionCreators} from 'redux';

class SideMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      mainDrawer: true,
      currentCoinIndex: null,
    };

    this.APP_INFO = 'App Info';
    this.PROFILE = 'Profile';
    this.WALLET = 'Wallet';

    this.CANCEL = 0;
    this.REMOVE = 1;
    this.REMOVE_DELETE = 2;
  }

  // const {actions: {setDarkMode}} = props;

  navigateToScreen = route => {
    let navigation = this.props.navigation;

    navigation.navigate(route);
  };

  _openWallet = coinID => {
    let navigation = this.props.navigation;
    navigation.navigate('Wallet', {
      coin: coinID,
    });
  };

  _openApp = (coinObj, screen, section) => {
    if (section.title === 'Identity App') {
      let navigation = this.props.navigation;
      navigation.navigate('Identity', {selectedScreen: screen});
    } else {
      this._openCoin(coinObj, screen, section);
    }
  };

  _openCoin = (coinObj, screen, section) => {
    let sectionName = getKeyByValue(section, coinObj.apps);
    let index = 0;

    while (
      index < coinObj.apps[sectionName].data.length &&
      coinObj.apps[sectionName].data[index].name !== screen
    ) {
      index++;
    }

    if (index >= coinObj.apps[sectionName].data.length) {
      throw new Error('Array out of bounds error at _openCoin in SideMenu.js');
    }

    this.props.navigation.closeDrawer();
    this.props.dispatch(setActiveCoin(coinObj));
    this.props.dispatch(setActiveApp(sectionName));
    this.props.dispatch(
      setActiveSection(coinObj.apps[sectionName].data[index]),
    );
    this.resetToScreen('CoinMenus', screen);
  };

  _removeCoin = coinObj => {
    this.canRemoveCoin(coinObj).then(answer => {
      let data = {
        task: this._removeUserFromCoin,
        message:
          'Removing ' +
          coinObj.display_ticker +
          ' from user ' +
          this.props.activeAccount.id +
          ', please do not close Verus Mobile.',
        input: [coinObj.id, answer === this.REMOVE_DELETE],
        route: 'Home',
        dispatchResult: true,
      };

      if (answer === this.REMOVE_DELETE || answer === this.REMOVE) {
        this.setState({mainDrawer: true}, () => {
          this.resetToScreen('SecureLoading', null, data, true);
        });
      }
    });
  };

  _removeUserFromCoin = (coinID, deleteWallet) => {
    return new Promise((resolve, reject) => {
      removeExistingCoin(
        coinID,
        this.props.activeAccount.id,
        this.props.dispatch,
        deleteWallet,
      )
        .then(res => {
          clearAllCoinIntervals(coinID);
          resolve(
            setUserCoins(
              this.props.activeCoinList,
              this.props.activeAccount.id,
            ),
          );
        })
        .catch(err => {
          console.warn(err);
          reject(err);
        });
    });
  };

  resetToScreen = (route, title, data, fullReset) => {
    let resetAction;

    if (fullReset) {
      resetAction = CommonActions.reset({
        index: 0, // <-- currect active route from actions array
        routes: [{name: route, params: {data: data}}],
      });
    } else {
      resetAction = CommonActions.reset({
        index: 1, // <-- currect active route from actions array
        routes: [
          {name: 'Home'},
          {name: route, params: {title: title, data: data}},
        ],
      });
    }

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction);
  };

  sectionExtractor = currentCoinIndex => {
    let sections = [];
    let coinApps = this.props.activeCoinsForUser[currentCoinIndex].apps;
    for (let key in coinApps) {
      sections.push(coinApps[key]);
    }

    return sections;
  };

  canRemoveCoin = coinObj => {
    if (this.props.dlightSockets[coinObj.id]) {
      return createAlert(
        'Confirm',
        `You have chosen to remove ${coinObj.display_ticker}. Would you also like to delete local ${coinObj.display_ticker} blockchain data?`,
        [
          {
            text: 'Cancel',
            onPress: () => resolveAlert(this.CANCEL),
            style: 'cancel',
          },
          {text: 'Remove', onPress: () => resolveAlert(this.REMOVE)},
          {text: 'Delete', onPress: () => resolveAlert(this.REMOVE_DELETE)},
        ],
        {
          cancelable: false,
        },
      );
    } else {
      return createAlert(
        'Confirm',
        'Are you sure you would like to remove ' + coinObj.display_ticker + '?',
        [
          {
            text: 'No',
            onPress: () => resolveAlert(this.CANCEL),
            style: 'cancel',
          },
          {text: 'Yes', onPress: () => resolveAlert(this.REMOVE)},
        ],
        {
          cancelable: false,
        },
      );
    }
  };

  handleLogout = () => {
    this.resetToScreen(
      'SecureLoading',
      null,
      {
        task: () => {
          // Hack to prevent crash on screens that require activeAccount not to be null
          // TODO: Find a more elegant solution
          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              await clearActiveAccountLifecycles();
              this.props.dispatch(signOut());
              resolve();
            }, 1000);
          });
        },
        message: 'Signing out...',
        route: 'Home',
        successMsg: 'Signed out',
        errorMsg: 'Failed to sign out',
      },
      true,
    );
  };

  _openSettings = drawerItem => {
    let navigation = this.props.navigation;
    if (drawerItem.title === this.APP_INFO) {
      this.props.dispatch(setConfigSection('settings-info'));
    } else if (drawerItem.title === this.PROFILE) {
      this.props.dispatch(setConfigSection('settings-profile'));
    } else if (drawerItem.title === this.WALLET) {
      this.props.dispatch(setConfigSection('settings-wallet'));
    } else {
      throw new Error(
        'Option ' + drawerItem.title + ' not found in possible settings values',
      );
    }

    navigation.navigate('SettingsMenus', {title: drawerItem.title});
  };

  toggleMainDrawer = () =>
    this.setState(prevState => ({mainDrawer: !prevState.mainDrawer}));

  render() {
    return renderSideMenu.call(this);
  }
}

SideMenu.propTypes = {
  navigation: PropTypes.object,
};

const mapStateToProps = state => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    dlightSockets: state.channelStore_dlight_private.dlightSockets,
    darkMode: state.settings.darkMode,
  };
};

export default connect(mapStateToProps)(SideMenu);
