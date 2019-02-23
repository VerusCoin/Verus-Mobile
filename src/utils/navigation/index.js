import React, { Component } from "react";
import { StackNavigator, TabNavigator, DrawerNavigator } from "react-navigation";
import { StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Icon } from "react-native-elements";
import { NavigationActions } from 'react-navigation';

import SideMenu from '../../containers/SideMenu';

import Login from '../../containers/Login';
import Home from '../../containers/Home';
import AddCoin from '../../containers/AddCoin';
import Settings from '../../containers/Settings';
//import Polling from '../../containers/Polling';
import Overview from '../../containers/Overview';
import SignUp from  '../../containers/SignUp';
import CoinDetails from '../../containers/CoinDetails';
import TransactionDetails from '../../containers/TransactionDetails';
import LoadingScreen from '../../containers/LoadingScreen';
import ConfirmSend from '../../containers/ConfirmSend';
import SendResult from '../../containers/SendResult';
import CoinMenus from '../../containers/CoinMenus';
import VerusPay from '../../containers/VerusPay';

const WALLET = "wallet";

const styles = StyleSheet.create({
  header_title_noBack: {
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'center',
    fontSize: 22,
    color: "#E9F1F7",
    paddingTop: 12,
    width: Dimensions.get('window').width // width of both buttons + no left-right padding
  },

  header_title_back: {
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'center',
    fontSize: 22,
    color: "#E9F1F7",
    paddingTop: 12,
    width: Dimensions.get('window').width - 110// width of both buttons + no left-right padding
  },

  menuButton: {
    marginRight:15
  }
});

export const MainScreens = 
  StackNavigator({
      Home: {
        screen: Home,
        navigationOptions: {
          title: "Home",
          headerLeft: null
        }
      },
      AddCoin: {
        screen: AddCoin,
        navigationOptions: {
          title: "Add Coin",
        }
      },
      Settings: {
        screen: Settings,
        navigationOptions: {
          title: "Settings",
        }
      },
      /*Polling: {
        screen: Polling,
        navigationOptions: {
          title: "Polling",
        }
      },*/
      CoinDetails: {
        screen: CoinDetails,
        navigationOptions: {
          title: "Details",
        }
      },
      TxDetails: {
        screen: TransactionDetails,
        navigationOptions: {
          title: "Details",
        }
      },
      ConfirmSend: {
        screen: ConfirmSend,
        navigationOptions: {
          title: "Confirm Send",
        }
      },
      SendResult: {
        screen: SendResult,
        navigationOptions: {
          title: "Send Result",
          headerLeft: null,
          headerRight: null,
          drawerLockMode: 'locked-closed'
        }
      },
      CoinMenus: {
        screen: CoinMenus,
      },
      VerusPay: {
        screen: VerusPay,
        navigationOptions: {
          title: "VerusPay",
        }
      }
    }, {
      headerMode: 'screen',
      navigationOptions: ({navigation}) => ({
        headerStyle: {
          backgroundColor: '#2E86AB',
        },
        headerRight: (
        <TouchableOpacity onPress={() => 
          navigation.navigate('DrawerOpen')} style={styles.menuButton}>
          <Icon name="menu" size={35} color="#E9F1F7"/>
        </TouchableOpacity>),
        gesturesEnabled: false,
        headerTintColor: '#E9F1F7',
      }),
  })

export const SignedOut = StackNavigator({
  SignIn: {
    screen: Login,
    navigationOptions: {
        header: null
    }
  },
});

export const SignedOutNoKey = StackNavigator({
    SignIn: {
      screen: SignUp,
      navigationOptions: {
        header: null
      }
    },
});

export const Loading = StackNavigator({
  Splash: {
    screen: LoadingScreen,
    navigationOptions: {
      header: null
    }
  },
});

export const RootNavigator = (hasAccount, loading, signedIn) => {
  return DrawerNavigator(
    {
      SignedIn: {
        screen: MainScreens,
        headerMode: 'screen',
        navigationOptions: {
          gesturesEnabled: false,
        }
      },
      SignedOut: {
        screen: SignedOut,
        navigationOptions: {
          gesturesEnabled: false,
          drawerLockMode: 'locked-closed'
        }
      },
      SignedOutNoKey: {
        screen: SignedOutNoKey,
        navigationOptions: {
          gesturesEnabled: false,
          drawerLockMode: 'locked-closed'
        }
      },
      Loading: {
        screen: Loading,
        navigationOptions: {
          gesturesEnabled: false,
          drawerLockMode: 'locked-closed'
        }
      }
    }, {
      contentComponent: SideMenu,
      drawerWidth: 250,
      drawerPosition: 'left',
      drawerOpenRoute: 'DrawerOpen',
      drawerCloseRoute: 'DrawerClose',
      drawerToggleRoute: 'DrawerToggle',
      mode: "modal",
      initialRouteName: loading ? "Loading" : (hasAccount ? (signedIn ? "SignedIn" : "SignedOut") : "SignedOutNoKey")
    }
  );
};



