import React from "react";
import { StackNavigator, DrawerNavigator } from "react-navigation";
import { StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Icon } from "react-native-elements";

import SideMenu from '../../containers/SideMenu';

import Login from '../../containers/Login';
import Home from '../../containers/Home';
import AddCoin from '../../containers/AddCoin';
import SignUp from  '../../containers/SignUp';
import CoinDetails from '../../containers/CoinDetails';
import TransactionDetails from '../../containers/TransactionDetails';
import LoadingScreen from '../../containers/LoadingScreen';
import ConfirmSend from '../../containers/ConfirmSend';
import SendResult from '../../containers/SendResult';
import CoinMenus from '../../containers/CoinMenus';
import VerusPay from '../../containers/VerusPay';
import SettingsMenus from '../../containers/SettingsMenus';
import ProfileInfo from '../../containers/ProfileInfo';
import ResetPwd from '../../containers/ResetPwd';
import DisplaySeed from '../../containers/DisplaySeed';
import RecoverSeed from '../../containers/RecoverSeed';
import DeleteProfile from '../../containers/DeleteProfile';
import SecureLoading from '../../containers/SecureLoading';
import CustomChainMenus from '../../containers/CustomChainMenus'
import GeneralWalletSettings from '../../containers/GeneralWalletSettings'
import CoinSettings from '../../containers/CoinSettings'

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
      CoinDetails: {
        screen: CoinDetails,
        navigationOptions: {
          title: "Details",
        }
      },
      TxDetails: {
        screen: TransactionDetails,
        navigationOptions: {
          title: "Info",
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
      DisplaySeed: {
        screen: DisplaySeed,
        navigationOptions: {
          title: "Seed",
          headerRight: null,
          drawerLockMode: 'locked-closed'
        }
      },
      CoinMenus: {
        screen: CoinMenus,
      },
      SettingsMenus: {
        screen: SettingsMenus,
      },
      VerusPay: {
        screen: VerusPay,
        navigationOptions: {
          title: "VerusPay",
        }
      },
      ProfileInfo: {
        screen: ProfileInfo,
        navigationOptions: {
          title: "Info",
        }
      },
      ResetPwd: {
        screen: ResetPwd,
        navigationOptions: {
          title: "Reset",
        }
      },
      RecoverSeed: {
        screen: RecoverSeed,
        navigationOptions: {
          title: "Recover",
        }
      },
      GeneralWalletSettings: {
        screen: GeneralWalletSettings,
        navigationOptions: {
          title: "General Wallet Settings"
        }
      },
      CoinSettings: {
        screen: CoinSettings,
      },
      DeleteProfile: {
        screen: DeleteProfile,
        navigationOptions: {
          title: "Delete",
        }
      },
      SecureLoading: {
        screen: SecureLoading,
        navigationOptions: {
          title: "Loading",
          headerRight: null,
          headerLeft: null,
          drawerLockMode: 'locked-closed'
        }
      },
      CustomChainMenus: {
        screen: CustomChainMenus,
      },
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
  RecoverSeed: {
    screen: RecoverSeed,
    navigationOptions: {
      title: "Recover",
    }
  },
  DisplaySeed: {
    screen: DisplaySeed,
    navigationOptions: {
      title: "Seed",
    }
  },
  DeleteProfile: {
    screen: DeleteProfile,
    navigationOptions: {
      title: "Delete",
    }
  },
  SecureLoading: {
    screen: SecureLoading,
    navigationOptions: {
      title: "Loading",
      headerRight: null,
      headerLeft: null,
      drawerLockMode: 'locked-closed'
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
          drawerLockMode: 'locked-closed',
          headerRight: null
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



